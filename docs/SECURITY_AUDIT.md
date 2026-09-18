# Security audit before public release

This audit reviewed extension version 0.1.1 on September 18, 2026, at source commit `b0777d6ab3f61af564625e17ce2671210dc37d84`. It records the review before the GChat Translator rename; its artifact name and checksum refer to that earlier build.

The review found no vulnerability that would block publication and no exposed credential in the reviewed files or reachable Git history. It identified one low-severity CI issue and a work-identity disclosure to consider before publication. The review and automated checks cannot rule out every vulnerability.

## Findings

### CI actions use mutable version tags

Severity is low. The affected locations are `.github/workflows/check.yml` lines 11, 12, 16, and 29 in the reviewed commit.

Checkout, Node setup, Python setup, and artifact upload use tags such as `@v4`. If an upstream tag changes or is compromised, CI can run different code without a repository change. That code could alter the release ZIP. The review found no evidence of compromise.

Pin each action to a verified full commit SHA from its official repository, with the release version in a comment. GitHub recommends [pinning actions to full commit SHAs](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions). Read-only `contents` permission, the ordinary `pull_request` trigger, and the lack of publishing credentials limit the current risk.

### Git history contains a work identity

This is an informational finding. Author and committer metadata on `master` contains a real name, employer affiliation, and work email. Publishing those commits also publishes the metadata. It is personal information, not an authentication secret.

Inspect the metadata locally:

```sh
git log master --format='%aN <%aE> | %cN <%cE>'
```

If you do not want to publish it, use a GitHub noreply address for future commits and prepare sanitized history or a fresh public snapshot before the first push. Changing Git configuration does not alter old commits. This audit did not rewrite history.

## Scope and evidence

The review covered extension JavaScript, the manifest, settings and privacy pages, build and packaging scripts, CI, tests, and public docs. It left the existing uncommitted `AGENTS.md` edit intact.

Gitleaks 8.30.1 found no secrets in the 30 commits reachable through local refs, including checkpoint refs. It also scanned a snapshot of tracked and nonignored untracked files. The scanner came from its official release and matched the published checksum. Ignored files and unreachable Git objects were outside the scan.

Historical file names showed no credentials, browser profiles, exports, or private configuration. The tracked preview was labeled as a synthetic example. Visual inspection found no account address or conversation identifier. Reachable PNG assets contained no embedded text metadata.

`npm audit --json` reported zero known vulnerabilities. All 69 resolved lockfile packages used `registry.npmjs.org` and had integrity hashes. Dependencies were development tools; extension bundles did not load external runtime packages. Advisory checks cannot rule out malicious dependency code.

The release ZIP contained 13 expected runtime and license files. It had no source maps, profiles, credentials, or development files. Every entry matched the build directory. Two consecutive packages were byte-identical and passed ZIP integrity checks.

## Runtime review

The manifest requested only `storage`. Content scripts matched HTTPS Google Chat and Gmail paths, and runtime checks limited Gmail translation to its Chat view. Scripts used Chrome's default isolated world. The review found no external message handlers, web-accessible resources, dynamic code evaluation, remote scripts, telemetry, or extension network requests.

The worker accepted the expected port name from matching subframes and connected to frame zero in the same tab. Before translating, the receiver checked enabled settings, the top-frame Chat route, and the text type. Page messages had no bridge into extension ports. Chrome describes these boundaries in its [content-script](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [message-passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) documentation.

Translations and errors rendered as text. Translation required trusted clicks. Storage held preferences and the settings theme, with no conversations. Requests released native model resources. Cancellation and settings changes discarded results that no longer applied.

Page scripts can read inline translations, as the privacy policy explains. Shadow DOM does not hide them from Google Chat. The manifest's `connect-src 'none'` policy applies to extension pages and does not prove that content scripts cannot make requests. The conclusion that the extension does not transmit messages also depended on source review and recorded requests during browser tests.

## Verification

| Check | Result |
| --- | --- |
| `npm run check` | 10 core tests and build passed. |
| `npm run test:browser` | 14 tests passed with the installed extension. |
| Temporary browser checks | Three passed. |
| History and current-file secret scans | No findings. |
| Dependency advisory audit | Zero known vulnerabilities. |
| ZIP integrity, build comparison, and reproducibility | Passed. |

The temporary browser checks used invented messages and API substitutes in a script outside the repository. They confirmed that:

- Synthetic clicks and `window.postMessage` did not invoke translation.
- Model output containing script, image, and SVG payloads stayed literal text and loaded no URL.
- A Chat iframe could not request translation while Gmail's top frame showed the inbox.

The historical artifact was `artifacts/local-chat-translator-0.1.1.zip`, with SHA-256 `05a5934c68afef2330a9385d64d812ae787317ff1a11ed7d788a1eba35539fa9`. This checksum does not apply to builds made after the rename or documentation edits.

## Follow-up and limits

Decide whether to publish the work email before publishing Git history. Pin CI actions before distributing CI-produced releases. Enable the private vulnerability reporting channel described in [SECURITY.md](../SECURITY.md) when the GitHub repository is available. The audit did not inspect or change repository settings.

Browser checks used temporary Chromium profiles and simulated pages. Native APIs were present, but the audit did not validate real model downloads, native translation of live conversations, or signed-in Gmail. Chrome's model download traffic was outside the recorded page requests. See [manual testing](MANUAL_TESTING.md) for the remaining checks.

The audit changed no runtime source, dependency versions, CI configuration, or Git history.
