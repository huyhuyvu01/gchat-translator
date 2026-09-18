# Implementation plan

- [ ] Local translation controller and message extraction, with automated tests.
- [ ] Inline controls, mutation handling, and settings.
- [ ] Browser integration tests and reproducible ZIP.
- [ ] Public documentation, privacy policy, license, and CI.
- [ ] Manual validation in signed-in Google Chat and Gmail Chat with real models.

Use only the storage permission and scoped declarative content scripts. Keep message text in page memory. Never send it through a service or persist it. Append a separate control beside the message body without rewriting the body. Restrict extraction to known Google Chat message markup, with no generic text fallback.

Translation and language detection run in the isolated content-script world. Verify API exposure and cross-origin frame policy in browser tests. Gmail embeds Chat in frames; inject into matching Chat frames as well as Gmail's Chat route. If Chrome blocks AI in a frame, show an actionable error rather than silently using a network service.

Sources checked 2026-09-18:

- https://developer.chrome.com/docs/ai/translator-api
- https://developer.chrome.com/docs/ai/language-detection
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

The shared browser redirected chat.google.com to the public Workspace product page. No signed-in conversation was available at the start. Synthetic browser tests cannot establish compatibility with current production Chat markup or real translation model downloads.
