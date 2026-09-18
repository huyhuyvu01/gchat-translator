// Google Chat's DOM is private and can change. Keep all selectors here.
export const messageSelector = '[jsname="bgckF"], [data-message-id] .DTp27d';
export const controlTag = 'local-chat-translation';
export const actionTag = 'local-chat-action';
export const messageContainerSelector = '[data-message-id], [jsname="Ne3sFf"]';

export function findMessageAction(body) {
  const container = body.closest(messageContainerSelector);
  if (!container) return null;
  // Chat creates this toolbar on hover. The reaction strip below a message
  // also has an Add reaction button, so never search for that label alone.
  const reaction = container.querySelector('[jsname="jpbBj"] [data-menu-action="1"]');
  if (reaction) return reaction;
  const toolbar = container.querySelector('[role="toolbar"]');
  const button = toolbar?.querySelector('[jsname="JlEEbd"], [aria-label="Add reaction"], [aria-label="Add emoji reaction"]');
  if (!button) return null;
  let action = button;
  while (action.parentElement !== toolbar) action = action.parentElement;
  return action;
}
const excluded = `script, style, button, [role="button"], [hidden], [aria-hidden="true"],
  [contenteditable]:not([contenteditable="false"]), [role="textbox"], ${controlTag}`;
const blocks = new Set(['DIV', 'P', 'LI', 'PRE', 'BLOCKQUOTE']);

export function isChatLocation(location) {
  return location.protocol === 'https:' && (
    location.hostname === 'chat.google.com' ||
    (location.hostname === 'mail.google.com' && /^\/mail\//.test(location.pathname) &&
      /^#chat(?:\/|$)/.test(location.hash))
  );
}

export function extractMessage(body) {
  if (body.closest(excluded)) return '';
  function read(node) {
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType !== 1 || node.matches(excluded)) return '';
    if (node.tagName === 'BR') return '\n';
    if (node.tagName === 'IMG') return node.getAttribute('alt') || '';
    const text = Array.from(node.childNodes, read).join('');
    return blocks.has(node.tagName) ? `\n${text}\n` : text;
  }
  return read(body).replace(/\u00a0/g, ' ').replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

export function findMessages(root) {
  const candidates = [];
  if (root.nodeType === 1 && root.matches(messageSelector)) candidates.push(root);
  candidates.push(...root.querySelectorAll(messageSelector));
  // Some Chat variants nest both supported selectors around the same text.
  return candidates.filter(body => !body.querySelector(messageSelector) && extractMessage(body));
}
