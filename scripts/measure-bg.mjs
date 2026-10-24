// 量測淺色模式背景圖的「實際可見比例」
// 用法：node scripts/measure-bg.mjs <baseUrl> [override.css]
// 開/關背景各用獨立頁面實例，避免 addStyleTag 互相污染
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const shots = path.join(ROOT, 'shots');
fs.mkdirSync(shots, { recursive: true });

const BASE = process.argv[2] || 'https://kalpakjian.github.io/ziwei-fortune/';
const OVERRIDE = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
console.log('BASE =', BASE);
console.log('OVERRIDE bytes =', OVERRIDE.length);
const chrome = [
  process.env.CHROME_PATH,
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
].filter(Boolean).find((p) => fs.existsSync(p));

// FORCE_DARK=1 → 模擬 Chrome「自動深色模式」，驗證底圖被反相後是否還看得見
const launchArgs = process.env.FORCE_DARK
  ? ['--enable-features=WebContentsForceDark']
  : [];

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: launchArgs });

async function diffRatio(page, onBuf, offBuf) {
  return page.evaluate(
    async ([a, b]) => {
      const load = (b64) =>
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = 'data:image/png;base64,' + b64;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = ia.width;
      const h = ia.height;
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(ia, 0, 0);
      const da = ctx.getImageData(0, 0, w, h).data;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(ib, 0, 0);
      const db = ctx.getImageData(0, 0, w, h).data;
      let changed = 0;
      let maxD = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d =
          Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
        if (d > 12) changed++;
        if (d > maxD) maxD = d;
      }
      return { pct: +((changed / (da.length / 4)) * 100).toFixed(2), maxD };
    },
    [onBuf.toString('base64'), offBuf.toString('base64')]
  );
}

async function shot(page, hide) {
  if (hide) await page.addStyleTag({ content: 'body.light::after{display:none!important}' });
  await page.waitForTimeout(300);
  return page.screenshot();
}

const results = {};
const viewports = process.env.QUICK
  ? [{ width: 1440, height: 1000, tag: '1440x1000' }]
  : [
      { width: 1440, height: 1000, tag: '1440x1000' },
      { width: 1280, height: 720, tag: '1280x720' },
      { width: 390, height: 844, tag: '390x844' },
    ];

for (const vp of viewports) {
  const openPage = async () => {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(BASE, { waitUntil: 'load' });
    if (OVERRIDE) await page.addStyleTag({ content: OVERRIDE });
    await page.click('#themeBtn');
    await page.waitForTimeout(1400);
    return page;
  };

  // 首頁
  let page = await openPage();
  const heroOn = await shot(page, false);
  await page.close();

  page = await openPage();
  const heroOff = await shot(page, true);
  await page.close();

  const diffPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const hero = await diffRatio(diffPage, heroOn, heroOff);

  // 結果區（排盤後捲到命盤）
  page = await openPage();
  await page.click('#demoBtn');
  await page.waitForSelector('.palace-cell', { timeout: 20000 });
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('result').scrollIntoView());
  await page.waitForTimeout(700);
  const resOn = await shot(page, false);
  await page.close();

  page = await openPage();
  await page.click('#demoBtn');
  await page.waitForSelector('.palace-cell', { timeout: 20000 });
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('result').scrollIntoView());
  await page.waitForTimeout(700);
  const resOff = await shot(page, true);
  await page.close();

  const res = await diffRatio(diffPage, resOn, resOff);
  await diffPage.close();

  fs.writeFileSync(path.join(shots, `measure-light-hero-${vp.tag}.png`), heroOn);
  fs.writeFileSync(path.join(shots, `measure-light-result-${vp.tag}.png`), resOn);

  results[vp.tag] = { hero, res };
  console.log(
    `${vp.tag.padEnd(10)} 首頁可見=${String(hero.pct).padStart(6)}% (maxΔ=${String(hero.maxD).padStart(4)})  結果區可見=${String(res.pct).padStart(6)}% (maxΔ=${String(res.maxD).padStart(4)})`
  );
}

await browser.close();
console.log('MEASURE DONE', JSON.stringify(results));
