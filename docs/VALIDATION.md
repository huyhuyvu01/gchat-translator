# Validation results

Date: 2026-09-18. Build version: 0.1.0.

## Automated checks

- Node.js 24.13.1 on Linux.
- Ten core tests passed with `npm test`.
- Seven installed-extension tests passed with `npm run test:browser` in Chrome for Testing 153.0.8010.12.
- The browser tests cover inline results, original HTML preservation, HTML-safe output, show/hide without retranslating, new and edited messages, reused DOM, cancellation, target changes, local settings, disabled controls, Gmail routing, errors, and cross-origin Chat iframe routing.
- A native French-to-English smoke check with synthetic text reached `Translator.create()` but did not complete or report download progress within 60 seconds in this headless environment. This is not a successful real-model translation check.
- Native `Translator` and `LanguageDetector` are exposed in the isolated content-script world. Native French-to-English availability reported `downloadable`.
- A real cross-origin frame reported Translator permission denied. The installed extension still completed translation through its top-frame relay using the controlled API double.
- The successful translation tests use API doubles and synthetic markup. They do not establish native model quality or compatibility with current production Chat markup.
- `npm run package` produced byte-identical ZIP files on two consecutive builds, checked with `cmp`.
- The runtime has no third-party JavaScript dependencies and no network request code. Browser fixture request capture showed only the expected page/frame navigations.
- Only the `storage` permission is declared. Local storage contained only the enabled and language settings after browser tests.

## Live session

The account owner authorized testing existing conversations but prohibited sending messages. A signed-in Chat home page was available in the shared browser. An existing conversation was opened. No messages were sent, edited, or deleted.

The shared browser connection dropped during the next API availability check and subsequently reported that no preview automation host was available. The account owner is reconnecting the preview. Live translation, current message selectors, and real Gmail Chat remain pending until the connection is restored and those checks pass.

This report must not be described as a complete manual acceptance pass. Use [the checklist](MANUAL_TESTING.md) to record the remaining results. Do not include live conversation content or identifiers in this file.
