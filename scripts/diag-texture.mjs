// 量化「底圖區域的紋理對比」：自動深色模式把整頁反相後，
// 只有本身對比夠高的底圖才留得住痕跡。
// 用法：node scripts/diag-texture.mjs <baseUrl> [override.css]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const shots = path.join(ROOT, 'shots');
fs.mkdirSync(shots, { recursive: true });
const BASE = process.argv[2] || 'http://127.0.0.1:5200/ziwei-fortune/';
const OVERRIDE = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
const chrome = [
  process.env.CHROME_PATH,
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
].filter(Boolean).find((p) => fs.existsSync(p));

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: process.env.FORCE_DARK ? ['--enable-features=WebContentsForceDark'] : [],
});

async function texture(page, buf, region) {
  return page.evaluate(
    async ([b64, reg]) => {
      const im = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = 'data:image/png;base64,' + b64;
      });
      const cv = document.createElement('canvas');
      cv.width = im.width;
      cv.height = im.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(im, 0, 0);
      const d = ctx.getImageData(reg.x, reg.y, reg.w, reg.h).data;
      let sum = 0;
      let sum2 = 0;
      const n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += lum;
        sum2 += lum * lum;
      }
      const mean = sum / n;
      const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
      return { mean: +mean.toFixed(1), std: +std.toFixed(2) };
    },
    [buf.toString('base64'), region]
  );
}

for (const vp of [
  { width: 1440, height: 1000, tag: '1440' },
  { width: 390, height: 844, tag: '390' },
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('ziwei-theme', 'light');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  if (OVERRIDE) await page.addStyleTag({ content: OVERRIDE });
  await page.waitForTimeout(1600);
  const buf = await page.screenshot();
  fs.writeFileSync(path.join(shots, `tex-${vp.tag}${process.env.TAG || ''}.png`), buf);

  // 底圖區（右上方太極圖所在處）與空白區對照
  const region =
    vp.width > 760
      ? { x: Math.round(vp.width * 0.62), y: 60, w: Math.round(vp.width * 0.3), h: 340 }
      : { x: Math.round(vp.width * 0.5), y: 80, w: Math.round(vp.width * 0.45), h: 300 };
  const t = await texture(page, buf, region);
  console.log(`${vp.tag}  底圖區 mean=${t.mean}  標準差=${t.std}`);
  await ctx.close();
}

await browser.close();
console.log('TEXTURE DONE');
