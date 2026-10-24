// 建立／清理 v4.0 資料集的查詢索引（每個年度解壓成 .jsonl 並寫出位移索引）
//
//   node scripts/dataset-cache.mjs --year 1990
//   node scripts/dataset-cache.mjs --all
//   node scripts/dataset-cache.mjs --status
//   node scripts/dataset-cache.mjs --clean
//
// 解壓後的年度檔每個約 700MB，預設只保留 2 個（ZIWEI_DATASET_CACHE_MAX）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.ZIWEI_DATASET_DIR
  ? path.resolve(process.env.ZIWEI_DATASET_DIR)
  : path.join(ROOT, 'data', 'ziwei-v4');
const CACHE_DIR = process.env.ZIWEI_DATASET_CACHE
  ? path.resolve(process.env.ZIWEI_DATASET_CACHE)
  : path.join(DATA_DIR, '.cache');

const dataset = await import(path.join(ROOT, 'dataset', 'index.js'));
const { ensureYearIndex, availableYears, CACHE_MAX } = dataset.default || dataset;

function parseArgs(argv) {
  const args = { years: [], all: false, clean: false, status: false };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    switch (key) {
      case '--year':
        args.years.push(Number(next));
        i += 1;
        break;
      case '--years':
        args.years.push(...String(next).split(',').map((n) => Number(n.trim())));
        i += 1;
        break;
      case '--all':
        args.all = true;
        break;
      case '--clean':
        args.clean = true;
        break;
      case '--status':
        args.status = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        if (key.startsWith('--')) console.warn(`忽略未知參數：${key}`);
    }
  }
  return args;
}

function usage() {
  console.log(`建立 v4.0 資料集查詢索引

用法：
  node scripts/dataset-cache.mjs --year 1990
  node scripts/dataset-cache.mjs --all
  node scripts/dataset-cache.mjs --status
  node scripts/dataset-cache.mjs --clean

參數：
  --year    建立單一年度索引
  --all     建立所有已下載年度的索引
  --status  顯示快取狀態
  --clean   清除快取（不影響已下載的 .zst）

資料集目錄：${DATA_DIR}
快取目錄：${CACHE_DIR}（最多保留 ${CACHE_MAX} 個年度）`);
}

function cacheState() {
  try {
    return fs
      .readdirSync(CACHE_DIR)
      .filter((f) => /^year-\d{4}\.jsonl$/.test(f))
      .map((f) => {
        const stat = fs.statSync(path.join(CACHE_DIR, f));
        return { f, size: stat.size, mtime: stat.mtime };
      });
  } catch (err) {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  if (args.clean) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    console.log(`已清除快取：${CACHE_DIR}`);
    return;
  }

  const years = availableYears();
  if (args.status) {
    console.log(`資料集年度：${years.length ? years.join('、') : '（尚未下載）'}`);
    const state = cacheState();
    if (!state.length) {
      console.log('快取：尚無解壓縮檔。');
      return;
    }
    for (const item of state) {
      console.log(`  ${item.f}：${(item.size / 1024 / 1024).toFixed(0)} MB · ${item.mtime.toLocaleString()}`);
    }
    return;
  }

  let targets = args.years.filter(Boolean);
  if (args.all) targets = years;
  if (!targets.length) {
    usage();
    return;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  for (const year of targets) {
    if (!years.includes(year)) {
      console.log(`  ${year}：尚未下載年度檔，先執行 npm run dataset:download -- --year ${year}`);
      continue;
    }
    const started = Date.now();
    const index = await ensureYearIndex(year);
    const count = index ? Object.keys(index.offsets).length : 0;
    console.log(`  ${year}：索引完成，${count} 筆（${((Date.now() - started) / 1000).toFixed(1)} 秒）`);
  }
}

main().catch((err) => {
  console.error(`錯誤：${err.message}`);
  process.exit(1);
});
