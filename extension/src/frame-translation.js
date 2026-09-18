import { translateMessage, TranslationError, friendlyError } from './translator.js';
import { isChatLocation } from './messages.js';

export function registerTopFrame(getSettings) {
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'chat-translation-top') return;
    const controller = new AbortController();
    let started = false;
    const send = value => { if (!controller.signal.aborted) port.postMessage(value); };
    port.onDisconnect.addListener(() => { void chrome.runtime.lastError; controller.abort(); });
    port.onMessage.addListener(async message => {
      if (message.type === 'ping') { send({ type: 'pong' }); return; }
      if (message.type !== 'translate' || started) return;
      started = true;
      const settings = getSettings();
      try {
        if (!settings.enabled || !isChatLocation(location)) throw new TranslationError('Open Gmail’s Chat view or chat.google.com to translate this message.');
        if (typeof message.text !== 'string') throw new TranslationError('This message has no text to translate.');
        const result = await translateMessage(message.text, settings, {
          signal: controller.signal,
          report: text => send({ type: 'progress', text }),
        });
        send({ type: 'result', result });
      } catch (error) {
        send({ type: 'error', text: friendlyError(error) });
      }
    });
  });
}

export function translateInTopFrame(text, _settings, { signal, report }) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const port = chrome.runtime.connect({ name: 'chat-translation-frame' });
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearInterval(heartbeat);
      signal.removeEventListener('abort', abort);
      port.disconnect();
      if (error) reject(error); else resolve(result);
    };
    const abort = () => finish(signal.reason);
    // Port traffic keeps the MV3 relay alive during a slow model download.
    const heartbeat = setInterval(() => port.postMessage({ type: 'ping' }), 20_000);
    signal.addEventListener('abort', abort, { once: true });
    port.onMessage.addListener(message => {
      if (message.type === 'progress') report(message.text);
      if (message.type === 'result') finish(null, message.result);
      if (message.type === 'error') finish(new TranslationError(message.text));
    });
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      finish(new TranslationError('The local translation connection closed. Reload Chat and retry.'));
    });
    port.postMessage({ type: 'translate', text });
  });
}
