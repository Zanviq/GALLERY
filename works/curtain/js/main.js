import { Curtain } from './cloth.js';
import { createGLRenderer } from './render-gl.js';
import { create2DRenderer } from './render-2d.js';
import { drawStage, drawRig } from './stage.js';

const COLORS = {
  velvet: '#0D5C47', deep: '#011E16', sheen: '#74D2AE', back: '#3C6658',
  silverHi: '#F1F4F5', silver: '#C3CACD', silverLo: '#5E676B',
};
const STEP = 1 / 60;
const params = new URLSearchParams(location.search);

const root = document.documentElement;
const stageEl = document.querySelector('[data-stage]');
const setCanvas = document.querySelector('[data-set]');
const clothCanvas = document.querySelector('[data-cloth]');
const rigCanvas = document.querySelector('[data-rig]');
const card = document.querySelector('[data-card]');
const hintEl = document.querySelector('[data-hint]');
const setCtx = setCanvas.getContext('2d');
const rigCtx = rigCanvas.getContext('2d');

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;

let renderer = null;
if (!params.has('nogl')) {
  try { renderer = createGLRenderer(clothCanvas, COLORS); } catch (e) { renderer = null; }
}
if (!renderer) renderer = create2DRenderer(clothCanvas, COLORS);

let S = null;          // layout
let cu = null;         // the cloth
let running = false;
let last = 0, acc = 0;
let lampLevel = 1;
let flickerT = -1;
let wasOpen = false, bowed = false, announcedTear = false, interacted = false;
let tearCount = 0;
let lastKey = '';
let baseIterations = 10, stepCost = 0;

// ---- layout ---------------------------------------------------------------------------------

function layout() {
  const W = Math.max(1, stageEl.clientWidth), H = Math.max(1, stageEl.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const phone = W < 640;
  // the gallery badge sits in the flies (top-left, 48px), so the rail hangs just below it
  const fly = H < 380 ? 54 : 60;
  const railT = phone || H < 380 ? 5 : 7;
  const railY = fly + railT;
  const leg = Math.max(10, Math.round(W * 0.03));
  const hemGap = Math.max(9, Math.round(H * 0.016));
  const floorY = H - 1;
  const L = {
    W, H, dpr, phone, fly, railT, railY, leg,
    ringDrop: railT * 1.3 + 3,
    hemY: floorY - hemGap,
    floorY,
    left: leg * 0.35,
    right: W - leg * 0.35,
    overlap: Math.max(10, W * 0.014),
    railEnd: Math.max(8, leg * 0.45),
  };
  stageEl.style.setProperty('--fly', fly + 'px');
  stageEl.style.setProperty('--leg', leg + 'px');
  return L;
}

function placeSet(L, cuNow) {
  const { H } = L;
  // how far in the bunched curtain reaches when it is fully open
  // (plus the flare of the hanging cloth below the bunched rings)
  const stack = L.leg + (cuNow ? cuNow.openS() + cuNow.dx * 2 : L.W * 0.12) + L.W * 0.05;
  const floorDepth = Math.min(H * 0.24, 190);
  const floorBackY = L.floorY - floorDepth;
  const s = Math.max(0.75, Math.min(1.35, H / 720));
  let lampX, cardX, cardW, cardY, shift, titleSize;
  if (!L.phone) {
    lampX = Math.round(L.W * 0.66);
    cardX = Math.max(stack + 28, L.W * 0.2);
    cardW = Math.min(460, lampX - cardX - 70 * s);
    cardY = L.fly + Math.max(28, H * 0.14);
    shift = '0px';
    titleSize = Math.max(44, Math.min(104, cardW * 0.24));
  } else {
    lampX = Math.round(L.W / 2);
    cardW = Math.min(300, L.W - 2 * stack - 12);
    cardX = L.W / 2;
    cardY = L.fly + Math.max(20, H * 0.06);
    shift = '-50%';
    titleSize = Math.max(34, Math.min(52, cardW * 0.18));
  }
  stageEl.style.setProperty('--card-x', cardX + 'px');
  stageEl.style.setProperty('--card-y', cardY + 'px');
  stageEl.style.setProperty('--card-w', cardW + 'px');
  stageEl.style.setProperty('--card-shift', shift);
  stageEl.style.setProperty('--title-size', titleSize + 'px');
  const lampBaseY = L.floorY - floorDepth * 0.42;
  let lampHeadY = lampBaseY - Math.min(H * 0.44, 360 * s);
  if (L.phone) {
    const r = card.getBoundingClientRect(), sr = stageEl.getBoundingClientRect();
    const cardBottom = r.bottom - sr.top;
    lampHeadY = Math.max(lampHeadY, cardBottom + 48 * s);
    lampHeadY = Math.min(lampHeadY, lampBaseY - 90 * s);
  }
  Object.assign(L, {
    floorBackY, lampX, lampBaseY, lampHeadY, lampScale: s,
    poolRx: Math.max(150, L.W * 0.3), poolRy: Math.max(150, L.W * 0.3) * 0.2,
    wallR: Math.max(260, H * 0.7),
    tasselScale: L.phone ? 0.85 : 1,
  });
}

function build(keepOpen) {
  const L = layout();
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(L.W, L.H) < 560 || L.W < 640;
  const lite = coarse || small;
  const maxParticles = renderer.kind === '2d' ? (lite ? 700 : 1000) : lite ? 1400 : 3000;
  const prevOpen = cu ? cu.openness() : 0;
  baseIterations = renderer.kind === '2d' || lite ? 8 : 10;
  cu = new Curtain(L, { maxParticles, iterations: baseIterations });
  cu.damp = reduced ? 0.8 : 0.988;
  cu.onTear = onTear;
  S = L;
  placeSet(L, cu);
  for (const c of [setCanvas, rigCanvas]) { c.width = Math.round(L.W * L.dpr); c.height = Math.round(L.H * L.dpr); }
  renderer.resize(L.W, L.H, L.dpr);
  // settle into the hanging shape before the first frame
  cu.settle(240);
  if (keepOpen && prevOpen > 0.5) { cu.travel('open', 1); cu.finishNow(); }
  cu.damp = reduced ? 0.8 : 0.988;
  drawSet();
  draw();
}

// ---- drawing --------------------------------------------------------------------------------

function scene() {
  const h = S.hemY - S.railY;
  return {
    spot: S.phone ? [S.W / 2, S.railY + h * 0.5, S.W * 0.85, h * 0.62] : [S.W / 2, S.railY + h * 0.55, S.W * 0.55, h * 0.72],
    railY: S.railY,
    railFade: h * 0.22,
    lamp: [S.lampX, S.lampHeadY, S.H * 0.45],
    lampLevel,
  };
}

function drawSet() { drawStage(setCtx, S, lampLevel); }

function draw() {
  renderer.draw(cu, scene());
  drawRig(rigCtx, cu, S);
}

// ---- loop -----------------------------------------------------------------------------------

function wake() {
  if (running || document.hidden) return;
  running = true;
  last = performance.now();
  acc = 0;
  requestAnimationFrame(frame);
}

function frame(now) {
  if (!running) return;
  if (document.hidden) { running = false; return; }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  let steps = 0;
  const t0 = performance.now();
  const maxSteps = stepCost > 8 ? 2 : 3;
  while (acc >= STEP && steps < maxSteps) { cu.step(STEP); acc -= STEP; steps++; }
  if (steps === maxSteps) acc = 0;
  if (steps) {
    // a slow device trades solver passes for frame rate, never below six
    stepCost = stepCost * 0.9 + ((performance.now() - t0) / steps) * 0.1;
    if (stepCost > 7 && cu.iterations > 6) cu.iterations--;
    else if (stepCost < 3 && cu.iterations < baseIterations) cu.iterations++;
  }
  if (flickerT >= 0) tickFlicker(dt);
  if (steps) { draw(); watch(); }
  if (cu.isQuiet() && flickerT < 0) { running = false; return; }
  requestAnimationFrame(frame);
}

// the bulb's bow: two slow dips and back, the first time it is seen
// (kept under two changes a second and shallow, well clear of flash thresholds)
const BOW = [[0, 1], [0.16, 0.5], [0.4, 1], [0.62, 1], [0.8, 0.65], [1.05, 1]];
function tickFlicker(dt) {
  flickerT += dt;
  let v = 1;
  for (let i = 1; i < BOW.length; i++) {
    if (flickerT <= BOW[i][0]) {
      const [t0, v0] = BOW[i - 1], [t1, v1] = BOW[i];
      v = v0 + (v1 - v0) * ((flickerT - t0) / (t1 - t0));
      break;
    }
  }
  if (flickerT > BOW[BOW.length - 1][0]) { flickerT = -1; v = 1; }
  setLamp(v);
}

function setLamp(v) {
  lampLevel = v;
  root.style.setProperty('--lamp', v.toFixed(3));
  drawSet();
}

// ---- state you can hear -------------------------------------------------------------------

function hint(text, key) {
  if (key && key === lastKey) return;
  lastKey = key || text;
  hintEl.textContent = text;
}

function describe() {
  const f = cu.openness();
  let s = f > 0.55 ? '열려 있습니다.' : f > 0.12 ? '조금 열려 있습니다.' : '닫혀 있습니다.';
  if (cu.torn > 0) s += ' 찢어진 곳이 있습니다.';
  clothCanvas.setAttribute('aria-label', '에메랄드색 벨벳 막. ' + s);
}

function watch() {
  const f = cu.openness();
  if (!wasOpen && f > 0.55) {
    wasOpen = true;
    if (!bowed) {
      bowed = true;
      if (!reduced) flickerT = 0;
      hint('막이 열렸습니다. 무대에는 불 하나만 켜져 있습니다.', 'open');
    } else hint('막이 열렸습니다.', 'open');
    describe();
  } else if (wasOpen && f < 0.12) {
    wasOpen = false;
    hint('막이 닫혔습니다.', 'close');
    describe();
  }
}

function onTear() {
  if (announcedTear) return;
  announcedTear = true;
  hint('막이 찢어졌습니다. 꿰매기를 누르면 은실로 꿰맵니다.', 'tear');
  describe();
}

// ---- pointer --------------------------------------------------------------------------------

function local(e) {
  const r = clothCanvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

clothCanvas.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  const [x, y] = local(e);
  const radius = e.pointerType === 'touch' ? 52 : 36;
  if (!cu.grab(e.pointerId, x, y, radius)) return;
  e.preventDefault();
  try { clothCanvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
  clothCanvas.classList.add('is-holding');
  if (!interacted) interacted = true;
  wake();
});
clothCanvas.addEventListener('pointermove', (e) => {
  if (!cu.grabs.has(e.pointerId)) return;
  const [x, y] = local(e);
  cu.move(e.pointerId, x, y);
  wake();
});
function end(e) {
  if (!cu.grabs.has(e.pointerId)) return;
  cu.release(e.pointerId);
  if (!cu.grabs.size) clothCanvas.classList.remove('is-holding');
  wake();
}
clothCanvas.addEventListener('pointerup', end);
clothCanvas.addEventListener('pointercancel', end);
clothCanvas.addEventListener('lostpointercapture', end);

// ---- cues -----------------------------------------------------------------------------------

function finishIfReduced() {
  if (!reduced) { wake(); return; }
  cu.finishNow();
  draw();
  watch();
  describe();
}

const cues = {
  open() {
    cu.releaseAll();
    cu.travel('open', 2.6);
    finishIfReduced();
  },
  close() {
    cu.releaseAll();
    cu.travel('close', 2.6);
    finishIfReduced();
  },
  tear() {
    const p = tearCount % 2;
    const seed = (tearCount * 0.618 + 0.13) % 1;
    tearCount++;
    announcedTear = false;
    cu.startYank(p, seed);
    finishIfReduced();
  },
  mend() {
    if (!cu.mend()) { hint('찢어진 곳이 없습니다.', 'nothing-' + Date.now()); return; }
    announcedTear = false;
    hint('은실로 꿰맸습니다. 꿰맨 자리는 그대로 남습니다.', 'mend-' + Date.now());
    finishIfReduced();
    describe();
  },
};

document.querySelectorAll('[data-cue]').forEach((b) => {
  b.addEventListener('click', () => cues[b.dataset.cue]());
});

// ---- lifecycle ------------------------------------------------------------------------------

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cu.releaseAll(); running = false; }
  else if (!cu.isQuiet()) wake();
});

reducedQuery.addEventListener('change', (e) => {
  reduced = e.matches;
  cu.damp = reduced ? 0.8 : 0.988;
  if (reduced && flickerT >= 0) { flickerT = -1; setLamp(1); }
});

let resizeTimer = 0, lastSize = '';
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const size = stageEl.clientWidth + 'x' + stageEl.clientHeight;
    if (size === lastSize) return;
    lastSize = size;
    running = false;
    build(true);
  }, 160);
});

if (renderer.kind === 'webgl') {
  clothCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; });
  clothCanvas.addEventListener('webglcontextrestored', () => { renderer.restore(); draw(); });
}

function start() {
  lastSize = stageEl.clientWidth + 'x' + stageEl.clientHeight;
  build(false);
  describe();
  if (params.has('capture') || params.has('debug')) {
    window.__curtain = {
      get cu() { return cu; },
      cues, draw, wake,
      run(seconds) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) cu.step(STEP); draw(); },
      setLamp,
    };
  }
}

if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
else start();
