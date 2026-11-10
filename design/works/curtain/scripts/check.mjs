// Release checks for the curtain page over CDP (dev tool, not deployed).
//   node design/works/curtain/scripts/check.mjs [base url]
// Needs the headless Chrome cdp.mjs talks to. For each viewport: console/network problems (printed
// by cdp.mjs), horizontal overflow, overlaps with the gallery badge, small tap targets, closed and
// open. Then motion on and reduced (tease, air, rope), pausing off-screen, the Canvas2D fallback,
// keyboard order and the /works/ path.
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cdp = path.join(here, 'cdp.mjs');
const base = process.argv[2] || 'http://127.0.0.1:8000';

const probe = `(() => {
  const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.left, b.top, b.right, b.bottom].map(Math.round) : null; };
  const host = document.querySelector('[data-gallery-back]');
  const badge = box(host && host.shadowRoot && host.shadowRoot.querySelector('a'));
  const hit = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const out = [];
  if (document.documentElement.scrollWidth > innerWidth) out.push('overflow ' + document.documentElement.scrollWidth);
  const parts = { bill: '.bill__cue', title: '.bill__title', after: '.after', brand: '.brand', nav: '.nav' };
  const b = {}; for (const k in parts) b[k] = box(document.querySelector(parts[k]));
  if (getComputedStyle(document.querySelector('[data-bill]')).opacity > 0.5) for (const k of ['bill', 'title']) if (hit(b[k], badge)) out.push(k + ' under badge');
  if (!document.querySelector('[data-after]').hidden && hit(b.after, badge)) out.push('after under badge');
  if (hit(b.brand, b.nav)) out.push('brand overlaps nav');
  for (const e of document.querySelectorAll('.btn, .nav a')) { const r = e.getBoundingClientRect(); if (r.width && (r.height < 44 || r.width < 44)) out.push('small target ' + e.textContent.trim() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  const st = document.querySelector('[data-stage]');
  return (st.classList.contains('is-ready') ? 'ready ' : 'NOT READY ') + (out.join('; ') || 'ok');
})()`;

function run(label, url, size, flags, ops) {
  const out = execFileSync('node', [cdp, url, size, ...flags, ...ops], { encoding: 'utf8', timeout: 120000 });
  console.log(`${label}\n  ${out.trim().split('\n').join('\n  ')}`);
}

const sizes = [['360x740@2', ['mobile']], ['390x844@2', ['mobile']], ['768x1024', ['mobile']], ['1024x768', []], ['1440x900', []], ['1920x1080', []]];
for (const [size, flags] of sizes) {
  run(size, `${base}/curtain/?debug`, size, flags, ['wait=1500', `log=${probe}`, 'eval=__curtain.pull(0)', 'wait=3200', `log=${probe}`,
    'eval=document.getElementById("program").scrollIntoView()', 'wait=300', `log=${probe}`]);
}
// motion both ways: the tease, the house air and the rope all run under reduced motion too, calmer
const peek = 'eval=window.__peek = 0; (function t() { window.__peek = Math.max(window.__peek, __curtain.cu.openness()); if (performance.now() < 9000) requestAnimationFrame(t); })()';
const mid = 'eval=window.__mid = []; setTimeout(() => window.__mid.push(+__curtain.cu.openness().toFixed(2)), 1200)';
for (const [label, flags] of [['motion on 390', ['mobile']], ['reduced motion 390', ['mobile', 'reduced']]]) {
  run(label, `${base}/curtain/?debug`, '390x844@2', flags, [peek, 'wait=1000',
    'log="air clock " + __curtain.cu.airT.toFixed(2) + " running " + __curtain.running + " damp " + __curtain.cu.damp',
    'wait=4500', 'log="tease peak openness " + window.__peek.toFixed(3) + ", bill " + document.querySelector("[data-bill]").style.opacity',
    mid, 'tapsel=[data-open]', 'wait=1500', 'log="1.2 s into the rope: openness " + window.__mid', 'wait=3500',
    'log=document.querySelector("[data-status]").textContent + " | after hidden " + document.querySelector("[data-after]").hidden + " | " + document.querySelector("[data-stage]").className',
    'log="lamp " + getComputedStyle(document.querySelector(".lamp")).animationName + " " + getComputedStyle(document.querySelector(".lamp")).animationDuration']);
}
// the loop and the lamps rest while the stage is out of view
run('pause off-screen 1440', `${base}/curtain/?debug`, '1440x900', [], ['wait=1200',
  'eval=document.getElementById("tickets").scrollIntoView()', 'wait=400',
  'log="away: running " + __curtain.running + " air " + __curtain.cu.airT.toFixed(3) + " | " + document.querySelector("[data-stage]").className + " | close-up " + document.querySelector("[data-close-up]").className',
  'wait=1200', 'log="1.2 s later: air " + __curtain.cu.airT.toFixed(3) + " running " + __curtain.running',
  'eval=window.scrollTo(0, 0)', 'wait=600', 'log="back: running " + __curtain.running + " | " + document.querySelector("[data-stage]").className']);
run('canvas2d fallback 1440', `${base}/curtain/?nogl&debug`, '1440x900', [], ['wait=1500', `log=${probe}`, 'eval=__curtain.pull(0)', 'wait=3200', `log=${probe}`]);
run('keyboard 1440', `${base}/curtain/`, '1440x900', [], ['wait=1500',
  ...Array(5).fill(0).flatMap(() => ['key=Tab', 'log=document.activeElement.textContent.trim() || document.activeElement.tagName']),
  'key=Enter', 'wait=3200', 'log=document.activeElement.textContent.trim()', 'log=document.querySelector("[data-status]").textContent']);
run('works path', `${base}/works/curtain/`, '1440x900', [], ['wait=1500', `log=${probe}`]);
