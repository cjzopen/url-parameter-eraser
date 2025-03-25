document.addEventListener('DOMContentLoaded', function() {
  const optionsButton = document.querySelector('#options');
  const infoButton = document.querySelector('#info');

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
});