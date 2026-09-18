import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage, friendlyError } from '../extension/src/translator.js';
const settings = { sourceLanguage: 'auto', targetLanguage: 'en' };
function fake({ state = 'available', detectedLanguage = 'fr', confidence = 0.99, fail = false } = {}) {
  const calls = [];
  const environment = { navigator: { userActivation: { isActive: true } } };
  for (const name of ['LanguageDetector', 'Translator']) {
    environment[name] = {
      async availability(options) { calls.push([name, 'availability', options]); return state; },
      async create(options) {
        calls.push([name, 'create', options]);
        options.monitor({ addEventListener(type, handler) { handler({ loaded: 0.5 }); } });
        return {
          async detect(text) { calls.push(['detect', text]); return [{ detectedLanguage, confidence }]; },
          async translate(text) { calls.push(['translate', text]); if (fail) throw new Error('private text'); return 'Hello'; },
          destroy() { calls.push([name, 'destroy']); },
        };
      },
    };
  }
  return { environment, calls };
}

test('detects and translates locally, with progress and resource cleanup', async () => {
  const { environment, calls } = fake({ state: 'downloadable' });
  const progress = [];
  assert.deepEqual(await translateMessage('Bonjour', settings, { environment, report: text => progress.push(text) }),
    { text: 'Hello', sourceLanguage: 'fr', unchanged: false });
  assert.ok(progress.includes('Downloading translation model… 50%'));
  assert.equal(calls.find(c => c[0] === 'Translator' && c[1] === 'create')[2].sourceLanguage, 'fr');
  assert.deepEqual(calls.filter(c => c[1] === 'destroy'), [['LanguageDetector', 'destroy'], ['Translator', 'destroy']]);
});

test('supports downloading models and an explicit source without detection', async () => {
  const { environment, calls } = fake({ state: 'downloading' });
  await translateMessage('Bonjour', { ...settings, sourceLanguage: 'fr' }, { environment });
  assert.ok(!calls.some(c => c[0] === 'LanguageDetector'));
});

test('same language avoids translation and ambiguous detection asks for a source', async () => {
  const same = fake({ detectedLanguage: 'en' });
  assert.equal((await translateMessage('Hello', settings, same)).unchanged, true);
  assert.ok(!same.calls.some(c => c[0] === 'Translator'));
  await assert.rejects(translateMessage('x', settings, fake({ confidence: 0.2 })), /language is unclear/);
});

test('missing APIs, unavailable models, and lost activation have actionable errors', async () => {
  await assert.rejects(translateMessage('Hi', settings, { environment: {} }), /desktop Chrome/);
  await assert.rejects(translateMessage('Hi', settings, fake({ state: 'unavailable' })), /unavailable/);
  const inactive = fake({ state: 'downloadable' });
  inactive.environment.navigator.userActivation.isActive = false;
  await assert.rejects(translateMessage('Hi', settings, inactive), /Click Retry/);
  assert.ok(!inactive.calls.some(c => c[1] === 'create'));
});

test('cleans resources after failures without including private errors in UI', async () => {
  const setup = fake({ fail: true });
  await assert.rejects(translateMessage('Bonjour', settings, setup), /private text/);
  assert.equal(setup.calls.filter(c => c[1] === 'destroy').length, 2);
  assert.ok(!friendlyError(new Error('private text')).includes('private text'));
});

test('cancellation prevents subsequent model calls', async () => {
  const setup = fake();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(translateMessage('Bonjour', settings, { ...setup, signal: controller.signal }), { name: 'AbortError' });
  assert.equal(setup.calls.length, 0);
});
