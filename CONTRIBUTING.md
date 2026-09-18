# Contributing

GChat Translator translates on the user's device when they click a message's translation button. Keep that behavior. Do not add remote translation or collect conversation data.

Before opening a pull request, run:

```sh
npm test
npm run build
npm run test:browser
npm run package
```

Describe what changed and how you tested it. Add regression tests for bugs in message extraction, message updates and cleanup, or translation. Copy edits do not need tests that repeat the new wording.

For changes to Chat selectors, include a small test fixture with only the markup needed to reproduce the problem. Use invented messages, names, addresses, conversation IDs, and account identifiers. Never commit live conversation screenshots, exports, browser profiles, or credentials.

Request only the permissions the extension needs. Explain any added permission in the pull request and privacy policy.

Merges and direct pushes to `main` publish a GitHub Release after CI passes. Check the workflow result and release assets after merging.

Keep each commit focused on a change a reviewer can assess. Contributions use the project's MIT license.
