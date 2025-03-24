// function updateToggleText(enabled) {
//   document.getElementById('toggle').textContent = enabled ? '停用' : '啟用';
// }

// chrome.storage.local.get('enabled', function(data) {
//   const enabled = data.enabled !== undefined ? data.enabled : true; // 預設啟用
//   updateToggleText(enabled);
// });

document.addEventListener('DOMContentLoaded', function() {
  // const toggleButton = document.querySelector('#toggle');
  const optionsButton = document.querySelector('#options');

  // if (toggleButton) {
  //   toggleButton.addEventListener('click', function() {
  //     chrome.storage.local.get('enabled', function(data) {
  //       const enabled = !data.enabled;
  //       chrome.storage.local.set({ enabled: enabled }, function() {
  //         console.log('Extension enabled:', enabled);
  //         updateToggleText(enabled);
  //       });
  //     });
  //   });
  // } else {
  //   console.error("toggle button not found!");
  // }

  if (optionsButton) {
    optionsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  } else {
    console.error("options button not found!");
  }
});