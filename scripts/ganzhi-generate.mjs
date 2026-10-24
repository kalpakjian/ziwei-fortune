// 產生 public/ganzhi.js 用的節氣表與日柱錨點（開發期工具）。
//   node scripts/ganzhi-generate.mjs
//
// 以 lunar-typescript（iztro 的相依套件）為基準，輸出：
//   - 1950–2031 每年的 12 個月柱起點（立春…大雪 + 次年小寒）
//   - 一個已知的「西元日期 → 日柱」錨點
import * as L from 'lunar-typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FROM = 1949;
const TO = 2031;
/** 月柱起點的節氣：前 11 個取該年的中文鍵，小寒取拼音鍵（隔年的那一次） */
const TERMS = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];

const rows = [];
for (let y = FROM; y <= TO; y += 1) {
  const table = L.Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
  const dates = TERMS.map((t) => {
    const v = table[t];
    if (!v) throw new Error(`缺少節氣 ${t}（${y}）`);
    const s = typeof v === 'string' ? `${v} 00:00:00` : v.toYmdHms();
    return `${s.slice(5, 10)} ${s.slice(11, 19)}`;
  });
  // 小寒在隔年 1 月：拼音鍵 XIAO_HAN 才是「下一次」
  const xiaoHan = table['XIAO_HAN'];
  if (!xiaoHan) throw new Error(`缺少 XIAO_HAN（${y}）`);
  const xs = typeof xiaoHan === 'string' ? `${xiaoHan} 00:00:00` : xiaoHan.toYmdHms();
  dates.push(`${xs.slice(5, 10)} ${xs.slice(11, 19)}`);
  rows.push(`  ${y}: '${dates.join(',')}',`);
}

// 小寒是隔年 1 月，需往前一年的表取
// 小寒已由拼音鍵取得（隔年那一次），不再需要額外處理

// 日柱錨點
const anchorDate = '1900-01-01';
const [ay, am, ad] = anchorDate.split('-').map(Number);
const anchor = L.Solar.fromYmd(ay, am, ad).getLunar().getEightChar().getDay();

const GANZHI = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥',
];

console.log('/* 由 scripts/ganzhi-generate.mjs 產生，請勿手改 */');
console.log(`export const JIEQI_TABLE = {\n${rows.join('\n')}\n};`);
console.log('');
console.log(`export const DAY_ANCHOR = { date: '${anchorDate}', pillar: '${anchor}' };`);
console.log('');
console.log(`export const GAN_ZHI = ${JSON.stringify(GANZHI)};`);

// 直接寫出前端可用的資料檔
const OUT = path.join(ROOT, 'public', 'ganzhi-data.js');
fs.writeFileSync(
  OUT,
  `'use strict';

/* 由 scripts/ganzhi-generate.mjs 產生，請勿手改。
   JIEQI_TABLE：每年 12 個月柱起點節氣（立春、驚蟄、清明、立夏、芒種、小暑、立秋、白露、寒露、立冬、大雪、次年小寒）。
   DAY_ANCHOR：日柱循環的錨點（西元日期 → 六十甲子）。
   GAN_ZHI：六十甲子表。 */

window.ZiweiGanzhiData = {
  JIEQI_TABLE: {
${rows.join('\n')}
  },
  DAY_ANCHOR: { date: '${anchorDate}', pillar: '${anchor}' },
  GAN_ZHI: ${JSON.stringify(GANZHI)},
};
`,
  'utf8'
);
console.log(`\n已寫出 ${OUT}（${(fs.statSync(OUT).size / 1024).toFixed(1)} KB）`);
