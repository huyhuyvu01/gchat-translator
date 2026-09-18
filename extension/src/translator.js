export class TranslationError extends Error {}

export function friendlyError(error) {
  if (error instanceof TranslationError) return error.message;
  if (error?.name === 'NotAllowedError') {
    return 'Chrome needs another click to start the model. Click Retry. If this keeps happening in Gmail, open chat.google.com.';
  }
  if (error?.name === 'NotSupportedError') return 'Chrome cannot translate this language pair on this device. Choose another language in settings.';
  if (error?.name === 'SecurityError') return 'Chrome blocked local translation in this frame. Open this conversation at chat.google.com.';
  if (error?.name === 'QuotaExceededError') return 'This message is too long for Chrome to translate. Try a shorter message.';
  if (error?.name === 'TimeoutError') return 'The model took too long to respond. Check your connection for model downloads, then retry.';
  return 'Local translation failed. Check that Chrome can download its language models, then retry.';
}

async function createModel(api, options, label, report, signal, environment) {
  signal?.throwIfAborted();
  const state = await api.availability(options);
  signal?.throwIfAborted();
  if (state === 'unavailable') throw new TranslationError(`${label} is unavailable on this device or for these languages. Check Chrome settings or choose another language.`);
  if (!['available', 'downloadable', 'downloading'].includes(state)) {
    throw new TranslationError('Chrome returned an unknown model state. Update Chrome and retry.');
  }
  if (state !== 'available' && environment.navigator?.userActivation?.isActive === false) {
    throw new TranslationError('The language model is ready to be requested. Click Retry to allow Chrome to download it.');
  }
  report(state === 'available' ? `Preparing ${label.toLowerCase()}…` : `Downloading ${label.toLowerCase()}…`);
  return api.create({
    ...options, signal,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', event => {
        if (!signal?.aborted) report(`Downloading ${label.toLowerCase()}… ${Math.round(event.loaded * 100)}%`);
      });
    },
  });
}

// Resources belong to a single request. Chrome retains downloaded models, while
// destroy() releases request resources even after errors or cancelled UI work.
export async function translateMessage(text, settings, { environment = globalThis, report = () => {}, signal } = {}) {
  if (!text.trim()) throw new TranslationError('This message has no text to translate.');
  if (!environment.Translator) throw new TranslationError('Local translation requires desktop Chrome 138 or newer with the Translator API enabled.');
  let detector;
  let translator;
  try {
    let sourceLanguage = settings.sourceLanguage;
    if (sourceLanguage === 'auto') {
      if (!environment.LanguageDetector) throw new TranslationError('Chrome’s Language Detector API is unavailable. Choose the message language in extension settings.');
      detector = await createModel(environment.LanguageDetector, {}, 'Language detector', report, signal, environment);
      signal?.throwIfAborted();
      report('Detecting language…');
      const [best] = await detector.detect(text, { signal });
      if (!best || best.detectedLanguage === 'und' || !(best.confidence >= 0.5)) {
        throw new TranslationError('The message language is unclear. Choose the message language in extension settings, then retry.');
      }
      sourceLanguage = best.detectedLanguage;
    }
    signal?.throwIfAborted();
    if (sourceLanguage === settings.targetLanguage) return { text, sourceLanguage, unchanged: true };
    translator = await createModel(environment.Translator,
      { sourceLanguage, targetLanguage: settings.targetLanguage }, 'Translation model', report, signal, environment);
    signal?.throwIfAborted();
    report('Translating locally…');
    const translated = await translator.translate(text, { signal });
    signal?.throwIfAborted();
    if (!translated.trim()) throw new TranslationError('Chrome returned an empty translation. Click Retry.');
    return { text: translated, sourceLanguage, unchanged: false };
  } finally {
    detector?.destroy();
    translator?.destroy();
  }
}
