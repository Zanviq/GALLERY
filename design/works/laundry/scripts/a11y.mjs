// Keyboard and target-size audit for works/laundry (dev tool, not deployed).
//   node a11y.mjs <puppeteer-core dir> <url> [width]
// Tabs through the whole page and prints each stop with its accessible-ish name, whether a
// focus indicator is drawn, and any interactive element smaller than 44x44.
import { createRequire } from 'module';
import path from 'path';

const [, , ppDir, url, width = '390'] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--hide-scrollbars', '--no-first-run'],
});
const page = await browser.newPage();
const W = Number(width);
await page.setViewport({ width: W, height: 900, isMobile: W < 768, hasTouch: W < 768 });
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));

const stops = [];
for (let i = 0; i < 90; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const target = el.matches('input') ? el.nextElementSibling || el : el;
    const ts = getComputedStyle(target);
    const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (ts.outlineStyle !== 'none' && parseFloat(ts.outlineWidth) > 0);
    const b = el.getBoundingClientRect();
    const name = (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    return { tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''), name, ring, w: Math.round(b.width), h: Math.round(b.height) };
  });
  if (!info) break;
  if (stops.length && stops[0].tag === info.tag && stops[0].name === info.name) break;
  stops.push(info);
}
for (const s of stops) console.log(`${s.ring ? 'ring' : 'NO-RING'}  ${s.w}x${s.h}  ${s.tag}  ${s.name}`);

const small = await page.evaluate(() => [...document.querySelectorAll('a, button, input, [tabindex="0"], [role="radio"]')]
  .filter((el) => {
    if (el.closest('p') && el.tagName === 'A') return false; // inline text links are exempt
    const t = el.matches('input[type="radio"]') ? el.parentElement : el;
    const b = t.getBoundingClientRect();
    return b.width && (b.width < 44 || b.height < 44) && getComputedStyle(t).visibility !== 'hidden';
  })
  .map((el) => `${el.tagName}.${el.className} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
console.log('small targets:', small.length ? small : 'none');
await browser.close();
