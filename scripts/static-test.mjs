// 靜態版驗證：確認不呼叫任何 API、所有資產在子路徑下都能載入。
// 執行：node scripts/static-test.mjs（需先 npm run build 與 npm run preview）
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const executablePath = candidates.find((p) => fs.existsSync(p));

const BASE = process.env.STATIC_URL || 'http://localhost:5200/ziwei-fortune/';
const apiRequests = [];
const badResponses = [];
const errors = [];
const results = { base: BASE };

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('request', (req) => {
  if (req.url().includes('/api/')) apiRequests.push(req.url());
});
page.on('response', (res) => {
  if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`);
});

await page.goto(BASE, { waitUntil: 'load' });
console.log('loaded');
results.hasEngine = await page.evaluate(() => !!window.ZiweiEngine);
results.title = await page.title();

// 深色模式防護：head 必須有「靜態」的 meta 標籤，
// 否則 Dark Reader 或 Chrome 自動深色模式會疊一層暗色樣式到命盤上。
results.darkReaderLock = await page.evaluate(
  () => !!document.querySelector('meta[name="darkreader-lock"]')
);
results.colorSchemeOnlyLight = await page.evaluate(
  () =>
    document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ===
    'only light'
);

await page.click('#demoBtn');
console.log('demo clicked');
await page.waitForSelector('#result:not([hidden])', { timeout: 10000 });
await page.waitForSelector('.palace-cell', { timeout: 10000 });
console.log('result rendered');

results.cells = await page.locator('.palace-cell').count();
results.centerName = (await page.textContent('.cc-name'))?.trim();
results.score = (await page.textContent('#scoreValue'))?.trim();
results.patterns = await page.locator('.pattern-card').count();
results.apiRequests = apiRequests.length;
results.badResponses = badResponses;
results.errors = errors;

// 切換流年，確認純前端也能重算（先切到運限分頁，下拉才可見）
await page.click('.tab[data-tab="fortune"]');
await page.waitForTimeout(300);
const sel = page.locator('#fortuneYearInline');
await sel.selectOption('2030');
await page.waitForTimeout(1200);
const sub = (await page.textContent('#fortuneSub')) || '';
results.yearChanged = sub.includes('2030');
console.log('year changed:', results.yearChanged);

await page.screenshot({ path: path.join(SHOTS, 'static.png'), fullPage: false });
await browser.close();

console.log(JSON.stringify(results, null, 2));

const ok =
  results.hasEngine &&
  results.cells === 12 &&
  results.apiRequests === 0 &&
  badResponses.length === 0 &&
  errors.length === 0 &&
  results.yearChanged &&
  results.darkReaderLock &&
  results.colorSchemeOnlyLight;

if (!ok) {
  console.error('STATIC TEST FAILED');
  process.exit(1);
}
console.log('STATIC OK');
