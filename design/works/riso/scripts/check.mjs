// Quality-gate sweep for the riso work (dev tool, not deployed).
//   node check.mjs <puppeteer-core dir> <out dir> [base url]
// One browser: every width for horizontal overflow + console/network errors, reduced motion,
// the /works/riso/ path, storage blocked, keyboard tab order, and full-page shots per width.
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, outDir, base = 'http://127.0.0.1:8000'] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--no-first-run'],
});

async function open(url, { width, height = 900, mobile = false, reduced = false, blockStorage = false } = {}) {
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[console.${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[http ${r.status()}] ${r.url()}`); });
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (blockStorage) {
    await page.evaluateOnNewDocument(() => {
      const thrower = { get() { throw new DOMException('blocked', 'SecurityError'); } };
      Object.defineProperty(window, 'localStorage', thrower);
      Object.defineProperty(window, 'sessionStorage', thrower);
    });
  }
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(1200);
  return { page, problems };
}

async function overflow(page) {
  return page.evaluate(async () => {
    // walk the page so lazy prints render, then measure
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    const vw = document.documentElement.clientWidth;
    const wide = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > vw + 0.5 || r.left < -0.5)) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || el.closest('.sr-only') || el.closest('[hidden]')) continue;
        wide.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60) + ` ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    }
    return { scroll: document.documentElement.scrollWidth, vw, wide: wide.slice(0, 8) };
  });
}

const url = `${base}/riso/`;
for (const [w, mobile] of [[360, true], [390, true], [768, true], [1024, false], [1440, false], [1920, false]]) {
  const { page, problems } = await open(url, { width: w, mobile });
  const o = await overflow(page);
  console.log(`width ${w}: scrollWidth ${o.scroll} / ${o.vw}${o.wide.length ? ' WIDE ' + o.wide.join(' | ') : ''}`);
  for (const p of problems) console.log('  ', p);
  await page.screenshot({ path: path.join(outDir, `w${w}.png`), fullPage: true });
  await page.close();
}

{
  const { page, problems } = await open(url, { width: 1280, reduced: true });
  const wipe = await page.evaluate(() => new Promise((res) => {
    // with reduced motion the sheet is final on the first frames: sample the canvas twice
    const c = document.getElementById('press-canvas');
    const x = c.getContext('2d');
    const a = x.getImageData(0, 0, c.width, c.height).data;
    let inked = 0;
    for (let i = 0; i < a.length; i += 4 * 97) if (a[i] < 250 || a[i + 1] < 250 || a[i + 2] < 250) inked++;
    res(inked);
  }));
  console.log('reduced motion: inked samples on first look', wipe);
  for (const p of problems) console.log('  ', p);
  await page.close();
}
{
  const { page, problems } = await open(`${base}/works/riso/`, { width: 1280 });
  console.log('/works/riso/ title:', await page.title());
  for (const p of problems) console.log('  ', p);
  await page.close();
}
{
  const { page, problems } = await open(url, { width: 1280, blockStorage: true });
  await page.click('#pull');
  await sleep(1500);
  console.log('storage blocked: slug =', await page.$eval('#slug', (e) => e.textContent));
  for (const p of problems) console.log('  ', p);
  await page.close();
}
{
  // which characters each web font actually has to draw (text nodes + input values + canvas glyph)
  const { page } = await open(url, { width: 1280 });
  const used = await page.evaluate(() => {
    const out = {};
    const add = (fam, text) => {
      const f = fam.split(',')[0].replace(/["']/g, '').trim();
      out[f] = out[f] || new Set();
      for (const ch of text) if (ch.trim()) out[f].add(ch);
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.parentElement || n.parentElement.closest('script,style,noscript')) continue;
      add(getComputedStyle(n.parentElement).fontFamily, n.textContent);
    }
    for (const el of document.querySelectorAll('input, textarea, output')) add(getComputedStyle(el).fontFamily, el.value || '');
    for (const el of document.querySelectorAll('h1,h2,h3')) {
      const b = getComputedStyle(el, '::before').content;
      if (b && b !== 'none' && b !== 'normal') add(getComputedStyle(el).fontFamily, b.replace(/"/g, ''));
    }
    add('Black Han Sans', '겹');
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort().join('')]));
  });
  console.log('FONTCHARS ' + JSON.stringify(used));
  await page.close();
}
{
  const { page } = await open(url, { width: 1280 });
  const seq = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    seq.push(await page.evaluate(() => {
      const a = document.activeElement;
      if (!a) return '-';
      const label = a.getAttribute('aria-label') || a.textContent.trim().slice(0, 18) || a.id;
      const cs = getComputedStyle(a);
      return `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''} "${label.slice(0, 28)}" ${cs.outlineStyle !== 'none' ? 'ring' : 'NO-RING'}`;
    }));
  }
  console.log('tab order:\n  ' + seq.join('\n  '));
  await page.close();
}
await browser.close();
