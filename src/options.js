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

  // 兼容舊格式：自訂參數補成 {param, note, domain}
  function normalizeCustom(arr) {
    return (Array.isArray(arr) ? arr : []).map(p => {
      if (typeof p === 'string') return { param: p, note: '', domain: '' };
      if (!('domain' in p)) p.domain = '';
      return p;
    });
  }

  // 重新讀取 storage 並重繪三個區塊：參數列表、前綴對照表、還原清單。
  function refreshAll() {
    getStoredParams(['url_parameter_eraser_params', 'defaultParamsCancel'], function(data) {
      const cancel = Array.isArray(data.defaultParamsCancel) ? data.defaultParamsCancel : [];
      const customParams = normalizeCustom(data.url_parameter_eraser_params);
      updateParamsList(paramsList, getEffectiveDefaultParams(cancel), customParams, deleteDefaultParam, deleteCustomParam);
      renderPrefixTable(cancel);
      renderRestoreList(cancel, customParams);
    });
  }

  // 「載入前固定攔截」前綴對照表：由 prefixExpansions 產生（與 DNR 規則同源）並扣除已刪除（cancel）的前綴，
  // 表格增修時此處自動同步。讓使用者知道這些前綴已內建、無需手動新增。
  function renderPrefixTable(cancelArr) {
    const container = document.getElementById('prefixTable');
    if (!container) return;
    container.textContent = '';
    const cancel = Array.isArray(cancelArr) ? cancelArr : [];
    const expansions = (typeof globalThis !== 'undefined' && globalThis.prefixExpansions) || {};
    const prefixes = Object.keys(expansions).filter(p => !cancel.includes(p));
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

  // 還原清單：列出被刪除（在 cancel 中）且確實是內建預設的參數，各給一顆「還原」鈕（逐一還原）。
  function renderRestoreList(cancelArr, customParams) {
    const section = document.getElementById('restoreSection');
    const list = document.getElementById('restoreList');
    if (!section || !list) return;
    list.textContent = '';
    const cancel = Array.isArray(cancelArr) ? cancelArr : [];
    const defaultNames = (Array.isArray(window.defaultParams) ? window.defaultParams : [])
      .map(p => (typeof p === 'string' ? p : p.param));
    const deleted = cancel.filter(c => defaultNames.includes(c));
    section.hidden = deleted.length === 0;
    deleted.forEach(param => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'restore-name';
      name.textContent = param;
      const btn = document.createElement('button');
      btn.className = 'restore-btn';
      btn.textContent = chrome.i18n.getMessage('optionsRestoreButton');
      btn.addEventListener('click', () => restoreDefaultParam(param));
      li.appendChild(name);
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  // 還原內建參數 = 移出 cancel 名單 + 直接吸收掉同名自訂（含其 note/domain 一併丟棄）。
  function restoreDefaultParam(param) {
    getStoredParams(['url_parameter_eraser_params', 'defaultParamsCancel'], function(data) {
      const cancel = (Array.isArray(data.defaultParamsCancel) ? data.defaultParamsCancel : [])
        .filter(c => c !== param);
      const customParams = normalizeCustom(data.url_parameter_eraser_params).filter(p => p.param !== param);
      chrome.storage.sync.set({ defaultParamsCancel: cancel }, function() {
        saveParams('url_parameter_eraser_params', customParams, refreshAll);
      });
    });
  }

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

  // 顯示新增結果訊息（防呆提示）
  function showAddFeedback(msg, isError) {
    const el = document.getElementById('addFeedback');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isError);
  }

  // 儲存自訂參數（含防呆：已存在的參數不可重複新增）
  addButton.addEventListener('click', function() {
    const inputs = customParamsInput.value.split(',').map(p => escapeRegex(p.trim())).filter(Boolean);
    const note = customParamsNoteInput ? customParamsNoteInput.value.trim() : '';
    let domain = customParamsDomainInput ? customParamsDomainInput.value.trim().toLowerCase() : '';
    if (!domain) domain = '';
    if (!inputs.length) return;
    getStoredParams(['url_parameter_eraser_params', 'defaultParamsCancel'], function(data) {
      const cancel = Array.isArray(data.defaultParamsCancel) ? data.defaultParamsCancel : [];
      const existingParams = normalizeCustom(data.url_parameter_eraser_params);
      // 有效集合 = 內建（−cancel）+ 現有自訂；命中即視為「已存在」，不重複新增。
      const activeNames = new Set([
        ...getEffectiveDefaultParams(cancel).map(p => (typeof p === 'string' ? p : p.param)),
        ...existingParams.map(p => p.param)
      ]);
      const added = [];
      const duplicates = [];
      inputs.forEach(param => {
        if (activeNames.has(param)) {
          duplicates.push(param);
        } else {
          existingParams.push({ param, note, domain });
          activeNames.add(param);
          added.push(param);
        }
      });
      const dupMsg = duplicates.length
        ? chrome.i18n.getMessage('optionsDuplicateMsg', duplicates.join(', '))
        : '';
      if (!added.length) {
        showAddFeedback(dupMsg, true);
        return;
      }
      saveParams('url_parameter_eraser_params', existingParams, function() {
        customParamsInput.value = '';
        if (customParamsNoteInput) customParamsNoteInput.value = '';
        if (customParamsDomainInput) customParamsDomainInput.value = '';
        showAddFeedback(dupMsg, duplicates.length > 0);
        refreshAll();
      });
    });
  });

  // 加載已保存的設置
  getStoredParams(['url_parameter_eraser_params', 'defaultParamsCancel'], function(data) {
    refreshAll();
    // 若 local 沒有但 sync 有，則同步回 local（沿用既有相容行為）
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
    chrome.storage.sync.get(['defaultParamsCancel'], function(data) {
      const cancelList = Array.isArray(data.defaultParamsCancel) ? data.defaultParamsCancel : [];
      if (!cancelList.includes(paramToDelete)) cancelList.push(paramToDelete);
      chrome.storage.sync.set({ defaultParamsCancel: cancelList }, refreshAll);
    });
  }

  // 刪除 customParams 中的參數
  function deleteCustomParam(paramToDelete) {
    getStoredParams(['url_parameter_eraser_params'], function(data) {
      const updatedParams = normalizeCustom(data.url_parameter_eraser_params).filter(p => p.param !== paramToDelete);
      saveParams('url_parameter_eraser_params', updatedParams, refreshAll);
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