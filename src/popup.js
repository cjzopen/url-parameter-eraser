document.addEventListener('DOMContentLoaded', function() {
  const optionsButton = document.querySelector('#options');
  const infoButton = document.querySelector('#info');
  const processedLinksContainer = document.querySelector('#processedLinks');

  if (optionsButton) {
    optionsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  } else {
    console.error("options button not found!");
  }

  if (infoButton) {
    infoButton.addEventListener('click', function() {
      chrome.tabs.create({ url: chrome.runtime.getURL('info.html') });
    });
  } else {
    console.error("info button not found!");
  }

  // 獲取當前分頁的網域
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const url = new URL(tabs[0].url);
    const domain = url.hostname;

    // 改成 checkbox 狀態變化，取代舊的 toggleDomain/disableProcessing 按鈕
    // 動態監控
    const dynamicInput = document.getElementById('dynamic-monitoring-input');
    chrome.storage.local.get(['disabledDomains'], function(data) {
      const disabledDomains = data.disabledDomains || [];
      dynamicInput.checked = disabledDomains.includes(domain); // checked = 停用
      dynamicInput.onchange = function() {
        if (dynamicInput.checked) {
          // 停用動態監控
          if (!disabledDomains.includes(domain)) disabledDomains.push(domain);
          chrome.storage.local.set({ disabledDomains });
        } else {
          // 啟用動態監控
          const updated = disabledDomains.filter(d => d !== domain);
          chrome.storage.local.set({ disabledDomains: updated });
        }
      };
    });
    // 所有功能
    const allFuncInput = document.getElementById('allfunction-input');
    chrome.storage.local.get(['disabledProcessingDomains'], function(data) {
      const disabledProcessingDomains = data.disabledProcessingDomains || [];
      allFuncInput.checked = disabledProcessingDomains.includes(domain); // checked = 停用
      allFuncInput.onchange = function() {
        if (allFuncInput.checked) {
          // 停用所有功能
          if (!disabledProcessingDomains.includes(domain)) disabledProcessingDomains.push(domain);
          chrome.storage.local.set({ disabledProcessingDomains });
        } else {
          // 啟用所有功能
          const updated = disabledProcessingDomains.filter(d => d !== domain);
          chrome.storage.local.set({ disabledProcessingDomains: updated });
        }
      };
    });
  });

  // 獲取當前分頁的處理後連結
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ action: 'getProcessedLinks', tabId }, function(response) {
      const links = response.links || [];
      if (links.length > 0) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = `Processed Links (${links.length})`;
        details.appendChild(summary);

        links.forEach(link => {
          const p = document.createElement('p');

          const textSpan = document.createElement('span');
          textSpan.textContent = `Text: ${link.text || '(No text)'}`;

          const removedKeysSpan = document.createElement('span');
          removedKeysSpan.textContent = `Removed Keys: ${link.removedKeys || '(None)'}`;
          removedKeysSpan.setAttribute('title', link.removedKeys);

          p.appendChild(textSpan);
          p.appendChild(document.createElement('br'));
          p.appendChild(removedKeysSpan);

          details.appendChild(p);
        });

        processedLinksContainer.appendChild(details);
      } else {
        processedLinksContainer.textContent = 'No links processed.';
      }
    });
  });
});