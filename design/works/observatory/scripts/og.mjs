// Capture og/observatory.png (1200x630) and thumbnails/observatory.webp (1200x900, q82).
//   node og.mjs <puppeteer-core dir> <base url, e.g. http://127.0.0.1:8000>
// The OG image comes from design/works/observatory/og.html (the site's own planisphere module);
// the thumbnail is a real capture of the page at 1440x1080 CSS px, scaled to 1200x900.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const [, , ppDir, base] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, timeout: 180000, protocolTimeout: 300000,
  args: ['--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });

await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto(`${base}/design/works/observatory/og.html`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await sleep(800);
await page.screenshot({ path: path.join(root, 'og', 'observatory.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
console.log('wrote og/observatory.png');

await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1200 / 1440 });
await page.goto(`${base}/observatory/?capture&at=2026-11-09T20:30`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await sleep(1200);
await page.screenshot({ path: path.join(root, 'thumbnails', 'observatory.webp'), type: 'webp', quality: 82 });
console.log('wrote thumbnails/observatory.webp');
await browser.close();
