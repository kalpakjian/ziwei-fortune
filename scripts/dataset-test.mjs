// v4.0 資料集測試：node scripts/dataset-test.mjs
//
// 檢查 key 對應（晚子時跨日）、查詢結果、與本程式排盤的交叉比對，
// 以及沒有資料集時的優雅降級。
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const dataset = require(path.join(ROOT, 'dataset', 'index.js'));
const { astro } = require(path.join(ROOT, 'node_modules', 'iztro'));

/** 資料集用簡體，iztro 用繁體，比對時先換算 */
const SIMPLIFIED = {
  天机: '天機',
  太阳: '太陽',
  廉贞: '廉貞',
  太阴: '太陰',
  贪狼: '貪狼',
  巨门: '巨門',
  七杀: '七殺',
  破军: '破軍',
};
const toTraditional = (name) => SIMPLIFIED[name] || name;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
}

const years = dataset.availableYears();
if (!years.length) {
  console.log('SKIP  尚未下載任何年度資料集（npm run dataset:download -- --year 1990）');
  process.exit(0);
}
const year = years[0];

// 1. key 對應
const normal = dataset.resolveKey('1990-5-17', 6, '女');
check('一般時辰的 key', normal.key === '1990-05-17-6-female', normal.key);

const late = dataset.resolveKey('1990-12-31', 12, '男');
check('晚子時算隔日子的子時', late.key === '1991-01-01-0-male', late.key);

const early = dataset.resolveKey('1990-1-1', 0, '男');
check('早子時就是當天子時', early.key === '1990-01-01-0-male', early.key);

// 2. 查詢
const ds = await dataset.lookup({ solarDate: `${year}-5-17`, timeIndex: 6, gender: '女' });
check('查得到資料', ds.available === true, ds.state);
check('13 個主題', ds.topics.length === 13, `${ds.topics.length} 個`);
check('每個主題都有內文', ds.topics.every((t) => t.text && t.text.length > 100));
check('總字數合理', ds.totalChars > 10000, `${ds.totalChars} 字`);
check('key 格式正確', /^\d{4}-\d{2}-\d{2}-\d{1,2}-(male|female)$/.test(ds.key), ds.key);

// 3. 與本程式排盤交叉比對命宮主星
const [y, m, d] = ds.key.split('-').slice(0, 3).map(Number);
const hour = Number(ds.key.split('-')[3]);
const gender = ds.key.endsWith('male') ? '男' : '女';
const chart = astro.bySolar(`${y}-${m}-${d}`, hour, gender, true, 'zh-TW');
const soulPalace = chart.palaces.find((p) => p.name === '命宮');
const ourStar = (soulPalace.majorStars[0] || {}).name || '';
check(
  '命宮主星與本程式排盤一致',
  toTraditional(ds.soulStar) === ourStar,
  `資料集 ${ds.soulStar} / 本程式 ${ourStar}`
);

// 4. 沒有資料集時要優雅降級
const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ziwei-ds-'));
const probe = `
  const d = require(${JSON.stringify(path.join(ROOT, 'dataset', 'index.js'))});
  d.lookup({ solarDate: '1990-5-17', timeIndex: 6, gender: '女' }).then((r) => {
    console.log(JSON.stringify({ available: r.available, state: r.state }));
  });
`;
const out = execFileSync(process.execPath, ['-e', probe], {
  env: {
    ...process.env,
    ZIWEI_DATASET_DIR: emptyDir,
    ZIWEI_DATASET_CACHE: path.join(emptyDir, '.cache'),
  },
  encoding: 'utf8',
});
const degraded = JSON.parse(out.trim());
check('沒有資料集時不會出錯', degraded.available === false, degraded.state);
fs.rmSync(emptyDir, { recursive: true, force: true });

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log('\nALL DATASET TESTS PASSED');
