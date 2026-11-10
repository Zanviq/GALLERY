// 색모래 병: pick a jar, hold to pour, tilt, shake, cork, and the bottle goes to the windowsill.
import GEO from './geo.js';
import { Sand, MAX_TILT } from './sim.js';
import { SANDS, buildLut } from './palette.js';
import { sensorsPossible, enableSensors } from './sensors.js';
import { SandSound } from './sound.js';
import { preloadFinish, renderFinish, finishBlob } from './finish.js';
import { START, START_LAYERS, STILL, STILL_LAYERS } from './start.js';

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
const bottle = $('[data-bottle]');
const canvas = $('[data-canvas]');
const ctx = canvas.getContext('2d');
const corkImg = $('[data-cork-img]');
const held = $('[data-held]');
const finishCanvas = $('[data-finish]');
const statusText = $('[data-status-text]');
const undoBtn = $('[data-undo]');
const pourBtn = $('[data-pour]');
const corkBtn = $('[data-cork]');
const tiltBtns = $$('[data-tilt]');
const sensorStop = $('[data-sensor-stop]');
const shakeBtn = $('[data-shake]');
const instantBtn = $('[data-instant]');
const emptyBtn = $('[data-empty]');
const soundBtn = $('[data-sound]');
const jarBtns = $$('[data-jar]');
const panelFill = $('[data-panel="fill"]');
const panelDone = $('[data-panel="done"]');
const sensorCard = $('[data-sensor]');

if (!ctx) {
  $('[data-fallback]').hidden = false;
  throw new Error('no 2d canvas');
}

// ── model ──
const sim = new Sand(GEO, capture ? 20261110 : (Math.random() * 4294967296) >>> 0);
const lut = buildLut();
canvas.width = GEO.W;
canvas.height = GEO.H;
const image = ctx.createImageData(GEO.W, GEO.H);
sim.setOutput(new Uint32Array(image.data.buffer), lut);
const sound = new SandSound();

// rows of the photographed bottle, in grid cells
const LIP_TOP = 88;            // top of the glass lip
const BASE = 599;              // bottom of the thick base
const PIVOT = (LIP_TOP + BASE) / 2;
const BODY_HW = 137;           // outer half-width of the body
const CORK = [104, 52.75, 86.75, 82.25];   // cork photo box: x, y, w, h
const CORK_SEAT = CORK[1] + CORK[3];        // first sand row visible under the cork
const JAR_PIVOT = [0.935, 0.05];           // the jar's rim corner it pours from (fraction of the photo)
const JAR_RATIO = 337 / 240;

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
let jarT = 0;                // 0 = jar resting beside the neck, 1 = tipped over the mouth
let flowT = 0;               // ramps up while the jar keeps pouring
let spawnDebt = 0;
let jiggle = null;
let undo = null;
let undoTimer = 0;
let demo = null;             // the opening pour: { t0, until }
let perf = { n: 0, sum: 0, max: 0, slow: 0 };     // frame cost of the sand (ms), for checks
window.__sandPerfReset = () => { perf = { n: 0, sum: 0, max: 0, slow: 0 }; };

// ── layout ──
const view = { w: 0, h: 0, k: 1, bx: 0, by: 0, jw: 56 };
function layout() {
  const r = stage.getBoundingClientRect();
  view.w = Math.max(1, r.width);
  view.h = Math.max(1, r.height);
  // the tipped jar rises about its own width above the point it pours from; the jar is about a
  // fifth of the bottle's width, so size the bottle first with a guess and then settle both
  view.gap = 14;
  let k = 0.7;
  for (let pass = 0; pass < 2; pass++) {
    view.jw = Math.round(Math.min(120, Math.max(44, 2 * BODY_HW * k * 0.2)));
    const head = view.gap + view.jw * 1.06 + 4;
    k = Math.min((view.h - head - 8) / (BASE - LIP_TOP), (view.w - 24) / (2 * BODY_HW + 20));
  }
  const head = view.gap + view.jw * 1.06 + 4;
  view.k = Math.max(0.3, k);
  const used = head + (BASE - LIP_TOP) * view.k;
  const top = Math.max(0, (view.h - used) / 2) + head;           // screen y of the lip top
  view.bx = view.w / 2 - GEO.cx * view.k;
  view.by = top - LIP_TOP * view.k;
  bottle.style.width = `${GEO.W * view.k}px`;
  bottle.style.height = `${GEO.H * view.k}px`;
  bottle.style.left = `${view.bx}px`;
  bottle.style.top = `${view.by}px`;
  bottle.style.transformOrigin = `${GEO.cx * view.k}px ${PIVOT * view.k}px`;
  corkImg.style.left = `${CORK[0] * view.k}px`;
  corkImg.style.top = `${CORK[1] * view.k}px`;
  corkImg.style.width = `${CORK[2] * view.k}px`;
  corkImg.style.height = `${CORK[3] * view.k}px`;
  held.style.width = `${view.jw}px`;
  held.style.height = `${Math.round(view.jw * JAR_RATIO)}px`;
  held.style.transformOrigin = `${JAR_PIVOT[0] * view.jw}px ${JAR_PIVOT[1] * view.jw * JAR_RATIO}px`;
  placeBottle();
  placeJar();
}

/**
 * rot: the bottle's rotation on screen (clockwise). down: the angle of world-down on screen, from
 * straight down toward the right. Dragging turns the bottle on screen; with the phone's sensors the
 * bottle stays put on screen and the world (the stream, the jar) leans instead.
 */
function frames() {
  const th = (state.shown * Math.PI) / 180;
  return state.sensor ? { rot: 0, down: th } : { rot: th, down: 0 };
}

/** Bottle cell (x, y) to stage px. */
function toScreen(x, y, rot) {
  const ox = GEO.cx * view.k, oy = PIVOT * view.k;
  const dx = x * view.k - ox, dy = y * view.k - oy;
  return [view.bx + ox + dx * Math.cos(rot) - dy * Math.sin(rot), view.by + oy + dx * Math.sin(rot) + dy * Math.cos(rot)];
}
/** Stage px to bottle cells. */
function toCells(sx, sy, rot) {
  const ox = GEO.cx * view.k, oy = PIVOT * view.k;
  const dx = sx - view.bx - ox, dy = sy - view.by - oy;
  return [(ox + dx * Math.cos(rot) + dy * Math.sin(rot)) / view.k, (oy - dx * Math.sin(rot) + dy * Math.cos(rot)) / view.k];
}

let lastBottleRot = null, lastJitter = 0;
function placeBottle() {
  const { rot } = frames();
  let jx = 0;
  if (jiggle) {
    const t = (performance.now() - jiggle.t0) / 380;
    if (t >= 1) jiggle = null; else jx = Math.sin(t * Math.PI * 6) * 5 * (1 - t);
  }
  if (rot === lastBottleRot && jx === lastJitter) return;
  lastBottleRot = rot;
  lastJitter = jx;
  bottle.style.transform = `translateX(${jx.toFixed(2)}px) rotate(${rot.toFixed(4)}rad)`;
}

/** Where the stream leaves the jar: straight above the mouth in the world. */
function lipPoint() {
  const { rot, down } = frames();
  const [mx, my] = toScreen(GEO.cx, GEO.mouth - 2, rot);
  const d = view.gap + (GEO.mouth - LIP_TOP) * view.k;
  return [mx - Math.sin(down) * d, my - Math.cos(down) * d];
}

let lastJar = '';
function placeJar() {
  const { down } = frames();
  const [lx, ly] = lipPoint();
  const e = jarT * jarT * (3 - 2 * jarT);
  // resting: upright (in the world), to the left of the neck; pouring: rim corner over the mouth, tipped
  const jh = view.jw * JAR_RATIO;
  const a = -down;                                   // screen rotation that keeps the jar upright in the world
  const ox0 = -view.jw * 1.05, oy0 = jh * 0.2;       // resting offset from the lip, world frame
  const rx = lx + ox0 * Math.cos(a) - oy0 * Math.sin(a), ry = ly + ox0 * Math.sin(a) + oy0 * Math.cos(a);
  const px = rx + (lx - rx) * e, py = ry + (ly - ry) * e;
  const ang = (a * 180) / Math.PI + e * 84;
  const ox = JAR_PIVOT[0] * view.jw, oy = JAR_PIVOT[1] * jh;
  const tf = `translate(${(px - ox).toFixed(1)}px, ${(py - oy).toFixed(1)}px) rotate(${ang.toFixed(2)}deg)`;
  if (tf !== lastJar) { held.style.transform = tf; lastJar = tf; }
}

// ── the loop: runs while something moves, sleeps otherwise ──
let raf = 0;
let paused = false;
let lastT = 0;
let lastGlint = 0;
let streamTilt = 0;          // the tilt the grains in the air were last moved at
function kick() {
  if (!raf && !paused) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
}
function frame(t) {
  raf = 0;
  const f = Math.min(2.5, Math.max(0.25, (t - lastT) / 16.67));
  lastT = t;
  const t0 = performance.now();
  let busy = false;

  if (demo) busy = runDemo(t) || busy;

  // tilt: eased on screen (reduced motion too); the sensor path is already smoothed
  if (!state.sensor) {
    const d = state.tilt - state.shown;
    if (Math.abs(d) < 0.05) state.shown = state.tilt;
    else { state.shown += d * (1 - Math.exp(-f / 4)); busy = true; }
  }
  sim.setTilt(state.shown);
  if (state.shown !== streamTilt) { sim.turnStream(state.shown - streamTilt, GEO.cx, PIVOT); streamTilt = state.shown; }

  // the jar: lifted and tipped while pouring
  const pouring = (pourSources.size > 0 || (demo && demo.pouring)) && state.phase === 'filling';
  const target = pouring ? 1 : 0;
  if (jarT !== target) {
    jarT = target ? Math.min(1, jarT + 0.075 * f) : Math.max(0, jarT - 0.06 * f);
    busy = true;
  }
  flowT = pouring && jarT > 0.86 ? Math.min(1, flowT + 0.05 * f) : 0;
  if (flowT > 0) {
    const rate = 14 + 34 * flowT;                       // grains per frame
    const { rot } = frames();
    const [lx, ly] = lipPoint();
    const [cx, cy] = toCells(lx, ly, rot);
    // world-down in the bottle's frame is the sim's gravity: (sin tilt, cos tilt)
    const th = (state.shown * Math.PI) / 180;
    const sx = Math.sin(th), sy = Math.cos(th);
    const g0 = 0.7;                                     // speed leaving the rim, cells/frame
    spawnDebt += rate * f;
    while (spawnDebt >= 1) {
      spawnDebt -= 1;
      const j = (sim.rand() + sim.rand() - 1) * 4.2;    // across the stream, denser in the middle
      const a = sim.rand() * 2.5;                       // along it, so a frame's grains don't bunch
      const v = state.jar * 32 + sim.shadeFor();
      sim.emit(v, cx + j * sy - a * sx, cy - j * sx - a * sy, g0 * sx + (sim.rand() - 0.5) * 0.1 * sy, g0 * sy);
    }
  } else spawnDebt = 0;

  const inAir = sim.flow(f);
  if (inAir) busy = true;
  const steps = Math.min(6, Math.max(1, Math.round(3 * f)));
  let moving = 0;
  for (let n = 0; n < steps; n++) moving += sim.step();
  if (sim.active > 0) busy = true;

  if (Math.abs(state.shown - lastGlint) > 0.12) {
    sim.glint(state.shown, true);
    lastGlint = state.shown;
  }

  const d = sim.takeDirty();
  if (d) {
    const x0 = Math.max(0, d[0]), y0 = Math.max(0, d[1]);
    const x1 = Math.min(GEO.W - 1, d[2]), y1 = Math.min(GEO.H - 1, d[3]);
    if (x1 >= x0 && y1 >= y0) ctx.putImageData(image, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }
  placeBottle();
  placeJar();
  if (jiggle) busy = true;

  sound.update(sim.landed, moving / steps, sim.fill());
  sim.landed = 0;

  if (state.phase === 'filling' && (sim.mouthBlocked() || sim.fill() > 0.992)) setFull();
  else if (state.phase === 'full' && sim.active === 0 && !inAir && sim.neckLevel() > 14) reopen();

  const dt = performance.now() - t0;
  if (busy || pouring) {
    perf.n++; perf.sum += dt; if (dt > perf.max) perf.max = dt;
    if (f > 1.3) perf.slow++;                        // frames that came later than 1/46 s
  }
  window.__sandPerf = { frames: perf.n, avg: perf.n ? +(perf.sum / perf.n).toFixed(2) : 0, max: +perf.max.toFixed(2), late: perf.slow };

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

// ── the opening demonstration: a short pour while the bottle sways, until the visitor touches ──
const DEMO_PLAN = [[4, 0, 2300, -12, 12, 2], [2, 2500, 4300, 12, -10, 1]];   // jar, start ms, end ms, tilt from, to, rocking waves
function runDemo(t) {
  const e = t - demo.t0;
  let step = null;
  for (const p of DEMO_PLAN) if (e >= p[1] && e < p[2]) step = p;
  if (step) {
    if (state.jar !== step[0]) pickJar(step[0], false);
    const u = (e - step[1]) / (step[2] - step[1]);
    state.tilt = step[3] + (step[4] - step[3]) * (0.5 - 0.5 * Math.cos(u * Math.PI * step[5]));
    demo.pouring = u < 0.86;
  } else demo.pouring = false;
  if (e > DEMO_PLAN[DEMO_PLAN.length - 1][2] + 200) {
    state.tilt = 0;
    endDemo(false);
    return true;
  }
  return true;
}
function endDemo(byVisitor) {
  if (!demo) return;
  demo = null;
  if (!drag && !state.sensor) state.tilt = 0;
  pickJar(byVisitor ? state.jar : 1, false);
  if (!byVisitor) say(hint());
  if (!byVisitor) offerSensors();
  kick();
}
const stopDemo = () => { if (demo) endDemo(true); };

/** On a phone, after the visitor has seen the sand move: offer the motion sensors (once a session). */
let offered = false;
function offerSensors() {
  if (!sensorsPossible() || capture || state.sensor || state.phase === 'corked') return;
  if (offered || store.get('sand.sensor') === 'off') return;
  offered = true;
  sensorCard.hidden = false;
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
    if (state.phase === 'corked') label += ' 코르크로 막아 햇빛 드는 창가에 세워 뒀어요.';
  }
  canvas.setAttribute('aria-label', label);
  finishCanvas.setAttribute('aria-label', label);
}

function say(text, withUndo = false) {
  statusText.textContent = text;
  undoBtn.hidden = !withUndo;
}
function hint() {
  if (state.sensor) return '휴대폰을 기울이고 붓기를 누르고 있어요. 흔들면 위층이 섞여요.';
  if (finePointer) return '붓기나 스페이스를 누르고 있으면 모래가 흘러요. 병을 끌거나 화살표 키로 기울여요.';
  return '붓기를 누르고 있으면 모래가 흘러요. 병을 옆으로 끌면 기울어요.';
}

// ── actions ──
function pickJar(n, announce = true) {
  if (state.phase === 'corked' || n < 1 || n > 5) return;
  state.jar = n;
  for (const b of jarBtns) b.setAttribute('aria-pressed', String(Number(b.dataset.jar) === n));
  held.src = `./img/jar-${n}.webp`;
  if (announce) say(`${SANDS[n].name} 모래를 들었어요.`);
  kick();
}

function startPour(src) {
  stopDemo();
  sound.start();
  if (state.phase === 'full') { say(fullMessage()); return; }
  if (state.phase !== 'filling') return;
  if (!pourSources.size) pourBtn.classList.add('is-held');
  pourSources.add(src);
  noteLayer(state.jar);
  clearUndo();
  preloadFinish();
  kick();
}
function stopPour(src) {
  pourSources.delete(src);
  if (!pourSources.size) pourBtn.classList.remove('is-held');
  if (!pourSources.size && pendingCorkFocus) { pendingCorkFocus = false; corkBtn.focus(); }
  if (!pourSources.size) offerSensors();          // after the first pour, not in the middle of it
  kick();
}

let pendingCorkFocus = false;
function setFull() {
  if (state.phase !== 'filling') return;
  state.phase = 'full';
  const hadFocus = document.activeElement === pourBtn;
  pourSources.clear();
  pourBtn.classList.remove('is-held');
  if (demo) demo = null;
  pourBtn.hidden = true;
  corkBtn.hidden = false;
  instantBtn.setAttribute('aria-disabled', 'true');
  say(fullMessage());
  if (hadFocus) {
    if (spaceDown) pendingCorkFocus = true; else corkBtn.focus();
  }
}
function fullMessage() {
  return sim.fill() < 0.94
    ? '목까지 찼어요. 기울이거나 흔들면 빈자리로 모래가 내려가요. 이대로 막아도 돼요.'
    : '병이 가득 찼어요. 코르크로 막아요.';
}
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
  stopDemo();
  if (state.phase === 'corked' || sim.count === 0) return;
  const now = performance.now();
  if (now - lastShake < 450) return;
  lastShake = now;
  sim.shake(34, true);
  state.mixed = true;
  jiggle = { t0: now };
  sound.shake();
  say('위층을 흔들어 섞었어요.');
  kick();
}

function pourLayer() {
  stopDemo();
  if (state.phase !== 'filling') { if (state.phase === 'full') say(fullMessage()); return; }
  clearUndo();
  sim.dropStream();
  const amount = Math.round(sim.capacity / 12);
  const poured = sim.pourInstant(state.jar, amount, () => (sim.rand() - 0.5) * 4);
  if (poured > 0) noteLayer(state.jar);
  say(`${SANDS[state.jar].name} 한 층을 바로 쌓았어요.`);
  preloadFinish();
  if (poured < amount || sim.mouthBlocked() || sim.fill() > 0.992) setFull();
  blitAll();
  updateLabel();
}

function empty() {
  stopDemo();
  if (state.phase === 'corked' || sim.count === 0) return;
  undo = { snap: sim.snapshot(), layers: state.layers.slice(), mixed: state.mixed, phase: state.phase };
  pourSources.clear();
  pourBtn.classList.remove('is-held');
  sim.clear();
  state.layers = [];
  state.mixed = false;
  setFilling();
  say('병을 비웠어요.', true);
  clearTimeout(undoTimer);
  undoTimer = setTimeout(clearUndo, 6000);
  blitAll();
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
  blitAll();
  kick();
  updateLabel();
}

function setFilling() {
  state.phase = 'filling';
  pourBtn.hidden = false;
  corkBtn.hidden = true;
  instantBtn.removeAttribute('aria-disabled');
}

function blitAll() {
  sim.takeDirty();
  ctx.putImageData(image, 0, 0);
}

let finishing = 0;
async function corkIt() {
  if (state.phase !== 'full') return;
  stopDemo();
  sim.dropStream();
  sim.settle();
  state.phase = 'corked';
  if (state.sensor) stopSensors(false);
  sensorCard.hidden = true;
  state.tilt = 0;
  state.shown = 0;
  sim.setTilt(0);
  sim.settle();
  blitAll();
  placeBottle();
  jarT = 0;
  placeJar();
  panelFill.hidden = true;
  panelFill.inert = true;
  panelDone.hidden = false;
  panelDone.inert = false;
  stage.classList.add('is-corked');
  corkImg.hidden = false;
  // the cork drops into the neck; under reduced motion it fades in where it sits instead (css)
  corkImg.classList.remove('is-in');
  void corkImg.offsetWidth;
  corkImg.classList.add('is-dropping');
  requestAnimationFrame(() => corkImg.classList.add('is-in'));
  setTimeout(() => sound.cork(), reduced ? 240 : 420);
  say('코르크로 막았어요. 창가에 세워 둘게요.');
  $('[data-save]').focus({ preventScroll: true });
  updateLabel();
  const ticket = ++finishing;
  try {
    await renderFinish(sim, finishCanvas, Math.ceil(CORK_SEAT));
    if (ticket !== finishing || state.phase !== 'corked') return;
    await new Promise((r) => setTimeout(r, 650));
    if (ticket !== finishing || state.phase !== 'corked') return;
    stage.classList.add('is-finished');
    say('햇빛 드는 창가에 세워 뒀어요. 사진으로 저장할 수 있어요.');
  } catch (e) {
    say('코르크로 막았어요. 창가 사진을 불러오지 못했어요. 연결을 확인하고 사진으로 저장을 눌러 보세요.');
  }
}

async function save() {
  try {
    let blob;
    if (stage.classList.contains('is-finished')) blob = await finishBlob(finishCanvas);
    else {
      await renderFinish(sim, finishCanvas, Math.ceil(CORK_SEAT));
      stage.classList.add('is-finished');
      blob = await finishBlob(finishCanvas);
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    a.href = url;
    a.download = `sand-bottle-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say('사진을 저장했어요. 이 기기 안에서 만들었고, 어디로도 보내지 않았어요.');
  } catch (e) {
    say('사진을 만들지 못했어요. 다시 눌러 주세요.');
  }
}

function newBottle() {
  finishing++;
  sim.clear();
  state.layers = [];
  state.mixed = false;
  setFilling();
  panelDone.hidden = true;
  panelDone.inert = true;
  panelFill.hidden = false;
  panelFill.inert = false;
  stage.classList.remove('is-corked', 'is-finished');
  corkImg.hidden = true;
  corkImg.classList.remove('is-in', 'is-dropping');
  say('새 병이에요. 모래를 골라 부어요.');
  pourBtn.focus({ preventScroll: true });
  blitAll();
  updateLabel();
  kick();
}

// ── sensors ──
function showTiltButtons(on) {
  for (const b of tiltBtns) b.hidden = !on;
  sensorStop.hidden = on;
}
async function startSensors() {
  stopDemo();
  sensorCard.hidden = true;
  sound.start();
  const res = await enableSensors({
    onTilt: (deg) => {
      if (state.phase === 'corked') return;
      const prev = state.shown;
      state.tilt = deg;
      state.shown = deg;
      if (Math.abs(deg - prev) > 0.3) kick();
    },
    onShake: shake,
  });
  if (res.ok) {
    state.sensor = res;
    store.set('sand.sensor', 'on');
    showTiltButtons(false);
    say(hint());
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

// ── sound toggle ──
function setSound(on, remember = true) {
  sound.setEnabled(on);
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.textContent = on ? '소리 켬' : '소리 끔';
  if (remember) store.set('sand.sound', on ? 'on' : 'off');
}

// ── input: buttons ──
for (const b of jarBtns) b.addEventListener('click', () => { stopDemo(); sound.start(); pickJar(Number(b.dataset.jar)); });

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
soundBtn.addEventListener('click', () => { const on = soundBtn.getAttribute('aria-pressed') !== 'true'; setSound(on); if (on) sound.start(); });
$('[data-save]').addEventListener('click', save);
$('[data-new]').addEventListener('click', newBottle);
$('[data-sensor-on]').addEventListener('click', startSensors);
$('[data-sensor-off]').addEventListener('click', () => {
  stopDemo();
  sensorCard.hidden = true;
  store.set('sand.sensor', 'off');
  say(hint());
  pourBtn.focus({ preventScroll: true });
});
sensorStop.addEventListener('click', () => stopSensors(true));

// tilt buttons: a click tilts 7 degrees; holding keeps tilting after a short wait
let tiltRepeat = 0;
let tiltHeld = false;
for (const b of tiltBtns) {
  const dir = Number(b.dataset.tilt);
  const stopRepeat = () => { clearTimeout(tiltRepeat); clearInterval(tiltRepeat); tiltRepeat = 0; };
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    stopDemo();
    stopRepeat();
    tiltHeld = false;
    tiltRepeat = setTimeout(() => {
      tiltHeld = true;
      tiltRepeat = setInterval(() => setTilt(state.tilt + dir * 3), 60);
    }, 350);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stopRepeat);
  b.addEventListener('click', () => {
    if (tiltHeld) { tiltHeld = false; return; }
    setTilt(state.tilt + dir * 7);
  });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ── input: dragging the bottle (tilt) and quick back-and-forth (shake) ──
let drag = null;
stage.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.sensor') || state.phase === 'corked') return;
  stopDemo();
  sound.start();
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already released */ }
  drag = { id: e.pointerId, x0: e.clientX, t0: state.tilt, lastX: e.clientX, dir: 0, turnX: e.clientX, turns: [] };
  stage.classList.add('is-dragging');
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  if (!state.sensor) setTilt(drag.t0 + dx * 0.3, false);
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
    if (onOtherButton) return;
    e.preventDefault();
    if (!e.repeat) { spaceDown = true; startPour('space'); }
    return;
  }
  if (e.key === 'Tab') return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    stopDemo();
    setTilt(state.tilt + (e.key === 'ArrowLeft' ? -5 : 5));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    stopDemo();
    setTilt(0);
  } else if ((e.key === 's' || e.key === 'S') && !e.repeat) {
    shake();
  } else if (/^[1-5]$/.test(e.key)) {
    stopDemo();
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
document.addEventListener('pointerdown', stopDemo, { capture: true });

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
new ResizeObserver(() => { layout(); }).observe(stage);

// ── start: a bottle already part-filled with swept layers, so the first screen shows what it does.
// The layers were poured once at build time (start.js). The opening pour plays under reduced
// motion too (BRIEF §000: calmer, not still); it lasts under 5 s and stops at the first touch.
panelDone.inert = true;
if (capture) window.__sand = { sim, state };
const soundPref = store.get('sand.sound');
setSound(soundPref !== 'off', false);
sim.loadRuns(START);
state.layers = START_LAYERS.slice();
blitAll();
layout();
updateLabel();

if (!capture) {
  say('모래가 흐르는 걸 보여 드릴게요. 화면을 누르면 바로 멈춰요.');
  demo = { t0: performance.now() + 500, pouring: false };
  kick();
} else {
  say(hint());
  offerSensors();
}

// a fixed bottle for the gallery's thumbnail and share image (only with ?capture)
if (capture) {
  window.sandCapture = (opts = {}) => {
    sim.loadRuns(STILL);
    state.layers = STILL_LAYERS.slice();
    // top it up to the brim with a few more swept layers
    for (let n = 0; opts.full && n < 30 && !sim.mouthBlocked(); n++) {
      const c = [2, 1, 5, 3, 4][n % 5];
      for (let j = 0; j < 6 && !sim.mouthBlocked(); j++) {
        sim.setTilt((n % 2 ? 1 : -1) * (16 - j * 6));
        sim.pourInstant(c, Math.round(sim.capacity / 150), () => (sim.rand() - 0.5) * 4, false);
      }
      sim.setTilt(0);
      sim.settle();
      noteLayer(c);
    }
    sim.setTilt(0);
    sim.settle();
    blitAll();
    pickJar(opts.jar || 2, false);
    if (opts.tilt) { state.tilt = opts.tilt; state.shown = opts.tilt; sim.setTilt(opts.tilt); }
    if (opts.cork) { setFull(); return corkIt(); }
    if (opts.pour) startPour('capture');
    updateLabel();
    kick();
    return null;
  };
}
