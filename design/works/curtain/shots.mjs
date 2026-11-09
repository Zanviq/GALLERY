// Scripted captures for review (dev tool, not deployed). Based on design/works/perfume/pp-shots.mjs.
//   node shots.mjs <puppeteer-core dir> <url> <width>x<height>[@dpr] [mobile] [reduced] op op ...
// ops: wait=<ms> | shot=<file.png> | click=<selector> | key=<Key> | tab=<n> | eval=<js> | log=<js expr>
//      drag=x0,y0,x1,y1[,steps[,ms]]  (mouse)   tdrag=x0,y0,x1,y1[,steps]  (touch)
//      hold=x,y | to=x,y[,steps] | up              (mouse down / move / up, for multi-step drags)
//      perf=<seconds>   (frame times while something moves)
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, url, size, ...rest] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(size);
const [W, H, DPR] = [Number(m[1]), Number(m[2]), Number(m[3] || 1)];
const flags = new Set();
while (rest.length && /^(mobile|reduced|nogpu)$/.test(rest[0])) flags.add(rest.shift());
const mobile = flags.has('mobile');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = ['--hide-scrollbars', '--no-first-run'];
if (!flags.has('nogpu')) args.unshift('--enable-unsafe-swiftshader', '--use-angle=swiftshader');
else args.push('--disable-gpu', '--disable-webgl');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: mobile, hasTouch: mobile });
if (flags.has('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[console.${msg.type()}]`, msg.text(), (msg.location() && msg.location().url) || ''); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url()));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()); });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await sleep(1200);
for (const op of rest) {
  const i = op.indexOf('=');
  const k = i < 0 ? op : op.slice(0, i), v = i < 0 ? '' : op.slice(i + 1);
  const n = v.split(',').map(Number);
  if (k === 'wait') await sleep(Number(v));
  else if (k === 'shot') await page.screenshot({ path: v });
  else if (k === 'click') await page.click(v);
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'tab') { for (let t = 0; t < Number(v); t++) await page.keyboard.press('Tab'); }
  else if (k === 'eval') await page.evaluate(v);
  else if (k === 'log') console.log('[log]', JSON.stringify(await page.evaluate(v)));
  else if (k === 'drag') {
    const [x0, y0, x1, y1, steps = 20, ms = 16] = n;
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (let s = 1; s <= steps; s++) { await page.mouse.move(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps); await sleep(ms); }
    await page.mouse.up();
  } else if (k === 'hold') { await page.mouse.move(n[0], n[1]); await page.mouse.down(); }
  else if (k === 'to') {
    const steps = n[2] || 15;
    const from = await page.evaluate(() => window.__lastMouse || null);
    for (let s = 1; s <= steps; s++) { await page.mouse.move(n[0], n[1], { steps: 1 }); await sleep(16); }
    void from;
  } else if (k === 'up') await page.mouse.up();
  else if (k === 'tdrag') {
    const [x0, y0, x1, y1, steps = 20] = n;
    await page.touchscreen.touchStart(x0, y0);
    for (let s = 1; s <= steps; s++) { await page.touchscreen.touchMove(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps); await sleep(16); }
    await page.touchscreen.touchEnd();
  } else if (k === 'perf') {
    const res = await page.evaluate((secs) => new Promise((done) => {
      const times = []; let prev = performance.now(); const end = prev + secs * 1000;
      function f(t) { times.push(t - prev); prev = t; if (t < end) requestAnimationFrame(f); else done(times); }
      requestAnimationFrame(f);
    }), Number(v));
    res.sort((a, b) => a - b);
    console.log('[perf] frames', res.length, 'median', res[res.length >> 1].toFixed(1), 'p95', res[Math.floor(res.length * 0.95)].toFixed(1));
  }
}
await browser.close();
