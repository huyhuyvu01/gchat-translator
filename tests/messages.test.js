import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { extractMessage, findMessages, isChatLocation } from '../extension/src/messages.js';
const document = html => new JSDOM(html).window.document;

test('extracts formatting, line breaks, links, and emoji without UI or original mutations', () => {
  const doc = document(`<div jsname="bgckF">Hello <b>Ada</b><br>Read <a href="https://example.com">this</a> <img alt="🙂"><div>Second line</div><button>Reply</button><span aria-hidden="true">time</span><local-chat-translation>Translated</local-chat-translation></div>`);
  const body = doc.querySelector('[jsname]');
  const original = body.outerHTML;
  assert.equal(extractMessage(body), 'Hello Ada\nRead this 🙂\nSecond line');
  assert.equal(body.outerHTML, original);
});

test('finds one body for nested markers and ignores drafts, hidden messages, and email', () => {
  const doc = document(`<div data-message-id="a"><div class="DTp27d"><div jsname="bgckF">Bonjour</div></div></div>
    <div contenteditable="true"><div jsname="bgckF">draft</div></div>
    <div hidden><div jsname="bgckF">hidden</div></div>
    <div data-message-id="email">Email body</div><div role="textbox" jsname="bgckF">draft</div>`);
  assert.deepEqual(findMessages(doc).map(extractMessage), ['Bonjour']);
});

test('permits only Chat and Gmail Chat routes', () => {
  for (const url of ['https://chat.google.com/u/0/', 'https://mail.google.com/mail/u/2/#chat/space/abc']) {
    assert.equal(isChatLocation(new URL(url)), true);
  }
  for (const url of ['https://mail.google.com/mail/u/0/#inbox', 'https://mail.google.com/mail/u/0/#chatter', 'http://chat.google.com/', 'https://example.com/#chat']) {
    assert.equal(isChatLocation(new URL(url)), false);
  }
});
