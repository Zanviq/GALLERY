// Lens wheel + optotype chart + duochrome. The blur lives only inside the two SVG charts.
import { rowPath } from './optotype.js';
import { TARGET, reducedMotion, signed, spoken } from './state.js';

const NS = 'http://www.w3.org/2000/svg';
const MIN = -4, MAX = 4, STEP = 0.25, DEG = 9; // 9° per 0.25 D, gap at the bottom of the ring
const ACCOMMODATION = 1.25; // a young eye squeezes out this much extra minus and stays sharp
const BLUR_PER_D = 2.9;     // σ in chart units for 1 D of defocus
const LINES = [
  { v: 0.1, t: '가' }, { v: 0.2, t: '너타' }, { v: 0.3, t: '라커다' }, { v: 0.4, t: '거나터카' },
  { v: 0.5, t: '더가러너' }, { v: 0.6, t: '타라거커나' }, { v: 0.8, t: '다너카가터' }, { v: 1.0, t: '러거타나더' },
];
const CHART_LINES = LINES.map((l) => l.v);

const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const snap = (v) => clamp(Math.round(v / STEP) * STEP, MIN, MAX);
const fmtV = (v) => (v === 1 ? '1.0' : String(v));

function drawRing(ring) {
  // knurled rim
  for (let a = 0; a < 360; a += 4) {
    el('line', { x1: 300, y1: 16, x2: 300, y2: 25, class: 'wheel__knurl', transform: `rotate(${a} 300 300)` }, ring);
  }
  for (let v = MIN; v <= MAX + 1e-9; v += STEP) {
    const major = Math.abs(v - Math.round(v)) < 1e-9;
    const a = (v / STEP) * DEG;
    const cls = v < -1e-9 ? 'wheel__tick wheel__tick--minus' : 'wheel__tick';
    el('line', { x1: 300, y1: 32, x2: 300, y2: major ? 54 : 44, class: cls + (major ? ' is-major' : ''), transform: `rotate(${a} 300 300)` }, ring);
    if (major) {
      const t = el('text', { x: 300, y: 80, class: 'wheel__num', 'text-anchor': 'middle', transform: `rotate(${a} 300 300)` }, ring);
      t.textContent = v === 0 ? '0' : (v < 0 ? '−' : '+') + Math.abs(v);
    }
  }
}

function drawChart(chart) {
  // heights in chart units: 1.0 line = 10, line v = 10 / v; gap below a line = 0.6 × next height
  const hs = LINES.map((l) => 10 / l.v);
  let total = hs.reduce((s, h) => s + h, 0);
  for (let i = 1; i < hs.length; i++) total += 0.6 * hs[i];
  let y = 300 - total / 2;
  const d = [];
  LINES.forEach((line, i) => {
    const h = hs[i];
    const row = rowPath([...line.t], 300, y, h);
    d.push(row.d);
    const label = el('text', { x: 300 + row.width / 2 + 12, y: y + h / 2 + 4, class: 'chart__v' }, chart);
    label.textContent = fmtV(line.v);
    y += h + (i + 1 < hs.length ? 0.6 * hs[i + 1] : 0);
  });
  el('path', { d: d.join(''), class: 'chart__ink' }, chart);
}

function drawDuo(left, right) {
  const a = rowPath([...'다커'], 100, 38, 44, 0.5);
  const b = rowPath([...'다커'], 300, 38, 44, 0.5);
  el('path', { d: a.d, class: 'duo__ink' }, left);
  el('path', { d: b.d, class: 'duo__ink' }, right);
}

/** What the fictional eye sees with lens power v. */
function optics(v) {
  const e = v - TARGET;                  // > 0 not enough minus, < 0 too much
  const eff = e < 0 ? Math.min(0, e + ACCOMMODATION) : e;
  const sigma = BLUR_PER_D * Math.abs(eff);
  const va = sigma < 0.01 ? 1.2 : Math.min(1.2, 0.91 / sigma);
  let line = null;
  for (const l of CHART_LINES) if (l <= va + 1e-9) line = l;
  const scale = 1 + 0.02 * Math.min(0, e); // too much minus makes letters look a touch smaller
  return { e, sigma, line, scale };
}

export function initExam() {
  const art = document.getElementById('wheel-art');
  if (!art) return;
  const ring = document.getElementById('wheel-ring');
  const chart = document.getElementById('chart');
  const chartScale = document.getElementById('chart-scale');
  const blur = document.getElementById('defocus-blur');
  const grip = document.getElementById('wheel-grip');
  const out = document.getElementById('sph');
  const minus = document.getElementById('step-minus');
  const plus = document.getElementById('step-plus');
  const status = document.getElementById('status-text');
  const statusSph = document.getElementById('status-sph');
  const redAmt = document.getElementById('blur-red-amt');
  const greenAmt = document.getElementById('blur-green-amt');
  const reply = document.getElementById('duo-reply');
  const record = document.getElementById('duo-record');

  drawRing(ring);
  drawChart(chart);
  drawDuo(document.getElementById('duo-left'), document.getElementById('duo-right'));

  let value = 0;
  let shownSigma = optics(0).sigma; // what the blur filter currently shows (eases toward target)
  let lastSaid = optics(0);
  let blurRaf = 0, statusTimer = 0;

  function setRing(angle, animate) {
    ring.classList.toggle('is-easing', !!animate && !reducedMotion());
    ring.style.transform = `rotate(${angle}deg)`;
  }

  function paintBlur(target) {
    cancelAnimationFrame(blurRaf);
    if (reducedMotion() || document.hidden) {
      shownSigma = target;
      blur.setAttribute('stdDeviation', target.toFixed(2));
      return;
    }
    const from = shownSigma, t0 = performance.now(), dur = 150;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      shownSigma = from + (target - from) * (1 - (1 - k) * (1 - k));
      blur.setAttribute('stdDeviation', shownSigma.toFixed(2));
      if (k < 1) blurRaf = requestAnimationFrame(tick);
    };
    blurRaf = requestAnimationFrame(tick);
  }

  function sayStatus() {
    const now = optics(value);
    const sharp = now.line === 1 && now.sigma <= 0.3;
    let lead = '';
    if (sharp) lead = ''; // the right lens and a too-strong one read the same here, on purpose
    else if (now.sigma < lastSaid.sigma - 0.05) lead = '나아졌습니다. ';
    else if (now.sigma > lastSaid.sigma + 0.05) lead = '더 흐려졌습니다. 반대쪽으로 돌려 보세요. ';
    else if (value !== 0) lead = '그대로입니다. ';
    let read;
    if (now.line === null) read = '0.1 줄도 읽기 어렵습니다.';
    else if (now.line < 1) read = `${fmtV(now.line)} 줄까지 읽힙니다.`;
    else if (!sharp) read = '1.0 줄까지 읽히지만 글자 테두리가 조금 번집니다.';
    else read = '또렷합니다. 1.0 줄까지 읽힙니다. 너무 센 렌즈도 또렷해 보이니 아래 적록 검사로 확인합니다.';
    statusSph.textContent = spoken(value) + ". ";
    status.textContent = lead + read;
    lastSaid = now;
  }

  function set(v, { animate = true, announce = true } = {}) {
    const next = snap(v);
    const changed = next !== value;
    value = next;
    const o = optics(value);
    out.textContent = signed(value);
    out.classList.toggle('is-minus', value < 0);
    grip.setAttribute('aria-valuenow', String(value));
    grip.setAttribute('aria-valuetext', spoken(value));
    minus.setAttribute('aria-disabled', String(value <= MIN));
    plus.setAttribute('aria-disabled', String(value >= MAX));
    if (!dragging) setRing(-(value / STEP) * DEG, animate);
    paintBlur(o.sigma);
    chartScale.setAttribute('transform', `translate(300 300) scale(${o.scale.toFixed(4)}) translate(-300 -300)`);
    // duochrome: red focuses 0.25 D deeper than green
    redAmt.setAttribute('stdDeviation', Math.min(10, 6 * Math.abs(o.e - 0.25)).toFixed(2));
    greenAmt.setAttribute('stdDeviation', Math.min(10, 6 * Math.abs(o.e + 0.25)).toFixed(2));
    if (changed) {
      record.hidden = true;
      if (announce) {
        clearTimeout(statusTimer);
        statusTimer = setTimeout(sayStatus, 260);
      }
    }
    return changed;
  }

  function nudge(d) {
    set(value + d);
  }

  minus.addEventListener('click', () => { if (value > MIN) { nudge(-STEP); reply.textContent = ''; } });
  plus.addEventListener('click', () => { if (value < MAX) { nudge(STEP); reply.textContent = ''; } });

  grip.addEventListener('keydown', (ev) => {
    const map = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP, PageDown: -1, PageUp: 1 };
    let handled = true;
    if (ev.key in map) nudge(map[ev.key]);
    else if (ev.key === 'Home') set(MIN);
    else if (ev.key === 'End') set(MAX);
    else handled = false;
    if (handled) { ev.preventDefault(); reply.textContent = ''; }
  });

  // drag: the ring follows the pointer; the value snaps every 9°
  let dragging = false, startAngle = 0, startValue = 0, unwrapped = 0, lastRaw = 0;
  const angleOf = (ev) => {
    const r = grip.getBoundingClientRect();
    return Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };
  grip.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    dragging = true;
    grip.setPointerCapture(ev.pointerId);
    grip.classList.add('is-dragging');
    startAngle = lastRaw = angleOf(ev);
    unwrapped = 0;
    startValue = value;
    reply.textContent = '';
  });
  grip.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const raw = angleOf(ev);
    let d = raw - lastRaw;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    unwrapped += d;
    lastRaw = raw;
    // turning the ring clockwise brings smaller numbers under the index
    const v = clamp(startValue - (unwrapped / DEG) * STEP, MIN, MAX);
    setRing(-(v / STEP) * DEG, false);
    set(v, { animate: false });
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    grip.classList.remove('is-dragging');
    setRing(-(value / STEP) * DEG, true);
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
  grip.addEventListener('lostpointercapture', end);

  // duochrome answers: the examiner turns the wheel for the patient
  document.querySelectorAll('[data-answer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ans = btn.dataset.answer;
      const e = value - TARGET;
      if (ans === 'red') {
        if (value <= MIN) { reply.textContent = '휠이 끝까지 돌아가 있습니다.'; return; }
        set(value - STEP);
        reply.textContent = '왼쪽(빨강)이 또렷하면 마이너스가 모자란 것입니다. 마이너스 쪽으로 한 칸 돌렸습니다.';
      } else if (ans === 'green') {
        if (value >= MAX) { reply.textContent = '휠이 끝까지 돌아가 있습니다.'; return; }
        set(value + STEP);
        reply.textContent = '오른쪽(초록)이 또렷하면 마이너스가 넘친 것입니다. 한 칸 덜어냈습니다.';
      } else if (Math.abs(e) < 1e-9) {
        reply.textContent = '두 쪽이 같으면 여기서 멈춥니다. 도수가 정해졌습니다.';
        record.hidden = false;
      } else {
        const side = e > 0 ? '왼쪽' : '오른쪽';
        reply.textContent = `화면 속 두 쪽은 아직 번짐이 다릅니다. ${side} 글자의 모서리가 더 날카롭습니다.`;
      }
    });
  });

  set(0, { animate: false, announce: false });
}
