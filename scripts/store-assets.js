import { chromium } from '@playwright/test';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const output = path.resolve('artifacts/store');
const extension = path.resolve('dist/extension');
const profile = await mkdtemp(path.join(tmpdir(), 'gchat-store-'));
await mkdir(output, { recursive: true });
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    viewport: { width: 800, height: 500 }, deviceScaleFactor: 1.6,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-sandbox'],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`chrome-extension://${id}/settings.html`);
    await page.locator('fieldset:not([disabled])').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, `settings-${theme}.png`) });
  }
  await cp(path.join(extension, 'icons/icon-128.png'), path.join(output, 'icon-128.png'));

  // Render the existing vector logo at the store's required promotional size.
  // Screenshots above use the installed extension, with no substituted API data.
  const icon = await readFile('extension/icons/translate.svg', 'utf8');
  await page.setViewportSize({ width: 440, height: 280 });
  await page.goto('about:blank');
  await page.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 440px; height: 280px; background: #edf2ff;
      color: #202b3c; font-family: Arial, sans-serif; display: grid; place-content: center;
      text-align: center; border: 1px solid #d7e1fb; }
    svg { width: 88px; height: 88px; margin: 0 auto 20px; }
    h1 { font-size: 28px; letter-spacing: -.7px; margin: 0 0 10px; }
    p { font-size: 16px; color: #52627c; margin: 0; }
  </style></head><body>${icon}<h1>GChat Translator</h1><p>Translate messages on your device.</p></body></html>`);
  await page.screenshot({ path: path.join(output, 'promo-440x280.png'), scale: 'css' });
  console.log(`Store images: ${path.relative(process.cwd(), output)}`);
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
