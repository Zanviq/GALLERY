// Dev tool (not deployed): render og/optician.png, the favicons and thumbnails/optician.webp.
//   node render-images.mjs <puppeteer-core dir> <repo root> [scrollY] [presses]
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, root, scrollY = '0', presses = '0'] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = 'http://127.0.0.1:8000';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });

// OG
await page.setViewport({ width: 1200, height: 630 });
await page.goto(`${base}/design/works/optician/og.html`, { waitUntil: 'networkidle0' });
await page.waitForSelector('body[data-ready]');
await sleep(300);
await page.screenshot({ path: path.join(root, 'og', 'optician.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
console.log('og/optician.png');

// favicons from the SVG mark
const svg = `${base}/works/optician/img/favicon.svg`;
for (const [size, file, pad] of [[32, 'favicon-32.png', 0], [180, 'apple-touch-icon.png', 26]]) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${pad ? '#fff' : 'transparent'}"><img src="${svg}" style="display:block;width:${size - pad * 2}px;height:${size - pad * 2}px;margin:${pad}px"></body></html>`);
  await sleep(300);
  await page.screenshot({ path: path.join(root, 'works', 'optician', 'img', file), omitBackground: pad === 0 });
  console.log(file);
}

// thumbnail: a real capture of the page
await page.setViewport({ width: 1200, height: 900 });
await page.goto(`${base}/optician/`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { const b = document.querySelector('[data-gallery-back]'); if (b) b.remove(); });
await page.focus('#wheel-grip');
for (let i = 0; i < Number(presses); i++) await page.keyboard.press('ArrowLeft');
await page.evaluate(() => document.activeElement.blur());
await page.evaluate((y) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, y); }, Number(scrollY));
await sleep(900);
await page.screenshot({ path: path.join(root, 'thumbnails', 'optician.webp'), type: 'webp', quality: 82 });
console.log('thumbnails/optician.webp');
await browser.close();
