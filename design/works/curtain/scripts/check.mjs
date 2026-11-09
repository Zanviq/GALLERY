// Release checks for the curtain page (dev tool, not deployed).
//   node design/works/curtain/scripts/check.mjs <puppeteer-core dir> <out dir>
// For each viewport: console errors/warnings, failed requests, horizontal overflow, overlaps between
// the apron parts, the card and the badge, tab order, and a capture. Then reduced motion and no-WebGL.
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, outDir] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const BASE = 'http://127.0.0.1:8000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sizes = [[360, 740, true], [390, 844, true], [768, 1024, true], [1024, 768, false], [1440, 900, false], [1920, 1080, false]];

async function run(browser, { url, w, h, mobile, reduced, tag, ops }) {
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(1200);
  const info = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
    const badge = document.querySelector('[data-gallery-back]');
    const ba = badge && badge.shadowRoot && badge.shadowRoot.querySelector('a');
    const bb = ba ? ba.getBoundingClientRect() : null;
    return {
      sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight, ih: innerHeight,
      hint: r('[data-hint]'), cues: r('.cues'), credit: r('.credit'), card: r('[data-card]'), stage: r('[data-stage]'),
      title: r('.card__title'), badge: bb ? [bb.left, bb.top, bb.right, bb.bottom].map(Math.round) : null,
      buttons: [...document.querySelectorAll('.cue')].map((b) => { const q = b.getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height)]; }),
      fontOk: document.fonts.check('17px "Grandiflora One"'),
    };
  });
  const hit = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  if (info.sw > info.iw) problems.push(`horizontal overflow ${info.sw} > ${info.iw}`);
  if (info.sh > info.ih) problems.push(`vertical overflow ${info.sh} > ${info.ih}`);
  if (hit(info.hint, info.cues)) problems.push('hint overlaps cues');
  if (hit(info.credit, info.cues)) problems.push('credit overlaps cues');
  if (hit(info.badge, info.card)) problems.push('badge overlaps card');
  if (info.card && info.stage && info.card[3] > info.stage[3]) problems.push('card runs below the stage');
  if (info.card && (info.card[0] < 0 || info.card[2] > info.iw)) problems.push('card clipped sideways');
  if (info.buttons.some(([bw, bh]) => bh < 44 || bw < 44)) problems.push('small tap target ' + JSON.stringify(info.buttons));
  for (const op of ops || []) {
    if (op.click) { await page.click(op.click); await sleep(op.wait || 300); }
    if (op.shot) await page.screenshot({ path: path.join(outDir, op.shot) });
    if (op.tab) {
      const order = [];
      for (let t = 0; t < op.tab; t++) {
        await page.keyboard.press('Tab');
        order.push(await page.evaluate(() => {
          const a = document.activeElement;
          if (a && a.shadowRoot) return 'badge';
          const s = a ? getComputedStyle(a) : null;
          return a ? `${a.textContent.trim()}${s && s.outlineStyle !== 'none' ? '(ring)' : '(NO RING)'}` : '-';
        }));
      }
      info.tab = order.join(' > ');
    }
    if (op.log) info.log = await page.evaluate(op.log);
  }
  console.log(`[${tag}] ${w}x${h}`, problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'ok',
    info.tab ? '\n  tab: ' + info.tab : '', info.log ? '\n  ' + JSON.stringify(info.log) : '', info.fontOk ? '' : '\n  font not ready');
  await page.close();
}

const only = process.argv[4];   // 'nogl' runs just the fallback pass
const browser = only === 'nogl' ? null : await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, timeout: 120000,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--no-first-run'],
});
if (browser) for (const [w, h, mobile] of sizes) {
  await run(browser, { url: BASE + '/curtain/', w, h, mobile, tag: 'normal', ops: [{ shot: `chk-${w}.png` }, { click: '[data-cue=open]', wait: 5500 }, { shot: `chk-${w}-open.png` }] });
}
if (browser) {
await run(browser, { url: BASE + '/works/curtain/', w: 1280, h: 800, tag: 'long url', ops: [{ tab: 5 }] });
await run(browser, { url: BASE + '/curtain/', w: 1280, h: 800, reduced: true, tag: 'reduced', ops: [
  { click: '[data-cue=open]', wait: 900 }, { click: '[data-cue=tear]', wait: 900 }, { click: '[data-cue=mend]', wait: 900 }, { click: '[data-cue=close]', wait: 900 },
  { log: '[document.querySelector("[data-hint]").textContent, document.querySelector("[data-cloth]").getAttribute("aria-label")]' }] });
await browser.close();
}

// no WebGL at all: the Canvas2D fallback
const b2 = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, timeout: 120000, args: ['--disable-gpu', '--disable-webgl', '--disable-3d-apis', '--hide-scrollbars'] });
await run(b2, { url: BASE + '/curtain/', w: 1280, h: 800, tag: 'no webgl', ops: [{ click: '[data-cue=tear]', wait: 2500 }, { shot: 'chk-nogl.png' }, { click: '[data-cue=mend]', wait: 2500 },
  { log: '[document.querySelector("[data-cloth]").getContext("2d") ? "2d" : "gl", document.querySelector("[data-hint]").textContent]' }] });
await b2.close();
