document.addEventListener('DOMContentLoaded', function() {
  const optionsButton = document.querySelector('#options');
  const infoButton = document.querySelector('#info');
  const processedLinksContainer = document.querySelector('#processedLinks');
  const toggleDomainButton = document.querySelector('#toggleDomain');
  const disableProcessingButton = document.querySelector('#disableProcessing');

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

    // 檢查該網域是否已禁用 observeDOMChanges()
    chrome.storage.local.get(['disabledDomains'], function(data) {
      const disabledDomains = data.disabledDomains || [];
      const isDisabled = disabledDomains.includes(domain);

      const enableText = chrome.i18n.getMessage('enableDynamicMonitoring');
      const disableText = chrome.i18n.getMessage('disableDynamicMonitoring');

      toggleDomainButton.textContent = isDisabled ? enableText : disableText;
      toggleDomainButton.style.backgroundColor = isDisabled ? '#4CAF50' : '#ff2453';

      toggleDomainButton.addEventListener('click', function() {
        if (isDisabled) {
          // 啟用該網域
          const updatedDomains = disabledDomains.filter(d => d !== domain);
          chrome.storage.local.set({ disabledDomains: updatedDomains }, function() {
            console.log(`Enabled observeDOMChanges() for ${domain}`);
            toggleDomainButton.textContent = disableText;
            toggleDomainButton.style.backgroundColor = '#ff2453';
          });
        } else {
          // 禁用該網域
          disabledDomains.push(domain);
          chrome.storage.local.set({ disabledDomains }, function() {
            console.log(`Disabled observeDOMChanges() for ${domain}`);
            toggleDomainButton.textContent = enableText;
            toggleDomainButton.style.backgroundColor = '#4CAF50';
          });
        }
      });
    });

    // 新增 disableProcessing 按鈕功能
    chrome.storage.local.get(['disabledProcessingDomains'], function(data) {
      const disabledProcessingDomains = data.disabledProcessingDomains || [];
      const isProcessingDisabled = disabledProcessingDomains.includes(domain);
      const disableProcessingText = chrome.i18n.getMessage('disableProcessing');
      const enableProcessingText = chrome.i18n.getMessage('enableProcessing');
      if (disableProcessingButton) {
        disableProcessingButton.textContent = isProcessingDisabled ? enableProcessingText : disableProcessingText;
        disableProcessingButton.style.backgroundColor = isProcessingDisabled ? '#4CAF50' : '#ff2453';
        disableProcessingButton.onclick = function() {
          if (isProcessingDisabled) {
            // 啟用 processLinks/observeDOMChanges
            const updated = disabledProcessingDomains.filter(d => d !== domain);
            chrome.storage.local.set({ disabledProcessingDomains: updated }, function() {
              disableProcessingButton.textContent = disableProcessingText;
              disableProcessingButton.style.backgroundColor = '#ff2453';
              chrome.tabs.reload(tabs[0].id);
            });
          } else {
            // 停用 processLinks/observeDOMChanges
            disabledProcessingDomains.push(domain);
            chrome.storage.local.set({ disabledProcessingDomains }, function() {
              disableProcessingButton.textContent = enableProcessingText;
              disableProcessingButton.style.backgroundColor = '#4CAF50';
              chrome.tabs.reload(tabs[0].id);
            });
          }
        };
      }
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