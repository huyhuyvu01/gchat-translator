export const languages = {
  ar: 'Arabic', bn: 'Bengali', bg: 'Bulgarian', zh: 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)', hr: 'Croatian', cs: 'Czech', da: 'Danish',
  nl: 'Dutch', en: 'English', fi: 'Finnish', fr: 'French', de: 'German', el: 'Greek',
  he: 'Hebrew', hi: 'Hindi', hu: 'Hungarian', id: 'Indonesian', it: 'Italian',
  ja: 'Japanese', kn: 'Kannada', ko: 'Korean', lt: 'Lithuanian', mr: 'Marathi',
  no: 'Norwegian', pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', ru: 'Russian',
  sk: 'Slovak', sl: 'Slovenian', es: 'Spanish', sv: 'Swedish', ta: 'Tamil',
  te: 'Telugu', th: 'Thai', tr: 'Turkish', uk: 'Ukrainian', vi: 'Vietnamese',
};

export const defaults = { enabled: true, targetLanguage: 'en', sourceLanguage: 'auto' };
export function preferences(value = {}) {
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
    targetLanguage: Object.hasOwn(languages, value.targetLanguage) ? value.targetLanguage : defaults.targetLanguage,
    sourceLanguage: Object.hasOwn(languages, value.sourceLanguage) ? value.sourceLanguage : 'auto',
  };
}
