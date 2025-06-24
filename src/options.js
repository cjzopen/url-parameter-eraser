document.addEventListener('DOMContentLoaded', function() {
  const customParamsInput = document.getElementById('customParams');
  const customParamsNoteInput = document.getElementById('customParamsNote');
  const customParamsDomainInput = document.getElementById('customParamsDomain');
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
    if (typeof input !== 'string') input = input && input.param ? input.param : '';
    if (input.startsWith('^')) {
      // 保留開頭的 ^，其餘部分才跳脫
      return '^' + input.slice(1).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    }
    return input.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  }

  // 從全局變數讀取 defaultParams
  let defaultParams = Array.isArray(window.defaultParams) ? [...window.defaultParams] : [];

  // 儲存自訂參數
  addButton.addEventListener('click', function() {
    let customParams = customParamsInput.value.split(',').map(param => escapeRegex(param.trim())).filter(param => param);
    let note = customParamsNoteInput.value.trim();
    let domain = customParamsDomainInput.value.trim().toLowerCase();
    // 沒輸入時為空字串
    if (!domain) domain = '';
    if (!customParams.length) return;
    getStoredParams(['url_parameter_eraser_params'], function(data) {
      let existingParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      // 兼容舊格式（字串）自動轉換為物件格式，補 domain
      existingParams = existingParams.map(p => {
        if (typeof p === 'string') return {param: p, note: '', domain: ''};
        if (!('domain' in p)) p.domain = '';
        return p;
      });
      // 新增每個 param 都帶 note, domain
      customParams.forEach(param => {
        const idx = existingParams.findIndex(p => p.param === param);
        if (idx !== -1) {
          existingParams[idx].note = note;
          existingParams[idx].domain = domain;
        } else {
          existingParams.push({param, note, domain});
        }
      });
      // 同步存到 local 及 sync
      saveParams('url_parameter_eraser_params', existingParams, function() {
        chrome.storage.sync.set({ url_parameter_eraser_params: existingParams }, function() {
          console.log("Custom parameters saved (local & sync):", existingParams);
          updateParamsList(paramsList, defaultParams, existingParams, deleteDefaultParam, deleteCustomParam);
          customParamsInput.value = '';
          customParamsNoteInput.value = '';
          customParamsDomainInput.value = '';
        });
      });
    });
  });

  // 加載已保存的設置
  getStoredParams(['url_parameter_eraser_params', 'defaultParams'], function(data) {
    let customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
    // 兼容舊格式，補 domain
    customParams = customParams.map(p => {
      if (typeof p === 'string') return {param: p, note: '', domain: ''};
      if (!('domain' in p)) p.domain = '';
      return p;
    });
    updateParamsList(paramsList, defaultParams, customParams, deleteDefaultParam, deleteCustomParam);
    // 若 local 沒有但 sync 有，則同步回 local
    if (!data.url_parameter_eraser_params) {
      chrome.storage.sync.get(['url_parameter_eraser_params'], function(syncData) {
        if (Array.isArray(syncData.url_parameter_eraser_params)) {
          chrome.storage.local.set({ url_parameter_eraser_params: syncData.url_parameter_eraser_params });
        }
      });
    }
  });

  // 刪除 defaultParams 中的參數，並記錄到 defaultParamsCancel
  function deleteDefaultParam(paramToDelete) {
    // 取得現有 defaultParamsCancel
    chrome.storage.sync.get(['defaultParamsCancel'], function(data) {
      let cancelList = Array.isArray(data.defaultParamsCancel) ? data.defaultParamsCancel : [];
      // 只記錄 param 字串
      if (!cancelList.includes(paramToDelete)) cancelList.push(paramToDelete);
      chrome.storage.sync.set({ defaultParamsCancel: cancelList }, function() {
        // 過濾 defaultParams 並更新畫面
        defaultParams = defaultParams.filter(p => (typeof p === 'string' ? p : p.param) !== paramToDelete);
        window.defaultParams = defaultParams;
        saveParams('defaultParams', defaultParams, function() {
          console.log("Default parameter deleted and recorded:", paramToDelete);
          updateParamsList(paramsList, defaultParams, [], deleteDefaultParam, deleteCustomParam);
        });
      });
    });
  }

  // 刪除 customParams 中的參數
  function deleteCustomParam(paramToDelete) {
    getStoredParams(['url_parameter_eraser_params'], function(data) {
      let customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      // 兼容舊格式，補 domain
      customParams = customParams.map(p => {
        if (typeof p === 'string') return {param: p, note: '', domain: ''};
        if (!('domain' in p)) p.domain = '';
        return p;
      });
      const updatedParams = customParams.filter(p => p.param !== paramToDelete);
      saveParams('url_parameter_eraser_params', updatedParams, function() {
        chrome.storage.sync.set({ url_parameter_eraser_params: updatedParams }, function() {
          console.log("Custom parameter deleted (local & sync):", paramToDelete);
          updateParamsList(paramsList, defaultParams, updatedParams, deleteDefaultParam, deleteCustomParam);
        });
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