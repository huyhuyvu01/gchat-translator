# Implementation plan

- [x] Local translation controller and message extraction, with automated tests.
- [x] Inline controls, mutation handling, and settings.
- [x] Browser integration tests and reproducible ZIP.
- [x] Public documentation, privacy policy, license, and CI.
- [ ] Manual validation in signed-in Google Chat and Gmail Chat with real models.

Use only the storage permission and scoped declarative content scripts. Keep message text in page memory. Never send it through a service or persist it. Append a separate control beside the message body without rewriting the body. Restrict extraction to known Google Chat message markup, with no generic text fallback.

Translation and language detection run in the isolated content-script world. Verify API exposure and cross-origin frame policy in browser tests. Gmail embeds Chat in frames; inject into matching Chat frames as well as Gmail's Chat route. Browser testing confirmed that Chrome blocks AI in a cross-origin frame. An extension port relay now executes those requests in the same tab’s top-frame content script, with progress and cancellation. This adds no permission and no network request.

Sources checked 2026-09-18:

- https://developer.chrome.com/docs/ai/translator-api
- https://developer.chrome.com/docs/ai/language-detection
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

The user signed in and authorized translation tests without sending messages. The shared preview connection recovered. Live message selectors, control insertion, original preservation, settings changes, and controls for messages loaded by scrolling were checked using the source modules in the Electron preview. Native model translation did not succeed there. See VALIDATION.md for results and remaining desktop Chrome acceptance checks.
