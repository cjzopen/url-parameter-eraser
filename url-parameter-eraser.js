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
    const dataToSave = {
      modifiedCount: modifiedCount,
      processedLinks: Array.isArray(processedLinks) ? processedLinks : [] // 確保 processedLinks 是數組
    };
    chrome.storage.local.set({ [`tab_${tabId}`]: dataToSave }, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to save state to storage:", chrome.runtime.lastError.message);
      } else {
        // console.log(`State saved for tab_${tabId}:`, dataToSave);
      }
    });
  }
}

// 更新擴充套件圖示上的 badge
function updateBadge(count) {
  try {
    chrome.runtime.sendMessage({ action: 'updateBadge', count }, response => {
      if (chrome.runtime.lastError) {
        console.error("Failed to send message to background:", chrome.runtime.lastError.message);
      } else if (!response || !response.success) {
        console.warn("Background script did not acknowledge the message.");
      }
    });
  } catch (error) {
    console.error("Error sending message to background:", error);
  }
}

// 傳遞處理後的連結
function sendProcessedLinks(links) {
  try {
    chrome.runtime.sendMessage({ action: 'updateProcessedLinks', links }, response => {
      if (chrome.runtime.lastError) {
        console.error("Failed to send processed links to background:", chrome.runtime.lastError.message);
      } else if (!response || !response.success) {
        console.warn("Background script did not acknowledge the processed links.");
      }
    });
  } catch (error) {
    console.error("Error sending processed links to background:", error);
  }
}

// 有些 URL encode 後會變成 percent-encoded，例如?會變成 %3F，這樣的 URL 需要先 decode 再處理
function decodeIfEncoded(href) {
  // 僅當 href 含有 %3F（不分大小寫）時才 decode，否則直接回傳原 href
  if (/%3F/i.test(href)) {
    try {
      const decoded = decodeURIComponent(href);
      new URL(decoded); // 驗證 decode 後是合法 URL
      return decoded;
    } catch (e2) {
      return null;
    }
  }
  return href;
}

// 尋找 HTML 的所有連結，並將 URL 中包含特定參數的部分刪除
function processLinks() {
  if (!paramPattern) {
    return;
  }
  chrome.storage.local.get({
    'outlineColorHex': '#cb0fff',
    'outlineAlpha': 0.2,
    'disableOutline': false
  }, function(styleData) {
    // context 失效時 styleData 可能為 undefined/null
    if (!styleData || typeof styleData !== 'object') return;
    try {
      const hex = typeof styleData.outlineColorHex === 'string' ? styleData.outlineColorHex : '#cb0fff';
      const alpha = typeof styleData.outlineAlpha === 'string' || typeof styleData.outlineAlpha === 'number' ? parseFloat(styleData.outlineAlpha) : 0.2;
      const disableOutline = typeof styleData.disableOutline === 'boolean' ? styleData.disableOutline : false;
      // 轉換hex為rgb
      function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const num = parseInt(hex, 16);
        return [num >> 16, (num >> 8) & 0xff, num & 0xff];
      }
      const [r, g, b] = hexToRgb(hex);
      const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;

      const links = document.querySelectorAll('a');

      links.forEach(link => {
        try {
          if (!link.href) return;
          const decodedHref = decodeIfEncoded(link.href);
          if (!decodedHref) return;
          let url = new URL(decodedHref);
          let params = new URLSearchParams(url.search);
          let modified = false;
          const removedKeys = [];
          const keys = Array.from(params.keys());
          keys.forEach(param => {
            if (paramPattern.test(param) || paramPattern.test(decodeURIComponent(param))) {
              params.delete(param);
              if (param) {
                removedKeys.push(param);
              }
              modified = true;
            }
          });
          if (modified) {
            const originalUrl = link.href;
            url.search = params.toString();
            // 若原始 href 為 percent-encoded，需還原 encode 狀態（只 encode非 ASCII 部分，避免 query value 亂碼）
            if (/%[0-9a-fA-F]{2}/.test(originalUrl)) {
              // 只 encode path/search/hash，且保留 query value 的原始編碼
              let encodedPath = encodeURI(url.pathname);
              // 針對 search，保留 = 後的 value 原始編碼
              let encodedSearch = '';
              if (url.search) {
                const searchParams = [];
                url.searchParams.forEach((v, k) => {
                  // 取原始 query string
                  const match = originalUrl.match(new RegExp('[?&]' + k + '=([^&#]*)'));
                  if (match) {
                    searchParams.push(k + '=' + match[1]);
                  } else {
                    searchParams.push(k + '=' + encodeURIComponent(v));
                  }
                });
                encodedSearch = '?' + searchParams.join('&');
              }
              let encodedHash = url.hash ? encodeURI(url.hash) : '';
              link.href = url.origin + encodedPath + encodedSearch + encodedHash;
            } else {
              link.href = url.toString();
            }
            if (!disableOutline) {
              link.style.outline = '1px dashed';
              link.style.outlineColor = rgba;
            } else {
              link.style.outline = '';
              link.style.outlineColor = '';
            }
            const linkText = link.textContent.trim().substring(0, 32);
            processedLinks.push({
              original: originalUrl,
              modified: link.href,
              text: linkText || '(No text)',
              removedKeys: removedKeys.length > 0 ? removedKeys.join(', ') : '(None)'
            });
            modifiedCount++;
          }
        } catch (error) {
          console.warn("Skipping invalid URL:", link.href, error);
        }
      });
      saveState();
      updateBadge(modifiedCount);
      sendProcessedLinks(processedLinks);
    } catch (e) {
      // context 失效或其他錯誤時直接忽略
      return;
    }
  });
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

  chrome.storage.local.get(['disabledDomains', 'disabledProcessingDomains'], function(data) {
    const disabledDomains = data.disabledDomains || [];
    const disabledProcessingDomains = data.disabledProcessingDomains || [];
    const url = new URL(window.location.href);
    const domain = url.hostname;

    if (disabledProcessingDomains.includes(domain)) {
      // 完全停用 processLinks 和 observeDOMChanges
      initParamPattern(() => {
        cleanCurrentPageURL();
      });
      return;
    }

    if (disabledDomains.includes(domain)) {
      // 只停用 observeDOMChanges
      initParamPattern(() => {
        cleanCurrentPageURL();
        processLinks();
      });
      return;
    }

    // 如果未禁用，啟用 observeDOMChanges()
    initParamPattern(() => {
      cleanCurrentPageURL();
      processLinks();
      observeDOMChanges();
    });
  });
});