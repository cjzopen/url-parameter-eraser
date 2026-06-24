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

  // 「載入前固定攔截」前綴對照表：直接由 prefixExpansions 產生（與 DNR 規則同源），
  // 表格增修時此處自動同步。讓使用者知道這些前綴已內建、無需手動新增。
  function renderPrefixTable() {
    const container = document.getElementById('prefixTable');
    if (!container) return;
    const expansions = (typeof globalThis !== 'undefined' && globalThis.prefixExpansions) || {};
    const prefixes = Object.keys(expansions);
    if (!prefixes.length) return;

    const title = document.createElement('div');
    title.className = 'prefix-table-title';
    title.textContent = chrome.i18n.getMessage('optionsPrefixTableTitle');
    container.appendChild(title);

    const table = document.createElement('table');
    prefixes.forEach(prefix => {
      const names = Array.isArray(expansions[prefix]) ? expansions[prefix] : [];
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = prefix;
      const td = document.createElement('td');
      td.textContent = names.join(', ');
      tr.appendChild(th);
      tr.appendChild(td);
      table.appendChild(tr);
    });
    container.appendChild(table);
  }
  renderPrefixTable();

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

  // 要顯示／套用的預設參數 = 內建清單（default-params.js）扣除使用者刪除的（defaultParamsCancel 白名單）。
  // 刻意「不持久化 defaultParams」，這樣版本更新時 default-params.js 新增的參數會自動出現，
  // 已刪除的仍因 cancel 名單而不顯示。
  function getEffectiveDefaultParams(cancelArr) {
    const cancel = Array.isArray(cancelArr) ? cancelArr : [];
    const base = Array.isArray(window.defaultParams) ? window.defaultParams : defaultParams;
    return base.filter(p => !cancel.includes(typeof p === 'string' ? p : p.param));
  }

  // 儲存自訂參數
  addButton.addEventListener('click', function() {
    let customParams = customParamsInput.value.split(',').map(param => escapeRegex(param.trim())).filter(param => param);
    let note = customParamsNoteInput ? customParamsNoteInput.value.trim() : '';
    let domain = customParamsDomainInput ? customParamsDomainInput.value.trim().toLowerCase() : '';
    if (!domain) domain = '';
    if (!customParams.length) return;
    getStoredParams(['url_parameter_eraser_params', 'defaultParamsCancel'], function(data) {
      let existingParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      existingParams = existingParams.map(p => {
        if (typeof p === 'string') return {param: p, note: '', domain: ''};
        if (!('domain' in p)) p.domain = '';
        return p;
      });
      customParams.forEach(param => {
        const idx = existingParams.findIndex(p => p.param === param);
        if (idx !== -1) {
          existingParams[idx].note = note;
          existingParams[idx].domain = domain;
        } else {
          existingParams.push({param, note, domain});
        }
      });
      saveParams('url_parameter_eraser_params', existingParams, function() {
        updateParamsList(paramsList, getEffectiveDefaultParams(data.defaultParamsCancel), existingParams, deleteDefaultParam, deleteCustomParam);
        customParamsInput.value = '';
        if (customParamsNoteInput) customParamsNoteInput.value = '';
        if (customParamsDomainInput) customParamsDomainInput.value = '';
      });
    });
  });

  // 加載已保存的設置
  getStoredParams(['url_parameter_eraser_params', 'defaultParamsCancel'], function(data) {
    let customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
    // 兼容舊格式，補 domain
    customParams = customParams.map(p => {
      if (typeof p === 'string') return {param: p, note: '', domain: ''};
      if (!('domain' in p)) p.domain = '';
      return p;
    });
    updateParamsList(paramsList, getEffectiveDefaultParams(data.defaultParamsCancel), customParams, deleteDefaultParam, deleteCustomParam);
    // 若 local 沒有但 sync 有，則同步回 local
    if (!data.url_parameter_eraser_params) {
      chrome.storage.sync.get(['url_parameter_eraser_params'], function(syncData) {
        if (Array.isArray(syncData.url_parameter_eraser_params)) {
          chrome.storage.local.set({ url_parameter_eraser_params: syncData.url_parameter_eraser_params });
        }
      });
    }
  });

  // 刪除預設參數：只記錄到 defaultParamsCancel 白名單，不動內建清單、也不持久化 defaultParams。
  function deleteDefaultParam(paramToDelete) {
    chrome.storage.sync.get(['defaultParamsCancel', 'url_parameter_eraser_params'], function(data) {
      let cancelList = Array.isArray(data.defaultParamsCancel) ? data.defaultParamsCancel : [];
      if (!cancelList.includes(paramToDelete)) cancelList.push(paramToDelete);
      chrome.storage.sync.set({ defaultParamsCancel: cancelList }, function() {
        let customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
        updateParamsList(paramsList, getEffectiveDefaultParams(cancelList), customParams, deleteDefaultParam, deleteCustomParam);
      });
    });
  }

  // 刪除 customParams 中的參數
  function deleteCustomParam(paramToDelete) {
    getStoredParams(['url_parameter_eraser_params', 'defaultParamsCancel'], function(data) {
      let customParams = Array.isArray(data.url_parameter_eraser_params) ? data.url_parameter_eraser_params : [];
      // 兼容舊格式，補 domain
      customParams = customParams.map(p => {
        if (typeof p === 'string') return {param: p, note: '', domain: ''};
        if (!('domain' in p)) p.domain = '';
        return p;
      });
      const updatedParams = customParams.filter(p => p.param !== paramToDelete);
      saveParams('url_parameter_eraser_params', updatedParams, function() {
        // 預設參數一律用「內建清單 − cancel」，避免被刪的預設參數重新出現
        updateParamsList(paramsList, getEffectiveDefaultParams(data.defaultParamsCancel), updatedParams, deleteDefaultParam, deleteCustomParam);
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