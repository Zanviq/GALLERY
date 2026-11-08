// Dev tool (not deployed): capture each chart line of the optician page as its own image,
// log console problems, and check for horizontal overflow.
//   node sections.mjs <puppeteer-core dir> <url> <width>x<height> <outdir> [mobile] [reduced]
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, url, size, outDir, ...flags] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const [W, H] = size.split('x').map(Number);
const mobile = flags.includes('mobile');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
if (flags.includes('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url()));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()); });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await sleep(600);
const tag = `${W}`;
await page.screenshot({ path: path.join(outDir, `${tag}-view.png`) });
const over = await page.evaluate(() => {
  const doc = document.documentElement;
  const wide = [];
  for (const n of document.querySelectorAll('body *')) {
    const r = n.getBoundingClientRect();
    if (r.right > doc.clientWidth + 0.5 && r.width > 0) wide.push(`${n.tagName}.${n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className} ${Math.round(r.right)}`);
  }
  return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, wide: wide.slice(0, 8) };
});
console.log('[overflow]', JSON.stringify(over));
const ids = ['top', 'exam', 'fit', 'bench', 'care', 'price', 'visit'];
for (const id of ids) {
  const h = await page.$('#' + id);
  if (!h) continue;
  await page.evaluate((i) => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(i).scrollIntoView(); }, id);
  await sleep(250);
  await h.screenshot({ path: path.join(outDir, `${tag}-${id}.png`) });
}
const foot = await page.$('body > footer');
if (foot) await foot.screenshot({ path: path.join(outDir, `${tag}-foot.png`) });
await browser.close();
