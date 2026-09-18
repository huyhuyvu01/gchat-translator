# Contributing

Keep the extension local, explicit, and small. Do not add a remote translation fallback or collect conversation data.

Before opening a pull request, run `npm test`, `npm run build`, `npm run test:browser`, and `npm run package`. Explain the behavior changed and how you tested it. Include a regression test for extraction, lifecycle, or translation bugs. UI copy changes do not need tests that merely repeat the copy.

Google Chat markup changes should include a minimal synthetic fixture. Preserve only the structure needed to reproduce the issue. Replace message text, names, addresses, conversation IDs, and account identifiers with invented values. Do not commit live conversation screenshots, exports, browser profiles, or credentials.

Keep permissions at the minimum required for the behavior. Any added permission needs a concrete explanation in the pull request and privacy policy.

Use small commits that each describe a reviewable change. Contributions are licensed under the project's MIT license.
