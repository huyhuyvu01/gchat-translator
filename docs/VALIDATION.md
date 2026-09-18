# Validation results

## Sliding translation card

Validated 2026-09-18.

- `npm run check` passed all 10 core tests and built the extension. `npm run test:browser` passed all 13 browser tests.
- The drawer test covers animated collapse, a persistent tab, completion while hidden, reopening without the toolbar or another translation request, keyboard activation, reversing a slide, and reduced motion.
- Light and dark previews were checked with sample messages. The README preview renders the actual extension UI against simulated Chat markup, with a fixed sample translation.
- These drawer checks do not replace validation in signed-in Google Chat with native models.

## UI update, version 0.1.1

Validated 2026-09-18.

- `npm run check` passed all 10 core tests and built the extension. `npm run test:browser` passed all 12 installed-extension/browser tests.
- New browser regressions first failed against 0.1.0 for the missing toolbar icon, pale text in a light Chat theme with a dark system theme, and the missing loading skeleton. They pass with the update.
- The color bug came from the result's fixed palette and `color-scheme: light dark`, which followed the system theme independently of Chat. Results now copy the message's computed text style and refresh when the theme changes.
- Browser checks cover toolbar adjacency and replacement, lazy toolbar creation with the observed live Chat markup, localized reaction labels, keyboard activation, no activation of native Chat actions, light/dark theme switching, skeleton animation, reduced motion, cancellation, errors, and cleanup after completion.
- In signed-in standalone Chat, the hover toolbar used `[jsname="jpbBj"] [data-menu-action="1"]`. The reaction strip below the message used different markup. The new icon appeared immediately after the hover reaction action and measured 32 by 32 pixels.
- A temporary main-world bundle with a fixed sample translation verified the skeleton, result, and close icon in live dark-mode Chat. The result color matched the original message at `rgb(227, 227, 227)`. The close icon worked, and all injected UI and test references were removed afterward. No messages were sent, edited, or deleted, and no private message text or screenshots were saved to the repository.
- The live UI check was not an installed-extension or native-model translation check. Light/dark mismatch and theme switching were tested in the installed-extension fixtures. Real model download and translation quality still require desktop Chrome acceptance testing.
- `npm run package` produced `artifacts/local-chat-translator-0.1.1.zip`. Two consecutive builds produced identical bytes, and the archive passed its integrity check.

## Previous validation, version 0.1.0

Date: 2026-09-18. Build version: 0.1.0.

## Automated checks

- Node.js 24.13.1 on Linux.
- Ten core tests passed with `npm test`.
- Eight browser tests passed with `npm run test:browser` in Chrome for Testing 153.0.8010.12.
- The browser tests cover inline results, original HTML preservation, HTML-safe output, show/hide without retranslating, new and edited messages, reused DOM, cancellation, target changes, local settings, disabled controls, Gmail routing, errors, and cross-origin Chat iframe routing.
- A native French-to-English smoke check with synthetic text reached `Translator.create()` but did not complete or report download progress within 60 seconds in this headless environment. This is not a successful real-model translation check.
- Native `Translator` and `LanguageDetector` are exposed in the isolated content-script world. Native French-to-English availability reported `downloadable`.
- A real cross-origin frame reported Translator permission denied. The installed extension still completed translation through its top-frame relay using the controlled API double.
- Successful translation tests use API doubles and synthetic markup. They do not establish native model quality. Current standalone Chat message selectors were also checked in the live session below.
- `npm run package` produced byte-identical ZIP files on two consecutive builds, checked with `cmp`.
- The runtime has no third-party JavaScript dependencies and no network request code. Browser fixture request capture showed only the expected page/frame navigations.
- Only the `storage` permission is declared. Local storage contained only the enabled and language settings after browser tests.

## Live session

The account owner authorized translation tests on existing conversations and prohibited sending messages. No messages were sent, edited, or deleted. No conversation text, account identifiers, or screenshots were stored in the repository.

The agent runs on a Linux server and the shared preview runs on Windows through T3. After an earlier disconnect, preview status and control calls succeeded again. This confirms that the operating-system split itself does not prevent automation. The cause of the earlier lost host registration was not established.

The preview identified itself as T3 Code 0.0.42, Electron 44.1.0, Chromium 152.0.7977.65. The available tools cannot install the unpacked extension into that preview, so these checks used a temporary bundle of the same message, UI, preferences, and translation modules in the page's main world. They are not an installed-extension acceptance pass.

Observed in a signed-in standalone Chat conversation:

- The production message bodies matched `[jsname="bgckF"]` and `.DTp27d`, with `data-message-id` ancestors.
- Initially 10 message bodies received separate controls. Scrolling loaded more existing messages and the observer added controls without reloading.
- Original message HTML stayed unchanged. No duplicate adjacent controls were found.
- Disabling the UI removed controls. Re-enabling with Vietnamese updated button labels.
- Google Chat's Trusted Types policy rejected the original static HTML template in the main-world test. Controls now use DOM creation methods. An automated browser test covers mounting under that policy.
- A trusted translation-button click reached the native API path and produced an error. No translated result was produced.
- Language Detector availability reported `downloadable`, but model creation failed. French-to-English and Vietnamese-to-English Translator availability checks each exceeded a three-second diagnostic deadline in this Electron preview.
- Temporary controls and in-page test references were removed after testing.

## Remaining acceptance checks

Real model download and successful translation in desktop Google Chrome remain unverified. Real Gmail Chat, translation quality, and naturally arriving new messages also remain unverified. Installed-extension fixture tests cover Gmail routing and new-message insertion.

Do not describe this report as a complete manual acceptance pass. Use [the checklist](MANUAL_TESTING.md) for the remaining checks in desktop Chrome.
