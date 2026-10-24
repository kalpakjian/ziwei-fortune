// 端對端煙霧測試：用 playwright-core + 已安裝的 Chromium 檢查主要流程。
// 執行：node scripts/smoke.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1223', 'chrome-win64', 'chrome.exe'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('找不到 Chromium/Chrome 執行檔，請設定 CHROME_PATH');
  process.exit(1);
}

const BASE = process.env.BASE_URL || 'http://localhost:5199';
const errors = [];
const results = {};

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });
results.title = await page.title();
results.timeOptions = await page.locator('#timeIndex option').count();
results.dayOptions = await page.locator('#day option').count();

// 深色模式防護：meta 標籤必須在 HTML 原始碼裡（不能靠 JS 動態插入），
// 否則 Dark Reader / Chrome 自動深色模式會先套用樣式再被移除，造成閃爍。
results.darkReaderLock = await page.evaluate(
  () => !!document.querySelector('meta[name="darkreader-lock"]')
);
results.colorSchemeOnlyLight = await page.evaluate(
  () =>
    document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ===
    'only light'
);

await page.click('#demoBtn');
await page.waitForSelector('#result:not([hidden])', { timeout: 20000 });
await page.waitForSelector('.palace-cell');
await page.waitForTimeout(500);

results.cells = await page.locator('.palace-cell').count();
results.centerName = (await page.textContent('.cc-name'))?.trim();
results.centerItems = await page.locator('.cc-item').count();
results.majorStars = await page.locator('.pc-stars .star').count();
results.minorStars = await page.locator('.pc-minor span').count();
results.score = (await page.textContent('#scoreValue'))?.trim();
results.grade = (await page.textContent('#scoreGrade'))?.trim();
results.tags = await page.locator('.tag').count();
results.dimensions = await page.locator('.dimension-row').count();
results.palaceCards = await page.locator('.palace-card').count();
await page.screenshot({ path: path.join(SHOTS, 'desktop-result.png'), fullPage: false });

// 點擊第一個宮位，檢查詳情抽屜
await page.locator('.palace-cell').first().click();
await page.waitForSelector('#palaceDetail:not([hidden])');
results.detailTitle = (await page.textContent('#palaceDetail h3'))?.trim();
results.detailHasScore = (await page.locator('#palaceDetail .pd-star').last().textContent())?.trim();

await page.screenshot({ path: path.join(SHOTS, 'desktop-chart.png'), fullPage: false });

// 十二宮分頁
await page.click('.tab[data-tab="palaces"]');
results.palaceLinks = await page.locator('.js-palace-link').count();
await page.locator('.palace-card[data-index="9"]').scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(SHOTS, 'desktop-palaces.png'), fullPage: false });

// 格局分頁
await page.click('.tab[data-tab="patterns"]');
results.patternCards = await page.locator('.pattern-card').count();
results.patternEmpty = await page.locator('.pattern-empty').count();

// 運限分頁
await page.click('.tab[data-tab="fortune"]');
await page.waitForSelector('.fortune-card');
results.fortuneCards = await page.locator('.fortune-card').count();
results.timeline = await page.locator('.timeline li').count();
results.fortuneSub = (await page.textContent('#fortuneSub'))?.trim();
results.yearCardTitleBefore = (await page.textContent('.fortune-card:nth-child(2) h3'))?.trim();

// 切換流年（選最後一個選項，會重新請求）
const yearSelect = page.locator('#fortuneYearInline');
const targetYear = await yearSelect.locator('option').last().getAttribute('value');
await yearSelect.selectOption(String(targetYear));
await page.waitForFunction(
  (y) => document.getElementById('fortuneSub')?.textContent.includes(String(y)),
  targetYear,
  { timeout: 20000 }
);
results.yearChangedTo = targetYear;
results.fortuneSubAfter = (await page.textContent('#fortuneSub'))?.trim();
results.yearCardTitleAfter = (await page.textContent('.fortune-card:nth-child(2) h3'))?.trim();
await page.screenshot({ path: path.join(SHOTS, 'desktop-fortune.png'), fullPage: false });

// 總覽（含雷達與幸運元素）
await page.click('.tab[data-tab="overview"]');
await page.screenshot({ path: path.join(SHOTS, 'desktop-overview.png'), fullPage: true });

// 農曆模式的閏月欄位
await page.click('input[name="calendar"][value="lunar"]');
await page.waitForTimeout(150);
results.leapVisibleInLunar = await page.evaluate(
  () => !document.getElementById('leapWrap').hidden
);
results.lunarDayOptions = await page.locator('#day option').count();
await page.click('input[name="calendar"][value="solar"]');
results.leapHiddenInSolar = await page.evaluate(
  () => document.getElementById('leapWrap').hidden
);

// 列印樣式（模擬列印；實體列印會先觸發 beforeprint）
await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
await page.emulateMedia({ media: 'print' });
results.printFormHidden = await page.evaluate(
  () => getComputedStyle(document.querySelector('.form-panel')).display === 'none'
);
results.printPalaceBodyVisible = await page.evaluate(() => {
  const body = document.querySelector('.palace-card[data-index="9"] .palace-card-body');
  return !!body && body.getBoundingClientRect().height > 10;
});
await page.screenshot({ path: path.join(SHOTS, 'print.png'), fullPage: true });
await page.emulateMedia({ media: 'screen' });

// 行動版
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('pageerror', (err) => errors.push(`mobile pageerror: ${err.message}`));
await mobile.goto(BASE, { waitUntil: 'networkidle' });
await mobile.click('#demoBtn');
await mobile.waitForSelector('#result:not([hidden])', { timeout: 20000 });
await mobile.waitForTimeout(600);
results.mobileBodyOverflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 2
);
await mobile.screenshot({ path: path.join(SHOTS, 'mobile-chart.png'), fullPage: false });
await mobile.screenshot({ path: path.join(SHOTS, 'mobile-full.png'), fullPage: true });

// 背景圖規則：深色主題要有、淺色主題要沒有
results.darkBackground = await page.evaluate(() => {
  const s = getComputedStyle(document.body, '::after');
  return { display: s.display, image: s.backgroundImage };
});

// 淺色主題
await page.click('#themeBtn');
results.lightTheme = await page.evaluate(() => document.body.classList.contains('light'));
results.lightBackground = await page.evaluate(() => {
  const s = getComputedStyle(document.body, '::after');
  return { display: s.display, image: s.backgroundImage };
});
const darkBgOk =
  results.darkBackground.display !== 'none' && /bg-ziwei\.jpg/.test(results.darkBackground.image);
const lightBgOk =
  results.lightBackground.display !== 'none' &&
  /bg-ziwei-light\.jpg/.test(results.lightBackground.image);
if (!darkBgOk || !lightBgOk) {
  errors.push(
    `background rule failed: dark=${JSON.stringify(results.darkBackground)} light=${JSON.stringify(
      results.lightBackground
    )}`
  );
}
await page.screenshot({ path: path.join(SHOTS, 'desktop-light.png'), fullPage: false });

await browser.close();

results.browserErrors = errors;
console.log(JSON.stringify(results, null, 2));
if (errors.length) {
  process.exitCode = 2;
} else {
  console.log('SMOKE OK');
}
