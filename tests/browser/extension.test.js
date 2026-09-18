import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const markup = `<!doctype html><html><head><title>Chat fixture</title></head><body>
  <h1>Chat fixture</h1><section data-message-id="first"><span>Ada · 10:42</span>
    <div jsname="bgckF">Bonjour <b>tout le monde</b> !</div><div role="toolbar" aria-label="Message actions"><button aria-label="Add reaction">☺</button><button aria-label="Reply">↩</button><button aria-label="More options">⋮</button></div></section>
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
  await page.locator('local-chat-translation').getByRole('button', { name: 'Hide translation' }).click();
  await expect(page.locator('local-chat-translation .result')).toBeHidden();
  await page.locator('local-chat-translation').getByRole('button', { name: 'Show translation' }).click();
  assert.equal(await isolated('translationCalls'), 1);
  await page.evaluate(() => {
    document.querySelector('[jsname="bgckF"]').firstChild.textContent = 'Bonsoir ';
    const section = document.createElement('section');
    section.setAttribute('data-message-id', 'second');
    section.innerHTML = '<div class="DTp27d">Hola a todos</div><div role="toolbar"><button aria-label="Add reaction">☺</button></div>';
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

test('settings keep the chosen theme across reopening and collapse help by default', async t => {
  const { context, isolated } = await launch(t);
  const id = await isolated('chrome.runtime.id');
  let settings = await context.newPage();
  await settings.setViewportSize({ width: 344, height: 640 });
  await settings.emulateMedia({ colorScheme: 'dark' });
  await settings.goto(`chrome-extension://${id}/settings.html`);
  const theme = settings.getByRole('button', { name: 'Dark mode' });
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  await expect(settings.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(settings.getByRole('link', { name: 'Privacy policy' })).toBeHidden();
  await theme.click();
  await expect(settings.locator('html')).toHaveCSS('color-scheme', 'light');
  await settings.getByLabel('Translate into').selectOption('ja');
  await settings.getByRole('button', { name: 'Save settings' }).click();
  await expect(settings.getByRole('status')).toContainText('Saved.');
  // Native disclosure supports keyboard access without adding custom state.
  await settings.locator('summary').focus();
  await settings.keyboard.press('Enter');
  await expect(settings.getByRole('link', { name: 'Privacy policy' })).toBeVisible();
  await settings.keyboard.press('Space');
  await expect(settings.getByRole('link', { name: 'Privacy policy' })).toBeHidden();
  await settings.close();
  settings = await context.newPage();
  await settings.emulateMedia({ colorScheme: 'dark' });
  await settings.goto(`chrome-extension://${id}/settings.html`);
  await expect(settings.locator('html')).toHaveCSS('color-scheme', 'light');
  await expect(settings.getByLabel('Translate into')).toHaveValue('ja');
  await expect(settings.getByRole('link', { name: 'Privacy policy' })).toBeHidden();
  await settings.getByRole('button', { name: 'Dark mode' }).click();
  await settings.reload();
  await expect(settings.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(settings.getByRole('status')).toBeEmpty();
  for (const width of [320, 344]) {
    await settings.setViewportSize({ width, height: 640 });
    assert.equal(await settings.evaluate(() => document.documentElement.scrollWidth), width);
    assert.ok((await settings.locator('main').boundingBox()).height < 400);
  }
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

const themedMarkup = markup.replace('</head>', `<style>
  body { background: #f1f3f4; color: #202124; font: 14px/1.5 Arial; }
  section { position: relative; margin: 60px 20px; width: 540px; padding: 16px; background: #dde2e7; border-radius: 16px; }
  [jsname="bgckF"] { color: #303134; }
  body.dark { background: #202124; color: #e8eaed; }
  body.dark section { background: #35383c; }
  body.dark [jsname="bgckF"] { color: #e3e3e3; }
  [role="toolbar"] { display: flex; position: absolute; right: 8px; top: -20px; background: inherit; border-radius: 20px; visibility: hidden; }
  section:hover [role="toolbar"], section:focus-within [role="toolbar"] { visibility: visible; }
  [role="toolbar"] button { color: inherit; background: transparent; border: 0; width: 32px; height: 32px; }
</style></head>`);

test('translate icon joins hover actions and survives toolbar replacement', async t => {
  const { page, isolated } = await launch(t, undefined, () => themedMarkup);
  const toolbar = page.getByRole('toolbar', { includeHidden: true });
  const translate = toolbar.getByRole('button', { name: 'Translate to English', includeHidden: true });
  await expect(translate).toHaveCount(1);
  await expect(translate).toBeHidden();
  await page.locator('section').hover();
  await expect(translate).toBeVisible();
  assert.equal(await translate.textContent(), '');
  assert.equal(await page.locator('[aria-label="Add reaction"]').evaluate(el => el.nextElementSibling?.localName), 'local-chat-action');
  await isolated(mock);
  await translate.click();
  await expect(page.locator('local-chat-translation .text')).toContainText('Hello');
  const tab = page.locator('local-chat-translation').getByRole('button', { name: 'Hide translation' });
  await expect(tab).toHaveText('French → English');
  await tab.click();
  await expect(page.locator('local-chat-translation .result')).toBeHidden();
  await page.evaluate(() => {
    const toolbar = document.querySelector('[role="toolbar"]');
    const replacement = toolbar.cloneNode(true);
    replacement.querySelector('local-chat-action').remove();
    toolbar.replaceWith(replacement);
  });
  await page.locator('section').hover();
  await page.getByRole('toolbar').getByRole('button', { name: 'Show translation' }).click();
  await expect(page.locator('local-chat-translation .text')).toBeVisible();
  assert.equal(await isolated('translationCalls'), 1);
});

test('translated text follows message colors even when the system theme differs', async t => {
  const { page, isolated } = await launch(t, undefined, () => themedMarkup);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.locator('section').hover();
  await isolated(mock);
  await page.getByRole('button', { name: 'Translate to English' }).click();
  const output = page.locator('local-chat-translation .text');
  await expect(output).toBeVisible();
  await expect(output).toHaveCSS('color', 'rgb(48, 49, 52)');
  await page.evaluate(() => document.body.classList.add('dark'));
  await expect(output).toHaveCSS('color', 'rgb(227, 227, 227)');
  await page.evaluate(() => document.body.classList.remove('dark'));
  await expect(output).toHaveCSS('color', 'rgb(48, 49, 52)');
});

test('pending translation shows an animated skeleton and clears it on cancellation and error', async t => {
  const { page, isolated } = await launch(t);
  await isolated(mock + `Translator.create = async () => ({
    translate: () => new Promise(resolve => { globalThis.completeTranslation = resolve; }), destroy() {}
  });`);
  await page.getByRole('button', { name: 'Translate to English' }).click();
  const skeleton = page.locator('local-chat-translation .skeleton');
  await expect(skeleton).toBeVisible();
  await expect(page.locator('local-chat-translation .result')).toHaveAttribute('aria-busy', 'true');
  assert.ok(await skeleton.evaluate(el => el.getAnimations({ subtree: true }).length > 0));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await skeleton.evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  await page.getByRole('button', { name: 'Cancel translation', exact: true }).first().click();
  await expect(skeleton).toBeHidden();
  await isolated(mock + "Translator.availability = async () => 'unavailable';");
  await page.getByRole('button', { name: 'Translate to English' }).click();
  await expect(page.locator('local-chat-translation .status')).toContainText('unavailable');
  await expect(skeleton).toBeHidden();
});

test('lazy live Chat toolbar gets one icon, outside reaction strips, with keyboard activation', async t => {
  const fixture = markup.replace('data-message-id="first"', 'jsname="Ne3sFf"')
    .replace(/<div role="toolbar".*?<\/div>/, '<div role="list"><button jsname="JlEEbd" aria-label="Add reaction">☺</button></div>');
  const { page, isolated } = await launch(t, undefined, () => fixture);
  await expect(page.locator('local-chat-translation')).toHaveCount(1);
  await expect(page.locator('local-chat-action')).toHaveCount(0);
  await page.evaluate(() => {
    const toolbar = document.createElement('div');
    toolbar.setAttribute('jsname', 'jpbBj');
    toolbar.innerHTML = '<div class="eWw5ab"><div data-menu-action="1"><div jsname="FUbHCe"><span data-is-tooltip-wrapper><button jsname="JlEEbd" aria-label="Thêm biểu tượng cảm xúc">☺</button></span></div></div><button aria-label="Reply">↩</button></div>';
    document.querySelector('[jsname="bgckF"]').parentElement.append(toolbar);
    globalThis.nativeActionClicks = 0;
    toolbar.addEventListener('click', () => nativeActionClicks++);
  });
  const button = page.getByRole('button', { name: 'Translate to English' });
  await expect(button).toHaveCount(1);
  assert.equal(await page.locator('local-chat-action').evaluate(el => el.previousElementSibling.getAttribute('data-menu-action')), '1');
  await isolated(mock);
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('local-chat-translation .text')).toContainText('Hello');
  await expect(page.locator('local-chat-translation .skeleton')).toBeHidden();
  assert.equal(await page.evaluate(() => nativeActionClicks), 0);
  await page.evaluate(() => document.querySelector('[jsname="jpbBj"]').remove());
  await expect(page.locator('local-chat-action')).toHaveCount(0);
  await expect(page.locator('local-chat-translation .text')).toBeVisible();
  await page.locator('local-chat-translation').getByRole('button', { name: 'Hide translation' }).click();
  await expect(page.locator('local-chat-translation .result')).toBeHidden();
});

test('translation drawer slides, stays collapsed on completion, and reopens without the toolbar', async t => {
  const { page, isolated } = await launch(t, undefined, () => themedMarkup);
  await page.locator('section').hover();
  await isolated(mock + `Translator.create = async () => ({
    translate: () => { translationCalls++; return new Promise(resolve => { globalThis.completeTranslation = resolve; }); }, destroy() {}
  });`);
  await page.getByRole('button', { name: 'Translate to English' }).click();
  await expect.poll(() => isolated('typeof completeTranslation')).toBe('function');
  const host = page.locator('local-chat-translation');
  const drawer = host.locator('.drawer');
  const result = host.locator('.result');
  const tab = host.getByRole('button');
  await expect(tab).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => drawer.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.effect.target.className !== 'line').length)).toBe(0);
  const openHeight = (await host.boundingBox()).height;
  await tab.click();
  assert.ok(await drawer.evaluate(el => el.getAnimations().length > 0));
  await expect(result).toBeHidden();
  await expect(tab).toBeVisible();
  await expect(tab).toBeFocused();
  assert.ok((await host.boundingBox()).height < openHeight);
  assert.equal((await drawer.boundingBox()).height, 0);

  await isolated("completeTranslation('Hello from the collapsed drawer')");
  await expect(tab).toHaveText('French → English');
  await expect(result).toBeHidden();
  await page.evaluate(() => document.querySelector('[role="toolbar"]').remove());
  await expect(page.locator('local-chat-action')).toHaveCount(0);
  await tab.press('Enter');
  await expect(host.locator('.text')).toBeVisible();
  await expect(host.locator('.text')).toHaveText('Hello from the collapsed drawer');
  await expect(tab).toHaveAttribute('aria-expanded', 'true');
  // Reverse an in-flight slide, then reopen with Space and reduced motion.
  await tab.press('Enter');
  await tab.press('Enter');
  await expect(result).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tab.press('Space');
  await expect(result).toBeHidden();
  assert.equal((await drawer.boundingBox()).height, 0);
  await tab.press('Space');
  await expect(result).toBeVisible();
  assert.equal(await drawer.evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  assert.equal(await isolated('translationCalls'), 1);
});
