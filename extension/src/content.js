import { registerTopFrame, translateInTopFrame } from './frame-translation.js';
import { mountChat } from './chat.js';
import { defaults, preferences } from './preferences.js';

let settings = { ...defaults };
let chat;
if (window === window.top) registerTopFrame(() => settings);
const changed = (changes, area) => {
  if (area !== 'local') return;
  for (const key of Object.keys(defaults)) {
    if (key in changes) settings[key] = changes[key].newValue ?? defaults[key];
  }
  settings = preferences(settings);
  chat?.updateSettings(settings);
};
chrome.storage.onChanged.addListener(changed);
// Read after subscribing, so a concurrent settings change is not missed.
chrome.storage.local.get(defaults).then(value => {
  settings = preferences(value);
  chat = mountChat({ document, location, initialSettings: settings,
    ...(window !== window.top ? { translate: translateInTopFrame } : {}),
  });
}).catch(() => {
  // An extension reload can invalidate existing content scripts. Reloading Chat
  // restores them; do not expose internal errors or message text in the console.
});
