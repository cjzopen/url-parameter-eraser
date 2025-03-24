document.addEventListener('DOMContentLoaded', function() {
  console.log("Options page loaded.");

  document.getElementById('save').addEventListener('click', function() {
    let customParams = document.getElementById('customParams').value.split(',');
    chrome.runtime.sendMessage(
      { type: 'saveCustomParams', customParams: customParams },
      (response) => {
        if (response && response.success) {
          console.log("Custom parameters saved:", customParams);
        } else {
          console.error("Failed to save custom parameters.");
        }
      }
    );
  });

  // 加載已保存的設置
  chrome.storage.sync.get(['customParams'], function(data) {
    if (data.customParams) {
      document.getElementById('customParams').value = data.customParams.join(',');
    }
  });
});

// 更新動態規則
function updateDynamicRules(customParams) {
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
      removeRuleIds: rules.map(rule => rule.id),
      addRules: rules
    },
    function() {
      console.log("Dynamic rules updated:", rules);
    }
  );
}