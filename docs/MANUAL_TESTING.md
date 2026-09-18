# Manual testing

Use a test account or conversations you are authorized to inspect. Never send a message just to run these checks without the account owner's permission. Existing messages can cover translation and navigation. Another participant can send a message for arrival checks if they choose to do so.

Record the date, OS, Chrome version, extension commit, view, target language, and result. Do not save private message text, conversation IDs, screenshots, or browser profiles in this repository.

## Installation and first use

- Build with `npm ci && npm run build` and load `dist/extension` at `chrome://extensions`.
- Confirm the extension loads without errors. Reload already-open Chat pages.
- Open the popup. Set a target language different from an existing message and save.
- Open an existing conversation at `https://chat.google.com/`.
- Hover over a supported text message. Confirm the translation icon appears immediately after Add reaction in the message toolbar, with none in the reaction strip, composer, or sidebar.
- Move between messages and confirm each toolbar icon translates the correct message.
- Click Translate once. Confirm the result appears below the same message and the original remains unchanged.
- On a new language pair, check model download progress. If Chrome asks for another click after a long detector download, click Retry and confirm it continues.
- Confirm the translated text is plausible for the selected source and target languages.

## Message lifecycle and controls

- Use the tab beneath a result to slide it closed and open. Confirm there is no left border, the tab remains visible, and reopening does not translate again.
- Hide a pending translation with its tab. Confirm it finishes without reopening the card, then show the completed result.
- Translate a multiline message, a message with a link, a formatted message, and one containing emoji.
- Try a short or ambiguous message. If detection is uncertain, set the source language and retry.
- Translate a message already in the target language. Confirm the UI says it is already in that language.
- Change the target language while a translation is pending. Confirm the old result never appears under the new language setting.
- Cancel a pending request and retry.
- Change conversations and open a thread. Confirm new controls appear and original text remains intact.
- Scroll back to older messages and forward again. Confirm there is at most one control per message body.
- If a new message arrives naturally, confirm it gets a button without reloading. If someone edits or deletes a message, confirm no stale translation remains.
- Turn translation buttons off, then on. Confirm controls and results disappear when off and restore as untranslated buttons when on.
- Use the keyboard to focus and activate the toolbar icon and translation tab.
- Check light and dark Chat themes, including a Chat theme different from the system theme. Change themes while a result is visible and confirm its text matches the original message.
- Check the animated loading skeleton during model download and translation. Enable reduced motion and confirm the skeleton remains visible without animation and the card opens and closes without sliding.
- Check long lines and quoted messages. Hide a result after moving away from its toolbar.

## Gmail

- Repeat basic translation at `https://mail.google.com/mail/u/0/#chat/` or the corresponding account index.
- Test an embedded conversation. Confirm results appear in the Chat frame, even if the frame itself lacks Translator API permission.
- Switch to the inbox and confirm no translation controls appear on email messages.
- Switch back to Chat without reloading and translate another message.

## Failure states and privacy

- If you have a browser with the APIs disabled, confirm a clear unsupported-browser error.
- Test an unavailable language pair or model policy restriction if your environment offers one.
- After downloading the required models, disconnect from the network and translate an already-loaded message. Reconnect after the check.
- Inspect the extension's `chrome.storage.local` from its settings-page DevTools. Only `enabled`, `targetLanguage`, and `sourceLanguage` should be present.
- Inspect extension code/network behavior. The extension should make no HTTP requests with message text. Google Chat's own network traffic continues normally, and Chrome may download models.
- Run `npm run package` twice and compare the ZIP checksums.

## Result template

```text
Date:
OS / Chrome:
Extension commit:
Chat or Gmail Chat:
Source / target language:
Checks passed:
Checks failed or not exercised:
Reproduction using invented text:
```
