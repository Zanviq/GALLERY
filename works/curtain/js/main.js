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

let renderer = null;
let cu = null;
let L = null;
let running = false, last = 0, acc = 0;
let visible = true;
let isOpen = false;
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

function build(keep) {
  const was = cu ? cu.openness() : 0;
  L = layout();
  cu = new Cloth(L);
  cu.damp = reduced ? 0.8 : 0.985;
  if (L.phone) cu.iters = 7;
  renderer.resize(L.W, L.H, L.dpr);
  cu.settle(200);
  if (keep && was > 0.5) { cu.travel(0, 0.01); cu.settle(600); }
  cu.damp = reduced ? 0.8 : 0.985;
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
  renderer.draw(cu, light());
  const f = cu.openness();
  const fade = Math.max(0, Math.min(1, 1 - (f - 0.15) / 0.22));   // a peek keeps the announcement
  bill.style.opacity = fade.toFixed(3);
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
  let steps = 0;
  while (acc >= STEP && steps < 3) { cu.step(STEP); acc -= STEP; steps++; }
  if (steps === 3) acc = 0;
  if (steps) draw();
  if (cu.isQuiet()) { running = false; return; }
  requestAnimationFrame(frame);
}

// ---- hands --------------------------------------------------------------------------------

function local(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || !cu) return;
  const [x, y] = local(e);
  if (!cu.grab(e.pointerId, x, y)) return;
  if (e.pointerType === 'mouse') e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
  canvas.classList.add('is-holding');
  stopTease();
  wake();
});

canvas.addEventListener('pointermove', (e) => {
  if (!cu) return;
  const [x, y] = local(e);
  if (cu.grabs.has(e.pointerId)) { cu.move(e.pointerId, x, y); wake(); return; }
  if (e.pointerType === 'mouse') canvas.classList.toggle('can-grab', cu.hit(x, y) >= 0);
});

function end(e) {
  if (!cu || !cu.grabs.has(e.pointerId)) return;
  cu.release(e.pointerId);
  if (!cu.grabs.size) canvas.classList.remove('is-holding');
  wake();
}
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);
canvas.addEventListener('lostpointercapture', end);
canvas.addEventListener('pointerleave', () => canvas.classList.remove('can-grab'));

// ---- the traveller rope -------------------------------------------------------------------

function pull(to) {
  if (!cu) return;
  stopTease();
  cu.releaseAll();
  cu.travel(to, 2.4);
  if (reduced) { cu.settle(900); draw(); return; }
  wake();
}

openBtn.addEventListener('click', () => pull(0));
closeBtn.addEventListener('click', () => pull(1));

/** Once, a few seconds in: the lead edges part a hand's width and fall back, showing a line of light. */
function tease() {
  if (reduced || touched || !cu || cu.openness() > 0.02) return;
  touched = true;
  cu.travel(0.93, 1.3, 'out');
  const back = () => { if (cu.openness() < 0.2) cu.travel(1, 1.8); };
  cu.anim[0].then = back;
  wake();
}
function stopTease() { touched = true; clearTimeout(teaseTimer); }

// ---- lifecycle ----------------------------------------------------------------------------

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (cu) cu.releaseAll(); running = false; }
  else if (cu && !cu.isQuiet()) wake();
});

if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && cu && !cu.isQuiet()) wake();
  }).observe(stage);
}

reducedQuery.addEventListener('change', (e) => {
  reduced = e.matches;
  if (cu) cu.damp = reduced ? 0.8 : 0.985;
  if (reduced) stopTease();
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
    canvas.addEventListener('webglcontextrestored', () => { renderer.restore(); draw(); });
  }
  lastSize = stage.clientWidth + 'x' + stage.clientHeight;
  build(false);
  stage.classList.add('is-ready');
  if (params.has('capture') || params.has('debug')) {
    window.__curtain = { get cu() { return cu; }, draw, wake, pull, tease, run(sec) { for (let i = 0; i < sec * 60; i++) cu.step(STEP); draw(); } };
  } else if (!reduced) {
    teaseTimer = setTimeout(tease, 2600);
  }
}

const img = new Image();
img.decoding = 'async';
img.src = VELVET.src;
img.decode().then(() => start(img), fail);
