// console.log("Background script started.");

// 確保 Service Worker 正常啟動
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Extension installed.");
// });

// 測試規則是否正確載入
// chrome.declarativeNetRequest.getDynamicRules((rules) => {
//   console.log("Dynamic rules loaded:", rules);
// });

// 處理來自選項頁的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'saveCustomParams') {
    const customParams = message.customParams;
    chrome.storage.sync.set({ customParams: customParams }, () => {
      console.log("Custom parameters saved:", customParams);
      updateDynamicRules(customParams);
      sendResponse({ success: true });
    });
    return true; // 表示將使用異步回應
  }
});

// 更新動態規則
function updateDynamicRules(customParams) {
  // 移除舊規則
  chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
    const existingRuleIds = existingRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules(
      {
        removeRuleIds: existingRuleIds,
        addRules: []
      },
      () => {
        console.log("Old dynamic rules removed:", existingRuleIds);

        // 添加新規則
        const rules = customParams.map((param, index) => ({
          id: 1000 + index, // 動態規則 ID，避免與靜態規則衝突
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              regexSubstitution: "\\0"
            }
          },
          condition: {
            regexFilter: `.*[?&]${param}=[^&]*`,
            resourceTypes: ["main_frame", "sub_frame"]
          }
        }));

        chrome.declarativeNetRequest.updateDynamicRules(
          {
            removeRuleIds: [],
            addRules: rules
          },
          () => {
            console.log("Dynamic rules updated:", rules);
          }
        );
      }
    );
  });
}