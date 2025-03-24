// 尋找 HTML 的所有連結，並將 URL 中包含特定參數的部分刪除
function processLinks() {
  const links = document.querySelectorAll('a');

  links.forEach(link => {
    try {
      if (!link.href) return; // 檢查 href 是否存在
      let url = new URL(link.href); // 嘗試構造 URL
      let params = new URLSearchParams(url.search);
      let modified = false;

      // 收集所有參數的鍵，然後逐一刪除
      const keys = Array.from(params.keys());
      keys.forEach(param => {
        if (paramPattern.test(param)) {
          params.delete(param);
          modified = true;
        }
      });

      if (modified) {
        url.search = params.toString();
        link.href = url.toString();
        link.style.outline = '1px dashed green';
        console.log("Modified link:", link.href);
      }
    } catch (error) {
      console.warn("Skipping invalid URL:", link.href, error);
    }
  });
}

// 清除當前頁面 URL 中特定的參數
function cleanCurrentPageURL() {
  try {
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    let modified = false;

    // 收集所有參數的鍵，然後逐一刪除
    const keys = Array.from(params.keys());
    keys.forEach(param => {
      if (paramPattern.test(param)) {
        params.delete(param);
        modified = true;
      }
    });

    if (modified) {
      url.search = params.toString();
      history.replaceState(null, '', url.toString());
      console.log("Cleaned current page URL:", url.toString());
    }
  } catch (error) {
    console.warn("Failed to clean current page URL:", error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cleanCurrentPageURL();
    processLinks();
  });
} else {
  cleanCurrentPageURL();
  processLinks();
}