# Validation results

These records describe checks run on September 18, 2026. Successful automated translations used simulated Chat pages and test substitutes for Chrome's APIs. Real model download and translation in desktop Chrome still need manual testing.

## Chrome Web Store preparation

`npm run check` passed 10 core tests; `npm run test:browser` passed all 14 browser tests. The final ZIP passed integrity, checksum, reproducibility, and built-file comparisons. Store image dimensions and the icon's transparent padding passed inspection. The privacy page rendered with its stylesheet and links at 360px without horizontal overflow. The Pages workflow passed local YAML checks; deployment remains untested until the changes reach `main`.

A native check loaded the packaged extension into a fresh, headed Chrome for Testing 153.0.8010.12 profile on Linux, with background networking and component updates allowed. It used invented French text on a simulated Chat page and the real Translator API, with French selected explicitly. The UI reached "Downloading translation model" but produced no result or download progress within 150 seconds. This did not establish successful native translation, automatic detection, or live Gmail compatibility. The connected preview is Electron 44.1.0, not desktop Google Chrome.

## GChat Translator rename and documentation rewrite

`npm run check` passed 10 core tests and built the renamed extension. `npm run test:browser` passed all 14 browser tests. The rewrite covered the README, contributor and security docs, implementation notes, manual checklist, validation and audit reports, and the extension's help and privacy text. `AGENTS.md` and `CLAUDE.md` stayed unchanged.

The manifest, popup, npm package metadata, CI artifact label, license contributor name, and ZIP filename now use GChat Translator or `gchat-translator`. The extension remains at version 0.1.1. Earlier validation records below retain their original test counts and identify historical archive names.

## Sliding translation card

- `npm run check` passed 10 core tests and built the extension. `npm run test:browser` passed 13 browser tests.
- The card test covered animated collapse, a tab that stays visible, completion while hidden, and reopening without the toolbar or another translation request. It also covered keyboard activation, reversing a slide, and reduced motion.
- Light and dark previews used sample messages. The README image shows the extension UI on simulated Chat markup with a fixed sample translation.

These checks did not validate signed-in Google Chat with native models.

## UI update in version 0.1.1

`npm run check` passed 10 core tests and built the extension. `npm run test:browser` passed 12 browser tests with the installed extension.

New regression tests first failed against version 0.1.0. They caught the missing toolbar icon, pale text when Chat used a light theme and the system used a dark theme, and the missing loading animation. All passed after the update.

The result's fixed palette and `color-scheme: light dark` followed the system theme independently of Chat. Results now copy the original message's computed text style and update when the theme changes.

Browser tests checked icon placement and toolbar replacement, toolbars created on hover with observed live markup, localized reaction labels, and keyboard use. They also checked that translation does not trigger Chat's native actions, plus theme switching, loading animation, reduced motion, cancellation, errors, and cleanup.

### Live UI check

In signed-in standalone Chat, the hover toolbar used `[jsname="jpbBj"] [data-menu-action="1"]`. The reaction strip below the message used different markup. The translation icon appeared immediately after the hover reaction action and measured 32 by 32 pixels.

A temporary bundle in the page's main world used a fixed sample translation to check loading, the result, and the close icon in dark-mode Chat. Result text matched the original at `rgb(227, 227, 227)`. The close icon worked. All injected controls and test references were removed afterward.

No messages were sent, edited, or deleted. No private message text or screenshots were saved in the repository.

This check did not use an installed extension or native translation. Automated tests with the installed extension covered theme mismatch and switching. Real downloads and translation quality still need desktop Chrome testing.

### Package check

Two consecutive runs of `npm run package` produced identical archives that passed ZIP integrity checks. At the time, the archive was named `artifacts/local-chat-translator-0.1.1.zip`. New builds use `artifacts/gchat-translator-0.1.1.zip`.

## Version 0.1.0

### Automated checks

Tests ran on Linux with Node.js 24.13.1. `npm test` passed 10 core tests. `npm run test:browser` passed eight browser tests in Chrome for Testing 153.0.8010.12.

The browser tests covered inline results, preservation of original HTML, output rendered as text, and hiding or showing results without translating again. They also covered new and edited messages, reused DOM nodes, cancellation, target-language changes, local settings, disabled controls, Gmail routing, errors, and cross-origin Chat frames.

Native `Translator` and `LanguageDetector` APIs were available in the isolated content-script world. French-to-English availability returned `downloadable`. A check using invented French text reached `Translator.create()` but neither completed nor reported download progress within 60 seconds in the headless browser. It did not demonstrate successful native translation.

A cross-origin frame reported that Translator permission was denied. The installed extension still translated through its top-frame relay using the API substitute.

Two consecutive packages were byte-identical, checked with `cmp`. The runtime had no third-party JavaScript dependencies or network request code. Browser request capture recorded only expected page and frame navigations. The manifest declared only `storage`, and local storage contained only the enabled and language settings after testing.

### Live session

The account owner authorized translation tests on existing conversations and prohibited sending messages. No messages were sent, edited, or deleted. No conversation text, account identifiers, or screenshots were saved in the repository.

The agent ran on Linux, while the shared preview ran on Windows through T3. Preview status and control calls worked after an earlier disconnect. The cause of the lost host registration remained unknown; the OS split did not itself prevent automation.

The preview reported T3 Code 0.0.42, Electron 44.1.0, and Chromium 152.0.7977.65. The tools could not install an unpacked extension there. Tests instead loaded a temporary bundle of the message, UI, preferences, and translation modules into the page's main world.

In a signed-in standalone Chat conversation:

- Message bodies matched `[jsname="bgckF"]` and `.DTp27d`, with `data-message-id` ancestors.
- Ten message bodies initially received controls. Scrolling loaded more existing messages, and the observer added controls without a reload.
- Original message HTML stayed unchanged, with no duplicate adjacent controls.
- Disabling translation removed controls. Re-enabling it with Vietnamese selected updated button labels.
- Chat's Trusted Types policy rejected the original static HTML template. The controls now use DOM creation methods, and a browser test checks that they mount under that policy.
- A trusted click reached the native translation API but returned an error. No translation appeared.
- Language Detector availability returned `downloadable`, but model creation failed. French-to-English and Vietnamese-to-English Translator availability checks each exceeded a three-second diagnostic deadline.
- The temporary controls and test references were removed afterward.

## Remaining manual checks

Real model downloads and successful translation in desktop Google Chrome remain unverified. So do live Gmail Chat, translation quality, and naturally arriving messages. Automated tests cover Gmail routing and inserted messages.

Use the [manual checklist](MANUAL_TESTING.md) to finish these checks. The results above do not constitute a complete manual acceptance pass.
