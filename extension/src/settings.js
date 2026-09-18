import { defaults, languages, preferences } from './preferences.js';

const fields = Object.fromEntries(Object.keys(defaults).map(key => [key, document.getElementById(key)]));
const status = document.getElementById('status');
const theme = document.getElementById('theme');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let chosenTheme = localStorage.getItem('theme');
function applyTheme() {
  const dark = chosenTheme === 'dark' || (chosenTheme !== 'light' && systemTheme.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  theme.setAttribute('aria-pressed', String(dark));
  theme.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
}
applyTheme();
systemTheme.addEventListener('change', applyTheme);
theme.addEventListener('click', () => {
  chosenTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', chosenTheme);
  applyTheme();
});
for (const [code, name] of Object.entries(languages)) {
  for (const field of [fields.targetLanguage, fields.sourceLanguage]) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    field.append(option);
  }
}
async function load() {
try {
  const saved = preferences(await chrome.storage.local.get(defaults));
  fields.enabled.checked = saved.enabled;
  fields.targetLanguage.value = saved.targetLanguage;
  fields.sourceLanguage.value = saved.sourceLanguage;
  document.querySelector('fieldset').disabled = false;
} catch {
  status.textContent = 'Settings could not be loaded. Reopen the extension and retry.';
}
}
load();
document.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await chrome.storage.local.set(preferences({
      enabled: fields.enabled.checked,
      targetLanguage: fields.targetLanguage.value,
      sourceLanguage: fields.sourceLanguage.value,
    }));
    status.textContent = 'Saved. Open Chat pages are up to date.';
  } catch {
    status.textContent = 'Settings could not be saved. Reopen the extension and retry.';
  }
});
