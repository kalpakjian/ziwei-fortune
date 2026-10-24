// 匯入解析測試：node scripts/import-test.mjs
//
// 在 vm 裡載入 public/ 的瀏覽器腳本，檢查各種生辰寫法的解析結果。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = {
  window: {},
  document: { getElementById: () => null, querySelectorAll: () => [] },
  console,
};
sandbox.window.ZiweiRender = { esc: (v) => String(v ?? '') };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'public', 'ganzhi-data.js'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'public', 'ganzhi.js'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'public', 'import.js'), 'utf8'), sandbox);
const parseLine = sandbox.window.ZiweiImport.parseLine;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
}

const cases = [
  {
    name: '日期 + 時辰 + 性別 + 姓名',
    line: '1970-11-6 巳時 男 劉德亮',
    expect: (r) => r.year === 1970 && r.month === 11 && r.day === 6 && r.timeIndex === 5 && r.gender === '男' && r.name === '劉德亮',
  },
  {
    name: '姓名在前',
    line: '王小明 1990-5-17 午時 女',
    expect: (r) => r.year === 1990 && r.month === 5 && r.day === 17 && r.timeIndex === 6 && r.gender === '女' && r.name === '王小明',
  },
  {
    name: '農曆標記',
    line: '農曆 1990-4-23 子時 男 李四',
    expect: (r) => r.calendar === 'lunar' && r.year === 1990 && r.month === 4 && r.day === 23 && r.timeIndex === 0,
  },
  {
    name: '中文日期',
    line: '1990年5月17日 午時 女',
    expect: (r) => r.year === 1990 && r.month === 5 && r.day === 17 && r.timeIndex === 6,
  },
  {
    name: '晚子時',
    line: '1990-5-17 晚子時 男',
    expect: (r) => r.timeIndex === 12,
  },
  {
    name: '時辰用數字',
    line: '1990-5-17 時辰 9 男',
    expect: (r) => r.timeIndex === 9,
  },
  {
    name: '四柱八字（農曆月柱口徑）',
    line: '庚戌 丁亥 庚寅 辛巳',
    expect: (r) => r.year === 1970 && r.month === 11 && r.day === 6 && r.timeIndex === 5,
  },
  {
    name: '四柱八字（節氣月柱口徑）',
    line: '庚午 辛巳 壬午 丙午',
    expect: (r) => r.year === 1990 && r.month === 5 && r.day === 17 && r.timeIndex === 6,
  },
  {
    name: '四柱八字（子時：早子與晚子兩解）',
    line: '庚午 辛巳 壬午 庚子',
    expect: (r) => r.year === 1990 && r.month === 5 && r.day === 17 && r.timeIndex === 0 && r.alternatives.length === 2,
  },
  {
    name: '沒有日期 → 標記錯誤',
    line: '王小明',
    expect: (r) => r.error === true,
  },
  {
    name: '沒有時辰 → 給預設並註記',
    line: '1990-5-17 男',
    expect: (r) => r.timeIndex === 6 && /時辰/.test(r.note),
  },
];

for (const c of cases) {
  const r = parseLine(c.line, 0);
  const ok = !!r && c.expect(r);
  check(c.name, ok, ok ? '' : JSON.stringify(r));
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log('\nALL IMPORT TESTS PASSED');
