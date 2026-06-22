// declarativeNetRequest 規則產生器（純函式，不碰 chrome API，方便測試）。
// 由 background service worker 透過 importScripts 載入，掛在 globalThis.buildDnrRules。
//
// DNR 的能力與限制（決定了下面的處理方式）：
//   - action.redirect.transform.queryTransform.removeParams 只能「精確比對參數名」，
//     無法做前綴比對（如 ^utm_），且區分大小寫。
//   - condition.requestDomains 是「網域 + 子網域」精確比對，無法做 hostname.includes()。
// 因此：
//   - ^ 開頭的前綴參數 → 查 prefixExpansions 展開為實際參數名；查不到則無法用 DNR，
//     回報在 fallback（仍由 content script 在載入後補清）。
//   - 有 domain 限定的參數 → 查 domainExpansions 展開為實際網域清單放入 requestDomains；
//     查不到則直接用該 domain 字串。
//
// 規則分組：
//   - 無 domain 的參數 → 一條「全域」規則（不設 requestDomains，套用所有網址）。
//   - 有 domain 的參數 → 依 domain 各成一條規則。
// 當某請求同時符合全域與網域規則時，單次評估只會套用一條 redirect；DNR 會對 redirect
// 後的請求「再次評估」，因此會以多次（有上限）redirect 收斂，最終兩組參數都會被移除。

(function (root) {
  // 將單一參數設定解析為 DNR 可用的實際參數名陣列；無法表達時回傳 null。
  function resolveRemoveParamNames(param, prefixExpansions) {
    if (typeof param !== 'string' || !param) return null;
    if (param.startsWith('^')) {
      const expanded = prefixExpansions && prefixExpansions[param];
      return Array.isArray(expanded) && expanded.length ? expanded.slice() : null;
    }
    return [param];
  }

  // params：已套用 cancel 白名單過濾後的清單，元素為 { param, domain }。
  // 回傳 { rules, fallback }；fallback 為無法用 DNR 表達、需由 content script 補清的參數名。
  function buildDnrRules(params, prefixExpansions, domainExpansions, startId) {
    let id = typeof startId === 'number' ? startId : 1;
    const globalRemove = new Set();
    const domainGroups = new Map(); // domain 字串 -> Set(removeParam 名稱)
    const fallback = [];

    (Array.isArray(params) ? params : []).forEach(p => {
      if (!p || !p.param) return;
      const names = resolveRemoveParamNames(p.param, prefixExpansions);
      const domain = (p.domain || '').trim();
      if (!names) {
        fallback.push(p.param);
        return;
      }
      if (!domain) {
        names.forEach(n => globalRemove.add(n));
      } else {
        if (!domainGroups.has(domain)) domainGroups.set(domain, new Set());
        const set = domainGroups.get(domain);
        names.forEach(n => set.add(n));
      }
    });

    const rules = [];
    const makeRule = (removeParams, requestDomains) => {
      const condition = { resourceTypes: ['main_frame'] };
      if (requestDomains && requestDomains.length) condition.requestDomains = requestDomains;
      return {
        id: id++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { transform: { queryTransform: { removeParams } } }
        },
        condition
      };
    };

    if (globalRemove.size) {
      rules.push(makeRule([...globalRemove]));
    }
    for (const [domain, set] of domainGroups) {
      const requestDomains = domainExpansions && Array.isArray(domainExpansions[domain])
        ? domainExpansions[domain].slice()
        : [domain];
      rules.push(makeRule([...set], requestDomains));
    }
    return { rules, fallback };
  }

  root.resolveRemoveParamNames = resolveRemoveParamNames;
  root.buildDnrRules = buildDnrRules;
})(typeof globalThis !== 'undefined' ? globalThis : self);
