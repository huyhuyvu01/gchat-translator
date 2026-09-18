import { actionTag, controlTag, extractMessage, findMessageAction, findMessages, isChatLocation, messageContainerSelector } from './messages.js';
import { languages, preferences } from './preferences.js';
import { friendlyError, translateMessage } from './translator.js';

const buttonStyle = `
  button { display: inline-flex; align-items: center; justify-content: center; flex: none;
    width: 32px; height: 32px; padding: 6px; border: 0; border-radius: 50%;
    background: transparent; color: inherit; cursor: pointer; box-sizing: border-box; }
  button:hover, button[aria-expanded="true"] { background: color-mix(in srgb, currentColor 10%, transparent); }
  button:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
  svg { width: 20px; height: 20px; fill: currentColor; pointer-events: none; }
  [hidden] { display: none !important; }
`;
const style = `
  :host { display: block; color: inherit; font: inherit; }
  ${buttonStyle}
  .panel { color: inherit; font: inherit; text-align: start; margin-top: 6px;
    --card-background: color-mix(in srgb, currentColor 6%, transparent); }
  .drawer { display: grid; grid-template-rows: 0fr; overflow: hidden;
    border-radius: 0 12px 12px 0; background: var(--card-background);
    transition: grid-template-rows 220ms ease; }
  .panel[data-expanded="true"] .drawer { grid-template-rows: 1fr; }
  .result { min-height: 0; overflow: hidden; visibility: hidden;
    transition: visibility 220ms; }
  .panel[data-expanded="true"] .result { visibility: visible; }
  .card { padding: 10px 12px; transform: translateY(-100%); opacity: 0;
    transition: transform 220ms ease, opacity 220ms ease; }
  .panel[data-expanded="true"] .card { transform: translateY(0); opacity: 1; }
  .tab { width: auto; max-width: 100%; height: auto; min-height: 30px; gap: 8px;
    padding: 6px 10px; border-radius: 0 0 12px 12px;
    background: var(--card-background); font: 11px/1.4 system-ui, sans-serif; text-align: start; }
  .tab[aria-expanded="true"] { background: var(--card-background); }
  .tab:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
  .label { opacity: .8; }
  .tab svg { width: 16px; height: 16px; flex: none; transition: transform 220ms ease; }
  .tab[aria-expanded="true"] svg { transform: rotate(180deg); }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
  .status { display: block; font: 12px/1.5 system-ui, sans-serif; opacity: .8; margin-top: 4px; }
  .status:empty { display: none; }
  .skeleton { padding: 6px 0; min-width: 120px; }
  .line { display: block; height: .8em; margin: .35em 0 .65em; border-radius: 4px;
    background: currentColor; opacity: .12; animation: translation-pulse 1.4s ease-in-out infinite; }
  .line:last-child { width: 64%; animation-delay: .15s; }
  @keyframes translation-pulse { 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) {
    .line { animation: none; }
    .drawer, .result, .card, .tab svg { transition: none; }
  }
`;
const translateIcon = 'm12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17A15.65 15.65 0 0 1 9 11.35 15.65 15.65 0 0 1 6.69 8h-2a17.6 17.6 0 0 0 2.98 4.56L2.58 17.58 4 19l5-5 3.11 3.11.76-2.04ZM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12Zm-2.62 7 1.62-4.33L19.12 17h-3.24Z';
const chevronIcon = 'm7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6Z';

export function mountChat({ document, location, initialSettings, translate = translateMessage }) {
  let settings = preferences(initialSettings);
  const records = new Map();
  let timer;
  let stopped = false;
  const pending = new Set();
  const window = document.defaultView;
  const active = () => settings.enabled && isChatLocation(location);
  const create = (tag, attributes = {}) => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  };
  const iconButton = (path, attributes = {}) => {
    const button = create('button', { type: 'button', ...attributes });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const shape = document.createElementNS(svg.namespaceURI, 'path');
    shape.setAttribute('d', path);
    svg.append(shape);
    button.append(svg);
    return button;
  };
  const nameButton = (button, name) => {
    button.setAttribute('aria-label', name);
    button.title = name;
  };

  function sync(body, record) {
    const anchor = findMessageAction(body);
    if (anchor) {
      if (anchor.nextElementSibling !== record.action) anchor.after(record.action);
    } else record.action.remove();
    // The message can set its own color rather than inheriting from its parent.
    // Read it again after theme changes, including app themes unlike the OS theme.
    const computed = window.getComputedStyle(body);
    for (const property of ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing']) {
      const value = computed.getPropertyValue(property);
      if (record.host.style.getPropertyValue(property) !== value) record.host.style.setProperty(property, value);
    }
    if (anchor) {
      const button = anchor.matches('button, [role="button"]') ? anchor : anchor.querySelector('button, [role="button"]');
      record.action.style.color = window.getComputedStyle(button || anchor).color;
    }
  }

  function remove(body, record) {
    record.request?.abort();
    record.action.remove();
    record.host.remove();
    records.delete(body);
  }

  function add(body, text) {
    const host = create(controlTag, { translate: 'no' });
    const shadow = host.attachShadow({ mode: 'open' });
    const sheet = create('style');
    sheet.textContent = style;
    const panel = create('div', { class: 'panel', hidden: '', 'data-expanded': 'false' });
    const status = create('span', { class: 'status', role: 'status', 'aria-live': 'polite' });
    const drawer = create('div', { class: 'drawer' });
    const result = create('div', { class: 'result', id: 'translation', inert: '', 'aria-busy': 'false' });
    const card = create('div', { class: 'card' });
    const label = create('span', { class: 'label' });
    const tab = iconButton(chevronIcon, { class: 'tab', 'aria-controls': 'translation', 'aria-expanded': 'false' });
    nameButton(tab, 'Show translation');
    tab.prepend(label);
    const output = create('div', { class: 'text', dir: 'auto' });
    const skeleton = create('div', { class: 'skeleton', hidden: '', 'aria-hidden': 'true' });
    skeleton.append(create('span', { class: 'line' }), create('span', { class: 'line' }));
    card.append(skeleton, output, status);
    result.append(card);
    drawer.append(result);
    panel.append(drawer, tab);
    shadow.append(sheet, panel);

    const action = create(actionTag, { translate: 'no' });
    const actionShadow = action.attachShadow({ mode: 'open' });
    const actionSheet = create('style');
    actionSheet.textContent = `:host { display: inline-flex; align-items: center; align-self: center; flex: none; } ${buttonStyle}`;
    const button = iconButton(translateIcon, { 'aria-expanded': 'false' });
    actionShadow.append(actionSheet, button);
    const record = { host, action, text, container: body.closest(messageContainerSelector),
      identity: body.closest('[data-message-id]')?.getAttribute('data-message-id'), request: null };
    records.set(body, record);
    const idle = () => nameButton(button, `Translate to ${languages[settings.targetLanguage]}`);
    idle();
    const busy = value => {
      skeleton.hidden = !value;
      result.setAttribute('aria-busy', String(value));
    };
    const expanded = () => panel.dataset.expanded === 'true';
    const setExpanded = value => {
      panel.dataset.expanded = String(value);
      result.inert = !value;
      const name = value ? 'Hide translation' : 'Show translation';
      nameButton(tab, name);
      tab.setAttribute('aria-expanded', String(value));
      button.setAttribute('aria-expanded', String(value));
      nameButton(button, record.request ? 'Cancel translation' : output.textContent ? name : 'Retry translation');
    };
    const cancel = () => {
      record.request.abort();
      record.request = null;
      busy(false);
      setExpanded(false);
      panel.hidden = true;
      status.textContent = '';
      idle();
    };
    // Keep clicks and keyboard activation away from Chat's own action handlers.
    for (const element of [host, action]) {
      for (const type of ['click', 'mousedown', 'pointerdown', 'keydown', 'keyup']) {
        element.addEventListener(type, event => event.stopPropagation());
      }
    }
    tab.addEventListener('click', event => {
      if (!event.isTrusted) return;
      setExpanded(!expanded());
    });
    button.addEventListener('click', async event => {
      if (!event.isTrusted) return;
      if (record.request) { cancel(); return; }
      if (output.textContent) { sync(body, record); setExpanded(!expanded()); return; }
      const currentText = extractMessage(body);
      if (currentText !== record.text) { reconcile([body]); return; }
      const request = new AbortController();
      record.request = request;
      const timeout = setTimeout(() => request.abort(new DOMException('Timed out', 'TimeoutError')), 180_000);
      const current = () => records.get(body) === record && record.request === request && body.isConnected && active();
      sync(body, record);
      label.textContent = `Translating to ${languages[settings.targetLanguage]}`;
      label.removeAttribute('title');
      panel.hidden = false;
      // Establish the collapsed size before the first opening transition.
      drawer.getBoundingClientRect();
      setExpanded(true);
      busy(true);
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
          `${languages[translated.sourceLanguage] || translated.sourceLanguage} → ${languages[settings.targetLanguage]}`;
        label.title = 'On-device translation';
        status.textContent = '';
      } catch (error) {
        if (!current()) return;
        label.textContent = 'Translation unavailable';
        status.textContent = friendlyError(request.signal.aborted ? request.signal.reason : error);
      } finally {
        clearTimeout(timeout);
        if (record.request === request) {
          record.request = null;
          busy(false);
          setExpanded(expanded());
        }
      }
    });
    body.after(host);
    sync(body, record);
  }

  function reconcile(roots) {
    if (stopped) return;
    for (const [body, record] of records) {
      if (!active() || !body.isConnected || !record.host.isConnected || record.host.previousElementSibling !== body ||
        record.container !== body.closest(messageContainerSelector) ||
        record.identity !== body.closest('[data-message-id]')?.getAttribute('data-message-id') ||
        extractMessage(body) !== record.text) {
        remove(body, record);
        if (body.isConnected) roots.push(body.parentElement || body);
      } else sync(body, record);
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
      if (target?.closest(`${controlTag}, ${actionTag}`)) continue;
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
    attributeFilter: ['jsname', 'class', 'style', 'data-theme', 'data-message-id', 'contenteditable', 'hidden', 'aria-hidden'],
  });
  const routeChanged = () => reconcile([document]);
  const themeChanged = () => { for (const [body, record] of records) sync(body, record); };
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', themeChanged);
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
      scheme.removeEventListener('change', themeChanged);
      window.removeEventListener('hashchange', routeChanged);
      window.removeEventListener('popstate', routeChanged);
      for (const [body, record] of records) remove(body, record);
    },
  };
}
