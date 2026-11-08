// Dev tool (not deployed): tab order, focus visibility, target sizes and text contrast.
//   node a11y.mjs <puppeteer-core dir> <url> <width>x<height> [mobile]
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, url, size, ...flags] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const [W, H] = size.split('x').map(Number);
const mobile = flags.includes('mobile');

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, isMobile: mobile, hasTouch: mobile });
page.on('console', (m) => { if (['error', 'warn', 'warning'].includes(m.type())) console.log(`[console.${m.type()}]`, m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);

const order = [];
for (let i = 0; i < 70; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const n = document.activeElement;
    if (!n || n === document.body) return null;
    const cs = getComputedStyle(n);
    const r = n.getBoundingClientRect();
    const name = n.getAttribute('aria-label') || n.textContent.trim().replace(/\s+/g, ' ').slice(0, 28);
    const ring = (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') || cs.boxShadow !== 'none';
    return { tag: n.tagName.toLowerCase(), role: n.getAttribute('role') || '', name, ring, w: Math.round(r.width), h: Math.round(r.height), host: !!n.shadowRoot };
  });
  if (!info) break;
  order.push(info);
  if (info.host) break; // reached the gallery badge
}
for (const o of order) {
  const flag = (!o.ring ? ' NO-RING' : '') + ((o.w < 44 || o.h < 44) && o.tag !== 'a' ? ' SMALL' : '');
  console.log(`${o.tag}${o.role ? '[' + o.role + ']' : ''} "${o.name}" ${o.w}x${o.h}${flag}`);
}

const contrast = await page.evaluate(() => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { c: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
  const bgOf = (n) => {
    for (let e = n; e; e = e.parentElement) {
      const b = parse(getComputedStyle(e).backgroundColor);
      if (b.a > 0.5) return b.c;
    }
    return [255, 255, 255];
  };
  const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const n = t.parentElement;
    if (!t.textContent.trim() || seen.has(n) || n.closest('svg') || n.closest('[hidden]')) continue;
    seen.add(n);
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const f = parse(cs.color);
    const bg = bgOf(n);
    const fg = f.c.map((v, i) => v * f.a + bg[i] * (1 - f.a));
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), wt = Number(cs.fontWeight);
    const large = px >= 24 || (px >= 18.66 && wt >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need && !n.closest('[aria-disabled="true"],:disabled')) bad.push(`${ratio.toFixed(2)} < ${need}: "${t.textContent.trim().slice(0, 30)}"`);
  }
  return bad;
});
console.log('[contrast failures]', contrast.length ? contrast.join('\n') : 'none');
await browser.close();
