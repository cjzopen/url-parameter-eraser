document.addEventListener('DOMContentLoaded', function() {
  const customParamsInput = document.getElementById('customParams');
  const addButton = document.getElementById('add');
  const paramsList = document.getElementById('paramsList');
  const outlineColorPicker = document.getElementById('outlineColorPicker');
  const outlineAlphaRange = document.getElementById('outlineAlpha');
  const enableOutlineCheckbox = document.getElementById('enableOutline');
  const outlineDemo = document.getElementById('outlineDemo');

  // 限制輸入內容並進行正則表達式轉義
  customParamsInput.addEventListener('input', function() {
    // 僅允許以 ^ 開頭的文字，後續部分僅允許英文、數字、-、_、.
    const regex = /^\^?[a-zA-Z0-9\-_\.]*$/;
    if (!regex.test(this.value)) {
      this.value = this.value.replace(/[^a-zA-Z0-9\-_\.]/g, ''); // 移除不合法字元
      if (this.value[0] !== '^') {
        this.value = this.value.replace(/[^a-zA-Z0-9\-_\.]/g, '');
      }
    }
  });

  // 將文字轉義為正則表達式安全的格式
  function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 從全局變數讀取 defaultParams
  let defaultParams = Array.isArray(window.defaultParams) ? [...window.defaultParams] : [];

  // 儲存自訂參數
  addButton.addEventListener('click', function() {
    let customParams = customParamsInput.value.split(',').map(param => escapeRegex(param.trim())).filter(param => param);

    getStoredParams(['url_parameter_eraser_params'], function(data) {
      const existingParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      const updatedParams = [...new Set([...existingParams, ...customParams])];
      saveParams('url_parameter_eraser_params', updatedParams, function() {
        console.log("Custom parameters saved:", updatedParams);
        updateParamsList(paramsList, defaultParams, updatedParams, deleteDefaultParam, deleteCustomParam);
        customParamsInput.value = ''; // 清空輸入框
      });
    });
  });

  // 加載已保存的設置
  getStoredParams(['url_parameter_eraser_params', 'defaultParams'], function(data) {
    const customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
    updateParamsList(paramsList, defaultParams, customParams, deleteDefaultParam, deleteCustomParam);
  });

  // 刪除 defaultParams 中的參數
  function deleteDefaultParam(paramToDelete) {
    defaultParams = defaultParams.filter(param => param !== paramToDelete);
    window.defaultParams = defaultParams;
    saveParams('defaultParams', defaultParams, function() {
      console.log("Default parameter deleted:", paramToDelete);
      updateParamsList(paramsList, defaultParams, [], deleteDefaultParam, deleteCustomParam);
    });
  }

  // 刪除 customParams 中的參數
  function deleteCustomParam(paramToDelete) {
    getStoredParams(['url_parameter_eraser_params'], function(data) {
      const customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      const updatedParams = customParams.filter(param => param !== paramToDelete);
      saveParams('url_parameter_eraser_params', updatedParams, function() {
        console.log("Custom parameter deleted:", paramToDelete);
        updateParamsList(paramsList, defaultParams, updatedParams, deleteDefaultParam, deleteCustomParam);
      });
    });
  }

  // 更新外框預覽
  function updateOutlineDemo() {
    // 直接用目前 input 的值，不用預設值 fallback
    const hex = outlineColorPicker.value;
    const alpha = outlineAlphaRange.value;
    const disableOutline = enableOutlineCheckbox.checked;
    function hexToRgb(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
      const num = parseInt(hex, 16);
      return [num >> 16, (num >> 8) & 0xff, num & 0xff];
    }
    const [r, g, b] = hexToRgb(hex);
    const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    if (!disableOutline) {
      outlineDemo.style.outline = '1px dashed';
      outlineDemo.style.outlineColor = rgba;
    } else {
      outlineDemo.style.outline = '';
      outlineDemo.style.outlineColor = '';
    }
  }

  // 載入 outline 設定
  chrome.storage.local.get(['outlineColorHex', 'outlineAlpha', 'disableOutline'], function(data) {
    console.log(data.outlineColorHex);
    if (data.outlineColorHex) outlineColorPicker.value = data.outlineColorHex;
    if (data.outlineAlpha) outlineAlphaRange.value = data.outlineAlpha;
    if (typeof data.disableOutline === 'boolean') enableOutlineCheckbox.checked = data.disableOutline;
    updateOutlineDemo();
  });

  function saveOutlineSettings() {
    const hex = outlineColorPicker.value;
    const alpha = outlineAlphaRange.value;
    const disableOutline = enableOutlineCheckbox.checked;
    // 預設值
    const defaultHex = '#cb0fff';
    const defaultAlpha = '0.2';
    const defaultDisable = false;
    const toRemove = [];
    const toSet = {};
    if (hex === defaultHex) {
      toRemove.push('outlineColorHex');
    } else {
      toSet.outlineColorHex = hex;
    }
    if (alpha === defaultAlpha) {
      toRemove.push('outlineAlpha');
    } else {
      toSet.outlineAlpha = alpha;
    }
    if (disableOutline === defaultDisable) {
      toRemove.push('disableOutline');
    } else {
      toSet.disableOutline = disableOutline;
    }
    if (toRemove.length) chrome.storage.local.remove(toRemove);
    if (Object.keys(toSet).length) chrome.storage.local.set(toSet);
  }

  outlineColorPicker.addEventListener('input', function() {
    saveOutlineSettings();
    updateOutlineDemo();
  });
  outlineAlphaRange.addEventListener('input', function() {
    saveOutlineSettings();
    updateOutlineDemo();
  });
  enableOutlineCheckbox.addEventListener('change', function() {
    saveOutlineSettings();
    updateOutlineDemo();
  });
});