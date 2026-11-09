// Quality-gate checks for works/laundry (dev tool, not deployed).
//   node check.mjs <puppeteer-core dir> <base url> [outdir]
// - console errors / warnings, failed requests, in normal and reduced-motion runs
// - horizontal overflow at 360 390 768 1024 1440 1920
// - the notify flow: open a running machine, ask to be told, fast-forward, toast appears
// - Jua coverage: every character set in Jua exists in the Jua subset
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const [, , ppDir, base, outDir = '.'] = process.argv;
const require = createRequire(path.join(ppDir, 'package.json'));
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--no-first-run'],
});

async function open(url, { w = 390, h = 844, mobile = true, reduced = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const tag = `${url} ${w}${reduced ? ' reduced' : ''}`;
  page.on('console', (m) => { if (['error', 'warning', 'warn'].includes(m.type())) problems.push(`[console.${m.type()}] ${tag}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${tag}: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[requestfailed] ${tag}: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[http ${r.status()}] ${tag}: ${r.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(800);
  return page;
}

// 1. overflow at widths, both URLs
for (const url of [`${base}/laundry/`, `${base}/works/laundry/`]) {
  for (const w of [360, 390, 768, 1024, 1440, 1920]) {
    const page = await open(url, { w, h: 900, mobile: w < 768 });
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll('body *')].filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width && (b.right > de.clientWidth + 1 || b.left < -1) && getComputedStyle(el).position !== 'fixed';
      }).slice(0, 5).map((el) => `${el.tagName}.${el.className} ${Math.round(el.getBoundingClientRect().right)}`);
      return { sw: de.scrollWidth, cw: de.clientWidth, wide };
    });
    if (r.sw > r.cw) problems.push(`[overflow] ${url} ${w}: scrollWidth ${r.sw} > ${r.cw} ${r.wide.join(' | ')}`);
    console.log('width', w, url.includes('/works/') ? '/works/laundry/' : '/laundry/', r.sw <= r.cw ? 'ok' : 'OVERFLOW', r.wide.join(' | '));
    await page.close();
  }
}

// 2. notify flow + interactions (normal motion)
{
  const page = await open(`${base}/laundry/`, { w: 390, h: 844 });
  const num = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.mc[data-state="run"]')][0];
    return t && t.dataset.num;
  });
  await page.click(`.mc[data-num="${num}"]`);
  await sleep(300);
  const sheetOpen = await page.evaluate(() => document.getElementById('sheet').open);
  await page.click('#notify');
  const pressed = await page.$eval('#notify', (b) => b.getAttribute('aria-pressed'));
  await page.keyboard.press('Escape');
  await sleep(200);
  const focusBack = await page.evaluate(() => document.activeElement && document.activeElement.className);
  await page.click('#speed');
  let toast = false;
  for (let i = 0; i < 120 && !toast; i++) { await sleep(1000); toast = await page.$eval('#toast', (t) => !t.hidden); }
  const toastText = await page.$eval('#toast-text', (t) => t.textContent);
  console.log('notify flow:', { num, sheetOpen, pressed, focusBack, toast, toastText });
  if (!sheetOpen || pressed !== 'true' || !toast) problems.push('[flow] notify flow failed');
  // branch switch by keyboard
  await page.focus('input[name="branch"]:checked');
  await page.keyboard.press('ArrowRight');
  await sleep(300);
  const h1 = await page.$eval('#board-title', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  console.log('after ArrowRight on branch:', h1);
  // keypad + drum
  await page.evaluate(() => document.getElementById('courses').scrollIntoView());
  await page.click('.ckey[data-i="5"]');
  await page.click('[data-item="sock"]');
  await page.click('#m-start');
  await sleep(2500);
  const running = await page.evaluate(() => ({ state: document.getElementById('machine').dataset.state, line: document.getElementById('m-line').textContent }));
  console.log('drum:', running);
  await page.click('[data-item="towel"]');
  const msg = await page.$eval('#m-msg', (e) => e.textContent);
  console.log('locked msg:', msg);
  await page.screenshot({ path: path.join(outDir, 'chk-toast.png') });
  await page.close();
}

// 3. reduced motion: no running CSS animations, page still explains itself
{
  const page = await open(`${base}/laundry/`, { w: 1440, h: 900, mobile: false, reduced: true });
  const anim = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => a.animationName || a.constructor.name));
  console.log('reduced: running animations', anim);
  if (anim.length) problems.push(`[reduced] running animations: ${anim.join(', ')}`);
  await page.click('.mc');
  await sleep(200);
  await page.keyboard.press('Escape');
  await page.close();
}

// 4. Jua coverage
{
  const page = await open(`${base}/laundry/`, { w: 1440, h: 900, mobile: false });
  const juaText = await page.evaluate(() => {
    let s = '';
    for (const el of document.querySelectorAll('body *')) {
      const ff = getComputedStyle(el).fontFamily;
      if (!/^\s*"?Jua/.test(ff)) continue;
      for (const n of el.childNodes) if (n.nodeType === 3) s += n.textContent;
    }
    return s;
  });
  fs.writeFileSync(path.join(outDir, 'jua-text.txt'), juaText, 'utf8');
  await page.close();
}

await browser.close();
console.log(problems.length ? problems.join('\n') : 'NO PROBLEMS');
