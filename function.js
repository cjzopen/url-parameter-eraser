window.defaultParams = [
  '^utm_', '^stm_', '_gl', '_ga', 'clid', '_hs', 'hsa_', 'icid', 'igshid',
  'mc_', 'mkt_tok', 'yclid', '_openstat', 'wicked',
  'otc', 'oly_', 'rb_clickid', 'soc_', 'cvid', 'oicd', 'vgo_ee',
  'srsltid', 'gs_lcrp', 'gclid', 'gad_source', 'sxsrf', 'sca_esv'
];

// 從存儲中獲取參數
function getStoredParams(keys, callback) {
  chrome.storage.sync.get(keys, callback);
}

// 儲存參數到存儲
function saveParams(key, params, callback) {
  chrome.storage.sync.set({ [key]: params }, callback);
}

// 更新參數列表的 DOM
function updateParamsList(paramsListElement, defaultParams, customParams, deleteDefaultParam, deleteCustomParam) {
  paramsListElement.innerHTML = ''; // 清空列表

  // 顯示 defaultParams
  defaultParams.forEach(param => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = param + ' (預設)';
    li.appendChild(span);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '❌';
    deleteButton.style.marginLeft = '10px';
    deleteButton.addEventListener('click', () => deleteDefaultParam(param));

    li.appendChild(deleteButton);
    paramsListElement.appendChild(li);
  });

  // 顯示 customParams
  customParams.forEach(param => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = param;
    li.appendChild(span);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '❌';
    deleteButton.style.marginLeft = '10px';
    deleteButton.addEventListener('click', () => deleteCustomParam(param));

    li.appendChild(deleteButton);
    paramsListElement.appendChild(li);
  });
}
