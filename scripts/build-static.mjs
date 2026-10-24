// 產生可部署到 GitHub Pages 的純靜態版（docs/）
// 執行：npm run build
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DOCS = path.join(ROOT, 'docs');

fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(DOCS, { recursive: true });
fs.cpSync(PUBLIC, DOCS, { recursive: true });

const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'browser', 'main.js')],
  outfile: path.join(DOCS, 'engine.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2019'],
  legalComments: 'none',
  logLevel: 'warning',
  metafile: true,
});

// 在 app.js 之前載入引擎
// 換行沿用原檔的 CRLF，避免產出混合換行的檔案
const indexPath = path.join(DOCS, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('./engine.js')) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  html = html.replace(
    '<script src="./app.js"></script>',
    `<script src="./engine.js"></script>${eol}<script src="./app.js"></script>`
  );
  fs.writeFileSync(indexPath, html, 'utf8');
}

// GitHub Pages 不需要 Jekyll 處理
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '');

function walk(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? walk(full) : fs.statSync(full).size;
  }
  return total;
}

const total = walk(DOCS);
const engine = fs.readFileSync(path.join(DOCS, 'engine.js'));
const gzip = zlib.gzipSync(engine, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const outputs = Object.keys(result.metafile.outputs);
console.log('靜態版已產生：docs/');
console.log(`  檔案總大小：${kb(total)}`);
console.log(`  engine.js：${kb(engine.length)}（gzip ${kb(gzip)}）`);
console.log(`  打包輸出：${outputs.map((o) => path.relative(ROOT, o)).join(', ')}`);
console.log('部署：把 docs/ 推到 GitHub，Settings → Pages → Deploy from branch → /docs');
