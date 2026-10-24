// 八字干支交叉驗證：node scripts/ganzhi-test.mjs
//
// 以 lunar-typescript（iztro 的相依套件）為基準，驗證 public/ganzhi.js：
//   1. 年／月／日／時柱逐日逐時辰比對（1950–2030）
//   2. 四柱反查日期的往返測試
//   3. 早晚子時的處理
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as L from 'lunar-typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// public/ganzhi.js 是瀏覽器腳本，這裡用 vm 載入它的資料與邏輯
const src = fs.readFileSync(path.join(ROOT, 'public', 'ganzhi.js'), 'utf8');
const dataSrc = fs.readFileSync(path.join(ROOT, 'public', 'ganzhi-data.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(dataSrc, sandbox);
vm.runInNewContext(src, sandbox);
const G = sandbox.window.ZiweiGanzhi;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
}

// 1. 逐日逐時辰比對
let mismatches = [];
let checked = 0;
for (let y = 1950; y <= 2030; y += 1) {
  for (let m = 1; m <= 12; m += 1) {
    for (let d = 1; d <= 28; d += 1) {
      for (const hourIndex of [0, 1, 6, 11, 12]) {
        // 時辰索引 → 該時辰的代表時刻：子=0 點（早子）、丑=1 點、寅=3 點…亥=21 點、晚子=23 點
        const hour = hourIndex === 12 ? 23 : hourIndex === 0 ? 0 : hourIndex * 2 - 1;
        const e = L.Solar.fromYmdHms(y, m, d, hour, 0, 0).getLunar().getEightChar();
        if (hourIndex === 12) e.setSect(1); // 晚子換日（主流口徑）
        const mine = G.pillars([y, m, d], hourIndex, true);
        const theirs = { year: e.getYear(), month: e.getMonth(), day: e.getDay(), hour: e.getTime() };
        checked += 1;
        if (
          mine.year !== theirs.year ||
          mine.month !== theirs.month ||
          mine.day !== theirs.day ||
          mine.hour !== theirs.hour
        ) {
          mismatches.push(`${y}-${m}-${d} 時辰${hourIndex}: ${JSON.stringify(mine)} vs ${JSON.stringify(theirs)}`);
        }
      }
    }
  }
}
check(
  `逐日逐時辰比對（${checked.toLocaleString()} 組）`,
  mismatches.length === 0,
  mismatches.length ? mismatches.slice(0, 3).join(' | ') : ''
);

// 2. 四柱反查往返
const samples = [
  [1990, 5, 17, 6],
  [1970, 11, 6, 5],
  [2000, 1, 1, 0],
  [1985, 12, 31, 12],
  [2024, 2, 4, 3],
  [1965, 7, 15, 9],
];
let roundTripFails = [];
for (const [y, m, d, hi] of samples) {
  const p = G.pillars([y, m, d], hi, true);
  const found = G.datesFromPillars(p);
  const ok = found.some(
    (c) =>
      c.date[0] === y &&
      c.date[1] === m &&
      c.date[2] === d &&
      c.timeIndex === (hi === 12 ? 12 : hi)
  );
  if (!ok) roundTripFails.push(`${y}-${m}-${d} 時辰${hi} (${p.year}${p.month}${p.day}${p.hour})`);
}
check('四柱反查往返', roundTripFails.length === 0, roundTripFails.join(' | '));

// 3. 早晚子：23:00 出生在換日口徑下，日柱應為隔日
const lateZi = G.pillars([1990, 1, 30], 12, true);
const earlyZi = G.pillars([1990, 1, 31], 0, true);
check('晚子換日：日柱與隔日早子相同', lateZi.day === earlyZi.day, `${lateZi.day} vs ${earlyZi.day}`);

// 4. 節氣換年：立春前仍屬前一年
const beforeLiChun = G.pillars([1990, 1, 30], 6, true);
const afterLiChun = G.pillars([1990, 2, 10], 6, true);
check('立春換年', beforeLiChun.year === '己巳' && afterLiChun.year === '庚午', `${beforeLiChun.year} / ${afterLiChun.year}`);

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log('\nALL GANZHI TESTS PASSED');
