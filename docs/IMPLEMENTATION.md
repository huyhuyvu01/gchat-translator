# Implementation status

- [x] Local translation and message extraction, with automated tests.
- [x] Inline controls, message change handling, and settings.
- [x] Browser integration tests and a reproducible ZIP.
- [x] Public docs, privacy policy, license, and CI.
- [x] Publish tested ZIPs and checksums to GitHub Releases after pushes to `main`.
- [ ] Manual validation in signed-in Google Chat and Gmail Chat with real models.

## Translation and message handling

GChat Translator uses the `storage` permission and content scripts limited to Google Chat and Gmail. Message text stays in memory. The extension does not send it to a server or save it.

The translation icon sits beside the reaction action in the message's hover toolbar. Results appear below the message body without changing the original. Text extraction uses known Chat markup and has no fallback that reads arbitrary page text.

Translation and language detection run in isolated content scripts. Browser tests check that the APIs are available there and test cross-origin frame restrictions. Gmail embeds Chat in frames, so content scripts run in matching Chat frames and on Gmail's Chat route.

Chrome blocks its AI APIs in cross-origin frames. An extension port relay passes those translation requests to the same tab's top-frame content script. It supports progress and cancellation without another permission or a network request.

The implementation used these sources, checked on September 18, 2026:

- [Chrome Translator API](https://developer.chrome.com/docs/ai/translator-api)
- [Chrome Language Detector API](https://developer.chrome.com/docs/ai/language-detection)
- [Extension content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)

## Validation still needed

The account owner authorized tests on existing messages without sending messages. After the shared preview connection recovered, tests in the Electron preview checked live message selectors, control placement, preservation of original messages, settings changes, and controls on messages loaded by scrolling. These checks used the source modules injected into the page.

Native translation did not succeed in that preview. See [validation results](VALIDATION.md) for the evidence and the remaining desktop Chrome checks.
