// console.log("Background script started.");

// 確保 Service Worker 正常啟動
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Extension installed.");
// });

// 測試規則是否正確載入
// chrome.declarativeNetRequest.getDynamicRules((rules) => {
//   console.log("Dynamic rules loaded:", rules);
// });

const tabModifiedCounts = {}; // 用於記錄每個分頁的 modifiedCount
const tabProcessedLinks = {}; // 用於記錄每個分頁的處理後連結

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const tabId = sender.tab.id;
    const count = message.count;

    // 更新記錄
    tabModifiedCounts[tabId] = count;

    // 更新 Badge
    const badgeText = count > 99 ? '99+' : count > 0 ? count.toString() : '';
    chrome.action.setBadgeText({ text: badgeText, tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#ff2453', tabId });

    sendResponse({ success: true }); // 回應訊息以保持連接
  } else if (message.action === 'updateProcessedLinks') {
    const tabId = sender.tab.id;
    tabProcessedLinks[tabId] = message.links; // 存儲處理後的連結
    sendResponse({ success: true });
  }
  return true; // 表示此處有異步回應
});

// 當分頁被移除時，刪除對應的記錄
chrome.tabs.onRemoved.addListener(tabId => {
  delete tabModifiedCounts[tabId];
  delete tabProcessedLinks[tabId];
  chrome.storage.local.remove(`tab_${tabId}`);
});

// 當分頁切換時，更新 Badge
chrome.tabs.onActivated.addListener(activeInfo => {
  const tabId = activeInfo.tabId;
  const count = tabModifiedCounts[tabId] || 0;

  const badgeText = count > 99 ? '99+' : count > 0 ? count.toString() : '';
  chrome.action.setBadgeText({ text: badgeText, tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#ff2453', tabId });
});

// 提供 API 給 popup.html 獲取處理後的連結
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getProcessedLinks') {
    const tabId = message.tabId;
    sendResponse({ links: tabProcessedLinks[tabId] || [] });
  } else if (message.action === 'getTabId') {
    sendResponse({ tabId: sender.tab.id });
  }
});