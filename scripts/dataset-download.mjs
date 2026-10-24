// 下載紫微斗數開源解讀資料集 v4.0（CC BY 4.0）
//
//   node scripts/dataset-download.mjs --year 1990
//   node scripts/dataset-download.mjs --years 1990,1991,1992
//   node scripts/dataset-download.mjs --from 1990 --to 2000
//   node scripts/dataset-download.mjs --all
//   node scripts/dataset-download.mjs --status
//
// 來源：https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.ZIWEI_DATASET_DIR
  ? path.resolve(process.env.ZIWEI_DATASET_DIR)
  : path.join(ROOT, 'data', 'ziwei-v4');

const TAG = 'v4.0-13d';
const BASE = `https://github.com/Renhuai123/ziwei-doushu/releases/download/${TAG}`;
const MANIFEST_URL = `${BASE}/MANIFEST.json`;

function parseArgs(argv) {
  const args = { years: [], all: false, status: false };
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
      case '--from':
        args.from = Number(next);
        i += 1;
        break;
      case '--to':
        args.to = Number(next);
        i += 1;
        break;
      case '--all':
        args.all = true;
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
  console.log(`下載 v4.0 解讀資料集

用法：
  node scripts/dataset-download.mjs --year 1990
  node scripts/dataset-download.mjs --years 1990,1991,1992
  node scripts/dataset-download.mjs --from 1990 --to 2000
  node scripts/dataset-download.mjs --all
  node scripts/dataset-download.mjs --status

參數：
  --year    下載單一年度（每個年度檔約 2MB）
  --years   下載多個年度，逗號分隔
  --from    起始年度（需搭配 --to）
  --to      結束年度（需搭配 --from）
  --all     下載 1950–2026 全部年度（約 161MB）
  --status  只看目前已下載的年度

資料集目錄：${DATA_DIR}
來源：${MANIFEST_URL}
授權：CC BY 4.0（引用時請標註來源）`);
}

async function sha256(file) {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`下載失敗（HTTP ${res.status}）：${url}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (args.status) {
    const files = fs
      .readdirSync(DATA_DIR)
      .map((f) => /^year-(\d{4})\.jsonl\.zst$/.exec(f))
      .filter(Boolean)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    console.log(`資料集目錄：${DATA_DIR}`);
    console.log(files.length ? `已下載年度：${files.join('、')}` : '尚未下載任何年度。');
    return;
  }

  const manifestPath = path.join(DATA_DIR, 'MANIFEST.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('下載 MANIFEST.json …');
    await download(MANIFEST_URL, manifestPath);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = new Map(manifest.files.map((f) => [f.year, f]));

  let years = args.years.filter(Boolean);
  if (args.from && args.to) {
    for (let y = args.from; y <= args.to; y += 1) years.push(y);
  }
  if (args.all) {
    years = manifest.files.map((f) => f.year);
  }
  years = [...new Set(years)].sort((a, b) => a - b);

  if (!years.length) {
    usage();
    return;
  }

  console.log(`資料集：${manifest.dataset}`);
  console.log(`版本：${manifest.releaseTag}（${manifest.generatedAt}）· ${manifest.license}`);
  console.log(`目錄：${DATA_DIR}\n`);

  let done = 0;
  let skipped = 0;
  for (const year of years) {
    const entry = entries.get(year);
    if (!entry) {
      console.log(`  ${year}：清單中沒有這個年度，略過。`);
      continue;
    }
    const dest = path.join(DATA_DIR, `year-${year}.jsonl.zst`);
    if (fs.existsSync(dest)) {
      const current = await sha256(dest);
      if (current === entry.sha256) {
        skipped += 1;
        console.log(`  ${year}：已存在且校驗正確，略過。`);
        continue;
      }
      console.log(`  ${year}：既有檔案校驗不符，重新下載…`);
    }
    await download(`${BASE}/year-${year}.jsonl.zst`, dest);
    const current = await sha256(dest);
    if (current !== entry.sha256) {
      throw new Error(`${year} 的 SHA-256 校驗失敗（期望 ${entry.sha256}，實際 ${current}）`);
    }
    done += 1;
    console.log(`  ${year}：下載完成（${(entry.zstBytes / 1024 / 1024).toFixed(2)} MB，SHA-256 通過）`);
  }

  console.log(`\n完成：新增 ${done} 個年度，略過 ${skipped} 個。`);
  console.log('接著可以用 npm run dataset:cache 預先建立索引，之後查詢會更快。');
}

main().catch((err) => {
  console.error(`錯誤：${err.message}`);
  process.exit(1);
});
