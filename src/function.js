window.defaultParams = [
  '^utm_', '^stm_', '_gl', '_ga', '^__hs', '^_hs', '^hsa_', 'icid', 'igshid', 'ocid',
  '^mc_', 'mkt_tok', 'fbclid', 'yclid', '_openstat', 'wicked', 'jobsource', 'xmt',
  'otc', '^oly_', 'rb_clickid', '^soc_', 'cvid', 'oicd', 'vgo_ee',
  'srsltid', 'gs_lcrp', 'gclid', 'gad_source', 'gad_campaignid', 'gbraid', 'sxsrf', 'sca_esv',
  '^ref_', '\$deep_link', '\$3p', 'correlation_id', 'post_fullname',
  '_branch_match_id', '_branch_referrer',
  'trk', 'mcid', 'upsellOrderOrigin', 'referenceId', 'miniProfileUrn', 'lipi', 'trkEmail', 'midSig', 'midToken', 'otpToken',
  'msclkid', 'rlid', 'fr2', 'refId', 'trackingId',
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

// 創建參數列表項（支援 note, domain）
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
  const span = document.createElement('span');
  span.textContent = param;
  li.appendChild(span);

  // title 顯示 note 與 domain
  let title = note ? note : param;
  if (domain) title += `\n(domain: ${domain})`;
  li.title = title;

  const deleteButton = document.createElement('button');
  deleteButton.textContent = '✖';
  deleteButton.style.color = '#ff2453';
  deleteButton.title = `DELETE ${param}`;
  deleteButton.addEventListener('click', () => deleteCallback(param));

  li.appendChild(deleteButton);
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
