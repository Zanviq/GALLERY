// Dev tool (not deployed): drive the optician page's interactions and capture the states.
//   node interact.mjs <puppeteer-core dir> <url> <outdir> [reduced]
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, url, outDir, ...flags] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name, sel) => sel
  ? page.$(sel).then((h) => h.screenshot({ path: path.join(outDir, name) }))
  : page.screenshot({ path: path.join(outDir, name) });

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
if (flags.includes('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
page.on('console', (m) => { if (['error', 'warn', 'warning'].includes(m.type())) console.log(`[console.${m.type()}]`, m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url()));
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
const read = () => page.evaluate(() => ({
  sph: document.getElementById('sph').textContent,
  now: document.getElementById('wheel-grip').getAttribute('aria-valuetext'),
  blur: document.getElementById('defocus-blur').getAttribute('stdDeviation'),
  status: document.getElementById('status').textContent,
  reply: document.getElementById('duo-reply').textContent,
  record: !document.getElementById('duo-record').hidden,
}));

// keyboard on the wheel
await page.focus('#wheel-grip');
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
await sleep(500);
console.log('[-1.00]', JSON.stringify(await read()));
await shot(page, 'i-scope-m100.png', '.scope');
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
await sleep(500);
console.log('[-2.00]', JSON.stringify(await read()));
await page.click('[data-answer="red"]');
await sleep(500);
console.log('[red→-2.25]', JSON.stringify(await read()));
await page.click('[data-answer="same"]');
await sleep(300);
console.log('[same]', JSON.stringify(await read()));
await shot(page, 'i-scope-done.png', '.scope');
await page.focus('#wheel-grip');
await page.keyboard.press('PageDown');
await sleep(500);
console.log('[-3.25]', JSON.stringify(await read()));
await shot(page, 'i-duo-over.png', '.duo');

// drag: grab the ring at the top and turn it 45° clockwise
const box = await page.$eval('#wheel-grip', (n) => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; });
const cx = box.x + box.w / 2, cy = box.y + box.w / 2, R = box.w / 2 * 0.88;
await page.mouse.move(cx, cy - R);
await page.mouse.down();
for (let a = 0; a <= 45; a += 5) {
  const t = (a - 90) * Math.PI / 180;
  await page.mouse.move(cx + R * Math.cos(t), cy + R * Math.sin(t));
}
await page.mouse.up();
await sleep(500);
console.log('[drag +45° cw]', JSON.stringify(await read()));
// click inside the window must not turn anything
await page.mouse.click(cx, cy);
console.log('[click centre]', JSON.stringify(await read()));

// frame fitting
await page.evaluate(() => document.getElementById('fit').scrollIntoView());
await page.click('[data-face="wide"]');
await page.focus('#r-a');
for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
await page.focus('#r-l');
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowLeft');
await sleep(400);
console.log('[fit]', JSON.stringify(await page.evaluate(() => ({
  stamp: document.getElementById('stamp').textContent,
  verdict: [...document.querySelectorAll('#fit-verdict li')].map((l) => (l.classList.contains('is-off') ? '× ' : '○ ') + l.textContent),
}))));
await shot(page, 'i-fit.png', '.fit');

// bench follows the frame; cut it
await page.evaluate(() => document.getElementById('bench').scrollIntoView());
await page.click('[data-index="1.74"]');
await page.click('#cut');
await sleep(700);
await shot(page, 'i-bench-mid.png', '.bench');
await sleep(1600);
console.log('[bench]', JSON.stringify(await page.evaluate(() => ({
  nums: [...document.querySelectorAll('.bench__nums dd')].map((d) => d.textContent),
  note: document.getElementById('b-note').textContent, btn: document.getElementById('cut').textContent,
}))));
await shot(page, 'i-bench-done.png', '.bench');
await browser.close();
