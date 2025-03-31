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

          // const originalSpan = document.createElement('span');
          // originalSpan.textContent = `Original: ${link.original}`;
          // originalSpan.setAttribute('title', link.original);

          // const modifiedSpan = document.createElement('span');
          // modifiedSpan.textContent = `Modified: ${link.modified}`;
          // modifiedSpan.setAttribute('title', link.modified);

          const removedKeysSpan = document.createElement('span');
          removedKeysSpan.textContent = `Removed Keys: ${link.removedKeys || '(None)'}`;
          removedKeysSpan.setAttribute('title', link.removedKeys);

          p.appendChild(textSpan);
          p.appendChild(document.createElement('br'));
          // p.appendChild(originalSpan);
          // p.appendChild(document.createElement('br'));
          // p.appendChild(modifiedSpan);
          // p.appendChild(document.createElement('br'));
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