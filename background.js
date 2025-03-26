// console.log("Background script started.");

// 確保 Service Worker 正常啟動
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Extension installed.");
// });

// 測試規則是否正確載入
// chrome.declarativeNetRequest.getDynamicRules((rules) => {
//   console.log("Dynamic rules loaded:", rules);
// });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const count = message.count;
    const badgeText = count > 99 ? '99+' : count > 0 ? count.toString() : '';
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: '#ff2453' });
  }
});