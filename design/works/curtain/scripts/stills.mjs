// Gallery thumbnail (1200x900 webp q82) and share image (1200x630 png), captured from the live page.
//   node design/works/curtain/scripts/stills.mjs <puppeteer-core dir>
// The scene is driven through the page's own cloth: the panels drawn apart by the rope to
// different widths, then two seconds of simulation so the folds settle with some life left in them.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const require = createRequire(path.join(process.argv[2], 'package.json'));
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const scene = `(() => {
  const C = window.__curtain, c = C.cu;
  const go = (p, f) => { c.rope[p] = c.leadS(p); c.ropeAnim[p] = { from: c.leadS(p), to: c.closedS * f, t: 0, dur: 1.6 }; };
  go(0, 0.3); go(1, 0.44);
  C.run(1.2);
  // a hand has been on the left panel: the pile keeps the mark
  const k = c.idx(0, c.nx - 3, Math.round(c.ny * 0.45));
  c.grab('h', c.x[k], c.y[k], 40); C.run(0.15); c.release('h');
  C.run(1.6);
  C.draw();
})()`;

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
async function shoot(w, h, dpr) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  await page.goto('http://127.0.0.1:8000/curtain/?capture', { waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(1500);
  await page.evaluate(scene);
  await sleep(400);
  return page.screenshot({ type: 'png' });
}

const og = await shoot(1200, 630, 1);
fs.writeFileSync(path.join(root, 'og', 'curtain.png'), og);
console.log('og/curtain.png');

const thumb = await shoot(1200, 900, 1);
const webp = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = 1200; cv.height = 900;
  cv.getContext('2d').drawImage(img, 0, 0, 1200, 900);
  return cv.toDataURL('image/webp', 0.82).split(',')[1];
}, thumb.toString('base64'));
fs.writeFileSync(path.join(root, 'thumbnails', 'curtain.webp'), Buffer.from(webp, 'base64'));
console.log('thumbnails/curtain.webp');
await browser.close();
