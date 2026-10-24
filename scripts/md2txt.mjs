// Markdown 轉純文字：node scripts/md2txt.mjs <input.md> [output.txt]
//
// 把匯出的「命盤解讀_xxx.md」轉成可以直接貼到通訊軟體的純文字檔。
// 轉換邏輯在 public/md2txt.js（瀏覽器與 Node 共用）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { convert } = require(path.join(ROOT, 'public', 'md2txt.js'));

const [, , inputArg, outputArg] = process.argv;
if (!inputArg) {
  console.log('用法：node scripts/md2txt.mjs <input.md> [output.txt]');
  process.exit(1);
}

const input = path.resolve(inputArg);
const output = outputArg ? path.resolve(outputArg) : input.replace(/\.md$/i, '') + '.txt';

fs.writeFileSync(output, convert(fs.readFileSync(input, 'utf8')), 'utf8');
console.log(`已轉成純文字：${output}（${(fs.statSync(output).size / 1024).toFixed(1)} KB）`);
