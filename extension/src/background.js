// Relay only extension ports from Chat subframes to the same tab's top frame.
// Neither this worker nor the ports persist message text.
chrome.runtime.onConnect.addListener(port => {
  const sender = port.sender;
  if (port.name !== 'chat-translation-frame' || !sender?.tab || !sender.frameId ||
    !/^https:\/\/(chat\.google\.com\/|mail\.google\.com\/mail\/)/.test(sender.url || '')) {
    port.disconnect();
    return;
  }
  const top = chrome.tabs.connect(sender.tab.id, { frameId: 0, name: 'chat-translation-top' });
  port.onMessage.addListener(message => { try { top.postMessage(message); } catch { port.disconnect(); } });
  top.onMessage.addListener(message => { try { port.postMessage(message); } catch { top.disconnect(); } });
  port.onDisconnect.addListener(() => { void chrome.runtime.lastError; top.disconnect(); });
  top.onDisconnect.addListener(() => { void chrome.runtime.lastError; port.disconnect(); });
});
