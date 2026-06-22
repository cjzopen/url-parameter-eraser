// 預設追蹤參數清單已移至 default-params.js（globalThis.defaultParams），
// 由 content script、options/popup 與 background service worker 共用。

// cookies 參數
// window.cookiesList = [
//   { name: '^_ga', note: ''},
//   { name: '^_ga', note: ''},
//   { name: '^_gcl', note: ''},
//   { name: '^_gid', note: ''},
//   { name: '^_dc_gtm', note: ''},
//   { name: '^_gat_', note: ''},
//   { name: 'hubspotutk', note: ''},
//   { name: '^__cf', note: ''},
//   { name: '^__hs', note: ''},
//   { name: '^_fbp', note: ''},
// ];


// 從 storage 中獲取參數
function getStoredParams(keys, callback) {
  chrome.storage.sync.get(keys, callback);
}

// 儲存參數到 storage
function saveParams(key, params, callback) {
  chrome.storage.sync.set({ [key]: params }, callback);
}

// 創建參數列表項
function createParamsListElement(el, paramObj, isDefault, deleteCallback) {
  const li = document.createElement('li');
  let param, note, domain;
  if (typeof paramObj === 'string') {
    param = paramObj;
    note = '';
    domain = '';
  } else {
    param = paramObj.param;
    note = paramObj.note || '';
    domain = paramObj.domain || '';
  }
  // 如果 domain 有值，li 加上 class="domain-only"
  if (domain && domain.trim() !== '') {
    li.classList.add('domain-only');
  }

  // popoverId 只允許 _, -, 英文
  const safeParamIdName = param.replace(/[^a-zA-Z_-]/g, '');
  const popoverId = `param-${safeParamIdName}`;

  // Popover 按鈕
  const popoverBtn = document.createElement('button');
  popoverBtn.textContent = param;
  popoverBtn.setAttribute('popovertarget', popoverId);
  popoverBtn.classList.add('paramsListPopover');
  li.appendChild(popoverBtn);

  // Popover 內容
  const popDiv = document.createElement('div');
  popDiv.setAttribute('popover', '');
  popDiv.id = popoverId;
  const infoDiv = document.createElement('div');
  infoDiv.style.display = 'flex';
  infoDiv.style.flexDirection = 'column';
  infoDiv.style.gap = '8px';

  // Popover 關閉按鈕
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('popovertarget', popoverId);
  closeBtn.type = 'button';
  closeBtn.style.alignSelf = 'flex-end';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '0';
  closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 512 512" fill="currentColor"><use href="#svg-close-button"></use></svg>';
  infoDiv.appendChild(closeBtn);

  infoDiv.innerHTML += `<b>${param}</b>`;
  if (note) infoDiv.innerHTML += `<div>Note: ${note}</div>`;
  if (domain) infoDiv.innerHTML += `<div>Domain: ${domain}</div>`;
  // 刪除按鈕
  const deleteButton = document.createElement('button');
  deleteButton.innerHTML = '<svg width="28" height="32" viewBox="0 0 448 512" fill="currentColor"><use href="#svg-delete-button"></use></svg>';
  deleteButton.style.color = '#ff2453';
  deleteButton.title = `DELETE ${param}`;
  deleteButton.style.marginTop = '60px';
  deleteButton.addEventListener('click', () => deleteCallback(param));
  infoDiv.appendChild(deleteButton);
  popDiv.appendChild(infoDiv);
  li.appendChild(popDiv);

  return li;
}

// 更新參數列表的 DOM（支援 customParams 物件格式）
function updateParamsList(paramsListElement, defaultParams, customParams, deleteDefaultParam, deleteCustomParam) {
  // 清空列表
  while (paramsListElement.firstChild) {
    paramsListElement.removeChild(paramsListElement.firstChild);
  }

  // 顯示 defaultParams
  defaultParams.forEach(param => {
    const li = createParamsListElement(paramsListElement, param, true, deleteDefaultParam);
    paramsListElement.appendChild(li);
  });

  // customParams 兼容字串與物件格式
  customParams.forEach(paramObj => {
    // 若缺 domain 欄位，自動補空字串
    if (typeof paramObj === 'object' && !('domain' in paramObj)) paramObj.domain = '';
    const li = createParamsListElement(paramsListElement, paramObj, false, deleteCustomParam);
    paramsListElement.appendChild(li);
  });
}

// 兼容舊格式 defaultParams：若為字串自動轉換為物件格式
function normalizeDefaultParams(arr) {
  return arr.map(p => {
    if (typeof p === 'string') return { param: p, note: '', domain: '' };
    if (!('note' in p)) p.note = '';
    if (!('domain' in p)) p.domain = '';
    return p;
  });
}

// 將文字轉義為正則表達式安全的格式
function escapeRegex(input) {
  if (typeof input !== 'string') input = input && input.param ? input.param : '';
  if (input.startsWith('^')) {
    return '^' + input.slice(1).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  }
  return input.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
