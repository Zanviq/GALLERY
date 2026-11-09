// Automated gate checks for the observatory page (dev tool, not deployed).
//   node check.mjs <puppeteer-core dir> <base url>
// - console errors/warnings and failed requests, normal and reduced motion
// - palette: every computed colour on the page is one of the four inks
// - no horizontal scroll at 360 390 768 1024 1440 1920
// - tab order with visible focus, tap target sizes
// - slider keys, tap selection, form errors and success, idle animation loop
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, base] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = base.replace(/\/$/, '') + '/?at=2026-11-09T19:30';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, timeout: 180000, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--no-first-run'],
});
const problems = [];
const note = (m) => { problems.push(m); console.log('FAIL', m); };

async function open(width, height, { reduced = false, mobile = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') note(`console.${m.type()} @${width}${reduced ? ' reduced' : ''}: ${m.text()}`); });
  page.on('pageerror', (e) => note(`pageerror @${width}: ${e.message}`));
  page.on('requestfailed', (r) => note(`requestfailed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) note(`http ${r.status()}: ${r.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(1800);
  return page;
}

// ---- overflow at every width
for (const w of [360, 390, 768, 1024, 1440, 1920]) {
  const page = await open(w, 900, { mobile: w < 600 });
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (r.sw > r.cw) note(`horizontal scroll at ${w}: ${r.sw} > ${r.cw}`);
  else console.log(`ok width ${w}`);
  await page.close();
}

// ---- palette, focus, targets, interactions at 1440
{
  const page = await open(1440, 900);
  const bad = await page.evaluate(() => {
    const ok = new Set(['rgb(0, 0, 0)', 'rgb(255, 68, 54)', 'rgb(163, 20, 27)', 'rgb(61, 7, 9)']);
    const norm = (c) => {
      if (!c || c === 'none' || c === 'transparent' || c === 'currentcolor') return null;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return c.startsWith('url(') ? null : c;
      const p = m[1].split(',').map((x) => x.trim());
      if (p.length === 4 && Number(p[3]) === 0) return null;
      return `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
    };
    const out = new Set();
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[data-gallery-back]')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const props = ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke', 'textDecorationColor', 'caretColor'];
      for (const p of props) {
        if (p.startsWith('border') && cs[p.replace('Color', 'Width')] === '0px') continue;
        if (p === 'outlineColor' && cs.outlineStyle === 'none') continue;
        if ((p === 'fill' || p === 'stroke') && !(el instanceof SVGElement)) continue;
        const v = norm(cs[p]);
        if (v && !ok.has(v)) out.add(`${p}=${v} on ${el.tagName.toLowerCase()}.${el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className}`);
      }
    }
    // canvas pixels: every opaque pixel must be one of the inks (anti-aliasing blends between them,
    // so check the hue instead: green and blue never exceed red, and g/b stay in the red family)
    const c = document.querySelector('#disc-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let off = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
      if (g > r || b > r || Math.abs(g - b) > 24) off++;
    }
    if (off) out.add(`canvas: ${off} pixels outside the red family`);
    return [...out];
  });
  bad.forEach((b) => note(`palette: ${b}`));
  if (!bad.length) console.log('ok palette');

  // tab order + visible focus + target size
  const stops = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const canvasRing = el.id === 'disc' ? getComputedStyle(el.querySelector('canvas')).outlineStyle : 'none';
      const r = el.getBoundingClientRect();
      const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
      return { tag: el.tagName, id: el.id, text: (el.textContent || '').trim().slice(0, 18),
        visible: cs.outlineStyle !== 'none' || canvasRing !== 'none' || cs.boxShadow !== 'none' || el.matches('input[type=radio]'),
        w: Math.round(r.width), h: Math.round(r.height), inline };
    });
    if (!s) break;
    stops.push(s);
    if (!s.visible) note(`no visible focus: ${s.tag}#${s.id} ${s.text}`);
    if (!s.inline && (s.h < 44 || s.w < 44) && s.tag !== 'INPUT' && s.tag !== 'TEXTAREA') note(`small target ${s.w}x${s.h}: ${s.tag} ${s.text}`);
  }
  console.log('tab order:', stops.map((s) => s.id || s.text).join(' | '));

  // slider keys
  const k = await page.evaluate(async () => {
    const d = document.querySelector('#disc');
    d.focus();
    const v0 = Number(d.getAttribute('aria-valuenow'));
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const v1 = Number(d.getAttribute('aria-valuenow'));
    d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    const v2 = Number(d.getAttribute('aria-valuenow'));
    return [v0, v1, v2, d.getAttribute('aria-valuetext')];
  });
  if (k[1] - k[0] !== 10 || k[2] - k[1] !== 60) note(`slider keys: ${k}`); else console.log('ok slider keys', k[3]);

  // list -> selection -> info line
  const sel = await page.evaluate(async () => {
    document.querySelector('.target').click();
    await new Promise((r) => setTimeout(r, 200));
    return [document.querySelector('#disc-info').textContent, document.querySelector('.target').getAttribute('aria-pressed')];
  });
  if (sel[1] !== 'true') note(`list selection did not press: ${sel}`); else console.log('ok list select:', sel[0].slice(0, 60));

  // form: errors then success
  const f = await page.evaluate(async () => {
    const form = document.querySelector('#group-form');
    form.querySelector('button[type=submit]').click();
    const errs = [...form.querySelectorAll('.field__error:not([hidden])')].map((e) => e.textContent);
    const focused = document.activeElement && document.activeElement.name;
    form.querySelector('input[value="학교"]').checked = true;
    form.querySelector('#count').value = '28';
    form.querySelector('#date').value = document.querySelector('#date-example').textContent;
    form.querySelector('input[value="첫 회차"]').checked = true;
    form.querySelector('button[type=submit]').click();
    const res = document.querySelector('#group-result');
    return { errs, focused, ok: !res.hidden, text: res.textContent, active: document.activeElement.id };
  });
  if (f.errs.length !== 4 || !f.ok || f.active !== 'group-result') note(`form: ${JSON.stringify(f)}`);
  else console.log('ok form', f.errs.length, 'errors then', f.text.slice(0, 50));

  // idle: the animation loop must stop when nothing moves
  const idle = await page.evaluate(async () => {
    let n = 0;
    const orig = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => { n++; return orig(cb); };
    await new Promise((r) => setTimeout(r, 1500));
    window.requestAnimationFrame = orig;
    return n;
  });
  if (idle > 2) note(`rAF still running while idle: ${idle} calls`); else console.log('ok idle loop', idle);
  await page.close();
}

// ---- reduced motion
{
  const page = await open(390, 844, { reduced: true, mobile: true });
  const r = await page.evaluate(() => ({ play: document.querySelector('#play').hidden }));
  if (!r.play) note('reduced motion: play button still shown'); else console.log('ok reduced: no play');
  await page.close();
}

// ---- the /works/ path
{
  const page = await browser.newPage();
  const res = await page.goto(base.replace('/observatory', '/works/observatory') + '/?at=2026-11-09T19:30', { waitUntil: 'networkidle0' });
  if (res.status() !== 200) note(`/works/observatory/ status ${res.status()}`); else console.log('ok /works/observatory/');
  await page.close();
}

await browser.close();
console.log(problems.length ? `${problems.length} problem(s)` : 'ALL CHECKS PASSED');
