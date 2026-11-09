// Scripted captures and checks for review (dev tool, not deployed).
//   node shots.mjs <puppeteer-core dir> <url> <W>x<H>[@dpr] [mobile] [reduced] [fresh] op op ...
// ops: wait=<ms> | shot=<file.png> | full=<file.png> | click=<selector> | key=<Key> | type=<text>
//      eval=<js> | log=<js expr> | drag=<x1>,<y1>,<x2>,<y2> | dragsel=<from selector>><to selector>[@top|@bottom]
//      tap=<x>,<y> | focus=<selector> | webp=<file.webp> | scroll=<x>,<y>
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, url, size, ...rest] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(size);
const [W, H, DPR] = [Number(m[1]), Number(m[2]), Number(m[3] || 1)];
const flags = new Set();
while (rest.length && /^(mobile|reduced|fresh|nostore)$/.test(rest[0])) flags.add(rest.shift());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reuse a running headless Chrome (started with --remote-debugging-port=9333) when there is one;
// launching a fresh browser costs most of a minute on this machine.
let browser, shared = false;
try {
  browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: null });
  shared = true;
} catch {
  browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--hide-scrollbars', '--no-first-run', '--font-render-hinting=none'],
  });
}
const ctxB = shared ? await browser.createBrowserContext() : browser.defaultBrowserContext();
const page = await ctxB.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: flags.has('mobile'), hasTouch: flags.has('mobile') });
if (flags.has('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
if (flags.has('nostore')) {
  await page.evaluateOnNewDocument(() => {
    const deny = () => { throw new DOMException('denied', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { get: deny });
    Object.defineProperty(window, 'sessionStorage', { get: deny });
  });
}
page.on('console', (msg) => { if (['error', 'warning', 'warn'].includes(msg.type())) console.log(`[console.${msg.type()}]`, msg.text(), msg.location()?.url || ''); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()); });
if (flags.has('fresh')) {
  await page.goto(new URL('/', url).href, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
}
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await sleep(900);

async function center(sel, where) {
  return page.evaluate((s, w) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    const y = w === 'top' ? r.top + r.height * 0.3 : w === 'bottom' ? r.top + r.height * 0.8 : r.top + r.height / 2;
    return [r.left + r.width / 2, y];
  }, sel, where);
}
async function dragPath(x1, y1, x2, y2) {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) await page.mouse.move(x1 + (x2 - x1) * i / 14, y1 + (y2 - y1) * i / 14);
  await page.mouse.up();
}

for (const op of rest) {
  const i = op.indexOf('=');
  const k = op.slice(0, i), v = op.slice(i + 1);
  if (k === 'wait') await sleep(Number(v));
  else if (k === 'shot') await page.screenshot({ path: v });
  else if (k === 'webp') await page.screenshot({ path: v, type: 'webp', quality: 82 });
  else if (k === 'full') await page.screenshot({ path: v, fullPage: true });
  else if (k === 'click') await page.click(v);
  else if (k === 'focus') await page.focus(v);
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'type') await page.keyboard.type(v);
  else if (k === 'eval') await page.evaluate(v);
  else if (k === 'reload') { await page.reload({ waitUntil: 'networkidle0' }); await sleep(Number(v) || 800); }
  else if (k === 'store') { await page.evaluate((s) => localStorage.setItem('jamo.v1', s), v); await page.reload({ waitUntil: 'networkidle0' }); await sleep(800); }
  else if (k === 'log') console.log('[log]', JSON.stringify(await page.evaluate(v)));
  else if (k === 'tap') { const [x, y] = v.split(',').map(Number); await page.touchscreen.tap(x, y); }
  else if (k === 'scroll') { const [x, y] = v.split(',').map(Number); await page.evaluate((a, b) => window.scrollTo(a, b), x, y); }
  else if (k === 'drag') { const [a, b, c, d] = v.split(',').map(Number); await dragPath(a, b, c, d); }
  else if (k === 'dragsel') {
    const [from, toFull] = v.split('>');
    const [to, where] = toFull.split('@');
    const p = await center(from), q = await center(to, where);
    if (!p || !q) { console.log('[dragsel] missing', from, to); continue; }
    await dragPath(p[0], p[1], q[0], q[1]);
  }
}
if (shared) { await ctxB.close(); browser.disconnect(); } else await browser.close();
