window.defaultParams = [
  '^utm_', '^stm_', '_gl', '_ga', '^__hs', '^_hs', '^hsa_', 'icid', 'igshid',
  '^mc_', 'mkt_tok', 'fbclid', 'yclid', '_openstat', 'wicked', 'jobsource', 'xmt',
  'otc', '^oly_', 'rb_clickid', '^soc_', 'cvid', 'oicd', 'vgo_ee',
  'srsltid', 'gs_lcrp', 'gclid', 'gad_source', 'sxsrf', 'sca_esv',
  '^ref_', '\$deep_link', '\$3p', 'correlation_id', 'post_fullname',
  '_branch_match_id', '_branch_referrer',
  'trk', 'mcid', 'upsellOrderOrigin', 'referenceId', 'miniProfileUrn', 'lipi', 'trkEmail', 'midSig', 'midToken', 'otpToken',
  'msclkid', 'rlid', 'fr2',
  '^attr_', '_source_', 'is_from_webapp', 'sender_device'
];

// 從 storage 中獲取參數
function getStoredParams(keys, callback) {
  chrome.storage.sync.get(keys, callback);
}

// 儲存參數到 storage
function saveParams(key, params, callback) {
  chrome.storage.sync.set({ [key]: params }, callback);
}

// 創建參數列表項
function createParamsListElement(el, param, isDefault, deleteCallback) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = param;
  li.appendChild(span);

  const deleteButton = document.createElement('button');
  deleteButton.textContent = '✖';
  deleteButton.style.color = '#ff2453';
  deleteButton.title = `DELETE ${param}`;
  deleteButton.addEventListener('click', () => deleteCallback(param));

  li.appendChild(deleteButton);
  return li;
}

// 更新參數列表的 DOM
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

  // 顯示 customParams
  customParams.forEach(param => {
    const li = createParamsListElement(paramsListElement, param, false, deleteCustomParam);
    paramsListElement.appendChild(li);
  });
}
