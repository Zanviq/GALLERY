// 칼퇴 결재: the game loop, judging, lesson, round and the work log.
import { makeImpression, hitStyle, rng } from './ink.js';
import { buildDoc, ROW_Y, BOXES, scribble } from './docs.js';
import { SEAL_RIM, SEAL_GLYPHS, SEAL_CLIP_R } from './seal-data.js';
import * as sfx from './audio.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const desk = $('desk');
const tray = $('tray');
const belt = $('belt');
const ticksEl = $('ticks');
const stampEl = $('stamp');
const memoEl = $('memo');
const live = $('live');
const clockEl = $('clock');
const clockLeft = $('clock-left');
const pressBtn = $('press');
const sheets = { cover: $('cover'), pause: $('pause'), log: $('log') };

// ---------------------------------------------------------------- storage (optional)
const KEY = 'stamp.v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* records live for this visit only */ } }

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const settings = {
  slow: !!store.slow,
  step: typeof store.step === 'boolean' ? store.step : reduceMQ.matches,
  sound: typeof store.sound === 'boolean' ? store.sound : true,
};
sfx.setMuted(!settings.sound);

// ---------------------------------------------------------------- the seal as an SVG symbol for the small pictures
document.querySelector('svg.defs defs').insertAdjacentHTML('beforeend',
  `<clipPath id="seal-clip"><circle cx="50" cy="50" r="${SEAL_CLIP_R}"/></clipPath>` +
  `<symbol id="seal-mark" viewBox="0 0 100 100"><path fill="#C8102E" d="${SEAL_RIM}"/><path fill="#C8102E" clip-path="url(#seal-clip)" d="${SEAL_GLYPHS}"/></symbol>`);

// ---------------------------------------------------------------- geometry
const geo = { bw: 0, bh: 0, dw: 0, u: 0, aimX: 0, aimY: 0, top: 0, imp: 0, drop: 0 };
const stageEl = $('stage');
function layout() {
  const wide = innerWidth >= 960;
  // the stamp zone (0.36 dw + 22) and the tray (1.3 dw + 2 pad) share the stage height;
  // measure the stage at full stretch, then shrink it to what it holds so the rest of the
  // height goes around it (memo above, 꾹 button at the thumb)
  stageEl.style.flex = '';
  stageEl.style.height = '';
  tray.style.height = '';
  const sh = stageEl.clientHeight;
  const sw = stageEl.clientWidth;
  const pad = sh < 420 ? 8 : 14;
  let dw = Math.min((sh - 22 - pad * 2) / 1.66, sw * (wide ? 0.3 : 0.6), 300);
  dw = Math.max(100, Math.floor(dw));
  geo.dw = dw;
  geo.u = dw / 100;
  geo.bw = sw;
  geo.bh = Math.round(dw * 1.3 + pad * 2);
  tray.style.height = geo.bh + 'px';
  stageEl.style.flex = '0 0 auto';
  stageEl.style.height = Math.round(dw * 0.36 + 22 + geo.bh) + 'px';
  geo.top = pad;
  geo.aimX = Math.round(geo.bw * (wide ? 0.27 : 0.31));
  geo.aimY = geo.top + ROW_Y * geo.u;
  geo.imp = 15 * geo.u;
  geo.drop = 12 + geo.aimY + geo.imp * 0.3;
  const s = app.style;
  s.setProperty('--u', geo.u + 'px');
  s.setProperty('--aim-x', geo.aimX + 'px');
  s.setProperty('--aim-y', geo.aimY + 'px');
  s.setProperty('--imp', geo.imp + 'px');
  s.setProperty('--drop', geo.drop + 'px');
}

// ---------------------------------------------------------------- game state
const ROUND = 75;
const SPEED_PTS = [[0, 55], [15, 62], [35, 74], [55, 87], [75, 100]]; // units per second
const G = {
  state: 'cover', prev: null, mode: 'round',
  offset: 0, v: 0, docs: [], nextX: 0, elapsed: 0, last: 0, grace: 0, stepAcc: 0,
  readyT: 0, closeT: 0, cooldown: 0, rand: rng(1), lastKind: [], seen: new Set(),
  streak: 0, maxStreak: 0, score: 0, done: 0,
  c: null, lesson: null, clockSec: -1, nextDoc: null, raf: 0, roundKey: 'normal',
};
const freshCounts = () => ({ perfect: 0, good: 0, miss: 0, wrong: 0, twice: 0, late: 0, air: 0, banKept: 0, banHit: 0 });
G.c = freshCounts();

const q10 = (x) => Math.ceil((x - 2) / 10) * 10 + 2; // world x with targets on the 10-unit grid
const lerpPts = (pts, t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
  }
  return pts[pts.length - 1][1];
};
function stepInterval() {
  const base = G.mode === 'lesson' ? 0.34 : 0.25 - 0.07 * Math.min(1, G.elapsed / ROUND);
  return base * (settings.slow && G.mode !== 'lesson' ? 1.3 : 1);
}
function speedNow() {
  if (G.mode === 'lesson') return 36;
  return lerpPts(SPEED_PTS, G.elapsed) * (settings.slow ? 0.7 : 1);
}
function effSpeed() { return settings.step ? 10 / stepInterval() : G.v; }
function tolerance() {
  if (settings.step) return { p: 0.6, g: 10.5 };
  const v = effSpeed();
  return { p: Math.max(2.8, v * 0.045), g: Math.min(Math.max(7, v * 0.11), 9.5) };
}

// ---------------------------------------------------------------- documents on the belt
function addDoc(spec, worldX) {
  const d = buildDoc(spec, G.rand);
  d.worldX = worldX;
  d.rot = (G.rand() - 0.5) * 0.7;
  d.resolved = false;
  d.dirty = false;
  belt.appendChild(d.el);
  G.docs.push(d);
  placeDoc(d);
  return d;
}
function clearDocs() {
  for (const d of G.docs) d.el.remove();
  G.docs = [];
  belt.querySelectorAll('.air-mark').forEach((n) => n.remove());
}
function placeDoc(d) {
  const x = geo.aimX + (d.worldX - G.offset) * geo.u;
  d.sx = x;
  d.el.style.transform = `translate3d(${x.toFixed(2)}px, ${geo.top}px, 0) rotate(${d.rot.toFixed(2)}deg)`;
}

const PHASES = [
  { until: 15, gap: [22, 40], w: { g1: 100 } },
  { until: 35, gap: [18, 34], w: { g1: 68, jj: 32 } },
  { until: 55, gap: [14, 30], w: { g1: 44, jj: 20, gn: 20, br: 16 } },
  { until: 99, gap: [10, 24], w: { g1: 30, g2: 18, jj: 18, gn: 18, br: 16 } },
];
function pickSpec(ph) {
  const w = { ...ph.w };
  const [a, b] = G.lastKind;
  if (a === 'br') delete w.br; // never two 반려 in a row
  if (a && a === b && a !== 'g1') delete w[a];
  const total = Object.values(w).reduce((s, x) => s + x, 0);
  let r = G.rand() * total, k = 'g1';
  for (const [key, x] of Object.entries(w)) { if ((r -= x) <= 0) { k = key; break; } }
  G.lastKind = [k, a];
  if (k === 'g1') return { kind: 'gyeoljae', boxes: [Math.floor(G.rand() * 3)] };
  if (k === 'g2') { const s = Math.floor(G.rand() * 2); return { kind: 'gyeoljae', boxes: [s, s + 1] }; }
  if (k === 'jj') return { kind: 'jeongjeong' };
  if (k === 'gn') return { kind: 'ganin' };
  return { kind: 'banryeo' };
}
function spawnRound() {
  const ahead = (geo.bw - geo.aimX) / geo.u + 140;
  while (G.nextX < G.offset + ahead) {
    const v = Math.max(20, G.v);
    const tArrive = G.elapsed + (G.nextX + 50 - G.offset) / v;
    if (tArrive > ROUND + 2) { G.nextX = Infinity; break; }
    const ph = PHASES.find((p) => tArrive < p.until);
    const spec = pickSpec(ph);
    const ext0 = spec.kind === 'ganin' ? -32 : 0;
    const x = q10(G.nextX - ext0);
    addDoc(spec, x);
    const gap = ph.gap[0] + G.rand() * (ph.gap[1] - ph.gap[0]);
    G.nextX = x + 100 + gap;
  }
}

// ---------------------------------------------------------------- HUD
const fmt = (n) => n.toLocaleString('ko-KR');
function setClock(sec) {
  const s = Math.max(0, Math.min(ROUND, Math.floor(sec)));
  if (s === G.clockSec) return;
  G.clockSec = s;
  const total = 17 * 3600 + 58 * 60 + 45 + s;
  const hh = Math.floor(total / 3600), mm = Math.floor((total % 3600) / 60), ss = total % 60;
  const str = `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  clockEl.innerHTML = [...str].map((ch) => `<span${ch === ':' ? ' class="colon"' : ''}>${ch}</span>`).join('');
  const left = ROUND - s;
  clockLeft.textContent = left > 0 ? `퇴근까지 ${left}초` : '퇴근';
  $('clock-wrap').classList.toggle('last', left <= 10 && left > 0);
}
function mult() { return 1 + Math.min(3, Math.floor(G.streak / 6)); }
function hud() {
  $('streak').textContent = G.streak;
  const m = mult();
  $('mult').textContent = m > 1 ? ` ×${m}` : '';
  $('score').textContent = fmt(G.score);
  $('done').textContent = G.done;
}
let memoText = '';
function memo(text, lesson = false) {
  if (text === memoText) return;
  memoText = text;
  memoEl.textContent = text;
  memoEl.classList.toggle('lesson', lesson);
  if (lesson && text) live.textContent = text;
}
const WORDS = {
  perfect: '정확!', good: '조금 비뚤', miss: '빗나감', wrong: '엉뚱한 칸', twice: '두 번 찍음',
  late: '놓침', air: '헛도장', banKept: '반려 지킴', banHit: '반려인데!',
};
const SAY = {
  perfect: '정확', good: '조금 비뚤', miss: '빗나감', wrong: '엉뚱한 칸에 찍음', twice: '같은 칸에 두 번 찍음',
  late: '놓침', air: '헛도장', banKept: '반려 서류를 깨끗하게 보냄', banHit: '반려 서류에 찍음',
};
function feed(kind, extra = '') {
  const w = $('feed-word');
  w.textContent = WORDS[kind] + (extra ? ` ${extra}` : '');
  w.dataset.kind = kind;
  w.classList.remove('pop');
  void w.offsetWidth;
  w.classList.add('pop');
}

// ---------------------------------------------------------------- marks on paper
function addMark(d, x, kind, y = 41) {
  // on a contract the word goes over both pages, so it is not cut at the seam
  const sheet = d.kind === 'ganin' ? { el: d.el, x0: 0 } : sheetFor(d, x);
  const m = document.createElement('span');
  m.className = `mark mark-${kind}`;
  m.textContent = WORDS[kind];
  m.style.setProperty('--x', (x - sheet.x0).toFixed(1));
  m.style.setProperty('--y', y);
  m.style.setProperty('--r', ((G.rand() - 0.5) * 8).toFixed(1) + 'deg');
  sheet.el.appendChild(m);
}
function sheetFor(d, x) {
  if (d.sheets.length === 1) return d.sheets[0];
  return x < 68 ? d.sheets.find((s) => s.x0 < 0) : d.sheets.find((s) => s.x0 === 0);
}
function impress(d, lx, ly, quality) {
  const st = hitStyle(G.rand, quality, settings.step ? 0 : effSpeed());
  const size = geo.imp;
  const { canvas, pad } = makeImpression({
    size, dpr: Math.min(3, devicePixelRatio || 1), seed: Math.floor(G.rand() * 1e9),
    press: st.press, tilt: st.tilt, tiltAngle: st.tiltAngle, rot: st.rot,
    smear: st.smear * geo.u, smearAngle: (-d.rot * Math.PI) / 180,
  });
  const half = (size / 2 + pad) / geo.u;
  const place = (sheet, c, seam) => {
    c.className = 'imp';
    // page 2 lies under page 1: it keeps only the half right of the seam
    if (seam != null) c.style.clipPath = `inset(0 0 0 ${Math.max(0, seam - (lx - half)).toFixed(2)}em)`;
    c.style.left = (lx - sheet.x0 - half).toFixed(2) + 'em';
    c.style.top = (ly - half).toFixed(2) + 'em';
    c.style.width = c.style.height = (half * 2).toFixed(2) + 'em';
    sheet.el.appendChild(c);
  };
  if (d.kind === 'ganin') {
    // the same impression on both pages; each page shows the half it carries
    const copy = document.createElement('canvas');
    copy.width = canvas.width; copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    place(d.sheets.find((s) => s.x0 < 0), canvas);
    place(d.sheets.find((s) => s.x0 === 0), copy, 68);
  } else {
    place(d.sheets[0], canvas);
  }
}

// ---------------------------------------------------------------- judging
function offsetAt(t) {
  if (settings.step || G.grace > 0) return G.offset;
  const dt = Math.max(-0.05, Math.min(0.05, (t - G.last) / 1000));
  return G.offset + G.v * dt;
}
function localPoint(d, off) {
  // aim point in the document's own frame, undoing its small rotation
  const x = geo.aimX + (d.worldX - off) * geo.u;
  const cx = x + 50 * geo.u, cy = geo.top + 65 * geo.u;
  const dx = geo.aimX - cx, dy = geo.aimY - cy;
  const a = (-d.rot * Math.PI) / 180;
  return { x: 50 + (Math.cos(a) * dx - Math.sin(a) * dy) / geo.u, y: 65 + (Math.sin(a) * dx + Math.cos(a) * dy) / geo.u };
}
const canStamp = () => G.state === 'playing' || G.state === 'lesson';

let lastKeyStamp = 0;
function press(t) {
  if (G.state === 'log' && !G.signed) { signLog(); return; }
  if (!canStamp()) return;
  const now = performance.now();
  if (now < G.cooldown) return;
  G.cooldown = now + 140;
  dropStamp();
  const off = offsetAt(t);
  const d = G.docs.find((x) => { const lx = off - x.worldX; return lx >= x.ext0 && lx <= x.ext1; });
  if (!d) {
    sfx.clink();
    airMark(off);
    return outcome('air', null);
  }
  const p = localPoint(d, off);
  if (d.kind === 'banryeo') {
    impress(d, p.x, p.y, 0);
    sfx.thump(0);
    if (!d.dirty) { d.dirty = true; addMark(d, p.x, 'banHit', 44); }
    return outcome('banHit', d);
  }
  const T = tolerance();
  let open = null, done = null;
  for (const tg of d.targets) {
    const dx = p.x - tg.u;
    if (!tg.status) { if (!open || Math.abs(dx) < Math.abs(open.dx)) open = { tg, dx }; }
    else if (!done || Math.abs(dx) < Math.abs(done.dx)) done = { tg, dx };
  }
  let kind;
  if (open && Math.abs(open.dx) <= T.g) {
    kind = Math.abs(open.dx) <= T.p ? 'perfect' : 'good';
    open.tg.status = kind;
  } else if (done && Math.abs(done.dx) <= T.g) {
    kind = 'twice';
  } else if (d.kind === 'gyeoljae' && p.x >= BOXES[0] && p.x <= BOXES[2] + 20) {
    kind = 'wrong';
  } else {
    kind = 'miss';
  }
  const quality = kind === 'perfect' ? 1 : kind === 'good' ? 0.5 : 0;
  impress(d, p.x, p.y, quality);
  sfx.thump(quality);
  const early = open && open.dx < 0;
  addMark(d, p.x, kind);
  if (d.kind === 'ganin' && (kind === 'perfect' || kind === 'good')) d.el.classList.add('split');
  outcome(kind, d, open && (kind === 'good' || kind === 'miss') ? (early ? '(일찍)' : '(늦게)') : '');
  checkResolved(d);
}
function airMark(off) {
  const m = document.createElement('span');
  m.className = 'air-mark';
  m.textContent = WORDS.air;
  m.dataset.x = off;
  belt.appendChild(m);
  m.style.transform = `translate(${geo.aimX}px, ${geo.aimY}px)`;
  setTimeout(() => m.remove(), 900);
}
function checkResolved(d) {
  if (d.resolved) return;
  if (d.kind === 'banryeo' || d.targets.every((t) => t.status)) {
    d.resolved = true;
    if (G.mode === 'round') { G.done++; hud(); }
    if (G.mode === 'lesson') lessonResolved(d);
  }
}
function outcome(kind, d, extra = '') {
  const good = kind === 'perfect' || kind === 'good' || kind === 'banKept';
  feed(kind, extra);
  if (G.mode === 'lesson') { G.lesson.last = kind; G.lesson.extra = extra; live.textContent = SAY[kind]; return; }
  G.c[kind]++;
  if (good) {
    const before = mult();
    G.streak++;
    G.maxStreak = Math.max(G.maxStreak, G.streak);
    const base = kind === 'perfect' ? 100 : kind === 'good' ? 40 : 60;
    G.score += base * mult();
    if (mult() > before) sfx.tap2();
  } else {
    G.streak = 0;
  }
  hud();
  live.textContent = `${SAY[kind]}. 연속 ${G.streak}.`;
}
function sweep() {
  const T = tolerance();
  for (const d of G.docs) {
    if (d.resolved) continue;
    const lx = G.offset - d.worldX;
    if (d.kind === 'banryeo') {
      if (lx > 100) {
        if (!d.dirty) outcome('banKept', d);
        checkResolved(d);
      }
      continue;
    }
    for (const tg of d.targets) {
      if (!tg.status && lx - tg.u > T.g) {
        tg.status = 'late';
        addMark(d, tg.u, 'late', 40);
        outcome('late', d);
      }
    }
    checkResolved(d);
  }
}

// ---------------------------------------------------------------- the stamp object
function dropStamp() {
  if (reduceMQ.matches) {
    stampEl.classList.add('down');
    setTimeout(() => stampEl.classList.remove('down'), 120);
    return;
  }
  stampEl.animate([
    { transform: 'translate(-50%, 0)' },
    { transform: `translate(-50%, ${geo.drop}px) scaleY(.96)`, offset: 0.26 },
    { transform: `translate(-50%, ${geo.drop}px) scaleY(.96)`, offset: 0.38 },
    { transform: 'translate(-50%, 0)' },
  ], { duration: 230, easing: 'cubic-bezier(.3,.7,.4,1)' });
}

// ---------------------------------------------------------------- lesson
const LESSON = [
  { spec: { kind: 'gyeoljae', boxes: [0] }, memo: '동그라미 친 칸이 도장 밑 점선 원에 들어오면 꾹! 화면을 톡, 또는 Space.', stop: true },
  { spec: { kind: 'gyeoljae', boxes: [0] }, memo: '이번엔 멈추지 않아요. 칸이 점선 원에 겹칠 때 꾹.' },
  { spec: { kind: 'gyeoljae', boxes: [1] }, memo: '동그라미 친 칸에만 찍어요. 이번엔 과장 칸.' },
  { spec: { kind: 'jeongjeong' }, memo: '숫자를 고친 서류엔 정정인. 두 줄 그은 숫자 한가운데에.' },
  { spec: { kind: 'ganin' }, memo: '계약서 두 장엔 간인. 겹친 이음매에 반씩 걸치게.' },
  { spec: { kind: 'banryeo' }, memo: '반려 서류는 찍지 말고 그냥 보내요.' },
];
function startLesson() {
  closeSheets();
  resetBoard('lesson');
  G.lesson = { i: 0, tries: 0, doc: null, wait: 0.5, last: null, hold: false };
  $('btn-skip').hidden = false;
  clockLeft.textContent = '연습 중';
  setState('lesson');
  live.textContent = '연습을 시작해요. ' + LESSON[0].memo;
  focusPress();
}
function lessonSpawn() {
  const L = G.lesson;
  const step = LESSON[L.i];
  const ext0 = step.spec.kind === 'ganin' ? -32 : 0;
  L.doc = addDoc(step.spec, q10(G.offset + (geo.bw - geo.aimX) / geo.u + 8 - ext0));
  L.last = null;
  $('feed-word').textContent = '';
  memo(step.memo, true);
}
function lessonTick(dt) {
  const L = G.lesson;
  if (L.wait > 0) {
    L.wait -= dt;
    if (L.wait <= 0) {
      if (L.i >= LESSON.length) { finishLesson(); return false; }
      lessonSpawn();
    }
    return true;
  }
  const step = LESSON[L.i];
  if (step.stop && L.doc && !L.doc.resolved && !L.doc.targets[0].status) {
    const at = L.doc.worldX + L.doc.targets[0].u;
    if (G.offset >= at) { G.offset = at; if (!L.hold) { L.hold = true; memo('지금 꾹!', true); } return false; }
  }
  return true;
}
function lessonResolved(d) {
  const L = G.lesson;
  if (d !== L.doc) return;
  const kinds = d.kind === 'banryeo' ? [d.dirty ? 'banHit' : 'banKept'] : d.targets.map((t) => t.status);
  const ok = kinds.every((k) => k === 'perfect' || k === 'good' || k === 'banKept');
  L.hold = false;
  if (ok) {
    const anyGood = kinds.includes('good');
    memo(anyGood ? '조금 비뚤었지만 통과. 한가운데를 노려 봐요.' : '좋아요, 정확해요!', true);
    L.i++; L.tries = 0;
    L.wait = 1.2;
    if (L.i >= LESSON.length) memo('연습 끝! 이제 진짜 결재예요. 18시까지 75초.', true);
  } else {
    const k = kinds.find((x) => !(x === 'perfect' || x === 'good' || x === 'banKept'));
    const why = k === 'banHit' ? '반려 서류는 깨끗하게 둬야 해요.'
      : k === 'late' ? '도장을 안 찍고 지나갔어요.'
      : k === 'wrong' ? '동그라미 친 칸이 아니에요.'
      : L.extra === '(일찍)' ? '조금 일찍 찍었어요. 칸이 점선 원 한가운데 올 때!'
      : '조금 늦었어요. 칸이 점선 원 한가운데 온 순간!';
    L.tries++;
    if (L.tries > 2) { memo(why + ' 괜찮아요, 다음 서류로.', true); L.i++; L.tries = 0; }
    else memo(why + ' 한 장 더 와요.', true);
    L.wait = 1.6;
  }
}
function finishLesson() {
  store.lessonDone = true;
  save();
  $('btn-skip').hidden = true;
  startRound();
}

// ---------------------------------------------------------------- round
function resetBoard(mode) {
  clearDocs();
  G.mode = mode;
  G.offset = 0; G.elapsed = 0; G.grace = 0; G.stepAcc = 0; G.cooldown = 0;
  G.streak = 0; G.maxStreak = 0; G.score = 0; G.done = 0; G.c = freshCounts();
  G.rand = rng((Math.random() * 1e9) | 0);
  G.lastKind = []; G.nextDoc = null; G.clockSec = -1; G.signed = false;
  stampEl.classList.remove('down');
  $('feed-word').textContent = '';
  hud();
  G.v = speedNow();
}
function startRound() {
  closeSheets();
  $('btn-skip').hidden = true;
  resetBoard('round');
  G.roundKey = settings.step ? 'step' : settings.slow ? 'slow' : 'normal';
  G.nextX = q10(G.v * 2.3 - 48);
  spawnRound();
  setClock(0);
  G.readyT = 1.3;
  memo('준비. 18시까지 75초.');
  live.textContent = '결재 시작. 18시까지 75초.';
  setState('ready');
  focusPress();
}
function nextLabel() {
  const T = tolerance();
  const d = G.docs.find((x) => !x.resolved && (x.kind === 'banryeo' ? G.offset - x.worldX <= 100 : x.targets.some((t) => !t.status && G.offset - x.worldX - t.u <= T.g)));
  if (d && d !== G.nextDoc) {
    G.nextDoc = d;
    const first = !G.seen.has(d.kind + (d.targets.length > 1 ? '2' : ''));
    G.seen.add(d.kind + (d.targets.length > 1 ? '2' : ''));
    memo(first && (d.kind !== 'gyeoljae' || d.targets.length > 1) ? `새 서류! ${d.label}` : `다음: ${d.label}`);
  }
}
function endRound() {
  setState('closing');
  G.closeT = 1.1;
  memo('18:00. 퇴근!');
  sfx.bell();
  live.textContent = '18시예요. 업무 일지가 나왔어요.';
}

// ---------------------------------------------------------------- frame loop
let inFrame = false;
function frame(t) {
  inFrame = true;
  try { step(t); } finally { inFrame = false; }
  G.raf = isRunning() ? requestAnimationFrame(frame) : 0;
}
function step(t) {
  const dt = Math.min(0.05, Math.max(0, (t - G.last) / 1000));
  G.last = t;
  let move = true;
  if (G.grace > 0) { G.grace -= dt; move = false; }
  if (G.state === 'ready') {
    G.readyT -= dt;
    move = false;
    if (G.readyT <= 0) { setState('playing'); G.seen = new Set(); }
  } else if (G.state === 'playing') {
    if (move) {
      G.elapsed += dt;
      setClock(G.elapsed);
      if (G.elapsed >= ROUND) { endRound(); }
    }
  } else if (G.state === 'lesson') {
    if (move) move = lessonTick(dt);
  } else if (G.state === 'closing') {
    G.closeT -= dt;
    G.v *= Math.pow(0.02, dt);
    if (G.closeT <= 0) { showLog(); render(); return; }
  }
  if (move && (G.state === 'playing' || G.state === 'lesson' || G.state === 'closing')) {
    if (G.state !== 'closing') G.v = speedNow();
    if (settings.step && G.state !== 'closing') {
      G.stepAcc += dt;
      const iv = stepInterval();
      while (G.stepAcc >= iv) {
        G.stepAcc -= iv;
        G.offset += 10;
        if (G.state === 'lesson') { const s = LESSON[G.lesson.i]; if (s && s.stop && G.lesson.doc) { const at = G.lesson.doc.worldX + G.lesson.doc.targets[0].u; if (G.offset > at && !G.lesson.doc.targets[0].status) G.offset = at; } }
        sfx.tick();
      }
    } else {
      G.offset += G.v * dt;
    }
    if (G.state === 'playing') { spawnRound(); sweep(); nextLabel(); }
    if (G.state === 'lesson') sweep();
  }
  render();
}
const isRunning = () => ['ready', 'playing', 'lesson', 'closing'].includes(G.state);
function render() {
  for (let i = G.docs.length - 1; i >= 0; i--) {
    const d = G.docs[i];
    placeDoc(d);
    if (d.sx < -geo.dw * 1.4 - 40 && (d.resolved || G.mode !== 'round')) { d.el.remove(); G.docs.splice(i, 1); }
    else if (!d.entered && d.sx < geo.bw) { d.entered = true; if (G.state !== 'cover') sfx.slide(); }
  }
  const period = geo.u * 50;
  ticksEl.style.backgroundPosition = `${(-(G.offset * geo.u) % period).toFixed(2)}px 0`;
  belt.querySelectorAll('.air-mark').forEach((m) => {
    m.style.transform = `translate(${(geo.aimX + (Number(m.dataset.x) - G.offset) * geo.u).toFixed(1)}px, ${geo.aimY}px)`;
  });
}
function loop() {
  if (!inFrame && !G.raf && isRunning()) { G.last = performance.now(); G.raf = requestAnimationFrame(frame); }
}

// ---------------------------------------------------------------- states, sheets, pause
function setState(s) {
  G.state = s;
  app.dataset.state = s;
  loop();
}
function inertBackground(on) {
  for (const el of [$('hud'), desk, document.querySelector('.rules')]) el.inert = on;
}
function openSheet(name, focusId) {
  for (const [k, el] of Object.entries(sheets)) el.hidden = k !== name;
  inertBackground(true);
  const f = $(focusId);
  if (f) f.focus();
}
function closeSheets() {
  for (const el of Object.values(sheets)) el.hidden = true;
  inertBackground(false);
}
function focusPress() { pressBtn.focus({ preventScroll: true }); }

function pause(why) {
  if (!['ready', 'playing', 'lesson'].includes(G.state)) return;
  G.prev = G.state;
  setState('paused');
  if (G.raf) { cancelAnimationFrame(G.raf); G.raf = 0; }
  $('pause-why').textContent = why || '시계도 트레이도 멈췄어요.';
  syncOptions();
  openSheet('pause', 'btn-resume');
}
function resume() {
  if (G.state !== 'paused') return;
  closeSheets();
  G.grace = 0.7;
  setState(G.prev || 'playing');
  focusPress();
}
function goHome() {
  closeSheets();
  resetBoard('round');
  setState('cover');
  coverScene();
  setClock(0);
  memo('');
  syncOptions();
  showRecords();
  openSheet('cover', 'btn-start');
}

// ---------------------------------------------------------------- work log
function showLog() {
  setState('log');
  const c = G.c;
  const rows = [
    ['결재 처리', `${G.done}건`],
    ['정확', `${c.perfect}번`],
    ['조금 비뚤', `${c.good}번`],
    ['빗나감', `${c.miss + c.wrong + c.twice}번`],
    ['놓침', `${c.late}번`],
    ['헛도장', `${c.air}번`],
    ['반려 지킴', `${c.banKept}장`],
    ['반려에 찍음', `${c.banHit}장`],
    ['최고 연속', `${G.maxStreak}번`],
  ];
  $('log-rows').innerHTML = rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');
  const now = new Date();
  $('log-date').textContent = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;
  $('log-mode').textContent = { normal: '보통 속도', slow: '느긋하게', step: '칸칸이 이동' }[G.roundKey];
  $('log-score').textContent = fmt(G.score);
  store.best = store.best || {};
  const prev = store.best[G.roundKey];
  const isNew = !prev || G.score > prev.score;
  if (isNew && G.score > 0) { store.best[G.roundKey] = { score: G.score, streak: G.maxStreak }; save(); }
  const best = store.best[G.roundKey];
  $('log-best').textContent = isNew && G.score > 0 ? '새 기록' : best ? `최고 ${fmt(best.score)}` : '';
  $('log-best').classList.toggle('is-new', isNew && G.score > 0);
  $('log-sign').setAttribute('d', scribble(rng(7), 4, 5, 52, 17));
  $('log-confirm').innerHTML = '';
  $('log-comment').hidden = true;
  $('btn-sign').hidden = false;
  $('btn-again').hidden = true;
  $('btn-home2').hidden = true;
  G.signed = false;
  showRecords();
  openSheet('log', 'btn-sign');
}
function signLog() {
  if (G.signed) return;
  G.signed = true;
  const cell = $('log-confirm');
  const size = Math.min(58, cell.clientWidth * 0.7);
  const r = rng((Math.random() * 1e9) | 0);
  const { canvas, pad } = makeImpression({ size, dpr: Math.min(3, devicePixelRatio || 1), seed: (r() * 1e9) | 0, press: 1.05, tilt: 0.45, tiltAngle: r() * 6.28, rot: (r() - 0.5) * 0.12 });
  canvas.className = 'log-imp';
  canvas.style.width = canvas.style.height = size + pad * 2 + 'px';
  cell.appendChild(canvas);
  sfx.thump(1);
  const c = G.c;
  const judged = c.perfect + c.good + c.miss + c.wrong + c.twice + c.late + c.banKept + c.banHit + c.air;
  const acc = judged ? (c.perfect + c.good * 0.6 + c.banKept) / judged : 0;
  const text = judged === 0 ? '오늘 결재가 한 장도 없네. 내일 보자.'
    : acc >= 0.9 ? '완벽해. 내일부터 도장은 구 대리 담당.'
    : acc >= 0.75 ? '깔끔하네. 칼퇴 인정.'
    : acc >= 0.5 ? '몇 장은 다시 찍자. 그래도 퇴근!'
    : '칸부터 보고 찍자. 내일 일찍 와.';
  const cm = $('log-comment');
  cm.textContent = text;
  cm.hidden = false;
  $('btn-sign').hidden = true;
  $('btn-again').hidden = false;
  $('btn-home2').hidden = false;
  $('btn-again').focus();
  live.textContent = `확인 도장을 찍었어요. 부장 한마디: ${text}`;
}

// ---------------------------------------------------------------- settings UI
function syncOptions() {
  for (const id of ['opt-slow', 'pause-slow']) $(id).setAttribute('aria-pressed', String(settings.slow));
  for (const id of ['opt-step', 'pause-step']) $(id).setAttribute('aria-pressed', String(settings.step));
  for (const id of ['opt-sound', 'pause-sound', 'btn-sound']) $(id).setAttribute('aria-pressed', String(settings.sound));
  app.classList.toggle('stepped', settings.step);
}
function toggle(name) {
  settings[name] = !settings[name];
  store[name] = settings[name];
  save();
  if (name === 'sound') { sfx.setMuted(!settings.sound); if (settings.sound) sfx.unlock(); }
  if (name === 'step') { G.stepAcc = 0; if (settings.step) G.offset = Math.round(G.offset / 10) * 10; }
  syncOptions();
  if (G.state === 'cover') showRecords();
}
function showRecords() {
  const key = settings.step ? 'step' : settings.slow ? 'slow' : 'normal';
  const b = store.best && store.best[key];
  const label = { normal: '보통 속도', slow: '느긋하게', step: '칸칸이 이동' }[key];
  const text = b ? `최고 기록 (${label}) ${fmt(b.score)}점, 최고 연속 ${b.streak}번` : `아직 기록이 없어요 (${label}).`;
  $('cover-record').textContent = text;
  $('cover-first').hidden = !!store.lessonDone;
  $('aside-record').textContent = text;
}

// ---------------------------------------------------------------- cover scene: two documents waiting on the tray
function coverScene() {
  clearDocs();
  G.offset = 0;
  G.rand = rng(20261109);
  const a = addDoc({ kind: 'gyeoljae', boxes: [1] }, q10(-62));
  const p = localPoint(a, 0);
  a.targets[0].status = 'perfect';
  impress(a, a.targets[0].u, p.y, 1);
  addMark(a, a.targets[0].u, 'perfect');
  a.resolved = true;
  addDoc({ kind: 'ganin' }, q10(80));
  addDoc({ kind: 'jeongjeong' }, q10(220));
  for (const d of G.docs) d.entered = true;
  render();
}

// the title sheet carries one firm impression, as if 구 대리 tried the stamp first
function coverSeal() {
  const box = $('cover-seal');
  const { canvas } = makeImpression({ size: 84, dpr: Math.min(3, devicePixelRatio || 1), seed: 1109, press: 1.06, tilt: 0.8, tiltAngle: 2.3, rot: 0.05 });
  box.replaceChildren(canvas);
}

// ---------------------------------------------------------------- input
function onStagePointer(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.target.closest('button') && e.target.closest('button') !== pressBtn) return;
  if (!canStamp()) return;
  e.preventDefault();
  sfx.unlock();
  press(e.timeStamp);
}
desk.addEventListener('pointerdown', onStagePointer);
pressBtn.addEventListener('click', (e) => {
  // keyboard and assistive-tech activation (pointer presses are handled on pointerdown)
  if (e.detail === 0 && performance.now() - lastKeyStamp > 250) { sfx.unlock(); press(performance.now()); }
});
for (const id of ['btn-sound', 'btn-pause']) {
  $(id).addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') e.preventDefault(); });
}
$('btn-sound').addEventListener('click', () => toggle('sound'));
$('btn-pause').addEventListener('click', () => (G.state === 'paused' ? resume() : pause()));
$('btn-skip').addEventListener('click', () => { store.lessonDone = true; save(); startRound(); });
$('btn-start').addEventListener('click', () => { sfx.unlock(); if (store.lessonDone) startRound(); else startLesson(); });
$('btn-lesson').addEventListener('click', () => { sfx.unlock(); startLesson(); });
$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', () => (G.prev === 'lesson' ? startLesson() : startRound()));
$('btn-home').addEventListener('click', goHome);
$('btn-sign').addEventListener('click', () => { sfx.unlock(); signLog(); });
$('btn-again').addEventListener('click', startRound);
$('btn-home2').addEventListener('click', goHome);
for (const [id, name] of [['opt-slow', 'slow'], ['pause-slow', 'slow'], ['opt-step', 'step'], ['pause-step', 'step'], ['opt-sound', 'sound'], ['pause-sound', 'sound']]) {
  $(id).addEventListener('click', () => toggle(name));
}

addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const code = e.code;
  if (code === 'KeyM') { sfx.unlock(); toggle('sound'); return; }
  if (code === 'KeyP') { e.preventDefault(); if (G.state === 'paused') resume(); else pause(); return; }
  if (e.key === 'Escape' && G.state === 'paused') { e.preventDefault(); resume(); return; }
  if ((e.key === ' ' || e.key === 'Enter') && (canStamp() || G.state === 'ready')) {
    const ae = document.activeElement;
    if (ae && ae !== pressBtn && ae !== document.body && ae.closest('button, a, input')) return;
    e.preventDefault();
    if (e.repeat) return;
    lastKeyStamp = performance.now();
    sfx.unlock();
    press(e.timeStamp);
  }
});
addEventListener('blur', () => pause('창을 벗어나서 멈췄어요.'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('다른 탭으로 가서 멈췄어요.'); });

let rz = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(rz);
  rz = requestAnimationFrame(() => { layout(); render(); });
});
reduceMQ.addEventListener('change', () => { if (typeof store.step !== 'boolean') { settings.step = reduceMQ.matches; syncOptions(); } });

// ---------------------------------------------------------------- boot
async function boot() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('20px "Hi Melody"'), document.fonts.load('20px "East Sea Dokdo"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (e) { /* system fallback */ }
  layout();
  syncOptions();
  showRecords();
  setClock(0);
  coverScene();
  coverSeal();
  hud();
  openSheet('cover', 'btn-start');
  app.classList.add('booted');
}
boot();

// for automated checks only (no effect on play)
window.__stamp = { G, geo, settings, press: (t) => press(t ?? performance.now()), startRound, startLesson };
