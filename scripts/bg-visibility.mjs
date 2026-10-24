import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const shots = path.join(ROOT, 'shots');
const BASE = process.env.BASE_URL || 'http://localhost:5199/';
const chrome = [
  process.env.CHROME_PATH,
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
].filter(Boolean).find((p) => fs.existsSync(p));

const browser = await chromium.launch({ executablePath: chrome, headless: true });

for (const vp of [
  { width: 1440, height: 1000, tag: '1440' },
  { width: 1920, height: 1080, tag: '1920' },
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.click('#themeBtn');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(shots, `light-on-${vp.tag}.png`) });
  await page.addStyleTag({ content: 'body.light::after{display:none!important}' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(shots, `light-off-${vp.tag}.png`) });
  await page.close();
}

await browser.close();
console.log('VISIBILITY SHOTS OK');
