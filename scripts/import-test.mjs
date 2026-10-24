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
const parseMarkdown = sandbox.window.ZiweiImport.parseMarkdown;

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
  {
    name: '點分隔日期 + 簡體時辰 + 無姓名',
    line: '1984.3.1.卯时 女',
    expect: (r) => r.year === 1984 && r.month === 3 && r.day === 1 && r.timeIndex === 3 && r.gender === '女' && r.name === '',
  },
];

for (const c of cases) {
  const r = parseLine(c.line, 0);
  const ok = !!r && c.expect(r);
  check(c.name, ok, ok ? '' : JSON.stringify(r));
}

// .md 匯出檔的解析（拖進來的檔案）
const mdSample = `# 劉德亮 的命盤解讀

- 性別：男
- 國曆：1970-11-6（巳時 09:00~11:00）
- 農曆：一九七〇年十月初八 · 庚戌 丁亥 庚寅 辛巳
- 五行局：木三局 · 命主 破軍 · 身主 文昌
- 生肖 狗 · 命宮在午

## 總覽（60 分／平穩）
`;

const mdCases = [
  {
    name: '匯出檔：姓名',
    expect: (r) => r.name === '劉德亮',
  },
  {
    name: '匯出檔：性別',
    expect: (r) => r.gender === '男',
  },
  {
    name: '匯出檔：國曆日期',
    expect: (r) => r.year === 1970 && r.month === 11 && r.day === 6,
  },
  {
    name: '匯出檔：時辰（巳時）',
    expect: (r) => r.timeIndex === 5,
  },
  {
    name: '匯出檔：不是匯出檔時標記錯誤',
    text: '這是一般筆記\n沒有生辰資料',
    expect: (r) => r.error === true,
  },
  {
    name: '匯出檔：晚子時',
    text: '# 王小明 的命盤解讀\n\n- 性別：女\n- 國曆：1990-5-17（晚子時 23:00~23:59）\n',
    expect: (r) => r.timeIndex === 12 && r.year === 1990,
  },
];

for (const c of mdCases) {
  const r = parseMarkdown(c.text || mdSample, 'test.md');
  const ok = !!r && c.expect(r);
  check(c.name, ok, ok ? '' : JSON.stringify(r));
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log('\nALL IMPORT TESTS PASSED');
