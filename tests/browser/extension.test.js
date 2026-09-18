import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const markup = `<!doctype html><html><head><title>Chat fixture</title></head><body>
  <h1>Chat fixture</h1><section data-message-id="first"><span>Ada · 10:42</span>
    <div jsname="bgckF">Bonjour <b>tout le monde</b> !</div></section>
  <div contenteditable="true" role="textbox">Draft message</div>
</body></html>`;

async function launch(t, url = 'https://chat.google.com/', fixture = () => markup) {
  const profile = await mkdtemp(path.join(tmpdir(), 'local-chat-test-'));
  const extension = path.resolve('dist/extension');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  });
  t.after(async () => { await context.close(); await rm(profile, { recursive: true, force: true }); });
  const requests = [];
  await context.route(/^https:\/\//, route => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: 'text/html', body: fixture(route.request().url()) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  const worlds = [];
  cdp.on('Runtime.executionContextCreated', event => worlds.push(event.context));
  await cdp.send('Runtime.enable');
  await page.goto(url);
  const { frameTree } = await cdp.send('Page.getFrameTree');
  async function isolated(expression) {
    let world;
    await expect.poll(async () => {
      for (const candidate of worlds.filter(w => w.auxData?.isDefault === false && w.auxData.frameId === frameTree.frame.id)) {
        try {
          const { result } = await cdp.send('Runtime.evaluate', { contextId: candidate.id, expression: '!!globalThis.chrome?.runtime?.id', returnByValue: true });
          if (result.value) { world = candidate; return true; }
        } catch { /* Navigation may invalidate a context. */ }
      }
      return false;
    }).toBe(true);
    const response = await cdp.send('Runtime.evaluate', { contextId: world.id, expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  return { page, context, isolated, requests, errors };
}

const mock = `
  globalThis.translationCalls = 0;
  globalThis.Translator = {
    availability: async () => 'downloadable',
    create: async ({ monitor }) => {
      monitor({ addEventListener: (_, report) => report({ loaded: 0.5 }) });
      return { translate: async text => { translationCalls++; return 'Hello <script>world</script>!'; }, destroy() {} };
    }
  };
  globalThis.LanguageDetector = {
    availability: async () => 'available',
    create: async () => ({ detect: async () => [{ detectedLanguage: 'fr', confidence: 0.99 }], destroy() {} })
  }; true;
`;

test('installed extension translates, toggles, observes edits and new messages, and saves settings', async t => {
  const { page, context, isolated, requests, errors } = await launch(t);
  await expect(page.getByRole('button', { name: 'Translate to English' })).toHaveCount(1);
  const original = await page.locator('[jsname="bgckF"]').innerHTML();
  await isolated(mock);
  await page.getByRole('button', { name: 'Translate to English' }).click();
  await expect(page.locator('local-chat-translation .text')).toHaveText('Hello <script>world</script>!');
  assert.equal(await page.locator('[jsname="bgckF"]').innerHTML(), original);
  assert.equal(await page.locator('local-chat-translation script').count(), 0);
  await page.getByRole('button', { name: 'Hide translation' }).click();
  await expect(page.locator('local-chat-translation .result')).toBeHidden();
  await page.getByRole('button', { name: 'Show translation' }).click();
  assert.equal(await isolated('translationCalls'), 1);
  await page.evaluate(() => {
    document.querySelector('[jsname="bgckF"]').firstChild.textContent = 'Bonsoir ';
    const section = document.createElement('section');
    section.setAttribute('data-message-id', 'second');
    section.innerHTML = '<div class="DTp27d">Hola a todos</div>';
    document.body.append(section);
  });
  await expect(page.getByRole('button', { name: 'Translate to English' })).toHaveCount(2);
  await page.evaluate(() => {
    for (let i = 0; i < 30; i++) document.querySelector('h1').textContent = `Chat fixture ${i}`;
  });
  await expect(page.locator('local-chat-translation')).toHaveCount(2);
  const id = await isolated('chrome.runtime.id');
  const settings = await context.newPage();
  await settings.goto(`chrome-extension://${id}/settings.html`);
  await settings.getByLabel('Translate into').selectOption('vi');
  await settings.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('button', { name: 'Translate to Vietnamese' })).toHaveCount(2);
  await settings.getByLabel('Show translation buttons').uncheck();
  await settings.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('local-chat-translation')).toHaveCount(0);
  assert.equal(await page.locator('[jsname="bgckF"]').innerText(), 'Bonsoir tout le monde !');
  const stored = await isolated('chrome.storage.local.get(null)');
  assert.deepEqual(stored, { enabled: false, sourceLanguage: 'auto', targetLanguage: 'vi' });
  assert.deepEqual(requests, ['https://chat.google.com/']);
  assert.deepEqual(errors, []);
});

test('Gmail route changes limit controls to Chat', async t => {
  const { page } = await launch(t, 'https://mail.google.com/mail/u/2/#inbox');
  await expect(page.locator('local-chat-translation')).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#chat/space/example'; });
  await expect(page.getByRole('button', { name: 'Translate to English' })).toHaveCount(1);
  await page.evaluate(() => { location.hash = '#inbox'; });
  await expect(page.locator('local-chat-translation')).toHaveCount(0);
});

test('unsupported API and denied models show safe retry errors', async t => {
  const { page, isolated } = await launch(t);
  await isolated('globalThis.Translator = undefined');
  await page.getByRole('button', { name: 'Translate to English' }).click();
  await expect(page.locator('local-chat-translation .status')).toContainText('desktop Chrome');
  await isolated(mock + "Translator.availability = async () => 'unavailable';");
  await page.getByRole('button', { name: 'Retry translation' }).click();
  await expect(page.locator('local-chat-translation .status')).toContainText('unavailable');
});

test('real browser exposes native AI APIs in the isolated extension world', async t => {
  const { isolated } = await launch(t);
  const result = await isolated(`(async () => ({
    translator: typeof Translator,
    detector: typeof LanguageDetector,
    state: typeof Translator === 'undefined' ? null : await Translator.availability({sourceLanguage: 'fr', targetLanguage: 'en'})
  }))()`);
  t.diagnostic(JSON.stringify(result));
  assert.equal(result.translator, 'function');
  assert.equal(result.detector, 'function');
  assert.ok(['available', 'downloadable', 'downloading', 'unavailable'].includes(result.state));
});


test('Gmail Chat iframe translates through the top frame despite frame API policy', async t => {
  const { page, isolated, requests } = await launch(t, 'https://mail.google.com/mail/u/0/#chat/',
    url => url.includes('mail.google.com') ? '<iframe src="https://chat.google.com/"></iframe>' : markup);
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('button', { name: 'Translate to English' })).toHaveCount(1);
  assert.equal(await page.frames().find(f => f.url().includes('chat.google.com')).evaluate(() => document.featurePolicy.allowsFeature('translator')), false);
  await isolated(mock);
  await frame.getByRole('button', { name: 'Translate to English' }).click();
  await expect(frame.locator('local-chat-translation .text')).toHaveText('Hello <script>world</script>!');
  assert.equal(await isolated('translationCalls'), 1);
  assert.equal(requests.length, 2);
});


test('cancellation and settings changes discard pending results', async t => {
  const { page, isolated } = await launch(t);
  await isolated(mock + `Translator.create = async () => ({
    translate: () => new Promise(resolve => { globalThis.completeTranslation = resolve; }), destroy() {}
  });`);
  await page.getByRole('button', { name: 'Translate to English' }).click();
  await expect.poll(() => isolated('typeof completeTranslation')).toBe('function');
  await page.getByRole('button', { name: 'Cancel translation' }).click();
  await isolated("completeTranslation('Obsolete translation')");
  await expect(page.locator('local-chat-translation .text')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Translate to English' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Translate to English' }).click();
  await isolated("chrome.storage.local.set({targetLanguage: 'vi'})");
  await expect(page.getByRole('button', { name: 'Translate to Vietnamese' })).toHaveCount(1);
  await isolated("completeTranslation('Wrong target language')");
  await expect(page.locator('local-chat-translation .text')).toBeEmpty();
});

test('controls survive recycled markup without duplicates or rewriting original text', async t => {
  const { page } = await launch(t);
  await expect(page.locator('local-chat-translation')).toHaveCount(1);
  await page.evaluate(() => {
    document.querySelector('local-chat-translation').remove();
  });
  await expect(page.locator('local-chat-translation')).toHaveCount(1);
  await page.evaluate(() => {
    const section = document.createElement('section');
    section.dataset.messageId = 'moved';
    document.body.append(section);
    section.append(document.querySelector('[jsname="bgckF"]'));
  });
  await expect(page.locator('[data-message-id="moved"] local-chat-translation')).toHaveCount(1);
  await expect(page.locator('local-chat-translation')).toHaveCount(1);
  await page.evaluate(() => { document.querySelector('[data-message-id="moved"]').remove(); });
  await expect(page.locator('local-chat-translation')).toHaveCount(0);
});

test('shared UI mounts under Google Chat Trusted Types policy', async t => {
  const { build } = await import('esbuild');
  const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('https://chat.google.com/', route => route.fulfill({
    contentType: 'text/html', headers: { 'Content-Security-Policy': "require-trusted-types-for 'script'" }, body: markup,
  }));
  await page.goto('https://chat.google.com/');
  const bundle = await build({
    stdin: { contents: `import { mountChat } from './extension/src/chat.js';
      mountChat({document, location, initialSettings:{enabled:true, targetLanguage:'en', sourceLanguage:'auto'}});`, resolveDir: process.cwd() },
    bundle: true, format: 'iife', write: false,
  });
  await page.evaluate(bundle.outputFiles[0].text);
  await expect(page.getByRole('button', { name: 'Translate to English' })).toHaveCount(1);
  await expect(page.locator('[jsname="bgckF"]')).toHaveText('Bonjour tout le monde !');
});
