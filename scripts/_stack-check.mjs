import { chromium } from 'playwright-core';
import path from 'node:path';
const b = await chromium.launch({ executablePath: path.join(process.env.LOCALAPPDATA,'ms-playwright','chromium-1234','chrome-win64','chrome.exe'), headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto('http://localhost:5199/', { waitUntil: 'load' });
await p.click('#themeBtn');
await p.waitForTimeout(400);
const out = await p.evaluate(() => {
  const pts = [[900,250],[1000,300],[1100,350],[1200,200],[950,500],[1300,700],[300,300]];
  const hits = pts.map(([x,y]) => ({ x, y, stack: document.elementsFromPoint(x,y).slice(0,4).map(e => e.tagName + (e.className ? "." + String(e.className).slice(0,40) : "")) }));
  const page = document.querySelector(".page");
  const hero = document.querySelector(".hero");
  return {
    hits,
    pageBg: getComputedStyle(page).backgroundColor,
    pageBgImg: getComputedStyle(page).backgroundImage.slice(0,60),
    heroBg: getComputedStyle(hero).backgroundColor,
    heroBgImg: getComputedStyle(hero).backgroundImage.slice(0,60),
    after: getComputedStyle(document.body, "::after").backgroundSize + " | " + getComputedStyle(document.body, "::after").backgroundPosition,
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
