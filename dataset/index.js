'use strict';

/**
 * 紫微斗數開源解讀資料集 v4.0 讀取器（僅 Node.js）。
 *
 * 資料集：Renhuai123/ziwei-doushu〈紫微斗數開源解讀資料集 v4.0〉（CC BY 4.0）
 *   repo    https://github.com/Renhuai123/ziwei-doushu
 *   release https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d
 *
 * 每個年度檔案 year-YYYY.jsonl.zst 是一年的命盤解讀（每行一張盤，約 8,760 行）：
 *   { k: "1990-01-01-0-male", y, m, d, h, g, ms, t: { 主題: 字數 }, c: { 主題: 內文 } }
 * 主題共 13 個：overview / personality / love / career / wealth / health /
 *              family / children / move / friends / home / spirit / parents
 *
 * 這個模組刻意放在 dataset/ 而非 src/：src/ 會被 esbuild 打包成瀏覽器版
 * engine.js，不能依賴 node:fs / node:zlib。
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.ZIWEI_DATASET_DIR
  ? path.resolve(process.env.ZIWEI_DATASET_DIR)
  : path.join(ROOT, 'data', 'ziwei-v4');
const CACHE_DIR = process.env.ZIWEI_DATASET_CACHE
  ? path.resolve(process.env.ZIWEI_DATASET_CACHE)
  : path.join(DATA_DIR, '.cache');
/** 最多保留幾個解壓縮後的年度檔（每個約 700MB） */
const CACHE_MAX = Math.max(1, Number(process.env.ZIWEI_DATASET_CACHE_MAX || 2));
const ENABLED = process.env.ZIWEI_DATASET_ENABLED !== '0';

const MIN_YEAR = 1950;
const MAX_YEAR = 2026;

/** 主題順序與繁中標籤；資料集原文為簡體中文 */
const TOPICS = [
  { key: 'overview', label: '命格總覽' },
  { key: 'personality', label: '性格總覽' },
  { key: 'career', label: '事業總覽' },
  { key: 'wealth', label: '財運總覽' },
  { key: 'love', label: '感情總覽' },
  { key: 'health', label: '健康總覽' },
  { key: 'family', label: '兄弟總覽' },
  { key: 'children', label: '子女總覽' },
  { key: 'move', label: '遷移總覽' },
  { key: 'friends', label: '人際總覽' },
  { key: 'home', label: '田宅總覽' },
  { key: 'spirit', label: '福德總覽' },
  { key: 'parents', label: '父母總覽' },
];

const SOURCE = {
  name: '紫微斗數開源解讀資料集 v4.0',
  repo: 'https://github.com/Renhuai123/ziwei-doushu',
  release: 'https://github.com/Renhuai123/ziwei-doushu/releases/tag/v4.0-13d',
  license: 'CC BY 4.0',
  attribution: '解讀資料集：Renhuai123/ziwei-doushu〈紫微斗數開源解讀資料集 v4.0〉（CC BY 4.0）',
  note: '資料集原文為簡體中文；其中引用倪海廈《天紀》原話者另受 CC BY-NC-SA 4.0 限制。',
};

/** year -> { offsets: { key: [start, length] }, jsonlPath } */
const indexCache = new Map();

function pad2(n) {
  return String(n).padStart(2, '0');
}

function yearFileName(year) {
  return `year-${year}.jsonl.zst`;
}

function availableYears() {
  try {
    return fs
      .readdirSync(DATA_DIR)
      .map((f) => /^year-(\d{4})\.jsonl\.zst$/.exec(f))
      .filter(Boolean)
      .map((m) => Number(m[1]))
      .filter((y) => y >= MIN_YEAR && y <= MAX_YEAR)
      .sort((a, b) => a - b);
  } catch (err) {
    return [];
  }
}

function readManifest() {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'MANIFEST.json'), 'utf8');
    const m = JSON.parse(raw);
    return {
      dataset: m.dataset,
      releaseTag: m.releaseTag,
      generatedAt: m.generatedAt,
      totalCharts: m.totalCharts,
      totalReadings: m.totalReadings,
      topics: m.topics,
      license: m.license,
    };
  } catch (err) {
    return null;
  }
}

/** 資料集整體狀態：有哪些年度檔、索引到哪裡、授權資訊 */
function status() {
  const years = availableYears();
  return {
    enabled: ENABLED,
    dir: DATA_DIR,
    cacheDir: CACHE_DIR,
    years,
    yearCount: years.length,
    range: [MIN_YEAR, MAX_YEAR],
    topics: TOPICS,
    source: SOURCE,
    manifest: readManifest(),
  };
}

/**
 * 把本程式輸入（國曆日期＋時辰＋性別）對應到資料集的 key。
 * 晚子時（timeIndex 12）算隔日子的子時，與 iztro 排盤口徑一致。
 */
function resolveKey(solarDate, timeIndex, gender) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(solarDate || '').trim());
  if (!m) return null;
  let year = Number(m[1]);
  let month = Number(m[2]);
  let day = Number(m[3]);
  let hour = Number(timeIndex);
  if (!Number.isInteger(hour) || hour < 0 || hour > 12) return null;
  if (hour === 12) {
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
    hour = 0;
  }
  const g = gender === '男' || gender === 'male' ? 'male' : 'female';
  return {
    key: `${year}-${pad2(month)}-${pad2(day)}-${hour}-${g}`,
    year,
    month,
    day,
    hour,
    gender: g,
  };
}

/** 只讀檔頭，找出該行的 "k" 欄位，避免整行 JSON.parse */
function extractKey(line) {
  const head = line.subarray(0, 64).toString('latin1');
  const m = /"k":"([^"]+)"/.exec(head);
  return m ? m[1] : null;
}
/**
 * 解壓某一年度檔，同時寫出 .jsonl 快取與 key→位移索引。
 * 索引寫成 JSON 檔（每個年度約 8,760 筆，數百 KB），重啟後不必重解壓。
 */
function buildYearIndex(zstPath, jsonlPath, idxPath) {
  return new Promise((resolve, reject) => {
    const offsets = {};
    let written = 0;
    let pending = null;

    const out = fs.createWriteStream(jsonlPath);
    const decomp = zlib.createZstdDecompress();
    const src = fs.createReadStream(zstPath);

    const fail = (err) => {
      out.destroy();
      reject(err);
    };
    src.on('error', fail);
    decomp.on('error', fail);

    decomp.on('data', (chunk) => {
      out.write(chunk);
      written += chunk.length;
      pending = pending && pending.length ? Buffer.concat([pending, chunk]) : chunk;
      let nl = pending.indexOf(0x0a);
      while (nl !== -1) {
        const start = written - pending.length;
        const key = extractKey(pending.subarray(0, nl));
        if (key) offsets[key] = [start, nl];
        pending = pending.subarray(nl + 1);
        nl = pending.indexOf(0x0a);
      }
    });

    decomp.on('end', () => {
      if (pending && pending.length) {
        const key = extractKey(pending);
        if (key) offsets[key] = [written - pending.length, pending.length];
      }
      out.end(() => {
        try {
          fs.writeFileSync(idxPath, JSON.stringify(offsets));
        } catch (err) {
          /* 索引寫不進去不影響查詢，只是下次要重解壓 */
        }
        resolve(offsets);
      });
    });

    src.pipe(decomp);
  });
}

/** 快取只留最近使用的幾個年度，避免 700MB × N 撐爆磁碟 */
function evictCache(keepYear) {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter((f) => /^year-\d{4}\.jsonl$/.test(f));
    if (files.length <= CACHE_MAX) return;
    const withTime = files
      .map((f) => ({ f, t: fs.statSync(path.join(CACHE_DIR, f)).mtimeMs }))
      .sort((a, b) => a.t - b.t);
    for (const item of withTime.slice(0, withTime.length - CACHE_MAX)) {
      if (item.f === `year-${keepYear}.jsonl`) continue;
      try {
        fs.rmSync(path.join(CACHE_DIR, item.f), { force: true });
      } catch (err) {
        /* 刪不掉就算了 */
      }
    }
  } catch (err) {
    /* 快取清理失敗不影響功能 */
  }
}

async function ensureYearIndex(year) {
  if (indexCache.has(year)) return indexCache.get(year);
  const zstPath = path.join(DATA_DIR, yearFileName(year));
  if (!fs.existsSync(zstPath)) return null;

  const jsonlPath = path.join(CACHE_DIR, `year-${year}.jsonl`);
  const idxPath = path.join(CACHE_DIR, `year-${year}.idx.json`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  let offsets = null;
  if (fs.existsSync(jsonlPath) && fs.existsSync(idxPath)) {
    try {
      offsets = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    } catch (err) {
      offsets = null;
    }
  }
  if (!offsets) {
    offsets = await buildYearIndex(zstPath, jsonlPath, idxPath);
  }

  const entry = { offsets, jsonlPath };
  indexCache.set(year, entry);
  evictCache(year);
  return entry;
}

function readEntry(jsonlPath, offset, length) {
  const fd = fs.openSync(jsonlPath, 'r');
  try {
    const buf = Buffer.allocUnsafe(length);
    fs.readSync(fd, buf, 0, length, offset);
    return JSON.parse(buf.toString('utf8'));
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * 取得某張命盤的 13 維詳細解讀。
 * @param {{solarDate: string, timeIndex: number, gender: string}} input
 * @returns {Promise<object>} 永遠回傳物件，不丟例外
 */
async function lookup(input = {}) {
  if (!ENABLED) {
    return {
      available: false,
      state: 'disabled',
      message: '資料集功能已停用（設定 ZIWEI_DATASET_ENABLED=0）。',
      source: SOURCE,
    };
  }

  const target = resolveKey(input.solarDate, input.timeIndex, input.gender);
  if (!target) {
    return {
      available: false,
      state: 'invalid',
      message: '無法對應資料集的索引（日期或時辰格式不正確）。',
      source: SOURCE,
    };
  }

  if (target.year < MIN_YEAR || target.year > MAX_YEAR) {
    return {
      available: false,
      state: 'out-of-range',
      year: target.year,
      message: `資料集只涵蓋 ${MIN_YEAR}–${MAX_YEAR} 年，本次為 ${target.year} 年。`,
      source: SOURCE,
    };
  }

  if (!fs.existsSync(path.join(DATA_DIR, yearFileName(target.year)))) {
    return {
      available: false,
      state: 'missing-year',
      year: target.year,
      message: `尚未下載 ${target.year} 年的資料集（每個年度檔約 2MB）。`,
      source: SOURCE,
    };
  }

  let index = null;
  try {
    index = await ensureYearIndex(target.year);
  } catch (err) {
    return {
      available: false,
      state: 'error',
      year: target.year,
      message: `資料集解壓失敗：${err.message}`,
      source: SOURCE,
    };
  }
  if (!index) {
    return {
      available: false,
      state: 'missing-year',
      year: target.year,
      message: `尚未下載 ${target.year} 年的資料集。`,
      source: SOURCE,
    };
  }

  const entry = index.offsets[target.key];
  if (!entry) {
    return {
      available: false,
      state: 'not-found',
      year: target.year,
      message: `資料集內沒有這張盤（${target.key}）。`,
      source: SOURCE,
    };
  }

  let raw = null;
  try {
    raw = readEntry(index.jsonlPath, entry[0], entry[1]);
  } catch (err) {
    return {
      available: false,
      state: 'error',
      year: target.year,
      message: `讀取資料集失敗：${err.message}`,
      source: SOURCE,
    };
  }

  const topics = TOPICS.map((t) => ({
    key: t.key,
    label: t.label,
    chars: (raw.t && raw.t[t.key]) || 0,
    text: (raw.c && raw.c[t.key]) || '',
  })).filter((t) => t.text);

  return {
    available: true,
    state: 'ok',
    key: target.key,
    year: target.year,
    soulStar: raw.ms || '',
    topics,
    totalChars: topics.reduce((sum, t) => sum + t.chars, 0),
    source: SOURCE,
  };
}

module.exports = {
  TOPICS,
  SOURCE,
  MIN_YEAR,
  MAX_YEAR,
  DATA_DIR,
  CACHE_DIR,
  status,
  lookup,
  resolveKey,
  ensureYearIndex,
  readManifest,
  availableYears,
};

