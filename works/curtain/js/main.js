import { Cloth } from './cloth.js';
import { createGL, create2D } from './render.js';

// the velvet photograph: real width/height of the crop before it was resized to 2048x1024
const VELVET = { src: './img/velvet.webp', aspect: 1.7487 };
const STEP = 1 / 60;
const params = new URLSearchParams(location.search);

const root = document.documentElement;
const stage = document.querySelector('[data-stage]');
const canvas = document.querySelector('[data-cloth]');
const bill = document.querySelector('[data-bill]');
const after = document.querySelector('[data-after]');
const openBtn = document.querySelector('[data-open]');
const closeBtn = document.querySelector('[data-close]');
const status = document.querySelector('[data-status]');

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;

// Reduced motion keeps every movement here, calmer: more damping (the cloth follows without
// swinging), weaker air on a slower clock, a slower rope and a smaller tease.
const MOTION = {
  full: { damp: 0.985, air: 1, airRate: 1, rope: 2.4, brush: 1, tease: [0.93, 1.3, 1.8] },
  calm: { damp: 0.94, air: 0.8, airRate: 0.8, rope: 3.2, brush: 0.5, tease: [0.955, 1.9, 2.6] },
};
const still = params.has('still');            // debugging: no house air
let M = reduced ? MOTION.calm : MOTION.full;

let renderer = null;
let cu = null;
let L = null;
let lamp = null;
let running = false, last = 0, acc = 0, lastDraw = 0, busyUntil = 0;
let idleGap = 31;                              // ms between frames while only the air moves the cloth
let iters = 8;                                 // solver passes while a hand or the rope works it
let visible = true;
let isOpen = false;
let lit = false;
let fadeShown = -1;
let touched = false;
let teaseTimer = 0;

function fail() {
  root.classList.add('no-cloth');
  stage.classList.add('is-ready');
}

// ---- layout -------------------------------------------------------------------------------

function layout() {
  const W = Math.max(1, stage.clientWidth), H = Math.max(1, stage.clientHeight);
  const phone = W < 600;
  const hemGap = Math.round(Math.min(14, Math.max(8, H * 0.012)));
  return {
    W, H, phone,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    top: -6,                        // the heading and its rings hang behind the proscenium
    hem: H - hemGap,                // a sliver of the lit stage floor shows under the hem
    floor: H - 2,
    side: phone ? -10 : -Math.round(Math.max(24, W * 0.035)),
    overlap: 10,
    pleat: Math.max(1, Math.min(1.8, 0.62 / Math.max(0.2, W / 2 / H))),
    nx: phone ? 19 : 31,
    ny: phone ? 22 : 26,
  };
}

function light() {
  // one front-of-house light on the curtain, high and right of centre, so the bill below-left
  // sits in the cloth's own shade
  const { W, H, phone } = L;
  return phone
    ? { spot: [W * 0.62, H * 0.2, W * 0.95, H * 0.55], base: 0.4, gain: 0.78 }
    : { spot: [W * 0.66, H * 0.26, W * 0.5, H * 0.72], base: 0.46, gain: 0.76 };
}

function tune() {
  M = reduced ? MOTION.calm : MOTION.full;
  if (!cu) return;
  cu.damp = M.damp;
  cu.air = still ? 0 : M.air;
  cu.airRate = M.airRate;
}

function build(keep) {
  const was = cu ? cu.openness() : 0;
  const t = cu ? cu.airT : 0;
  L = layout();
  lamp = light();
  cu = new Cloth(L);
  tune();
  cu.airT = t;
  iters = L.phone ? 7 : 8;
  cu.iters = iters;
  renderer.resize(L.W, L.H, L.dpr);
  cu.settle(200);
  if (keep && was > 0.5) { cu.travel(0, 0.01); cu.settle(600); }
  // how far the gathered cloth reaches in from each side: the poster keeps clear of it
  const stack = L.side + (cu.nx - 1) * cu.minD[cu.ny - 1];
  stage.style.setProperty('--stack', Math.max(0, Math.round(stack)) + 'px');
  // on tall screens the stage controls sit under the programme, clear of the lamp
  const list = stage.querySelector('.poster__list');
  if (list) stage.style.setProperty('--after-top', Math.round(list.getBoundingClientRect().bottom - stage.getBoundingClientRect().top + 28) + 'px');
  draw();
}

// ---- drawing and state --------------------------------------------------------------------

function draw() {
  renderer.draw(cu, lamp);
  const f = cu.openness();
  const fade = Math.max(0, Math.min(1, 1 - (f - 0.15) / 0.22));   // a peek keeps the announcement
  const shown = Math.round(fade * 200) / 200;
  if (shown !== fadeShown) { fadeShown = shown; bill.style.opacity = String(shown); }
  // once the stage is properly in view, its light reaches out from the bulb (site.css)
  if (!lit && f > 0.3) { lit = true; stage.classList.add('is-lit'); }
  else if (lit && f < 0.04) { lit = false; stage.classList.remove('is-lit'); }
  // the bill's button goes with the bill; once it has faded the stage's own controls take over
  const away = fade < 0.05;
  if (away !== !after.hidden) {
    const had = document.activeElement;
    after.hidden = !away;
    openBtn.hidden = away;
    if (away && had === openBtn) closeBtn.focus();
    if (!away && had === closeBtn) openBtn.focus();
  }
  const open = f > 0.5;
  if (open !== isOpen) {
    isOpen = open;
    say(open ? '막이 열렸습니다. 빈 무대에 불 하나가 켜져 있고, 재개관 시즌 네 편이 적혀 있습니다.' : '막이 닫혔습니다.');
  }
}

function say(text) { status.textContent = text; }

// ---- loop ---------------------------------------------------------------------------------

function wake() {
  if (running || document.hidden || !visible || !cu) return;
  running = true;
  last = performance.now();
  acc = 0;
  requestAnimationFrame(frame);
}

function frame(now) {
  if (!running) return;
  if (document.hidden || !visible) { running = false; cu.releaseAll(); return; }
  acc += Math.min(0.05, (now - last) / 1000);
  last = now;
  // full rate while a hand, the rope or a swing moves the cloth; the air alone gets ~30 fps
  const busy = cu.grabs.size > 0 || cu.travelling() || cu.motion > 0.36 || now < busyUntil;
  if (busy || now - lastDraw >= idleGap) {
    cu.iters = busy ? iters : 5;               // fewer solver passes for the air alone
    let steps = 0;
    while (acc >= STEP && steps < 4) { cu.step(STEP); acc -= STEP; steps++; }
    if (steps === 4) acc = 0;
    if (steps) { draw(); lastDraw = now; }
  }
  if (cu.air === 0 && cu.isQuiet()) { running = false; return; }
  requestAnimationFrame(frame);
}

function stir(ms = 1200) { busyUntil = performance.now() + ms; wake(); }

// ---- hands --------------------------------------------------------------------------------

function local(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

const downs = new Map();       // where and when each hand took hold, to tell a tap from a pull
let hover = null;

canvas.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || !cu) return;
  const [x, y] = local(e);
  if (!cu.grab(e.pointerId, x, y)) return;
  if (e.pointerType === 'mouse') e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
  canvas.classList.add('is-holding');
  downs.set(e.pointerId, { x, y, t: performance.now(), far: 0 });
  stopTease();
  wake();
});

canvas.addEventListener('pointermove', (e) => {
  if (!cu) return;
  const [x, y] = local(e);
  if (cu.grabs.has(e.pointerId)) {
    const d = downs.get(e.pointerId);
    if (d) d.far = Math.max(d.far, Math.hypot(x - d.x, y - d.y));
    cu.move(e.pointerId, x, y);
    wake();
    return;
  }
  if (e.pointerType === 'touch') return;
  // a hand passing over the curtain stirs the hem and the seam
  if (hover) {
    const ms = Math.max(4, Math.min(100, e.timeStamp - hover[2])), per = 1000 / 60 / ms;
    if (cu.brush(x, y, (x - hover[0]) * per, (y - hover[1]) * per, M.brush)) stir();
  }
  hover = [x, y, e.timeStamp];
  canvas.classList.toggle('can-grab', cu.hit(x, y) >= 0);
});

function end(e) {
  if (!cu || !cu.grabs.has(e.pointerId)) return;
  cu.release(e.pointerId);
  const d = downs.get(e.pointerId);
  downs.delete(e.pointerId);
  // a tap or a click without a pull: the velvet dents where it was touched
  if (d && e.type === 'pointerup' && d.far < 8 && performance.now() - d.t < 400) cu.poke(d.x, d.y, M.brush);
  if (!cu.grabs.size) canvas.classList.remove('is-holding');
  stir();
}
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);
canvas.addEventListener('lostpointercapture', end);
canvas.addEventListener('pointerleave', () => { canvas.classList.remove('can-grab'); hover = null; });

// ---- the traveller rope -------------------------------------------------------------------

function pull(to) {
  if (!cu) return;
  stopTease();
  cu.releaseAll();
  cu.travel(to, M.rope);
  stir(M.rope * 1000 + 1500);
}

openBtn.addEventListener('click', () => pull(0));
closeBtn.addEventListener('click', () => pull(1));

/** Once, a few seconds in: the lead edges part a hand's width and fall back, showing a line of light. */
function tease() {
  if (touched || !cu || cu.openness() > 0.02) return;
  touched = true;
  const [to, out, back] = M.tease;
  cu.travel(to, out, 'out');
  cu.anim[0].then = () => { if (cu.openness() < 0.2) cu.travel(1, back); };
  stir((out + back) * 1000 + 1500);
}
function stopTease() { touched = true; clearTimeout(teaseTimer); }

// ---- lifecycle ----------------------------------------------------------------------------

// the CSS lamps (the bulb on the stage, the light under the hem, the close-up) pause with the page
const closeUp = document.querySelector('[data-close-up]');
let closeUpSeen = false;
function lampsAway() {
  stage.classList.toggle('is-away', document.hidden || !visible);
  if (closeUp) closeUp.classList.toggle('is-away', document.hidden || !closeUpSeen);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (cu) cu.releaseAll(); running = false; }
  else wake();
  lampsAway();
});

if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    lampsAway();
    if (visible) wake();
  }).observe(stage);
  if (closeUp) {
    new IntersectionObserver((entries) => {
      closeUpSeen = entries[entries.length - 1].isIntersecting;
      lampsAway();
    }).observe(closeUp);
  }
}

reducedQuery.addEventListener('change', (e) => {
  reduced = e.matches;
  tune();
});

let resizeTimer = 0, lastSize = '';
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const size = stage.clientWidth + 'x' + stage.clientHeight;
    if (size === lastSize || !renderer) return;
    lastSize = size;
    running = false;
    build(true);
    wake();
  }, 160);
});

function start(image) {
  if (!params.has('nogl')) {
    try { renderer = createGL(canvas, image, VELVET.aspect); } catch (err) { renderer = null; }
  }
  if (!renderer) {
    try { renderer = create2D(canvas, image, VELVET.aspect); } catch (err) { renderer = null; }
  }
  if (!renderer) { fail(); return; }
  if (renderer.kind === 'webgl') {
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; });
    canvas.addEventListener('webglcontextrestored', () => { renderer.restore(); draw(); wake(); });
  }
  lastSize = stage.clientWidth + 'x' + stage.clientHeight;
  build(false);
  stage.classList.add('is-ready');
  if (renderer.kind === '2d') idleGap = 48;      // the fallback draws cell by cell: ~20 fps at rest
  if (params.has('capture') || params.has('debug')) {
    window.__curtain = {
      get cu() { return cu; }, get running() { return running; }, stop() { running = false; },
      draw, wake, pull, tease, run(sec) { for (let i = 0; i < sec * 60; i++) cu.step(STEP); draw(); },
    };
  }
  if (!params.has('capture')) teaseTimer = setTimeout(tease, reduced ? 3000 : 2600);
  wake();
}

const img = new Image();
img.decoding = 'async';
img.src = VELVET.src;
img.decode().then(() => start(img), fail);
