let paramPattern = null;
let modifiedCount = 0; // 記錄更改的連結數量
let processedLinks = []; // 記錄處理的連結
let tabId = null; // 當前分頁的 ID

// 初始化 paramPattern
function initParamPattern(callback) {
  getStoredParams(['url_parameter_eraser_params', 'defaultParams'], function(data) {
    const defaultParams = Array.isArray(data.defaultParams) ? data.defaultParams : window.defaultParams;
    const customParams = data.url_parameter_eraser_params || [];
    const allParams = [...new Set([...defaultParams, ...customParams])];
    paramPattern = new RegExp(allParams.join('|'), 'i');
    // console.log("Initialized paramPattern:", paramPattern);

    if (callback) callback();
  });
}

// 按分頁 ID 將數據保存到 storage
function saveState() {
  if (tabId !== null && modifiedCount >= 1) {
    chrome.storage.local.set({ [`tab_${tabId}`]: { modifiedCount, processedLinks } });
  }
}

// 尋找 HTML 的所有連結，並將 URL 中包含特定參數的部分刪除
function processLinks() {
  if (!paramPattern) {
    return;
  }

  const links = document.querySelectorAll('a');

  links.forEach(link => {
    try {
      if (!link.href) return; // 檢查 href 是否存在
      let url = new URL(link.href); // 嘗試構造 URL
      let params = new URLSearchParams(url.search);
      let modified = false;
      const removedKeys = []; // 記錄刪除的 Query Key

      // 收集所有參數的 key 逐一刪除
      const keys = Array.from(params.keys());
      keys.forEach(param => {
        if (paramPattern.test(param)) {
          params.delete(param);
          removedKeys.push(param); // 記錄刪除的 Key
          modified = true;
        }
      });

      if (modified) {
        const originalUrl = link.href; // 保存原始連結
        url.search = params.toString();
        link.href = url.toString();
        link.style.outline = '1px dashed rgba(203, 15, 255, 0.2)';

        // 提取連結文字，限制最多 32 個字，並移除多餘的空白
        const linkText = link.textContent.trim().substring(0, 32);

        processedLinks.push({
          original: originalUrl,
          modified: link.href,
          text: linkText,
          removedKeys: removedKeys.join(', ') // 保存刪除的 Query Key
        });

        modifiedCount++; // 增加更改計數
      }
    } catch (error) {
      console.warn("Skipping invalid URL:", link.href, error);
    }
  });

  saveState();

  // 更新擴充套件圖示上的 badge
  chrome.runtime.sendMessage({ action: 'updateBadge', count: modifiedCount });

  // 傳遞處理後的連結
  chrome.runtime.sendMessage({ action: 'updateProcessedLinks', links: processedLinks });
}

// 清除當前頁面 URL 中特定的參數
function cleanCurrentPageURL() {
  if (!paramPattern) {
    return;
  }

  try {
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    let modified = false;

    // 收集所有參數的 key 逐一刪除
    const keys = Array.from(params.keys());
    keys.forEach(param => {
      if (paramPattern.test(param)) {
        params.delete(param);
        modified = true;
      }
    });

    if (modified) {
      url.search = params.toString();
      history.replaceState(null, '', url.toString());
      // console.log("URL Parameter Eraser: Cleaned current page URL:", url.toString());
    }
  } catch (error) {
    console.warn("Failed to clean current page URL:", error);
  }
}

// 監聽 DOM 的變化，並在變化時執行 processLinks()
function observeDOMChanges() {
  const observer = new MutationObserver(() => {
    processLinks();
  });

  observer.observe(document.body, {
    childList: true, // 監聽子節點的變化
    subtree: true    // 監聽整個子樹
  });

  // console.log("URL Parameter Eraser: MutationObserver started.");
}

// 初始化
chrome.runtime.sendMessage({ action: 'getTabId' }, (response) => {
  tabId = response.tabId;
  initParamPattern(() => {
    cleanCurrentPageURL();
    processLinks();
    observeDOMChanges();
  });
});