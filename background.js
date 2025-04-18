//chrome.tabs.onActivated.addListener(() => {
  //chrome.runtime.sendMessage({ action: 'updateBadge' });
//});

//chrome.tabs.onUpdated.addListener(() => {
  //chrome.runtime.sendMessage({ action: 'updateBadge' });
//});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleJsBlocking') {
    const enable = message.enabled;
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enable ? ['ruleset_1'] : [],
      disableRulesetIds: enable ? [] : ['ruleset_1']
    }, () => sendResponse({ success: true }));
    return true; // 비동기 응답 위해 true 반환
  }
});