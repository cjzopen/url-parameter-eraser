const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// 遞迴建立資料夾
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 處理單一檔案
async function processFile(srcPath, distPath) {
  const ext = path.extname(srcPath).toLowerCase();
  if (ext === '.js') {
    // JS 壓縮
    const code = fs.readFileSync(srcPath, 'utf8');
    const result = await minify(code);
    fs.writeFileSync(distPath, result.code, 'utf8');
  } else if (ext === '.json') {
    // JSON 壓縮
    const json = fs.readFileSync(srcPath, 'utf8');
    const minified = JSON.stringify(JSON.parse(json));
    fs.writeFileSync(distPath, minified, 'utf8');
  } else {
    // 其他檔案直接複製
    fs.copyFileSync(srcPath, distPath);
  }
}

// 遞迴處理資料夾
async function processDir(src, dist) {
  ensureDirSync(dist);
  const items = fs.readdirSync(src, { withFileTypes: true });
  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const distPath = path.join(dist, item.name);
    if (item.isDirectory()) {
      await processDir(srcPath, distPath);
    } else {
      await processFile(srcPath, distPath);
    }
  }
}

// 主程式
(async () => {
  ensureDirSync(distDir);
  await processDir(srcDir, distDir);
  console.log('壓縮與複製完成！');
})();