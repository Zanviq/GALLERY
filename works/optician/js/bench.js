// Lens bench: the chosen frame and the found prescription, cut from a round blank.
import { FACES, TARGET, state, update, subscribe, reducedMotion } from './state.js';
import { lensPath, lensHeight } from './fit.js';

const NS = 'http://www.w3.org/2000/svg';
const BLANKS = [60, 65, 70, 75];
const CENTRE = 1.2;     // centre thickness of a minus lens, mm
const VSCALE = 2.6;     // cross-section drawn this many times taller than it is
const fx = (n, d = 1) => n.toFixed(d);

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
const thick = (x, n) => CENTRE + (x * x * Math.abs(TARGET)) / (2000 * (n - 1));

function geometry(s) {
  const f = FACES[s.face];
  const d = (s.a + s.dbl - f.pd) / 2;  // decentration, OC is nasal (+x) of the box centre
  const B = lensHeight(s.a);
  const box = { x: -d, y: 2 };          // pupil sits 2 mm above the box centre
  return { f, d, B, box };
}

export function initBench() {
  const blank = document.getElementById('blank');
  const section = document.getElementById('section');
  if (!blank || !section) return;
  const out = {
    input: document.getElementById('b-input'), blank: document.getElementById('b-blank'),
    t: document.getElementById('b-edge-t'), n: document.getElementById('b-edge-n'),
    note: document.getElementById('b-note'),
  };
  const cutBtn = document.getElementById('cut');
  const idxBtns = [...document.querySelectorAll('[data-index]')];
  let cut = 'idle'; // idle → cutting → done
  let raf = 0, cutter = null, cutLine = null, waste = null, shape = null, pathLen = 0, t0 = 0;
  let visible = true;

  function draw(s) {
    cancelAnimationFrame(raf);
    cut = 'idle';
    cutBtn.textContent = '깎아 보기';
    blank.textContent = '';
    section.textContent = '';
    const { d, B, box } = geometry(s);
    const n = Number(s.index);

    // the outline, measured from the optical centre at (0, 0)
    const shapeD = lensPath(box.x, box.y, s.a, B);
    const probe = el('path', { d: shapeD }, blank);
    pathLen = probe.getTotalLength();
    let far = 0;
    for (let i = 0; i < 120; i++) {
      const p = probe.getPointAtLength((pathLen * i) / 120);
      far = Math.max(far, Math.hypot(p.x, p.y));
    }
    probe.remove();
    const need = Math.ceil(2 * far + 2);
    const size = BLANKS.find((b) => b >= need) || BLANKS[BLANKS.length - 1];
    const R = size / 2;

    const defs = el('defs', {}, blank);
    const pat = el('pattern', { id: 'hatch', width: 2.4, height: 2.4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('path', { d: 'M0 0V2.4', class: 'hatch' }, pat);

    el('circle', { cx: 0, cy: 0, r: R, class: 'blank__disc' }, blank);
    waste = el('path', { d: `M${-R} 0a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z${shapeD}`, 'fill-rule': 'evenodd', class: 'blank__waste' }, blank);
    shape = el('path', { d: shapeD, class: 'blank__shape' }, blank);
    cutLine = el('path', { d: shapeD, class: 'blank__cut', 'stroke-dasharray': fx(pathLen, 2), 'stroke-dashoffset': fx(pathLen, 2) }, blank);
    // optical centre
    el('path', { d: 'M-3 0H3M0 -3V3', class: 'blank__oc' }, blank);
    const ocLabel = el('text', { x: 1.5, y: -4.5, class: 'blank__label' }, blank);
    ocLabel.textContent = '광학 중심';
    const tl = el('text', { x: -R + 1, y: R + 5.5, class: 'blank__label' }, blank);
    tl.textContent = '귀 쪽';
    const nl = el('text', { x: R - 1, y: R + 5.5, class: 'blank__label', 'text-anchor': 'end' }, blank);
    nl.textContent = '코 쪽';
    const sl = el('text', { x: 0, y: -R - 2.5, class: 'blank__label', 'text-anchor': 'middle' }, blank);
    sl.textContent = `원판 지름 ${size}mm`;
    cutter = el('circle', { cx: 0, cy: 0, r: 2.6, class: 'blank__cutter', visibility: 'hidden' }, blank);

    // cross-section along the horizontal line through the optical centre
    const xt = box.x - s.a / 2, xn = box.x + s.a / 2; // temporal (left) and nasal (right) edges
    const steps = 40;
    let top = '', bot = '';
    for (let i = 0; i <= steps; i++) {
      const x = xt + ((xn - xt) * i) / steps;
      const h = (thick(x, n) * VSCALE) / 2;
      top += `${i ? 'L' : 'M'}${fx(x, 2)} ${fx(-h, 2)}`;
      bot = `L${fx(x, 2)} ${fx(h, 2)}` + bot;
    }
    const ht = (thick(xt, n) * VSCALE) / 2, hn = (thick(xn, n) * VSCALE) / 2;
    // V-bevel on both edges
    const prof = `${top}L${fx(xn + 1.4, 2)} 0${bot}L${fx(xt - 1.4, 2)} 0Z`;
    el('path', { d: `M-44 0H44`, class: 'section__axis' }, section);
    el('path', { d: prof, class: 'section__lens' }, section);
    const labels = [[xt, -ht - 1.4, thick(xt, n), 'start'], [0, -(CENTRE * VSCALE) / 2 - 1.4, CENTRE, 'middle'], [xn, -hn - 1.4, thick(xn, n), 'end']];
    for (const [x, y, v, anchor] of labels) {
      const t = el('text', { x: fx(x, 2), y: fx(y, 2), class: 'section__label', 'text-anchor': anchor }, section);
      t.textContent = `${fx(v)}`;
    }

    out.input.textContent = `${s.a}□${s.dbl}, 오른눈 S −2.25`;
    out.blank.textContent = need > 75
      ? `75mm로도 모자랍니다 (최소 ${need}mm)`
      : `지름 ${size}mm (최소 ${need}mm 필요)`;
    out.t.textContent = `${fx(thick(xt, n))}mm`;
    out.n.textContent = `${fx(thick(xn, n))}mm`;
    const diff = thick(xt, 1.56) - thick(xt, 1.74);
    out.note.textContent = need > 75
      ? '이 테는 눈 사이에 비해 너무 넓어 원판에서 깎아 낼 수 없습니다. 렌즈 폭이 좁은 테를 권합니다.'
      : diff < 0.5
        ? `이 도수에서는 1.56과 1.74의 귀 쪽 가장자리 차이가 ${fx(diff)}mm입니다. 비싼 렌즈가 꼭 필요하지는 않습니다.`
        : `눈동자가 렌즈 가운데에서 멀어 귀 쪽이 두껍습니다. 1.56과 1.74의 차이는 ${fx(diff)}mm입니다.`;
    for (const b of idxBtns) b.setAttribute('aria-pressed', String(b.dataset.index === s.index));
    cutBtn.disabled = need > 75;
  }

  function finish() {
    cancelAnimationFrame(raf);
    cut = 'done';
    cutLine.setAttribute('stroke-dashoffset', '0');
    cutter.setAttribute('visibility', 'hidden');
    waste.classList.add('is-gone');
    shape.classList.add('is-cut');
    cutBtn.textContent = '새 원판 놓기';
  }

  function frame(now) {
    if (!visible || document.hidden) { finish(); return; }
    const k = Math.min(1, (now - t0) / 1600);
    const len = pathLen * k;
    const p = cutLine.getPointAtLength(len);
    cutter.setAttribute('cx', fx(p.x, 2));
    cutter.setAttribute('cy', fx(p.y, 2));
    cutLine.setAttribute('stroke-dashoffset', fx(pathLen - len, 2));
    if (k < 1) raf = requestAnimationFrame(frame);
    else finish();
  }

  cutBtn.addEventListener('click', () => {
    if (cut === 'cutting') { finish(); return; }
    if (cut === 'done') { draw(state); return; }
    if (reducedMotion()) { finish(); return; }
    cut = 'cutting';
    cutBtn.textContent = '건너뛰기';
    cutter.setAttribute('visibility', 'visible');
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  });

  for (const b of idxBtns) b.addEventListener('click', () => update({ index: b.dataset.index }));

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (!visible && cut === 'cutting') finish();
  }).observe(blank);
  document.addEventListener('visibilitychange', () => { if (document.hidden && cut === 'cutting') finish(); });

  subscribe((s, patch) => {
    if (['a', 'dbl', 'face', 'index'].some((k) => k in patch)) draw(s);
  });
  draw(state);
}
