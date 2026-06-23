// console.log("Background script started.");

// 載入共用的預設參數清單與 DNR 規則產生器（classic service worker，可用 importScripts）。
importScripts('default-params.js', 'dnr-rules.js');

const tabModifiedCounts = {}; // 用於記錄每個分頁的 modifiedCount
const tabProcessedLinks = {}; // 用於記錄每個分頁的處理後連結

// ---- declarativeNetRequest：在請求送出前移除追蹤參數 ----

// 取得「有效參數」清單：內建 defaultParams（扣除 defaultParamsCancel 白名單）+ 自訂參數。
// 預設清單一律以 self.defaultParams（default-params.js）為準，不讀任何持久化快照，
// 確保版本更新時新參數會自動套用。與 content script 的 initParamPattern 行為一致。
function getEffectiveParams(callback) {
  chrome.storage.sync.get(['url_parameter_eraser_params', 'defaultParamsCancel'], (data) => {
    const defaults = self.defaultParams || [];
    const custom = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
    const cancel = Array.isArray(data.defaultParamsCancel) ? data.defaultParamsCancel : [];
    const cancelKeys = new Set(cancel.map(c => (typeof c === 'string' ? c : (c && c.param))).filter(Boolean));
    const normalize = (p) => (typeof p === 'string'
      ? { param: p, domain: '' }
      : { param: p && p.param, domain: (p && p.domain) || '' });
    const effectiveDefaults = defaults.map(normalize).filter(p => p.param && !cancelKeys.has(p.param));
    const effectiveCustom = custom.map(normalize).filter(p => p.param);
    callback([...effectiveDefaults, ...effectiveCustom]);
  });
}

// 依目前的有效參數重建 DNR dynamic rules（先移除舊規則再加入新規則）。
function rebuildDnrRules() {
  getEffectiveParams((params) => {
    const { rules, fallback } = self.buildDnrRules(
      params, self.prefixExpansions || {}, self.domainExpansions || {}, 1
    );
    chrome.declarativeNetRequest.getDynamicRules((existing) => {
      const removeRuleIds = (existing || []).map(r => r.id);
      chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: rules }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to update DNR rules:', chrome.runtime.lastError.message);
        } else {
          console.log(`DNR rules updated: ${rules.length} rule(s), ${fallback.length} fallback-only param(s).`);
        }
      });
    });
  });
}

// 參數 / 白名單變更時重建規則。
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.url_parameter_eraser_params || changes.defaultParamsCancel)) {
    rebuildDnrRules();
  }
});

// 一次性清理：舊版刪除預設參數時會把整份 defaultParams 快照寫進 sync，
// 這會凍結清單（版本更新後新參數不會出現）並佔用 sync 配額。現在改用 cancel 名單，
// 故移除這個過時的 key。一律改由 default-params.js 提供最新內建清單。
function removeObsoleteDefaultParamsKey() {
  chrome.storage.sync.remove('defaultParams', () => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to remove obsolete sync defaultParams:', chrome.runtime.lastError.message);
    }
  });
}

// 更新 Badge 的顏色和文字
function updateBadge(tabId, count, isDisabled) {
  const badgeText = count > 99 ? '99+' : count > 0 ? count.toString() : '';
  const badgeColor = isDisabled ? '#51f096' : '#ff2453'; // 禁用時為綠色，啟用時為紅色

  chrome.action.setBadgeText({ text: badgeText, tabId });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const tabId = sender.tab.id;
    const count = message.count;

    chrome.tabs.get(tabId, (tab) => {
      if (tab && tab.url) {
        const url = new URL(tab.url);
        const domain = url.hostname;

        chrome.storage.local.get(['disabledDomains'], (data) => {
          const disabledDomains = data.disabledDomains || [];
          const isDisabled = disabledDomains.includes(domain);
          tabModifiedCounts[tabId] = count; // 更新記錄
          updateBadge(tabId, count, isDisabled); // 更新 Badge
        });
      }
    });

    sendResponse({ success: true }); // 回應訊息以保持連接
  } else if (message.action === 'updateProcessedLinks') {
    const tabId = sender.tab.id;
    tabProcessedLinks[tabId] = message.links; // 存儲處理後的連結
    sendResponse({ success: true });
  }
  return true; // 表示此處有異步回應
});

// 清理所有與分頁相關的存儲項
function cleanUpTabStorage() {
  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith('tab_'));
    chrome.storage.local.remove(keysToRemove, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to clean up tab storage:", chrome.runtime.lastError.message);
      } else {
        console.log("Cleaned up tab storage:", keysToRemove);
      }
    });
  });
}

// 因為直接關閉 chrome 不會刪除對應的分頁記錄
// 當擴充套件啟動時清空 extension storage Local
chrome.runtime.onStartup.addListener(() => {
  cleanUpTabStorage();
  rebuildDnrRules();
});

// 當擴充套件安裝或更新時清空 extension storage Local
chrome.runtime.onInstalled.addListener(() => {
  cleanUpTabStorage();
  removeObsoleteDefaultParamsKey();
  rebuildDnrRules();
});

// 當分頁被移除時，刪除對應的記錄
chrome.tabs.onRemoved.addListener(tabId => {
  delete tabModifiedCounts[tabId];
  delete tabProcessedLinks[tabId];
  chrome.storage.local.remove(`tab_${tabId}`, () => {
    if (chrome.runtime.lastError) {
      console.error(`Failed to remove storage for tab_${tabId}:`, chrome.runtime.lastError.message);
    } else {
      console.log(`Removed storage for tab_${tabId}`);
    }
  });
});

// 當分頁切換時，更新 Badge
chrome.tabs.onActivated.addListener(activeInfo => {
  const tabId = activeInfo.tabId;
  const count = tabModifiedCounts[tabId] || 0;

  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const domain = url.hostname;

      chrome.storage.local.get(['disabledDomains'], (data) => {
        const disabledDomains = data.disabledDomains || [];
        const isDisabled = disabledDomains.includes(domain);
        updateBadge(tabId, count, isDisabled);
      });
    }
  });
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