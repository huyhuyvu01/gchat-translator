import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

await rm('dist/extension', { recursive: true, force: true });
await mkdir('dist/extension', { recursive: true });
for (const file of ['manifest.json', 'settings.html', 'settings.css', 'privacy.html']) {
  await cp(`extension/${file}`, `dist/extension/${file}`);
}
await cp('LICENSE', 'dist/extension/LICENSE');
await cp('extension/icons', 'dist/extension/icons', { recursive: true });
await build({
  entryPoints: ['extension/src/content.js', 'extension/src/settings.js', 'extension/src/background.js'],
  outdir: 'dist/extension', bundle: true, format: 'iife', target: 'chrome138',
  legalComments: 'none',
});
