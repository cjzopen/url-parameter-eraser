// manifest v3 已經不支援 webRequest API
// 用 declarativeNetRequest API 取代
import { paramPattern } from './url-parameter-eraser_params.js';

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    let url = new URL(details.url);
    let params = new URLSearchParams(url.search);

    for (let param of params.keys()) {
      if (paramPattern.test(param)) {
        params.delete(param);
      }
    }

    url.search = params.toString();
    return { redirectUrl: url.toString() };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// ...existing code for handling custom parameters and whitelist...