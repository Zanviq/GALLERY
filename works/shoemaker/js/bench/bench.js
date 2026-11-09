// The bench: a sheet of pattern card where a foot is traced and measured, and which turns into a
// hide with the upper's pieces chalked on it. See design/works/shoemaker/INTERACTION.md.
import {
  SHEET_W, SHEET_H, HEEL_Y, SAMPLES, sampleOutline, measure, fitTo, acceptStroke, resample, pathOf, lerp,
} from './geometry.js';
import { buildPieces, footArcs, alignContour, HIDE, BACKBONE, FLAW, M } from './pattern.js';

const NS = 'http://www.w3.org/2000/svg';
const LEATHER = [107, 26, 42];
const WHITE = [255, 255, 255];
const fmt = (v) => Math.round(v).toLocaleString('ko-KR');
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(' ')})`;

const STATUS = {
  sample: (s) => `본 ${s.id.toUpperCase()}를 올려 두었습니다. 종이 위에 직접 그려도 됩니다.`,
  drawn: (m) => `그린 발을 쟀습니다. 길이 ${fmt(m.length)}\u00a0mm, 볼 너비 ${fmt(m.width)}\u00a0mm.`,
  short: '선이 짧아 재지 못했습니다. 발 둘레를 한 바퀴 다 돌아 주십시오.',
  open: '시작한 곳과 끝난 곳이 6 cm 넘게 떨어져 있습니다. 시작한 자리 가까이에서 손을 떼 주십시오.',
  thin: '윤곽 안쪽이 너무 좁습니다. 선이 겹치지 않게 발 바깥쪽을 따라 그려 주십시오.',
  long: '윤곽이 종이보다 깁니다. 종이 안에서 조금 작게 그려 주십시오.',
  cancel: '그리던 선을 거두었습니다. 앞의 윤곽을 그대로 둡니다.',
  empty: '종이를 비웠습니다. 뒤꿈치를 아래 선에 맞추고 발 둘레를 한 바퀴 그려 보십시오.',
  hide: '가죽 위에 본 다섯 장을 놓았습니다. 흰 화살표가 결 방향입니다.',
  paper: '다시 종이 위의 발입니다. 새로 그려도 됩니다.',
  ruler: (what, v) => `${what} ${fmt(v)}\u00a0mm로 맞췄습니다.`,
};

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export function initBench(root) {
  const svg = root.querySelector('[data-sheet]');
  const card = document.querySelector('[data-card]');
  const statusEl = root.querySelector('[data-status]');
  const hint = root.querySelector('[data-hint]');
  const morphBtn = root.querySelector('[data-morph]');
  const clearBtn = root.querySelector('[data-clear]');
  const drawnChoice = root.querySelector('[data-drawn-choice]');
  const rulers = {
    length: root.querySelector('[data-ruler="length"]'),
    width: root.querySelector('[data-ruler="width"]'),
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wide = window.matchMedia('(min-width: 640px)');

  // ---- state ----
  const st = {
    source: 'b', // 'a' | 'b' | 'c' | 'drawn' | 'empty'
    shape: null, // unscaled outline of the source
    drawnShape: null,
    target: null, // { length, width }
    outline: null,
    meas: null,
    pieces: null,
    arcs: null,
    aligned: null,
    t: 0, // 0 paper, 1 hide
    goal: 0,
    trace: 1, // load trace progress
    anim: null,
    stroke: null,
    landscape: wide.matches,
  };

  // ---- view transform (canonical sheet -> what is on screen) ----
  const VW = () => (st.landscape ? SHEET_H : SHEET_W);
  const VH = () => (st.landscape ? SHEET_W : SHEET_H);
  const V = ([x, y]) => (st.landscape ? [SHEET_H - y, x] : [x, y]);
  const Vdir = ([x, y]) => (st.landscape ? [-y, x] : [x, y]);
  const fromView = ([X, Y]) => (st.landscape ? [Y, SHEET_H - X] : [X, Y]);

  // ---- svg skeleton ----
  svg.textContent = '';
  const title = el('title', { id: 'sheet-title' }, svg);
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="1" seed="3" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.9" result="ga"/>
      <feComposite in="d" in2="ga" operator="in"/>
    </filter>`;
  const gPaper = el('g', { class: 'sh-paper' }, svg);
  const paperRect = el('rect', { class: 'sh-card', rx: 1.2 }, gPaper);
  const gRuler = el('g', { class: 'sh-ruler' }, gPaper);
  const heelLine = el('path', { class: 'sh-heel' }, gPaper);
  const heelText = el('text', { class: 'sh-note' }, gPaper);
  const gHide = el('g', { class: 'sh-hide' }, svg);
  const hideFill = el('path', { class: 'sh-hide__fill' }, gHide);
  const gChalk = el('g', { class: 'sh-lines', filter: 'url(#chalk)' }, svg);
  const hideEdge = el('path', { class: 'sh-hide__edge' }, gChalk);
  const gDetail = el('g', { class: 'sh-detail' }, gChalk);
  const ghost = el('path', { class: 'sh-ghost' }, gChalk);
  const gDims = el('g', { class: 'sh-dims' }, gChalk);
  const arcEls = Array.from({ length: 5 }, () => el('path', { class: 'sh-line' }, gChalk));
  const live = el('path', { class: 'sh-live' }, gChalk);
  const gDimText = el('g', { class: 'sh-dimtext' }, svg);
  const gDetailText = el('g', { class: 'sh-detailtext' }, svg);

  function sizeUnits() {
    const r = svg.getBoundingClientRect();
    if (r.width > 0) svg.style.setProperty('--u', (VW() / r.width).toFixed(4));
  }

  function label(parent, text, at, dir = [0, 0], cls = 'sh-label', gap = 5) {
    const [x, y] = V(at);
    const [dx, dy] = Vdir(dir);
    const t = el('text', { class: cls }, parent);
    t.textContent = text;
    let anchor = 'middle', baseline = 'central';
    if (dx > 0.5) anchor = 'start'; else if (dx < -0.5) anchor = 'end';
    if (dy > 0.5) baseline = 'hanging'; else if (dy < -0.5) baseline = 'alphabetic';
    t.setAttribute('x', (x + dx * gap).toFixed(2));
    t.setAttribute('y', (y + dy * gap).toFixed(2));
    t.setAttribute('text-anchor', anchor);
    t.setAttribute('dominant-baseline', baseline);
    return t;
  }

  // ---- static paper (depends on orientation) ----
  function drawPaper() {
    const w = VW(), h = VH();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    root.style.setProperty('--sheet-ratio', `${w} / ${h}`);
    root.classList.toggle('is-landscape', st.landscape);
    paperRect.setAttribute('width', w);
    paperRect.setAttribute('height', h);
    let d = '';
    for (let mm = 5; mm < w; mm += 5) {
      const len = mm % 50 === 0 ? 6 : mm % 10 === 0 ? 4 : 2.2;
      d += `M${mm} ${h}V${h - len}`;
    }
    for (let mm = 5; mm < h; mm += 5) {
      const len = mm % 50 === 0 ? 6 : mm % 10 === 0 ? 4 : 2.2;
      d += `M0 ${h - mm}H${len}`;
    }
    gRuler.textContent = '';
    el('path', { d, class: 'sh-tick' }, gRuler);
    for (let mm = 50; mm < w - 10; mm += 50) {
      const t = el('text', { x: mm, y: h - 8, class: 'sh-rulenum', 'text-anchor': 'middle' }, gRuler);
      t.textContent = mm;
    }
    for (let mm = 50; mm < h - 10; mm += 50) {
      const t = el('text', { x: 8, y: h - mm, class: 'sh-rulenum', 'dominant-baseline': 'central' }, gRuler);
      t.textContent = mm;
    }
    const unit = el('text', { x: w - 3, y: h - 8, class: 'sh-rulenum', 'text-anchor': 'end' }, gRuler);
    unit.textContent = 'mm';
    heelLine.setAttribute('d', pathOf([[16, HEEL_Y], [SHEET_W - 6, HEEL_Y]], false, V));
    const [hx, hy] = V([18, HEEL_Y - 4]);
    heelText.setAttribute('x', hx);
    heelText.setAttribute('y', hy);
    heelText.setAttribute('dominant-baseline', st.landscape ? 'hanging' : 'alphabetic');
    heelText.textContent = '뒤꿈치 선';
    if (st.landscape) heelText.setAttribute('x', hx + 3);
    hideFill.setAttribute('d', pathOf(HIDE, true, V));
    hideEdge.setAttribute('d', pathOf(HIDE, true, V));
    sizeUnits();
  }

  // ---- measurement lines on paper ----
  function drawDims() {
    gDims.textContent = '';
    gDimText.textContent = '';
    if (!st.meas) return;
    const m = st.meas, b = m.box;
    const lx = b.x1 + 13;
    const tip = st.outline.reduce((a, p) => (p[1] < a[1] ? p : a));
    const tick = (p, ang = 1) => { const [x, y] = p; return [[x - 2.2 * ang, y + 2.2], [x + 2.2 * ang, y - 2.2]]; };
    const lines = [
      [[lx, b.y0], [lx, b.y1]],
      [[tip[0] + 3, b.y0], [lx + 4, b.y0]],
      [[b.x1 + 3, b.y1], [lx + 4, b.y1]],
      tick([lx, b.y0]), tick([lx, b.y1]),
      [[m.ball.lo, m.ball.y], [m.ball.hi, m.ball.y]],
      tick([m.ball.lo, m.ball.y]), tick([m.ball.hi, m.ball.y]),
    ];
    for (const ln of lines) el('path', { d: pathOf(ln, false, V), class: 'sh-dim' }, gDims);
    el('path', { d: pathOf([[m.instep.lo, m.instep.y], [m.instep.hi, m.instep.y]], false, V), class: 'sh-dim sh-dim--est' }, gDims);
    // numbers sit on their own lines, as on a pattern drawing; the halo cuts the line behind them
    label(gDimText, `길이 ${fmt(m.length)}`, [lx, b.y1 - m.length * 0.28], [0, 0], 'sh-label sh-label--dim', 0);
    label(gDimText, `볼 ${fmt(m.width)}`, [(m.ball.lo + m.ball.hi) / 2, m.ball.y], [0, 0], 'sh-label sh-label--dim', 0);
    label(gDimText, `발등 약 ${fmt(m.girth)}`, [(m.instep.lo + m.instep.hi) / 2, m.instep.y], [0, 0], 'sh-label sh-label--dim', 0);
  }

  // ---- pieces on the hide ----
  function drawDetail() {
    gDetail.textContent = '';
    gDetailText.textContent = '';
    if (!st.pieces) return;
    el('path', { d: pathOf(BACKBONE, false, V), class: 'sh-backbone' }, gDetail);
    label(gDetailText, '등선', [BACKBONE[0][0] + 2, BACKBONE[0][1] + 3], [0, 1], 'sh-label sh-label--hide', 2);
    const [fx, fy] = V([FLAW.x, FLAW.y]);
    el('circle', { cx: fx, cy: fy, r: FLAW.r, class: 'sh-mark' }, gDetail);
    el('path', { d: `M${fx - 3} ${fy - 3}L${fx + 3} ${fy + 3}M${fx + 3} ${fy - 3}L${fx - 3} ${fy + 3}`, class: 'sh-mark' }, gDetail);
    label(gDetailText, '흠', [FLAW.x, FLAW.y + FLAW.r], [0, 1], 'sh-label sh-label--hide', 3);
    for (const p of st.pieces) {
      if (p.lasting) el('path', { d: pathOf(p.lasting, false, V), class: 'sh-allow' }, gDetail);
      for (const n of p.notches) el('path', { d: pathOf(n, false, V), class: 'sh-mark' }, gDetail);
      for (const e of p.eyelets || []) { const [x, y] = V(e); el('circle', { cx: x, cy: y, r: 1.5, class: 'sh-mark' }, gDetail); }
      // grain arrow and name, placed in view space so text never sits on the arrow
      const vb = p.contour.map(V);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of vb) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const g0 = V(p.grain[0]), g1 = V(p.grain[1]);
      const horiz = Math.abs(g1[0] - g0[0]) > Math.abs(g1[1] - g0[1]);
      let a, b2, tx, ty, anchor = 'middle';
      if (p.id === 'tongue') {
        const half = horiz ? (x1 - x0) * 0.36 : (y1 - y0) * 0.36;
        a = horiz ? [cx - half, cy] : [cx, cy - half];
        b2 = horiz ? [cx + half, cy] : [cx, cy + half];
        if (st.landscape) { tx = cx; ty = y1 + 4; } else { tx = x1 + 4; ty = cy; anchor = 'start'; }
      } else if (horiz) {
        const half = (x1 - x0) * 0.26;
        a = [cx - half, cy + 6]; b2 = [cx + half, cy + 6]; tx = cx; ty = cy - 4;
      } else {
        const half = (y1 - y0) * 0.17;
        a = [cx, cy + 4]; b2 = [cx, cy + 4 + 2 * half]; tx = cx; ty = cy - 5;
      }
      const ux = b2[0] - a[0], uy = b2[1] - a[1], ul = Math.hypot(ux, uy) || 1;
      const ex = ux / ul * 3, ey = uy / ul * 3;
      const head = (pt, s) => `M${pt[0] - s * ex - ey} ${pt[1] - s * ey + ex}L${pt[0]} ${pt[1]}L${pt[0] - s * ex + ey} ${pt[1] - s * ey - ex}`;
      el('path', { d: `M${a[0]} ${a[1]}L${b2[0]} ${b2[1]}${head(b2, 1)}${head(a, -1)}`, class: 'sh-grain' }, gDetail);
      const t = el('text', { x: tx.toFixed(2), y: ty.toFixed(2), class: 'sh-label sh-label--hide', 'text-anchor': anchor,
        'dominant-baseline': p.id === 'tongue' && st.landscape ? 'hanging' : 'central' }, gDetailText);
      t.textContent = p.name;
    }
  }

  // ---- outline and pieces (called every frame while something moves) ----
  function render() {
    const t = st.t;
    const ms = t * 1300;
    const ground = clamp01(ms / 350);
    svg.style.setProperty('--paper', (1 - ground).toFixed(3));
    svg.style.setProperty('--hide', ground.toFixed(3));
    const details = clamp01((ms - 1000) / 300);
    gDetail.style.opacity = details; gDetailText.style.opacity = details;
    const dims = clamp01(1 - ms / 220) * clamp01((st.trace - 0.98) / 0.02);
    gDims.style.opacity = dims; gDimText.style.opacity = dims;
    gDims.style.display = gDimText.style.display = dims > 0 ? '' : 'none';
    gDetail.style.display = gDetailText.style.display = details > 0 ? '' : 'none';

    if (!st.arcs) { arcEls.forEach((p) => p.setAttribute('d', '')); return; }
    const color = mix(LEATHER, WHITE, clamp01((ms - 150) / 500));
    // load trace: one pencil going round the whole loop
    const lens = st.arcs.map((a) => a.len);
    const total = lens.reduce((s, v) => s + v, 0);
    let start = 0;
    st.arcs.forEach((arc, i) => {
      const ti = st.aligned ? easeInOut(clamp01((ms - 150 - i * 70) / 900)) : 0;
      const pts = ti > 0 ? arc.pts.map((p, j) => [lerp(p[0], st.aligned[i][j][0], ti), lerp(p[1], st.aligned[i][j][1], ti)]) : arc.pts;
      const e = arcEls[i];
      e.setAttribute('d', pathOf(pts, false, V));
      e.style.stroke = color;
      if (st.trace < 1) {
        const shown = clamp01((st.trace * total - start) / lens[i]);
        e.setAttribute('pathLength', '1');
        e.style.strokeDasharray = '1 1';
        e.style.strokeDashoffset = (1 - shown).toFixed(4);
      } else if (e.style.strokeDasharray) {
        e.removeAttribute('pathLength');
        e.style.strokeDasharray = '';
        e.style.strokeDashoffset = '';
      }
      start += lens[i];
    });
  }

  // ---- derived data ----
  function rebuild() {
    if (!st.shape) {
      st.outline = st.meas = st.arcs = st.aligned = st.pieces = null;
    } else {
      st.outline = fitTo(st.shape, st.target.length, st.target.width);
      st.meas = measure(st.outline);
      st.pieces = buildPieces(st.meas);
      st.arcs = footArcs(st.outline).map((a) => {
        let len = 0;
        for (let i = 1; i < a.pts.length; i++) len += Math.hypot(a.pts[i][0] - a.pts[i - 1][0], a.pts[i][1] - a.pts[i - 1][1]);
        return { ...a, len };
      });
      st.aligned = st.arcs.map((a) => alignContour(st.pieces.find((p) => p.id === a.id).contour, a.pts));
    }
    drawDims();
    drawDetail();
    render();
    updateCard();
    updateControls();
  }

  // ---- card, controls, title ----
  const cardOut = (k) => card.querySelector(`[data-m="${k}"]`);
  function updateCard() {
    const m = st.meas;
    const set = (k, v) => { const e = cardOut(k); if (e) e.textContent = v; };
    card.classList.toggle('is-empty', !m);
    if (!m) {
      ['length', 'width', 'girth', 'last'].forEach((k) => set(k, '—'));
      set('grade', '종이에 발을 그리면 채워집니다');
      title.textContent = '빈 본뜨기 종이. 뒤꿈치 선만 그어져 있습니다.';
      return;
    }
    set('length', fmt(m.length));
    set('width', fmt(m.width));
    set('girth', fmt(m.girth));
    if (m.inRange) {
      set('last', fmt(m.lastLen));
      set('grade', `${m.grade.name} (${m.grade.code})`);
    } else {
      set('last', '—');
      set('grade', '공방 골은 220–300\u00a0mm까지 있습니다');
    }
    const list = card.querySelector('[data-pieces]');
    if (list) {
      for (const p of st.pieces) {
        const row = list.querySelector(`[data-piece="${p.id}"]`);
        if (row) row.textContent = `${fmt(p.real.w)} × ${fmt(p.real.h)}\u00a0mm`;
      }
    }
    title.textContent = st.goal === 1
      ? `가죽 위의 본 다섯 장: 앞날개, 뒷날개 바깥, 뒷날개 안, 혀, 안감. 축척 1:2.`
      : `발 윤곽. 길이 ${fmt(m.length)}\u00a0mm, 볼 너비 ${fmt(m.width)}\u00a0mm, 발등 둘레 약 ${fmt(m.girth)}\u00a0mm.`;
  }

  function updateControls() {
    const empty = !st.shape;
    const hideOn = st.goal === 1;
    morphBtn.disabled = empty;
    morphBtn.classList.toggle('is-on', hideOn);
    morphBtn.textContent = hideOn ? '발 모양으로 돌아가기' : '본으로 옮기기';
    clearBtn.disabled = hideOn;
    for (const [k, input] of Object.entries(rulers)) {
      input.disabled = empty;
      const v = st.meas ? st.meas[k] : Number(input.value);
      input.value = String(Math.round(Math.min(Number(input.max), Math.max(Number(input.min), v))));
      const out = root.querySelector(`[data-ruler-out="${k}"]`);
      if (out) out.textContent = st.meas ? `${fmt(v)}\u00a0mm` : '—';
    }
    for (const [k, input] of Object.entries(rulers)) {
      input.setAttribute('aria-valuetext', st.meas ? `${fmt(st.meas[k])} 밀리미터` : '비어 있음');
    }
    root.classList.toggle('is-empty', empty);
    root.classList.toggle('is-hide', hideOn);
    hint.hidden = !empty;
    svg.classList.toggle('can-draw', !hideOn && st.t === 0);
    const piecesBox = card.querySelector('[data-pieces-box]');
    if (piecesBox) piecesBox.hidden = !hideOn;
  }

  let statusTimer = 0;
  function say(text, delay = 0) {
    clearTimeout(statusTimer);
    if (delay) statusTimer = setTimeout(() => { statusEl.textContent = text; }, delay);
    else statusEl.textContent = text;
  }

  // ---- animation driver ----
  function animate(step, done) {
    cancelAnimationFrame(st.anim);
    let last = performance.now();
    const tick = (now) => {
      const dt = document.hidden ? 1e6 : Math.min(now - last, 64);
      last = now;
      if (step(dt)) { st.anim = requestAnimationFrame(tick); } else { st.anim = null; done && done(); }
    };
    st.anim = requestAnimationFrame(tick);
  }

  function setGoal(goal) {
    st.goal = goal;
    updateControls();
    updateCard();
    if (reduce.matches) { st.t = goal; render(); updateControls(); return; }
    const dur = goal === 1 ? 1300 : 800;
    animate((dt) => {
      st.t = goal === 1 ? Math.min(1, st.t + dt / dur) : Math.max(0, st.t - dt / dur);
      render();
      return st.t !== goal;
    }, updateControls);
  }

  function finishTrace() { st.trace = 1; render(); }

  function playTrace() {
    if (reduce.matches || !st.arcs) { finishTrace(); return; }
    st.trace = 0;
    render();
    animate((dt) => {
      st.trace = Math.min(1, st.trace + dt / 1400);
      render();
      return st.trace < 1;
    }, () => {
      // dimension lines come in after the pencil has gone round
      let f = 0;
      const dimsIn = () => { f = Math.min(1, f + 0.08); gDims.style.opacity = gDimText.style.opacity = easeOut(f); if (f < 1) requestAnimationFrame(dimsIn); };
      if (!document.hidden) dimsIn(); else render();
    });
  }

  // ---- choosing feet ----
  function useSample(id, announce = true) {
    const s = SAMPLES.find((x) => x.id === id);
    st.source = id;
    st.shape = sampleOutline(s);
    st.target = { length: s.length, width: s.width };
    st.trace = 1;
    rebuild();
    if (announce) say(STATUS.sample(s));
  }

  function useDrawn() {
    if (!st.drawnShape) return;
    st.source = 'drawn';
    st.shape = st.drawnShape;
    const m = measure(st.shape);
    st.target = { length: m.length, width: m.width };
    rebuild();
  }

  root.querySelectorAll('input[name="foot"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      if (r.value === 'drawn') { useDrawn(); say(STATUS.drawn(st.meas)); } else useSample(r.value);
    });
  });

  for (const [k, input] of Object.entries(rulers)) {
    input.addEventListener('input', () => {
      if (!st.shape) return;
      st.target[k] = Number(input.value);
      rebuild();
      say(STATUS.ruler(k === 'length' ? '길이를' : '볼 너비를', st.meas[k]), 400);
    });
  }

  morphBtn.addEventListener('click', () => {
    if (!st.shape) return;
    finishTrace();
    const goal = st.goal === 1 ? 0 : 1;
    setGoal(goal);
    say(goal ? STATUS.hide : STATUS.paper);
  });

  clearBtn.addEventListener('click', () => {
    if (st.goal === 1) return;
    st.source = 'empty';
    st.shape = null;
    root.querySelectorAll('input[name="foot"]').forEach((r) => { r.checked = false; });
    rebuild();
    say(STATUS.empty);
  });

  // ---- drawing ----
  const toSheet = (ev) => {
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const c = fromView([p.x, p.y]);
    return [Math.min(SHEET_W - 1, Math.max(1, c[0])), Math.min(SHEET_H - 1, Math.max(1, c[1]))];
  };
  function drawLive() { live.setAttribute('d', st.stroke ? pathOf(st.stroke.pts, false, V) : ''); }
  function addPoint(p) {
    const pts = st.stroke.pts;
    const last = pts[pts.length - 1];
    const d = Math.hypot(p[0] - last[0], p[1] - last[1]);
    if (d < 1.2) return;
    const steps = Math.ceil(d / 3);
    for (let i = 1; i <= steps; i++) pts.push([lerp(last[0], p[0], i / steps), lerp(last[1], p[1], i / steps)]);
  }
  function endStroke(cancelled) {
    const s = st.stroke;
    st.stroke = null;
    drawLive();
    ghost.setAttribute('d', '');
    arcEls.forEach((e) => { e.style.opacity = ''; });
    svg.classList.remove('is-drawing');
    if (!s) return;
    if (cancelled) { say(STATUS.cancel); render(); return; }
    const r = acceptStroke(s.pts);
    if (r.error) { say(STATUS[r.error]); render(); return; }
    st.drawnShape = resample(r.pts, r.pts.length);
    drawnChoice.hidden = false;
    const radio = drawnChoice.querySelector('input');
    radio.checked = true;
    useDrawn();
    say(STATUS.drawn(st.meas));
    if (!reduce.matches) {
      svg.classList.add('is-settling');
      setTimeout(() => svg.classList.remove('is-settling'), 280);
    }
  }
  svg.addEventListener('pointerdown', (ev) => {
    if (st.goal === 1 || st.t > 0 || st.stroke) return;
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    ev.preventDefault();
    finishTrace();
    svg.setPointerCapture(ev.pointerId);
    st.stroke = { id: ev.pointerId, pts: [toSheet(ev)] };
    if (st.outline) ghost.setAttribute('d', pathOf(st.outline, true, V));
    arcEls.forEach((e) => { e.style.opacity = '0'; });
    gDims.style.display = gDimText.style.display = 'none';
    hint.hidden = true;
    svg.classList.add('is-drawing');
    drawLive();
  });
  svg.addEventListener('pointermove', (ev) => {
    if (!st.stroke || ev.pointerId !== st.stroke.id) return;
    const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    for (const e of (evs.length ? evs : [ev])) addPoint(toSheet(e));
    drawLive();
  });
  svg.addEventListener('pointerup', (ev) => { if (st.stroke && ev.pointerId === st.stroke.id) endStroke(false); });
  svg.addEventListener('pointercancel', (ev) => {
    if (st.stroke && ev.pointerId === st.stroke.id) { endStroke(true); if (!st.shape) hint.hidden = false; }
  });

  // ---- orientation and size ----
  wide.addEventListener('change', () => {
    st.landscape = wide.matches;
    drawPaper();
    rebuild();
  });
  if ('ResizeObserver' in window) new ResizeObserver(sizeUnits).observe(svg);
  reduce.addEventListener('change', () => { if (reduce.matches) { cancelAnimationFrame(st.anim); st.t = st.goal; finishTrace(); updateControls(); } });

  // ---- start: sample B, traced once when the sheet is first seen ----
  drawPaper();
  useSample('b', false);
  say(STATUS.sample(SAMPLES[1]));
  if (!reduce.matches && 'IntersectionObserver' in window) {
    st.trace = 0;
    render();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); if (st.trace === 0) playTrace(); }
    }, { threshold: 0.35 });
    io.observe(svg);
  }

  return { state: st, useSample, setGoal };
}
