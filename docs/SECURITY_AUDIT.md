# Security audit before public release

Date: 2026-09-18. Extension version: 0.1.1.
Reviewed source commit: `b0777d6ab3f61af564625e17ce2671210dc37d84`.

No publication-blocking vulnerability or exposed credential was found in the reviewed files and reachable Git history. One low-severity CI hardening item and one publication privacy consideration remain. This is a source review with automated checks, not a guarantee that every vulnerability has been found.

## Findings

### Low: CI actions use mutable version tags

Locations: `.github/workflows/check.yml:11`, `:12`, `:16`, and `:29`.

Checkout, Node setup, Python setup, and artifact upload use tags such as `@v4`. A changed or compromised upstream tag can change the code running in CI without a repository change. That code could modify the extension ZIP produced by the job. No compromise was observed.

Pin each action to a verified full commit SHA from its official repository. Keep the release version in a comment for readability. The current read-only `contents` permission, ordinary `pull_request` trigger, and absence of publishing credentials limit the impact. GitHub recommends [full commit SHA pinning](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions).

### Informational: Git history exposes a work identity

The author and committer metadata on `master` contains a real name, employer affiliation, and a work email address. Publishing those commits publishes that metadata even if no source file contains it. This is a privacy choice, not an exposed authentication secret.

Review locally with:

```sh
git log master --format='%aN <%aE> | %cN <%cE>'
```

If that disclosure is unwanted, use a GitHub noreply address for future commits and prepare sanitized history or a fresh public snapshot before the first push. Changing Git configuration alone does not change existing commits. This audit did not rewrite history.

## Scope and evidence

- Reviewed all extension JavaScript, manifest, settings and privacy pages, build/package scripts, workflow, tests, and public documentation. The existing uncommitted `AGENTS.md` edit was left intact.
- Gitleaks 8.30.1 found no secrets across all 30 commits reachable through local refs, including checkpoint refs, and a snapshot of current tracked and nonignored untracked files. The scanner binary came from the official release and matched its published checksum. This does not scan ignored local files or unreachable Git objects.
- Checked historical file names for credentials, browser profiles, exports, and private configuration. None were found. The tracked preview is documented and labeled as a synthetic example. Visual inspection found no account address or conversation identifier. Reachable PNG assets contain only image chunks, with no embedded textual metadata.
- `npm audit --json` reported zero known vulnerabilities. All 69 resolved lockfile packages use `registry.npmjs.org` and have integrity hashes. Dependencies are development tools; extension bundles have no external runtime package loading. Advisory checks do not establish that every dependency is free of malicious code.
- The release ZIP contains 13 expected runtime/license files, with no source maps, profiles, credentials, or development files. Every entry matches the build directory. Two consecutive packages were byte-identical and passed ZIP integrity validation.

## Runtime security review

The manifest requests only `storage`, with content scripts scoped to HTTPS Google Chat and Gmail paths. Gmail routing checks restrict translation to its Chat view. Scripts use Chrome's default isolated world. No external message handlers, web-accessible resources, dynamic code evaluation, remote scripts, telemetry, or extension network request code were found.

The worker accepts the expected port name from matching subframes and connects to frame zero in the same tab. The receiver checks enabled settings, the top-frame Chat route, and the text type before translation. Page messages are not bridged into extension ports. Chrome documents these boundaries in [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging).

Translations and errors use text rendering rather than HTML interpretation. Activation requires trusted clicks. Storage writes contain preferences and the settings theme, not conversations. Requests clean up native model resources, and cancellation/settings changes discard obsolete results.

Inline translations are readable by page scripts, as disclosed in the privacy policy. Shadow DOM does not make them confidential from Google Chat. The manifest's `connect-src 'none'` policy covers extension pages; it should not be treated as proof that content scripts cannot make network requests. The no-transmission conclusion also relies on the source review and fixture request checks.

## Verification

| Check | Result |
| --- | --- |
| Core tests and build, `npm run check` | 10 tests passed; build passed |
| Installed-extension tests, `npm run test:browser` | 14 tests passed |
| Additional temporary browser probes | 3 passed |
| History and current-file secret scans | No findings |
| Dependency advisory audit | Zero known vulnerabilities |
| ZIP integrity, build correspondence, reproducibility | Passed |

The additional probes verified that synthetic clicks and `window.postMessage` do not invoke translation; model output containing script, image, and SVG payloads stays literal text without loading a URL; and a Chat iframe cannot request translation while the Gmail top frame is on its inbox route. They used synthetic messages and controlled API doubles in a temporary script outside the repository.

Artifact: `artifacts/local-chat-translator-0.1.1.zip`.

SHA-256: `05a5934c68afef2330a9385d64d812ae787317ff1a11ed7d788a1eba35539fa9`.

## Limits and publication follow-up

Resolve the work-email disclosure choice before publishing history. Pin CI actions before distributing CI-produced releases. Enable the private vulnerability reporting channel requested by `SECURITY.md` when the GitHub repository is available; repository settings were not inspected or changed.

Browser checks used temporary Chromium profiles and synthetic pages. Native APIs were present, but real model downloads, native translation of live conversations, and signed-in Gmail acceptance were not validated by this audit. Browser-managed model traffic is outside the fixture network assertions. See `MANUAL_TESTING.md` for remaining release acceptance checks.

No runtime source, dependency versions, workflow configuration, or Git history was changed by this audit.
