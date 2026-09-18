import { controlTag, extractMessage, findMessages, isChatLocation } from './messages.js';
import { languages, preferences } from './preferences.js';
import { friendlyError, translateMessage } from './translator.js';

const style = `
  :host { display: block; margin: 6px 0; color-scheme: light dark; }
  .panel { font: 13px/1.5 system-ui, sans-serif; color: light-dark(#334155, #e2e8f0); text-align: start; }
  button { font: inherit; color: light-dark(#1456b8, #a8c7fa); background: light-dark(#f3f6fc, #253248);
    border: 1px solid light-dark(#cbd5e1, #64748b); border-radius: 6px; padding: 3px 9px; cursor: pointer; }
  button:hover { background: light-dark(#e3ecfc, #34445e); }
  button:focus-visible { outline: 2px solid light-dark(#1456b8, #a8c7fa); outline-offset: 2px; }
  .status { display: block; margin-top: 4px; }
  .result { border-inline-start: 2px solid light-dark(#94b8ef, #709bd5); margin-top: 6px; padding-inline-start: 10px; }
  .label { font-size: 11px; margin-bottom: 3px; }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
  [hidden] { display: none !important; }
`;

export function mountChat({ document, location, initialSettings, translate = translateMessage }) {
  let settings = preferences(initialSettings);
  const records = new Map();
  let timer;
  let stopped = false;
  const pending = new Set();
  const window = document.defaultView;
  const active = () => settings.enabled && isChatLocation(location);

  function remove(body, record) {
    record.request?.abort();
    record.host.remove();
    records.delete(body);
  }

  function add(body, text) {
    const host = document.createElement(controlTag);
    host.setAttribute('translate', 'no');
    const shadow = host.attachShadow({ mode: 'open' });
    // This template is static. Message text and model output only use textContent.
    shadow.innerHTML = `<style>${style}</style><div class="panel"><button type="button"></button>
      <span class="status" role="status" aria-live="polite"></span>
      <div class="result" id="translation" hidden><div class="label"></div><div class="text" dir="auto"></div></div></div>`;
    const button = shadow.querySelector('button');
    const status = shadow.querySelector('.status');
    const result = shadow.querySelector('.result');
    const label = shadow.querySelector('.label');
    const output = shadow.querySelector('.text');
    const record = { host, text, identity: body.closest('[data-message-id]')?.getAttribute('data-message-id'), request: null };
    records.set(body, record);
    const idle = () => { button.textContent = `Translate to ${languages[settings.targetLanguage]}`; };
    idle();
    button.setAttribute('aria-controls', 'translation');
    button.setAttribute('aria-expanded', 'false');
    host.addEventListener('click', event => event.stopPropagation());
    button.addEventListener('click', async event => {
      // Page scripts cannot trigger a translation without the user's click.
      if (!event.isTrusted) return;
      if (record.request) {
        record.request.abort();
        record.request = null;
        status.textContent = 'Translation cancelled.';
        idle();
        return;
      }
      if (output.textContent) {
        result.hidden = !result.hidden;
        button.textContent = result.hidden ? 'Show translation' : 'Hide translation';
        button.setAttribute('aria-expanded', String(!result.hidden));
        return;
      }
      const currentText = extractMessage(body);
      if (currentText !== record.text) { reconcile([body]); return; }
      const request = new AbortController();
      record.request = request;
      const timeout = setTimeout(() => request.abort(new DOMException('Timed out', 'TimeoutError')), 180_000);
      const current = () => records.get(body) === record && record.request === request && body.isConnected && active();
      button.textContent = 'Cancel translation';
      status.textContent = 'Checking local models…';
      try {
        const translated = await translate(currentText, settings, {
          signal: request.signal,
          report(message) { if (current()) status.textContent = message; },
        });
        if (!current() || extractMessage(body) !== currentText) return;
        output.textContent = translated.text;
        output.lang = settings.targetLanguage;
        label.textContent = translated.unchanged ? `Already in ${languages[settings.targetLanguage]}` :
          `${languages[translated.sourceLanguage] || translated.sourceLanguage} to ${languages[settings.targetLanguage]} · On-device translation`;
        result.hidden = false;
        button.textContent = 'Hide translation';
        button.setAttribute('aria-expanded', 'true');
        status.textContent = '';
      } catch (error) {
        if (!current()) return;
        status.textContent = friendlyError(request.signal.aborted ? request.signal.reason : error);
        button.textContent = 'Retry translation';
      } finally {
        clearTimeout(timeout);
        if (record.request === request) record.request = null;
      }
    });
    body.after(host);
  }

  function reconcile(roots) {
    if (stopped) return;
    for (const [body, record] of records) {
      if (!active() || !body.isConnected || !record.host.isConnected || record.host.previousElementSibling !== body ||
        record.identity !== body.closest('[data-message-id]')?.getAttribute('data-message-id') ||
        extractMessage(body) !== record.text) {
        remove(body, record);
        if (body.isConnected) roots.push(body.parentElement || body);
      }
    }
    if (!active()) return;
    for (const root of roots) {
      if (!root?.isConnected && root !== document) continue;
      for (const body of findMessages(root)) {
        if (!records.has(body)) add(body, extractMessage(body));
      }
    }
  }

  const observer = new window.MutationObserver(mutations => {
    for (const mutation of mutations) {
      const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
      if (target?.closest(controlTag)) continue;
      pending.add(target);
    }
    if (pending.size && !timer) timer = setTimeout(() => {
      timer = null;
      const roots = [...pending];
      pending.clear();
      reconcile(roots);
    }, 60);
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['jsname', 'class', 'data-message-id', 'contenteditable', 'hidden', 'aria-hidden'],
  });
  const routeChanged = () => reconcile([document]);
  window.addEventListener('hashchange', routeChanged);
  window.addEventListener('popstate', routeChanged);
  reconcile([document]);
  return {
    updateSettings(value) {
      const next = preferences(value);
      if (JSON.stringify(next) === JSON.stringify(settings)) return;
      settings = next;
      for (const [body, record] of records) remove(body, record);
      reconcile([document]);
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('hashchange', routeChanged);
      window.removeEventListener('popstate', routeChanged);
      for (const [body, record] of records) remove(body, record);
    },
  };
}
