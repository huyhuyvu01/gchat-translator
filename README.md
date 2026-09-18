# GChat Translator

Translate individual Google Chat messages on your device with Chrome's built-in AI APIs. Hover over a message and click the translation icon. The result appears below the original, with a tab to hide or show it.

GChat Translator works in standalone Google Chat and Gmail's Chat view, including embedded Chat frames. It has no server, API key, remote translation fallback, or telemetry.

![Expanded and collapsed translation cards with sample messages](docs/extension-preview.png)

## Install a release

Download the ZIP from [GitHub Releases](https://github.com/huyhuyvu01/gchat-translator/releases/latest) and extract it. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the extracted folder. Reload your Chat tabs, open the extension popup, and choose a target language.

Each release includes a `.sha256` file to verify the ZIP. Releases require the same desktop Chrome API support described below.

## Install from source

You need Node.js 22 or newer, npm, and desktop Google Chrome with the built-in Translator and Language Detector APIs. Chrome introduced these APIs in version 138. Support also depends on your device, browser settings, language pair, and administrator policies.

```sh
npm ci
npm run build
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select `dist/extension` in this repository.
3. Reload any open Google Chat or Gmail tabs.
4. Open the extension popup, choose a target language, and save.
5. Hover over a Chat message and click the translation icon next to **Add reaction**.

Chrome may download language models on the first request. A loading animation and download progress appear below the message. If the download takes longer than Chrome allows after a click, click **Retry translation** to continue. Once the models are ready, translation takes one click.

Click the toolbar icon again to cancel a pending request. Use the tab below the result to hide or show it without translating again. Hiding a pending result lets it finish in the background. The tab stays visible while the card is closed. Loading and card animations respect reduced-motion settings.

The popup lets you turn translation controls off or choose a source language when automatic detection gets short or mixed-language messages wrong. Saving settings updates open tabs and clears previous translations.

## Privacy and permissions

The extension requests only the `storage` permission. Content scripts run on `https://chat.google.com/*` and `https://mail.google.com/mail/*`. The Gmail script checks for the Chat route, such as `/mail/u/0/#chat/`, because manifest patterns cannot match URL fragments. It does not select email bodies or compose fields.

Message text goes only to Chrome's local APIs. Gmail's cross-origin Chat frames cannot normally call these APIs, so an extension service worker passes translation requests to the same tab's top frame. The relay does not save message text. Chrome may contact Google to download models.

The extension saves language choices, the enabled setting, and the settings panel theme. Translations stay in the page until a reload, a settings change, or removal of the message. Page scripts can read inline translations, just as they can read the original messages.

Read the [privacy policy](extension/privacy.html) for details. Google Chat handles your conversations under Google's own policies.

## Development and tests

```sh
npm ci
npm test
npx playwright install chromium
npm run build
npm run test:browser
npm run package
```

On Linux, use `npx playwright install --with-deps chromium` if browser dependencies are missing. Browser tests load the built extension into a temporary Chromium profile. They use simulated Chat pages and test substitutes for Chrome's APIs, so they need no Google account. A separate check confirms that native APIs are available to isolated content scripts.

See the [manual test checklist](docs/MANUAL_TESTING.md) and [validation results](docs/VALIDATION.md). These automated tests do not prove that every live Chat layout works or that real model downloads succeed.

## Build a ZIP

Run `npm run package` to create `artifacts/gchat-translator-0.1.1.zip` and its SHA-256 checksum. Packaging requires Python 3. The ZIP contains the runtime files and license. Fixed file order, timestamps, permissions, and uncompressed entries make builds reproducible with the same source and locked dependencies. Git ignores generated files.

Extract the ZIP to load it unpacked, or submit it to the Chrome Web Store.

## Chrome Web Store submission

Run `npm run store:assets` after installing Playwright Chromium to create `artifacts/store/`: two 1280×800 screenshots of the installed settings page, the 128×128 icon, and a 440×280 promotional image. These images contain no conversations. Upload them as listing assets, separately from the extension ZIP. The screenshots do not demonstrate native translation; finish the [manual checks](docs/MANUAL_TESTING.md) before submitting.

Use this listing description:

> Translate individual Google Chat messages on your device with Chrome's built-in translation APIs. Hover over a message and click Translate to show the result below the original. Hide or reopen translations, choose your target language, and override automatic language detection when needed.
>
> Supports standalone Google Chat and Gmail's Chat view. Requires desktop Chrome 138 or newer and available language models. Chrome may download models on first use; internet access is needed for those downloads. Language and device support vary.
>
> The extension processes message text locally and saves only your preferences. It has no developer server, analytics, advertisements, or third-party translation service. Google Chat still handles conversations under Google's own policies. GChat Translator is an independent project with no affiliation with Google.

Use English as the listing language and Tools as the category if that category is available in the dashboard. Project URL: `https://github.com/huyhuyvu01/gchat-translator`. Support URL: `https://github.com/huyhuyvu01/gchat-translator/issues`.

Privacy practices fields:

| Field | Explanation |
| --- | --- |
| Single purpose | Translate individual Google Chat messages on the user's device while preserving the original text. |
| `storage` | Save whether translation is enabled and the user's source and target language preferences locally. |
| `https://chat.google.com/*` | Identify Chat messages and display translation controls and results. |
| `https://mail.google.com/mail/*` | Support Gmail's Chat view and embedded Chat frames. The script checks the Chat route and does not select email bodies or compose fields. All-frame injection supports embedded conversations. |
| Remote code | No. Executable code ships in the extension. Chrome manages its own language-model downloads. |
| Data handling | Personal communications and website content are processed locally to provide translation. Message text and translations are not sent to the developer or saved in extension storage. |

Complete the dashboard's data-use certifications to match these practices: no sale or unrelated transfers, no use outside the single purpose, and no use for creditworthiness or lending. Local processing still needs disclosure. See [Google's privacy requirements](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

The public policy URL will be `https://huyhuyvu01.github.io/gchat-translator/privacy.html`. Before using it, choose **GitHub Actions** in the repository's **Settings → Pages → Build and deployment → Source**, then push the privacy workflow to `main` or run **Publish privacy policy** manually from `main`. The workflow publishes the bundled policy and its stylesheet, so there is one policy to maintain. Confirm the URL works while signed out. The URL is not live until deployment succeeds.

Register at the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/), pay the one-time fee, verify your contact email, enable 2-Step Verification, and complete the account declarations shown there. Upload the tested ZIP, fill the listing and privacy fields, and paste the [reviewer instructions](docs/MANUAL_TESTING.md#store-reviewer-instructions). Start with unlisted distribution for a pilot; anyone with its link can install it, and Google still reviews it. Select deferred publishing if you want to inspect approval before making the listing available. See [Google's submission guide](https://developer.chrome.com/docs/webstore/publish).

## Automated releases

[GitHub Actions](https://github.com/huyhuyvu01/gchat-translator/actions) runs the core tests, browser tests, build, and packaging checks on branch pushes and pull requests. After a successful push to `main`, including a merged pull request, it publishes the tested ZIP and checksum to [GitHub Releases](https://github.com/huyhuyvu01/gchat-translator/releases).

Each release uses a `build-<full commit SHA>` tag. A push containing several commits builds the final commit. Rerunning a workflow for the same commit updates that release's assets. Branch and pull request runs upload workflow artifacts without publishing releases.

The release job uses GitHub's built-in token with `contents: write`; the test job has read-only access. No personal token or release secret is needed. Actions are pinned to full commit SHAs. The workflow does not sign the extension or submit it to the Chrome Web Store.

## Code layout

Source files live in `extension/src`. Esbuild bundles them without runtime dependencies.

| File | Responsibility |
| --- | --- |
| `messages.js` | Find Chat messages and extract their text. |
| `translator.js` | Check model availability, report progress, translate, and release model resources. |
| `chat.js` | Add controls, watch message changes, and cancel requests that no longer apply. |
| `frame-translation.js`, `background.js` | Pass embedded Chat requests between frames in the same tab. |
| `settings.js` | Save language choices, the enabled setting, and the panel theme. |

A `MutationObserver` finds new messages and clears results when messages change. Unchanged messages keep their controls. Text extraction skips the extension's own output. Translations render as text, never as HTML.

## Troubleshooting and limits

Google Chat can change its page markup without notice. If translation buttons disappear after a Chat update, report your Chrome version and whether you used standalone Chat or Gmail. Leave private message text out of the report.

If a model is unavailable, check Chrome updates, administrator policies, disk space, and network access for downloads. Try another language pair. Incognito and browsers other than supported desktop Chrome may lack these APIs.

Names, emoji, very short messages, and mixed-language text can confuse language detection. Choose the source language in the popup and retry. Translations can be wrong, so the original message stays visible.

After updating or reloading the extension, reload your Chat pages too.

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [MIT license](LICENSE)

GChat Translator is an independent project with no affiliation with Google.
