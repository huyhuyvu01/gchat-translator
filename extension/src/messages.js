// Google Chat's DOM is private and can change. Keep all selectors here.
export const messageSelector = '[jsname="bgckF"], [data-message-id] .DTp27d';
export const controlTag = 'local-chat-translation';
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
