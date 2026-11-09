// Release checks for the sand page (dev tool, not deployed).
//   node design/works/sand/scripts/check.mjs <puppeteer-core dir> <out dir> [quick]
// Per viewport: console errors/warnings, failed requests, horizontal overflow, overlaps, tap target
// sizes, font loaded, captures. Then: tab order, reduced motion, storage blocked, the loop sleeping
// when idle and pausing when hidden, and the /works/sand/ address.
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, outDir, mode] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const BASE = 'http://127.0.0.1:8000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sizes = mode === 'quick' ? [[390, 844, true]] :
  [[360, 740, true], [390, 844, true], [768, 1024, true], [1024, 768, false], [1440, 900, false], [1920, 1080, false]];

const COUNT_RAF = `(() => { window.__raf = 0; const r = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => { window.__raf++; return r(f); }; })();`;
const NO_STORE = `(() => { const deny = () => { throw new DOMException('denied', 'SecurityError'); };
  Object.defineProperty(window, 'localStorage', { get: deny }); Object.defineProperty(window, 'sessionStorage', { get: deny }); })();`;

async function open(browser, { url, w, h, mobile, reduced, nostore }) {
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });
  await page.evaluateOnNewDocument(COUNT_RAF);
  if (nostore) await page.evaluateOnNewDocument(NO_STORE);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(700);
  return { page, problems };
}

const LAYOUT = () => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width && b.height ? [b.left, b.top, b.right, b.bottom].map(Math.round) : null; };
  const q = (s) => r(document.querySelector(s));
  const badge = document.querySelector('[data-gallery-back]');
  const ba = badge && badge.shadowRoot && badge.shadowRoot.querySelector('a');
  const vis = (e) => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const titleRange = document.createRange();
  titleRange.selectNodeContents(document.querySelector('.title'));
  const tr = titleRange.getBoundingClientRect();
  return {
    sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight, ih: innerHeight,
    title: [tr.left, tr.top, tr.right, tr.bottom].map(Math.round), badge: r(ba), stage: q('[data-stage]'), deck: q('.deck'),
    foot: q('.foot'), aside: q('.aside'), app: q('.app'), status: q('.status'), sensor: q('[data-sensor]'),
    small: [...document.querySelectorAll('button')].filter(vis).map((b) => [b.textContent.trim() || b.getAttribute('aria-label'), Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]).filter(([, bw, bh]) => bw < 44 || bh < 44),
    fontOk: document.fonts.check('17px "Black And White Picture"'),
    textOverflow: [...document.querySelectorAll('.title, .lead, .status, .jar__name, .btn, .foot p, .aside *')].filter((e) => vis(e) && e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName),
  };
};

const hit = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function judge(info, problems) {
  if (info.sw > info.iw) problems.push(`horizontal overflow ${info.sw} > ${info.iw}`);
  if (hit(info.title, info.badge)) problems.push('title under the gallery badge');
  if (hit(info.stage, info.deck)) problems.push('stage overlaps deck');
  if (hit(info.deck, info.foot)) problems.push('deck overlaps footer');
  if (hit(info.app, info.aside)) problems.push('aside overlaps the column');
  if (info.small.length) problems.push('small tap targets ' + JSON.stringify(info.small));
  if (info.textOverflow.length) problems.push('text overflow ' + JSON.stringify(info.textOverflow));
  if (!info.fontOk) problems.push('font not loaded');
  if (info.stage && info.stage[3] - info.stage[1] < 280) problems.push('stage too short ' + (info.stage[3] - info.stage[1]));
}

async function holdPour(page, ms) {
  const b = await page.$('[data-pour]');
  const box = await b.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(ms);
  await page.mouse.up();
}

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, timeout: 120000,
  args: ['--hide-scrollbars', '--no-first-run'],
});

for (const [w, h, mobile] of sizes) {
  const { page, problems } = await open(browser, { url: BASE + '/sand/', w, h, mobile });
  await page.screenshot({ path: path.join(outDir, `chk-${w}.png`) });
  const sensorShown = await page.$eval('[data-sensor]', (e) => !e.hidden);
  if (sensorShown) await page.click('[data-sensor-off]');
  // tilt by dragging the bottle, then pour
  const st = await (await page.$('[data-stage]')).boundingBox();
  await page.mouse.move(st.x + st.width / 2, st.y + st.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(st.x + st.width / 2 + 70, st.y + st.height * 0.6, { steps: 8 });
  await page.mouse.up();
  await holdPour(page, 1800);
  await sleep(1500);
  await page.screenshot({ path: path.join(outDir, `chk-${w}-poured.png`) });
  const info = await page.evaluate(LAYOUT);
  judge(info, problems);
  const label = await page.$eval('[data-canvas]', (c) => c.getAttribute('aria-label'));
  console.log(`[${w}x${h}${mobile ? ' touch' : ''}]`, problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'ok',
    `| sensor card ${sensorShown ? 'shown' : 'hidden'} | stage ${info.stage[3] - info.stage[1]}px | page ${info.sh}/${info.ih} | ${label}`);
  await page.close();
}

if (mode !== 'quick') {
  // keyboard: tab order and visible focus, then a keyboard-only fill
  {
    const { page, problems } = await open(browser, { url: BASE + '/works/sand/', w: 1280, h: 860, mobile: false });
    const order = [];
    for (let t = 0; t < 14; t++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => {
        const a = document.activeElement;
        if (a && a.shadowRoot) return 'badge';
        const s = getComputedStyle(a);
        return `${(a.textContent.trim() || a.getAttribute('aria-label') || a.tagName).slice(0, 12)}${s.outlineStyle !== 'none' && s.outlineWidth !== '0px' ? '' : '(NO RING)'}`;
      }));
    }
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('3');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await page.keyboard.down('Space'); await sleep(1500); await page.keyboard.up('Space');
    await page.keyboard.press('2');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    await page.keyboard.down('Space'); await sleep(1500); await page.keyboard.up('Space');
    await sleep(1800);
    await page.keyboard.press('s');
    await sleep(1500);
    await page.screenshot({ path: path.join(outDir, 'chk-keyboard.png') });
    const out = await page.evaluate(() => [document.querySelector('[data-canvas]').getAttribute('aria-label'), document.querySelector('[data-status-text]').textContent]);
    console.log('[keyboard /works/sand/]', problems.length ? 'PROBLEMS: ' + problems.join(' | ') : 'ok', '\n  tab:', order.join(' > '), '\n  ', JSON.stringify(out));
    await page.close();
  }
  // reduced motion: fill instantly, shake, cork: the end state shows at once
  {
    const { page, problems } = await open(browser, { url: BASE + '/sand/', w: 390, h: 844, mobile: true, reduced: true });
    await page.click('[data-sensor-off]');
    for (let n = 0; n < 20; n++) {
      if (!(await page.$eval('[data-cork]', (e) => e.hidden))) break;
      await page.click('[data-jar="' + ((n % 5) + 1) + '"]');
      await page.click('[data-instant]');
    }
    await page.click('[data-shake]');
    await sleep(800);
    for (let n = 0; n < 8; n++) {             // shaking can open room again: top up until full
      if (!(await page.$eval('[data-cork]', (e) => e.hidden))) break;
      await page.click('[data-instant]');
      await sleep(200);
    }
    const corkHidden = await page.$eval('[data-cork]', (e) => e.hidden);
    if (!corkHidden) await page.click('[data-cork]');
    await sleep(80);
    await page.screenshot({ path: path.join(outDir, 'chk-reduced-corked.png') });
    const before = await page.evaluate(() => window.__raf);
    await sleep(1200);
    const after = await page.evaluate(() => window.__raf);
    const out = await page.evaluate(() => [document.querySelector('[data-status-text]').textContent, document.querySelector('[data-canvas]').getAttribute('aria-label')]);
    console.log('[reduced motion]', problems.length ? 'PROBLEMS: ' + problems.join(' | ') : 'ok', `| cork button was ${corkHidden ? 'hidden (not full yet)' : 'shown'} | frames while idle ${after - before}`, '\n  ', JSON.stringify(out));
    await page.close();
  }
  // storage blocked; idle loop sleeps; hidden tab pauses
  {
    const { page, problems } = await open(browser, { url: BASE + '/sand/', w: 390, h: 844, mobile: true, nostore: true });
    { const st = await (await page.$('[data-stage]')).boundingBox(); await page.mouse.click(st.x + st.width / 2, st.y + st.height * 0.7); }
    await sleep(300);
    if (await page.$eval('[data-sensor]', (e) => !e.hidden)) await page.click('[data-sensor-off]');
    await sleep(1500);
    const a = await page.evaluate(() => window.__raf);
    await sleep(1000);
    const b = await page.evaluate(() => window.__raf);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await holdPour(page, 800);
    const c = await page.evaluate(() => window.__raf);
    await sleep(600);
    const d = await page.evaluate(() => window.__raf);
    console.log('[storage blocked + sleep]', problems.length ? 'PROBLEMS: ' + problems.join(' | ') : 'ok', `| idle frames/s ${b - a} | frames while hidden ${d - c}`);
    await page.close();
  }
}
await browser.close();
