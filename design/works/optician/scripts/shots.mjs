// Scripted captures for review (dev tool, not deployed).
//   node pp-shots.mjs <puppeteer-core dir> <url> <width>x<height>[@dpr] [mobile] op op op ...
// ops: y=<px> | el=<css selector> (scroll into view) | wait=<ms> | shot=<file.png> | full=<file.png>
//      click=<selector> | key=<Key> | eval=<js> | move=x,y | log=<js expression>
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, url, size, ...rest] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(size);
const [W, H, DPR] = [Number(m[1]), Number(m[2]), Number(m[3] || 1)];
const flags = new Set();
while (rest.length && /^(mobile|reduced|nogl)$/.test(rest[0])) flags.add(rest.shift());
const mobile = flags.has('mobile');
const ops = rest;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: mobile, hasTouch: mobile });
if (flags.has('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[console.${msg.type()}]`, msg.text(), msg.location() && msg.location().url || ''); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url()));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()); });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await sleep(1500);
for (const op of ops) {
  const i = op.indexOf('=');
  const k = op.slice(0, i), v = op.slice(i + 1);
  if (k === 'y') await page.evaluate((y) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, y); }, Number(v));
  else if (k === 'el') await page.evaluate((s) => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector(s).scrollIntoView(); }, v);
  else if (k === 'wait') await sleep(Number(v));
  else if (k === 'shot') await page.screenshot({ path: v });
  else if (k === 'full') await page.screenshot({ path: v, fullPage: true });
  else if (k === 'click') await page.click(v);
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'eval') await page.evaluate(v);
  else if (k === 'move') { const [x, y] = v.split(',').map(Number); await page.mouse.move(x, y, { steps: 12 }); }
  else if (k === 'log') console.log('[log]', JSON.stringify(await page.evaluate(v)));
}
await browser.close();
