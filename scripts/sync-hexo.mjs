// 把 docs/ 同步到 Hexo 的 source/ziwei-fortune/
// 用法：npm run sync:hexo
// 可用 HEXO_SOURCE 覆寫目的地
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const TARGET =
  process.env.HEXO_SOURCE || 'C:\\Users\\princ\\blog\\source\\ziwei-fortune';

if (!fs.existsSync(DOCS)) {
  console.error('找不到 docs/，請先執行 npm run build');
  process.exit(1);
}

fs.rmSync(TARGET, { recursive: true, force: true });
fs.cpSync(DOCS, TARGET, { recursive: true });

const files = fs.readdirSync(TARGET);
const total = files.reduce(
  (n, f) => n + fs.statSync(path.join(TARGET, f)).size,
  0
);
console.log(`已同步 ${files.length} 個檔案到 ${TARGET}（${(total / 1024).toFixed(1)} KB）`);
console.log('下一步：到 Hexo 目錄 commit + push，讓 GitHub Actions 部署。');
