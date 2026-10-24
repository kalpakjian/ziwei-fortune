import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const shots = path.join(ROOT, 'shots');
fs.mkdirSync(shots, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:5199/';
const chrome = [
  process.env.CHROME_PATH,
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
].filter(Boolean).find((p) => fs.existsSync(p));

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(shots, 'bg-dark-hero.png') });

await page.click('#demoBtn');
await page.waitForSelector('.palace-cell', { timeout: 15000 });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(shots, 'bg-dark-result.png') });

await page.click('#themeBtn');
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo({ top: 0 }));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shots, 'bg-light-hero.png') });
const desktopMetrics = await page.evaluate(() => {
  const sel = document.querySelector('#timeIndex');
  const after = getComputedStyle(document.body, '::after');
  return {
    selectBg: getComputedStyle(sel).backgroundImage.slice(0, 90),
    lightBgOpacity: after.opacity,
  };
});
console.log('DESKTOP METRICS', JSON.stringify(desktopMetrics));

await page.evaluate(() => document.getElementById('result').scrollIntoView());
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shots, 'bg-light-result.png') });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE, { waitUntil: 'load' });
await mobile.waitForTimeout(500);
await mobile.click('#themeBtn');
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: path.join(shots, 'bg-light-mobile.png') });
const metrics = await mobile.evaluate(() => {
  const h = document.querySelector('.hero h1');
  const cs = getComputedStyle(h);
  const after = getComputedStyle(document.body, '::after');
  return {
    h1Height: Math.round(h.getBoundingClientRect().height),
    h1LineHeight: cs.lineHeight,
    h1FontSize: cs.fontSize,
    lightBgDisplay: after.display,
    lightBgHasImage: after.backgroundImage.includes('bg-ziwei-light-mobile.jpg'),
    selectBg: getComputedStyle(document.querySelector('#timeIndex')).backgroundImage.slice(0, 90),
    dateTops: [...document.querySelectorAll('.date-row input, .date-row select')].map((el) =>
      Math.round(el.getBoundingClientRect().top)
    ),
  };
});
console.log('MOBILE METRICS', JSON.stringify(metrics));

await browser.close();
console.log('BG SHOTS OK');
