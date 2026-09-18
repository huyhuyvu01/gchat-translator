# Manual testing

Use a test account or conversations you have permission to inspect. Test translation and navigation with existing messages. Do not send a message for a test without the account owner's permission. If another participant chooses to send one, use it to check how the extension handles new messages.

Record the date, OS, Chrome version, extension commit, view, target language, and result. Keep private message text, conversation IDs, screenshots, and browser profiles out of this repository.

## Install and translate

- Run `npm ci` and `npm run build`. Load `dist/extension` at `chrome://extensions`.
- Confirm Chrome lists the extension as GChat Translator and reports no errors. Reload open Chat pages.
- Open the popup, choose a target language different from an existing message's language, and save.
- Open an existing conversation at `https://chat.google.com/`.
- Hover over a text message. Check that the translation icon appears immediately after Add reaction in the hover toolbar. It should not appear in the reaction strip, composer, or sidebar.
- Move between messages. Check that each icon translates its own message.
- Click Translate once. Check that the result appears below the same message and leaves the original unchanged.
- Try a new language pair and check model download progress. If Chrome needs another click after a long detector download, click Retry and check that translation continues.
- Check that the result makes sense for the selected source and target languages.

## Results and controls

- Close and reopen a result with the tab below it. Check that the card slides, has no left border, and keeps its tab visible. Reopening should not translate again.
- Hide a pending result with its tab. Check that translation finishes without reopening the card, then open it to read the result.
- Translate multiline text, links, formatted text, and emoji.
- Try a short or ambiguous message. If detection is uncertain, choose the source language and retry.
- Translate text already in the target language. Check that the result says so.
- Change the target language during translation. Check that the old result never appears under the new setting.
- Cancel a pending request and retry.
- Change conversations and open a thread. Check that controls appear on new messages and leave the originals unchanged.
- Scroll to older messages and back. Check for duplicate controls on each message body.
- If a message arrives during the test, check that it gets a button without a reload. If someone edits or deletes a message, check that its old translation disappears.
- Turn translation buttons off and on. Turning them off should remove controls and results. Turning them on should restore untranslated buttons.
- Focus and activate the toolbar icon and result tab with the keyboard.
- Test light and dark Chat themes, including a Chat theme that differs from the system theme. Change themes with a result open and check that its text style matches the original message.
- Check the loading animation during model download and translation. With reduced motion enabled, the loading indicator should stay visible without animation, and the card should open and close without sliding.
- Check long lines and quoted messages. Move away from the toolbar, then hide the result with its tab.

## Gmail Chat

- Repeat basic translation at `https://mail.google.com/mail/u/0/#chat/`, using the appropriate account index.
- Open an embedded conversation. Check that results appear in the Chat frame even when that frame lacks Translator API permission.
- Switch to the inbox. Check that email messages have no translation controls.
- Switch back to Chat without reloading and translate another message.

## Errors, privacy, and packaging

- If the APIs are disabled in your browser, check that the extension explains the unsupported-browser error.
- If possible, test an unavailable language pair or an administrator restriction on models.
- Download the required models, disconnect from the network, and translate an already-loaded message. Reconnect afterward.
- In the settings page's DevTools, inspect `chrome.storage.local`. It should contain only `enabled`, `targetLanguage`, and `sourceLanguage`. The panel theme uses the extension's `localStorage`.
- Inspect the extension's code and network activity. It should make no HTTP requests containing message text. Google Chat still makes its own requests, and Chrome may download models.
- Run `npm run package` twice and compare the ZIP checksums.

## Record results

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
