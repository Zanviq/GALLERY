// 색모래 병: pick a sand, pour it, tilt, shake, cork, save.
import { Sand, W, CX, MOUTH, PIVOT_Y, BOTTOM, MAX_TILT } from './sim.js';
import { SANDS, buildLut, buildCss } from './palette.js';
import { makeGridCanvas, paintGrid, drawBottle, drawCork, drawReflection, drawCup, sandTile } from './render.js';
import { sensorsPossible, enableSensors } from './sensors.js';
import { bottlePng } from './export.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;
reducedQuery.addEventListener?.('change', (e) => { reduced = e.matches; });
const capture = document.documentElement.classList.contains('capture');
const finePointer = matchMedia('(pointer: fine)').matches;

const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage blocked: fine */ } },
};

// ── elements ──
const stage = $('[data-stage]');
const canvas = $('[data-canvas]');
const ctx = canvas.getContext('2d');
const statusText = $('[data-status-text]');
const undoBtn = $('[data-undo]');
const pourBtn = $('[data-pour]');
const corkBtn = $('[data-cork]');
const tiltBtns = $$('[data-tilt]');
const sensorStop = $('[data-sensor-stop]');
const shakeBtn = $('[data-shake]');
const instantBtn = $('[data-instant]');
const emptyBtn = $('[data-empty]');
const jarBtns = $$('[data-jar]');
const panelFill = $('[data-panel="fill"]');
const panelDone = $('[data-panel="done"]');
const sensorCard = $('[data-sensor]');

if (!ctx) {
  $('[data-fallback]').hidden = false;
  throw new Error('no 2d canvas');
}

// ── model ──
const sim = new Sand(capture ? 20261109 : (Math.random() * 4294967296) >>> 0);
const lut = buildLut();
const css = buildCss();
const grid = makeGridCanvas();
const patterns = [null];
for (let c = 1; c <= 5; c++) patterns.push(ctx.createPattern(sandTile(c, lut, 32, c * 7), 'repeat'));

const state = {
  phase: 'filling',          // filling | full | corked
  jar: 1,
  tilt: 0,                   // target tilt (degrees, + = right side down)
  shown: 0,                  // tilt being drawn and simulated
  sensor: null,              // { stop } while the phone's sensors drive the tilt
  layers: [],                // colours poured, bottom to top (repeats merged)
  mixed: false,
};
const pourSources = new Set();
const particles = [];        // grains in the air between cup and mouth: {x, y, vy, v}
let spawnDebt = 0;
let blocked = 0;
let cupAngle = 0.35;
let jiggle = null;           // {t0}
let cork = null;             // {t0} while the cork drops
let undo = null;
let undoTimer = 0;
let lastAnnounce = '';

// ── layout ──
const view = { w: 0, h: 0, dpr: 1, cell: 2, px: 0, py: 0 };
const SPAN_X = 228, TOP = 168, DOWN = 108;     // world extents around the pivot, in cells
const DROP = 34;                               // cup lip above the mouth
const SHELF_RISE = 14;                         // cells the corked bottle moves up into the cup's space

function layout() {
  const r = stage.getBoundingClientRect();
  view.dpr = Math.min(3, window.devicePixelRatio || 1);
  view.w = Math.max(1, r.width);
  view.h = Math.max(1, r.height);
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
  view.cell = Math.min(view.w / SPAN_X, view.h / (TOP + DOWN));
  view.px = view.w / 2;
  view.py = (view.h - (TOP + DOWN) * view.cell) / 2 + TOP * view.cell;
  draw();
}

// ── drawing ──
function mouthScreen(rot) {
  const d = MOUTH - PIVOT_Y;
  return [view.px - Math.sin(rot) * d * view.cell, view.py + Math.cos(rot) * d * view.cell];
}

function draw() {
  const { dpr, cell } = view;
  const k = cell * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const th = (state.shown * Math.PI) / 180;
  const bottleRot = state.sensor ? 0 : th;
  const worldRot = state.sensor ? -th : 0;
  let jx = 0;
  if (jiggle) {
    const t = (performance.now() - jiggle.t0) / 360;
    if (t >= 1) jiggle = null; else jx = Math.sin(t * Math.PI * 6) * 2.4 * (1 - t);
  }
  paintGrid(grid, sim.g, lut);

  const done = state.phase === 'corked';
  // once corked, the cup is gone: the bottle rises a little to sit on the shelf in the middle
  let corkT = 1;
  if (cork) { corkT = Math.min(1, (performance.now() - cork.t0) / 520); if (corkT >= 1) cork = null; }
  const py = view.py - (done ? SHELF_RISE * (1 - Math.pow(1 - corkT, 3)) : 0) * cell;
  if (done) {
    // the shelf edge across the stage, then the striped reflection under it
    const shelfY = (py + (BOTTOM + 2 - PIVOT_Y) * cell) * dpr;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, Math.round(shelfY), canvas.width, Math.max(2, Math.round(dpr * 1.5)));
  }
  ctx.setTransform(k, 0, 0, k, (view.px + jx * cell) * dpr, py * dpr);
  ctx.rotate(bottleRot);
  ctx.translate(-CX, -PIVOT_Y);
  if (done) drawReflection(ctx, grid.canvas, 28);
  drawBottle(ctx, grid.canvas);
  if (done) drawCork(ctx, 46 * Math.pow(1 - corkT, 3));

  if (!done) {
    const [mx, my] = mouthScreen(bottleRot);
    ctx.setTransform(k, 0, 0, k, (mx + jx * cell * Math.cos(bottleRot)) * dpr, my * dpr);
    ctx.rotate(worldRot);
    for (const p of particles) {
      ctx.fillStyle = css[p.v];
      ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
    }
    ctx.translate(0.6, -DROP);
    const level = 9 - 15 * Math.min(1, Math.max(0, (cupAngle - 0.35) / 1.0));
    drawCup(ctx, cupAngle, patterns[state.jar], level);
  }
}

// ── loop: runs only while something moves; sleeps otherwise ──
let raf = 0;
let paused = false;
let lastT = 0;
function kick() {
  if (!raf && !paused) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
}
function frame(t) {
  raf = 0;
  const f = Math.min(3, Math.max(0.25, (t - lastT) / 16.67));
  lastT = t;
  let busy = false;

  // tilt: eased on screen unless reduced motion; the sensor path is already smoothed
  if (!state.sensor) {
    const d = state.tilt - state.shown;
    if (Math.abs(d) < 0.05 || reduced) state.shown = state.tilt;
    else { state.shown += d * (1 - Math.exp(-f / 4)); busy = true; }
  }
  sim.setTilt(state.shown);

  // the cup tips while pouring
  const pouring = pourSources.size > 0 && state.phase === 'filling';
  const cupTarget = pouring ? 1.32 : 0.35;
  if (Math.abs(cupTarget - cupAngle) > 0.01) {
    cupAngle = reduced ? cupTarget : cupAngle + (cupTarget - cupAngle) * (1 - Math.exp(-f / 3));
    busy = true;
  }

  // grains leave the cup once it is tipped far enough
  if (pouring && cupAngle > 1.05) {
    spawnDebt += 8 * f;
    while (spawnDebt >= 1) {
      spawnDebt -= 1;
      const v = state.jar * 32 + sim.shadeFor();
      particles.push({ x: (sim.rand() - 0.5) * 2.6, y: -DROP + 1.5, vy: 0.25 + sim.rand() * 0.25, v, wait: 0 });
    }
  }
  let arrived = 0;
  for (let n = particles.length - 1; n >= 0; n--) {
    const p = particles[n];
    if (p.y < 0) { p.vy += 0.09 * f; p.y = Math.min(0, p.y + p.vy * f); continue; }
    // at the mouth: drop in, or wait a frame if the mouth cells are busy
    if (state.phase === 'filling' && sim.inject(p.v >> 5, CX - 0.5 + p.x, p.v)) {
      particles.splice(n, 1);
      arrived++;
      noteLayer(p.v >> 5);
    } else if (++p.wait > 40 || state.phase !== 'filling') particles.splice(n, 1);
  }
  if (particles.length) busy = true;

  const steps = Math.round(4 * f);
  for (let n = 0; n < steps; n++) sim.step();
  if (sim.active > 0) busy = true;

  if (state.phase === 'filling' && ((arrived || pouring) && sim.mouthBlocked() || sim.fill() > 0.985)) setFull();
  else if (state.phase === 'full' && sim.active === 0 && !sim.mouthBlocked() && sim.fill() < 0.985) reopen();
  if (jiggle || cork) busy = true;

  draw();
  // the text alternative follows the sand on a short timer, not only when everything is still
  if ((busy || pouring) && !labelTimer) labelTimer = setTimeout(() => { labelTimer = 0; updateLabel(); }, 800);
  if (busy || pouring) kick();
  else asleep();
}

let labelTimer = 0;
function asleep() {
  clearTimeout(labelTimer);
  labelTimer = 0;
  updateLabel();
}

// ── layers and the text alternative ──
function noteLayer(colour) {
  const L = state.layers;
  if (L[L.length - 1] !== colour) L.push(colour);
}

function fillWords() {
  const f = sim.fill();
  if (state.phase !== 'filling' || f > 0.97) return '가득 찼어요';
  if (f < 0.05) return '조금 들어 있어요';
  if (f < 0.2) return '조금 찼어요';
  if (f < 0.45) return '3분의 1쯤 찼어요';
  if (f < 0.65) return '반쯤 찼어요';
  return '거의 찼어요';
}
function updateLabel() {
  let label;
  if (sim.count === 0) label = '빈 유리병이에요.';
  else {
    const names = state.layers.map((c) => SANDS[c].name).join(', ');
    label = `유리병에 모래가 ${fillWords()}. 아래부터 ${names}.` + (state.mixed ? ' 맨 위는 흔들어 섞었어요.' : '');
    if (state.phase === 'corked') label += ' 코르크로 막았어요.';
  }
  canvas.setAttribute('aria-label', label);
}

function say(text, withUndo = false) {
  statusText.textContent = text;
  undoBtn.hidden = !withUndo;
  lastAnnounce = text;
}

// ── actions ──
function pickJar(n) {
  if (state.phase === 'corked' || n < 1 || n > 5) return;
  state.jar = n;
  for (const b of jarBtns) b.setAttribute('aria-pressed', String(Number(b.dataset.jar) === n));
  say(`${SANDS[n].name} 모래를 골랐어요.`);
  kick();
}

function startPour(src) {
  if (state.phase === 'full') { say(fullMessage()); return; }
  if (state.phase !== 'filling') return;
  if (!pourSources.size) pourBtn.classList.add('is-held');
  pourSources.add(src);
  clearUndo();
  kick();
}
function stopPour(src) {
  pourSources.delete(src);
  if (!pourSources.size) pourBtn.classList.remove('is-held');
  if (!pourSources.size && pendingCorkFocus) { pendingCorkFocus = false; corkBtn.focus(); }
  kick();
}

let pendingCorkFocus = false;
function setFull() {
  if (state.phase !== 'filling') return;
  state.phase = 'full';
  const hadFocus = document.activeElement === pourBtn;
  pourSources.clear();
  pourBtn.classList.remove('is-held');
  particles.length = 0;
  pourBtn.hidden = true;
  corkBtn.hidden = false;
  instantBtn.setAttribute('aria-disabled', 'true');
  say(fullMessage());
  if (hadFocus) {
    if (spaceDown) pendingCorkFocus = true; else corkBtn.focus();
  }
}
function fullMessage() {
  return sim.fill() < 0.93
    ? '목까지 찼어요. 기울이거나 흔들면 빈자리로 모래가 내려가요. 이대로 막아도 돼요.'
    : '병이 가득 찼어요. 코르크로 막아요.';
}
/** Tilting or shaking a full bottle can open the neck again: then it can take more sand. */
function reopen() {
  const hadFocus = document.activeElement === corkBtn;
  setFilling();
  say('병에 빈자리가 생겼어요. 더 부을 수 있어요.');
  if (hadFocus) pourBtn.focus({ preventScroll: true });
}

function setTilt(deg, announce = true) {
  if (state.phase === 'corked' || state.sensor) return;
  const t = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.round(deg * 10) / 10));
  if (t === state.tilt) return;
  const was = Math.sign(state.tilt);
  state.tilt = t;
  if (announce && Math.sign(t) !== was) sayTilt();
  kick();
}
function sayTilt() {
  const now = Math.sign(state.tilt);
  say(now > 0 ? '병을 오른쪽으로 기울였어요.' : now < 0 ? '병을 왼쪽으로 기울였어요.' : '병을 똑바로 세웠어요.');
}

let lastShake = 0;
function shake() {
  if (state.phase === 'corked' || sim.count === 0) return;
  const now = performance.now();
  if (now - lastShake < 450) return;
  lastShake = now;
  sim.shake(16, !reduced);
  state.mixed = true;
  if (!reduced) jiggle = { t0: now };
  say('위층을 흔들어 섞었어요.');
  kick();
}

function pourLayer() {
  if (state.phase !== 'filling') { if (state.phase === 'full') say(fullMessage()); return; }
  clearUndo();
  // grains already in the air land first
  for (const p of particles.splice(0)) if (sim.inject(p.v >> 5, CX - 0.5 + p.x, p.v)) noteLayer(p.v >> 5);
  const amount = Math.round(sim.capacity / 14);
  const poured = sim.pourInstant(state.jar, amount, () => (sim.rand() - 0.5) * 2.6);
  if (poured > 0) noteLayer(state.jar);
  say(`${SANDS[state.jar].name} 한 층을 바로 쌓았어요.`);
  if (poured < amount || sim.mouthBlocked() || sim.fill() > 0.985) setFull();
  draw();
  updateLabel();
}

function empty() {
  if (state.phase === 'corked' || sim.count === 0) return;
  undo = { snap: sim.snapshot(), layers: state.layers.slice(), mixed: state.mixed, phase: state.phase };
  pourSources.clear();
  pourBtn.classList.remove('is-held');
  particles.length = 0;
  sim.clear();
  state.layers = [];
  state.mixed = false;
  setFilling();
  say('병을 비웠어요.', true);
  clearTimeout(undoTimer);
  undoTimer = setTimeout(clearUndo, 6000);
  draw();
  updateLabel();
}
function clearUndo() {
  if (!undo) return;
  undo = null;
  clearTimeout(undoTimer);
  undoBtn.hidden = true;
}
function restore() {
  if (!undo) return;
  const u = undo;
  clearUndo();
  sim.restore(u.snap);
  state.layers = u.layers;
  state.mixed = u.mixed;
  say('비운 모래를 되돌렸어요.');
  if (u.phase === 'full') setFull();
  kick();
  updateLabel();
}

function setFilling() {
  state.phase = 'filling';
  blocked = 0;
  pourBtn.hidden = false;
  corkBtn.hidden = true;
  instantBtn.removeAttribute('aria-disabled');
}

function corkIt() {
  if (state.phase !== 'full') return;
  sim.settle();
  state.phase = 'corked';
  if (state.sensor) stopSensors(false);
  state.tilt = 0;
  state.shown = 0;
  sim.setTilt(0);
  sim.settle();
  cork = reduced ? null : { t0: performance.now() };
  panelFill.hidden = true;
  panelFill.inert = true;
  panelDone.hidden = false;
  panelDone.inert = false;
  stage.classList.add('is-done');
  say('코르크로 막았어요. 그림으로 저장할 수 있어요.');
  $('[data-save]').focus({ preventScroll: true });
  kick();
  draw();
  updateLabel();
}

async function save() {
  try {
    const blob = await bottlePng(grid.canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sand-bottle.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say('그림을 저장했어요. 이 기기 안에서 만들었고, 어디로도 보내지 않았어요.');
  } catch (e) {
    say('그림을 만들지 못했어요. 다시 눌러 주세요.');
  }
}

function newBottle() {
  sim.clear();
  state.layers = [];
  state.mixed = false;
  particles.length = 0;
  setFilling();
  panelDone.hidden = true;
  panelDone.inert = true;
  panelFill.hidden = false;
  panelFill.inert = false;
  stage.classList.remove('is-done');
  say('새 병이에요. 모래를 골라 부어요.');
  pourBtn.focus({ preventScroll: true });
  draw();
  updateLabel();
}

// ── sensors ──
function showTiltButtons(on) {
  for (const b of tiltBtns) b.hidden = !on;
  sensorStop.hidden = on;
}
async function startSensors() {
  sensorCard.hidden = true;
  const res = await enableSensors({
    onTilt: (deg) => {
      if (state.phase === 'corked') return;
      const prev = state.shown;
      state.tilt = deg;
      state.shown = deg;
      if (Math.abs(deg - prev) > 0.5) kick();
    },
    onShake: shake,
  });
  if (res.ok) {
    state.sensor = res;
    store.set('sand.sensor', 'on');
    showTiltButtons(false);
    say('센서를 켰어요. 휴대폰을 기울이고 붓기를 누르고 있어요. 흔들면 위층이 섞여요.');
  } else {
    store.set('sand.sensor', 'off');
    say('센서를 켜지 못했어요. 병을 옆으로 끌거나 기울이기 버튼을 써요.');
  }
  kick();
}
function stopSensors(announce = true) {
  if (state.sensor) state.sensor.stop();
  state.sensor = null;
  state.tilt = 0;
  state.shown = 0;
  showTiltButtons(true);
  store.set('sand.sensor', 'off');
  if (announce) say('센서를 껐어요. 병을 옆으로 끌어 기울여요.');
  kick();
}

// ── input: buttons ──
for (const b of jarBtns) b.addEventListener('click', () => pickJar(Number(b.dataset.jar)));

pourBtn.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  try { pourBtn.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already released */ }
  startPour('pointer');
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pourBtn.addEventListener(ev, () => stopPour('pointer'));
pourBtn.addEventListener('contextmenu', (e) => e.preventDefault());
pourBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); startPour('enter'); }
});
pourBtn.addEventListener('keyup', (e) => { if (e.key === 'Enter') stopPour('enter'); });
pourBtn.addEventListener('blur', () => { stopPour('enter'); stopPour('space'); });

corkBtn.addEventListener('click', corkIt);
shakeBtn.addEventListener('click', shake);
instantBtn.addEventListener('click', pourLayer);
emptyBtn.addEventListener('click', empty);
undoBtn.addEventListener('click', restore);
$('[data-save]').addEventListener('click', save);
$('[data-new]').addEventListener('click', newBottle);
$('[data-sensor-on]').addEventListener('click', startSensors);
$('[data-sensor-off]').addEventListener('click', () => {
  sensorCard.hidden = true;
  store.set('sand.sensor', 'off');
  say('병을 옆으로 끌면 기울어요. 붓기를 누르고 있는 동안 모래가 나와요.');
  pourBtn.focus({ preventScroll: true });
});
sensorStop.addEventListener('click', () => stopSensors(true));

// tilt buttons: a click tilts 7 degrees (on release); holding keeps tilting after a short wait
let tiltRepeat = 0;
let tiltHeld = false;
for (const b of tiltBtns) {
  const dir = Number(b.dataset.tilt);
  const stopRepeat = () => { clearTimeout(tiltRepeat); clearInterval(tiltRepeat); tiltRepeat = 0; };
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    stopRepeat();
    tiltHeld = false;
    tiltRepeat = setTimeout(() => {
      tiltHeld = true;
      tiltRepeat = setInterval(() => setTilt(state.tilt + dir * 3), 60);
    }, 350);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stopRepeat);
  b.addEventListener('click', () => {
    if (tiltHeld) { tiltHeld = false; return; }    // a long press already tilted
    setTilt(state.tilt + dir * 7);
  });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ── input: dragging the bottle (tilt) and quick back-and-forth (shake) ──
let drag = null;
stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.sensor') || state.phase === 'corked') return;
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already released */ }
  drag = { id: e.pointerId, x0: e.clientX, t0: state.tilt, lastX: e.clientX, dir: 0, turnX: e.clientX, turns: [] };
  stage.classList.add('is-dragging');
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  if (!state.sensor) setTilt(drag.t0 + dx * 0.32, false);
  const step = e.clientX - drag.lastX;
  if (Math.abs(step) >= 2) {
    const dir = Math.sign(step);
    if (drag.dir && dir !== drag.dir) {
      if (Math.abs(drag.lastX - drag.turnX) >= 18) {
        const now = performance.now();
        drag.turns.push(now);
        while (drag.turns.length && now - drag.turns[0] > 600) drag.turns.shift();
        if (drag.turns.length >= 3) { drag.turns.length = 0; shake(); }
      }
      drag.turnX = drag.lastX;
    }
    drag.dir = dir;
    drag.lastX = e.clientX;
  }
});
const endDrag = (e) => {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  if (Math.sign(state.tilt) !== Math.sign(drag.t0)) sayTilt();
  drag = null;
  stage.classList.remove('is-dragging');
};
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

// ── input: keyboard ──
let spaceDown = false;
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const a = document.activeElement;
  const onOtherButton = a && a.tagName === 'BUTTON' && a !== pourBtn;
  if (e.key === ' ' || e.code === 'Space') {
    if (onOtherButton) return;            // Space keeps its usual job on other buttons
    e.preventDefault();
    if (!e.repeat) { spaceDown = true; startPour('space'); }
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    setTilt(state.tilt + (e.key === 'ArrowLeft' ? -5 : 5));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setTilt(0);
  } else if ((e.key === 's' || e.key === 'S') && !e.repeat) {
    shake();
  } else if (/^[1-5]$/.test(e.key)) {
    pickJar(Number(e.key));
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    if (spaceDown) e.preventDefault();
    spaceDown = false;
    stopPour('space');
  }
});
window.addEventListener('blur', () => { spaceDown = false; pourSources.clear(); pourBtn.classList.remove('is-held'); });

// ── pause when hidden or off-screen ──
function setPaused(p) {
  paused = p;
  if (p) {
    pourSources.clear();
    pourBtn.classList.remove('is-held');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  } else kick();
}
document.addEventListener('visibilitychange', () => setPaused(document.hidden));
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    for (const en of entries) setPaused(!en.isIntersecting || document.hidden);
  }).observe(stage);
}
new ResizeObserver(() => layout()).observe(stage);

// ── jars in the rack ──
function drawJars() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  for (const b of jarBtns) {
    const c = $('canvas', b);
    const n = Number(b.dataset.jar);
    const u = 2;                               // CSS px per grain
    c.width = 44 * dpr; c.height = 52 * dpr;
    const x = c.getContext('2d');
    x.setTransform(u * dpr, 0, 0, u * dpr, 0, 0);
    x.imageSmoothingEnabled = false;
    // jar body (22 x 26 grains): lid, shoulder, sand
    x.save();
    x.beginPath();
    x.moveTo(4, 7); x.lineTo(18, 7); x.quadraticCurveTo(21, 7, 21, 10); x.lineTo(21, 23.5);
    x.quadraticCurveTo(21, 25.5, 19, 25.5); x.lineTo(3, 25.5); x.quadraticCurveTo(1, 25.5, 1, 23.5);
    x.lineTo(1, 10); x.quadraticCurveTo(1, 7, 4, 7); x.closePath();
    x.clip();
    x.drawImage(sandTile(n, lut, 22, n * 13), 0, 10.5);
    x.restore();
    x.strokeStyle = '#fff';
    x.lineWidth = 0.9;
    x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(4, 7); x.lineTo(18, 7); x.quadraticCurveTo(21, 7, 21, 10); x.lineTo(21, 23.5);
    x.quadraticCurveTo(21, 25.5, 19, 25.5); x.lineTo(3, 25.5); x.quadraticCurveTo(1, 25.5, 1, 23.5);
    x.lineTo(1, 10); x.quadraticCurveTo(1, 7, 4, 7); x.closePath();
    x.stroke();
    x.strokeRect(5, 1.5, 12, 4.2);
    x.fillStyle = '#fff';
    x.globalAlpha = 0.28;
    x.fillRect(3.2, 12, 1.2, 10);
    x.globalAlpha = 1;
  }
}

// ── start ──
function intro() {
  if (sensorsPossible() && !capture) {
    const pref = store.get('sand.sensor');
    if (pref !== 'off') sensorCard.hidden = false;
    say('병을 옆으로 끌면 기울어요. 붓기를 누르고 있는 동안 모래가 나와요.');
  } else if (finePointer) {
    say('병을 옆으로 끌거나 화살표 키로 기울여요. 스페이스를 누르는 동안 부어요.');
  } else {
    say('병을 옆으로 끌면 기울어요. 붓기를 누르고 있는 동안 모래가 나와요.');
  }
}

panelDone.inert = true;
drawJars();
layout();
intro();
updateLabel();

// a fixed bottle for the gallery's thumbnail and share image (only with ?capture)
if (capture) {
  // [sand, share of a layer, tilt at the start, tilt at the end]: the tilt sweeps while it pours
  const plan = [[3, 1.0, -6, 8], [2, 0.8, 26, 12], [1, 1.0, -28, -8], [5, 0.6, 4, 30], [4, 0.9, -18, 20],
    [3, 0.8, 30, -6], [2, 0.7, -30, -12], [1, 0.9, 6, 26], [5, 0.6, -24, 10], [4, 0.8, 22, -20], [3, 0.7, 0, 0]];
  window.sandCapture = (opts = {}) => {
    for (const [c, amt, from, to] of plan) {
      const total = Math.round((sim.capacity / 14) * amt);
      for (let n = 0; n < 6; n++) {
        sim.setTilt(from + ((to - from) * n) / 5);
        sim.pourInstant(c, Math.round(total / 6), () => (sim.rand() - 0.5) * 2.6);
      }
      noteLayer(c);
      if (sim.mouthBlocked()) break;
    }
    // a bottle that will be corked is filled to the brim with a few more swept layers
    for (let n = 0; opts.cork && n < 12 && !sim.mouthBlocked(); n++) {
      const c = [2, 1, 5, 3, 4][n % 5];
      for (let j = 0; j < 6 && !sim.mouthBlocked(); j++) {
        sim.setTilt((n % 2 ? 1 : -1) * (24 - j * 8));
        sim.pourInstant(c, Math.round(sim.capacity / 90), () => (sim.rand() - 0.5) * 2.6);
      }
      noteLayer(c);
    }
    sim.setTilt(0); sim.settle();
    state.jar = opts.jar || 2;
    pickJar(state.jar);
    if (opts.cork) { setFull(); corkIt(); cork = null; }
    else if (opts.pour) { state.tilt = opts.tilt || 0; state.shown = state.tilt; startPour('capture'); }
    draw();
    updateLabel();
  };
}
