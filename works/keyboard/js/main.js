// 가락 65 — 페이지 동작
import { KEYS, BY_CODE, BY_ID } from './layout.js';
import { COLORWAYS, SWITCHES, LAYERS, PRICES } from './data.js';
import { createAudio, audioSupported } from './audio.js';
import { createTyping } from './typing.js';

const html = document.documentElement;
const RM = html.classList.contains('rm');
const GL = html.classList.contains('gl');
const MOTION = html.classList.contains('motion');
const CAPTURE = html.classList.contains('capture');
const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const won = (n) => n.toLocaleString('ko-KR');

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 동작 */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
};

const state = {
  colorway: 'meok',
  switchId: 'goyo',
  pressedAny: false,
  lastLetterAt: 0,
  step: -1,
};

let scene = null;
const audio = createAudio();

// ---------- 소리 ----------
const soundBtn = $('[data-sound]');
const soundLabel = $('[data-sound-label]');
const hintSoundBtn = $('[data-hint-sound]');

function setSound(on) {
  if (on) {
    try { audio.enable(); } catch (e) { soundUnavailable(); return; }
  } else audio.disable();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundLabel.textContent = on ? '켜짐' : '꺼짐';
  if (on) {
    audio.key(state.switchId, 'enter', 'down');
    audio.key(state.switchId, 'enter', 'up', 0.1);
    hintSoundBtn.hidden = true;
    if (state.pressedAny) setHint(TOUCH ? '스크롤하면 속을 열어 봅니다.' : '계속 쳐 보세요. 스크롤하면 속을 열어 봅니다.');
  }
}
function soundUnavailable() {
  soundBtn.disabled = true;
  soundLabel.textContent = '없음';
  soundBtn.title = '이 브라우저에서는 소리를 낼 수 없습니다';
}
if (!audioSupported()) soundUnavailable();
soundBtn.addEventListener('click', () => setSound(!audio.enabled));
hintSoundBtn.addEventListener('click', () => setSound(true));

// ---------- 안내(히어로) ----------
const hintText = $('[data-hint-text]');
const hintCap = $('[data-hint-cap]');
function setHint(t) { if (hintText.textContent !== t) hintText.textContent = t; }
const heroLead = $('[data-hero-lead]');
if (TOUCH) heroLead.textContent = '화면 속 키를 손가락으로 눌러 보세요. 진짜 키처럼 내려갔다 올라옵니다.';
if (!GL) heroLead.textContent = '알루미늄을 깎아 만든 65% 키보드입니다. 키를 누르면 아래 사양의 배열도에 같은 키가 표시됩니다.';

function capLabel(k) {
  if (k.id === 'space') return 'Space';
  if (k.mark) return '◆';
  return k.top || k.label || k.id;
}

const NAV_KEYS = new Set(['tab', 'lshift', 'rshift', 'lctrl', 'lalt', 'meta', 'hanyeong', 'hanja', 'fn', 'up', 'down', 'left', 'right', 'pgup', 'pgdn', 'end', 'del', 'esc', 'caps']);
function noteFirstPress(id) {
  if (state.pressedAny || NAV_KEYS.has(id)) return;
  state.pressedAny = true;
  if (!audio.enabled && !soundBtn.disabled) {
    setHint('좋아요. 소리도 들어 보세요.');
    hintSoundBtn.hidden = false;
  } else {
    setHint('스크롤하면 속을 열어 봅니다.');
  }
}

// ---------- 배열도(SVG) ----------
const mapSvg = $('[data-layoutmap]');
const mapKeys = new Map();
(function buildMap() {
  const u = 40, gap = 4, pad = 2;
  const W = 16 * u + pad * 2, H = 5 * u + pad * 2;
  mapSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const ns = 'http://www.w3.org/2000/svg';
  KEYS.forEach((k) => {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', `k${k.group === 'mod' ? ' mod' : ''}${k.group === 'accent' ? ' acc' : ''}`);
    const x = pad + k.x * u + gap / 2, y = pad + k.row * u + gap / 2;
    const w = k.w * u - gap, h = u - gap;
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('rx', 5);
    g.appendChild(r);
    const label = k.id === 'space' ? '' : k.mark ? '◆' : (k.top || k.label || '');
    if (label) {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', x + 7); t.setAttribute('y', y + 15);
      t.textContent = label;
      g.appendChild(t);
    }
    if (k.w !== 1) {
      const t2 = document.createElementNS(ns, 'text');
      t2.setAttribute('class', 'u');
      t2.setAttribute('x', x + w - 6); t2.setAttribute('y', y + h - 7); t2.setAttribute('text-anchor', 'end');
      t2.textContent = `${k.w}u`;
      g.appendChild(t2);
    }
    mapSvg.appendChild(g);
    mapKeys.set(k.id, g);
  });
  const title = document.createElementNS(ns, 'title');
  title.textContent = '가락 65 배열도';
  mapSvg.prepend(title);
})();

// ---------- 키 누름 (물리 키보드 + 화면) ----------
const held = new Set();
function keyDown(id, source) {
  const k = BY_ID.get(id);
  if (!k) return;
  if (held.has(id) && source === 'key') return;
  held.add(id);
  if (scene) scene.press(id);
  audio.key(state.switchId, id, 'down');
  const g = mapKeys.get(id);
  if (g) g.classList.add('is-down');
  hintCap.textContent = capLabel(k);
  hintCap.classList.add('is-down');
  noteFirstPress(id);
}
function keyUp(id) {
  if (!held.has(id)) return;
  held.delete(id);
  if (scene) scene.release(id);
  audio.key(state.switchId, id, 'up');
  const g = mapKeys.get(id);
  if (g) g.classList.remove('is-down');
  if (!held.size) hintCap.classList.remove('is-down');
}
function releaseAll() { [...held].forEach(keyUp); }

const NO_KEYUP = new Set(['Lang1', 'Lang2', 'HangulMode', 'HanjaMode', 'KanaMode']);
const INTERACTIVE = 'input, textarea, select, button, a[href], summary, [contenteditable], [tabindex]';

window.addEventListener('keydown', (e) => {
  const k = BY_CODE.get(e.code);
  if (!k) return;
  // 히어로에서 글자를 치는 중이면 스페이스로 페이지가 내려가지 않게 한다.
  // 포커스가 컨트롤 위에 있거나, 막 페이지에 들어와 스페이스로 스크롤하려는 경우는 그대로 둔다.
  const onControl = e.target instanceof Element && e.target.closest(INTERACTIVE);
  if (k.id !== 'space' && k.ko) state.lastLetterAt = performance.now();
  if (e.code === 'Space' && !onControl && scene && scene.slotName === 'main' && heroProgress() < 0.02
      && performance.now() - state.lastLetterAt < 1500 && !e.altKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
  }
  if (e.repeat) return;
  keyDown(k.id, 'key');
  if (NO_KEYUP.has(e.code)) setTimeout(() => keyUp(k.id), 140);
});
window.addEventListener('keyup', (e) => {
  const k = BY_CODE.get(e.code);
  if (e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight') { releaseAll(); return; }
  if (k) keyUp(k.id);
});
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

// ---------- 색 구성 ----------
const colorRadios = $$('input[name="colorway"]');
const formColorRadios = $$('input[name="fcolor"]');
function applyColorway(id, animate = true) {
  if (!COLORWAYS[id]) return;
  state.colorway = id;
  const c = COLORWAYS[id].css;
  html.style.setProperty('--accent', c.accent);
  html.style.setProperty('--on-accent', c.onAccent);
  html.style.setProperty('--accent-ink', c.accentInk);
  html.style.setProperty('--accent-deep', c.accentDeep);
  colorRadios.forEach((r) => { r.checked = r.value === id; });
  formColorRadios.forEach((r) => { r.checked = r.value === id; });
  if (scene) scene.setColorway(id, animate);
  updateSlotLabels();
}
colorRadios.forEach((r) => r.addEventListener('change', () => r.checked && applyColorway(r.value)));
formColorRadios.forEach((r) => r.addEventListener('change', () => r.checked && applyColorway(r.value)));

function updateSlotLabels() {
  const cw = COLORWAYS[state.colorway];
  const sw = SWITCHES[state.switchId];
  const colorSlot = $('[data-color-slot]');
  colorSlot.setAttribute('aria-label', `${cw.name} 색의 가락 65, ${sw.name} 스위치. 끌어서 돌려 볼 수 있습니다.`);
}

// ---------- 스위치 + 힘-거리 곡선 ----------
const curve = {
  svg: $('[data-curve-svg]'),
  press: $('[data-curve-press]'),
  release: $('[data-curve-release]'),
  grid: $('[data-curve-grid]'),
  marks: $('[data-curve-marks]'),
  dot: $('[data-curve-dot]'),
  name: $('[data-curve-name]'),
  spec: $('[data-curve-spec]'),
};
const PX = { x0: 64, x1: 616, y0: 352, y1: 24, maxMm: 4.2, maxGf: 100 };
const sx = (mm) => PX.x0 + (mm / PX.maxMm) * (PX.x1 - PX.x0);
const sy = (gf) => PX.y0 - (gf / PX.maxGf) * (PX.y0 - PX.y1);
const N = 72;

function sampleCurve(points) {
  // points 는 x 가 단조(증가 또는 감소). 매개변수 u 로 고르게 다시 뽑는다.
  const out = [];
  const total = [0];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    total.push(total[i - 1] + Math.hypot((bx - ax) * 40, (by - ay) * 1));
  }
  const L = total[total.length - 1];
  for (let s = 0; s < N; s++) {
    const d = (s / (N - 1)) * L;
    let i = 1;
    while (i < total.length - 1 && total[i] < d) i++;
    const t = (d - total[i - 1]) / Math.max(1e-6, total[i] - total[i - 1]);
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  return out;
}
const toPath = (pts) => 'M' + pts.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('L');

(function drawGrid() {
  const ns = 'http://www.w3.org/2000/svg';
  const add = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (text !== undefined) n.textContent = text;
    curve.grid.appendChild(n);
    return n;
  };
  for (let mm = 0; mm <= 4; mm++) {
    add('line', { x1: sx(mm), x2: sx(mm), y1: PX.y1, y2: PX.y0, class: mm === 0 ? 'axis' : '' });
    add('text', { x: sx(mm), y: PX.y0 + 22, 'text-anchor': 'middle' }, String(mm));
  }
  for (let gf = 0; gf <= 100; gf += 20) {
    add('line', { x1: PX.x0, x2: PX.x1, y1: sy(gf), y2: sy(gf), class: gf === 0 ? 'axis' : '' });
    add('text', { x: PX.x0 - 12, y: sy(gf) + 4, 'text-anchor': 'end' }, String(gf));
  }
  add('text', { x: PX.x1, y: PX.y0 + 44, 'text-anchor': 'end', class: 'axis-title' }, '누른 깊이 (mm)');
  add('text', { x: PX.x0 - 12, y: PX.y1 - 10, 'text-anchor': 'start', class: 'axis-title' }, '힘 (gf)');
})();

let curveNow = null;
let curveAnim = 0;
function setCurve(id, animate) {
  const sw = SWITCHES[id];
  const target = { press: sampleCurve(sw.press), release: sampleCurve(sw.release) };
  const from = curveNow;
  curveNow = target;
  cancelAnimationFrame(curveAnim);
  if (!from || !animate || RM) {
    curve.press.setAttribute('d', toPath(target.press));
    curve.release.setAttribute('d', toPath(target.release));
  } else {
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / 260);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const mix = (a, b) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * e, p[1] + (b[i][1] - p[1]) * e]);
      curve.press.setAttribute('d', toPath(mix(from.press, target.press)));
      curve.release.setAttribute('d', toPath(mix(from.release, target.release)));
      if (t < 1) curveAnim = requestAnimationFrame(step);
    };
    curveAnim = requestAnimationFrame(step);
  }
  // 표시점
  const ns = 'http://www.w3.org/2000/svg';
  curve.marks.replaceChildren();
  const mark = (mm, gf, label, above = true, anchor = 'start') => {
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', sx(mm)); l.setAttribute('x2', sx(mm)); l.setAttribute('y1', sy(gf)); l.setAttribute('y2', PX.y0);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', sx(mm)); c.setAttribute('cy', sy(gf)); c.setAttribute('r', 5.5);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', sx(mm) + (anchor === 'start' ? 10 : -10)); t.setAttribute('y', sy(gf) + (above ? -12 : 22));
    t.setAttribute('text-anchor', anchor);
    t.textContent = label;
    curve.marks.append(l, c, t);
  };
  const at = (pts, mm) => {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      if ((mm - ax) * (mm - bx) <= 0) return ay + (by - ay) * ((mm - ax) / ((bx - ax) || 1));
    }
    return 0;
  };
  if (sw.feel.bump) mark(0.5, sw.peakForce, `턱 ${sw.peakForce}gf`, true, 'start');
  if (sw.feel.click) mark(sw.feel.click, at(sw.press, 1.75), `딸깍 ${sw.feel.click.toFixed(1)}mm`, true, 'start');
  else mark(sw.actuation, at(sw.press, sw.actuation), `작동 ${sw.actuation.toFixed(1)}mm`, true, 'start');
  curve.name.textContent = sw.name;
  $$('[data-v]', curve.spec).forEach((n) => {
    const k = n.dataset.v;
    const v = sw[k];
    n.textContent = k === 'actuation' || k === 'travel' ? v.toFixed(1) : String(v);
  });
}

const switchRadios = $$('input[name="switch"]');
const formSwitchRadios = $$('input[name="fswitch"]');
function applySwitch(id, animate = true) {
  state.switchId = id;
  switchRadios.forEach((r) => { r.checked = r.value === id; });
  formSwitchRadios.forEach((r) => { r.checked = r.value === id; });
  setCurve(id, animate);
  if (scene) scene.setSwitch(id, SWITCHES[id]);
  updateSlotLabels();
}
switchRadios.forEach((r) => r.addEventListener('change', () => r.checked && applySwitch(r.value)));
formSwitchRadios.forEach((r) => r.addEventListener('change', () => r.checked && applySwitch(r.value)));

// 들어 보기: 곡선 위 점이 타마다 내려갔다 올라온다
const listenBtn = $('[data-listen]');
const listenLabel = $('[data-listen-label]');
const listenIcon = $('[data-listen-icon] use');
let playing = false;
let dotAnim = 0;
function moveDot(pts, dur) {
  cancelAnimationFrame(dotAnim);
  if (RM) {
    const [x, y] = pts[pts.length - 1];
    curve.dot.setAttribute('cx', sx(x)); curve.dot.setAttribute('cy', sy(y));
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const t = clamp((now - t0) / dur);
    const i = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
    curve.dot.setAttribute('cx', sx(pts[i][0]));
    curve.dot.setAttribute('cy', sy(pts[i][1]));
    if (t < 1) dotAnim = requestAnimationFrame(step);
  };
  dotAnim = requestAnimationFrame(step);
}
function setListening(on) {
  playing = on;
  listenLabel.textContent = on ? '멈추기' : '소리 들어 보기';
  listenIcon.setAttribute('href', on ? '#i-stop' : '#i-play');
  curve.dot.classList.toggle('is-on', on);
}
listenBtn.addEventListener('click', async () => {
  if (playing) {
    audio.stopSample();
    releaseAll();
    setListening(false);
    return;
  }
  if (!audio.enabled) setSound(true);
  if (!audio.enabled) return;
  setListening(true);
  await audio.sample(state.switchId, (i, phase, id) => {
    if (!playing) return;
    if (phase === 'down') {
      moveDot(curveNow.press, 70);
      if (scene) scene.press(id);
      const g = mapKeys.get(id); if (g) g.classList.add('is-down');
    } else {
      moveDot(curveNow.release, 90);
      if (scene) scene.release(id);
      const g = mapKeys.get(id); if (g) g.classList.remove('is-down');
    }
  });
  setListening(false);
});

// ---------- 스크롤: 첫 화면과 분해 ----------
const intro = $('[data-intro]');
const hero = $('[data-hero]');
const explode = $('[data-explode]');
const explodeEnd = $('[data-explode-end]');
const layerItems = $$('[data-layer]');
const stepCount = $('[data-step-count]');
const stepBtns = $$('[data-step]');
const header = $('[data-header]');
const P_START = 0.3, P_END = 0.86;
const STEP = (P_END - P_START) / LAYERS.length;

function heroProgress() {
  if (!MOTION) return 0;
  const r = intro.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span > 0 ? clamp(-r.top / span) : 0;
}

function setStep(i, { fromScroll = false } = {}) {
  if (i === state.step) return;
  state.step = i;
  layerItems.forEach((li, n) => {
    li.classList.toggle('is-active', n === i);
    const b = li.querySelector('.layer__btn');
    if (b && !MOTION) b.setAttribute('aria-expanded', String(n === i));
  });
  const shown = i < 0 ? 1 : i + 1;
  stepCount.textContent = `${shown} / ${LAYERS.length}`;
  stepBtns[0].disabled = i <= 0;
  stepBtns[1].disabled = i >= LAYERS.length - 1;
  if (scene) scene.setActiveLayer(i, !fromScroll);
  updateTags();
}

function onScroll() {
  header.classList.toggle('is-solid', window.scrollY > 8);
  if (!MOTION) return;
  const p = heroProgress();
  if (scene) scene.setExplode(p);
  const heroFade = clamp((p - 0.006) / 0.06);
  hero.style.opacity = String(1 - heroFade);
  hero.style.transform = `translateY(${(-heroFade * 48).toFixed(1)}px)`;
  hero.style.visibility = heroFade >= 1 ? 'hidden' : '';
  const on = p > 0.1 && p < P_END + 0.015;
  if (explode.classList.contains('is-on') !== on) {
    explode.classList.toggle('is-on', on);
    stepBtns.forEach((b) => { b.tabIndex = on ? 0 : -1; });
  }
  explodeEnd.classList.toggle('is-on', p > 0.93);
  const stepping = p >= P_START - 0.01 && p < P_END + 0.015;
  const i = p >= P_END ? LAYERS.length - 1 : Math.floor((p - P_START) / STEP);
  setStep(stepping ? clamp(i, 0, LAYERS.length - 1) : -1, { fromScroll: true });
}
window.addEventListener('scroll', onScroll, { passive: true });

function scrollToStep(i) {
  const r = intro.getBoundingClientRect();
  const top = window.scrollY + r.top;
  const span = r.height - window.innerHeight;
  const p = P_START + (i + 0.5) * STEP;
  window.scrollTo({ top: top + span * p, behavior: RM ? 'auto' : 'smooth' });
}

stepBtns.forEach((b) => b.addEventListener('click', () => {
  const dir = Number(b.dataset.step);
  const cur = state.step < 0 ? 0 : state.step;
  const next = clamp(cur + dir, 0, LAYERS.length - 1);
  if (MOTION) scrollToStep(next);
  else setStep(next);
}));
const layerBtns = layerItems.map((li) => li.querySelector('.layer__btn'));
if (!MOTION) {
  stepCount.setAttribute('aria-live', 'polite');
  layerBtns.forEach((b, n) => b.addEventListener('click', () => setStep(n)));
  $('[data-explode-lead]').textContent = '층 이름을 누르면 그 층을 들어 올려 보여 드립니다.';
} else {
  // 스크롤 모드: 층 이름을 누르면(화면 낭독기 포함) 그 단계로 스크롤한다
  stepCount.removeAttribute('aria-live');
  layerBtns.forEach((b, n) => {
    b.tabIndex = -1;
    b.removeAttribute('aria-expanded');
    b.addEventListener('click', () => scrollToStep(n));
  });
  stepBtns.forEach((b) => { b.tabIndex = -1; });
}

// ---------- 지시선 ----------
const callouts = $('[data-callouts]');
const lines = $('[data-callout-lines]');
const SVGNS = 'http://www.w3.org/2000/svg';
const NARROW = matchMedia('(max-width: 860px)');
const tags = LAYERS.map((L, i) => {
  const t = document.createElement('div');
  t.className = 'tag';
  const no = document.createElement('span');
  no.className = 'num';
  no.textContent = String(i + 1);
  const nm = document.createElement('span');
  nm.className = 'tag__name';
  nm.textContent = L.name;
  t.append(no, nm);
  callouts.appendChild(t);
  const g = document.createElementNS(SVGNS, 'g');
  const pl = document.createElementNS(SVGNS, 'polyline');
  const c = document.createElementNS(SVGNS, 'circle');
  c.setAttribute('r', 2.6);
  g.append(pl, c);
  lines.appendChild(g);
  return { t, g, pl, c };
});

function updateTags() {
  tags.forEach((x, i) => {
    const a = i === state.step;
    x.t.classList.toggle('is-active', a);
    x.g.classList.toggle('is-active', a);
  });
}

function layoutCallouts() {
  if (!scene) return;
  const name = scene.slotName;
  const want = (name === 'main' && MOTION) || name === 'layers';
  if (!want) return;
  const slotEl = scene.slotEl;
  if (callouts.parentElement !== slotEl) slotEl.appendChild(callouts);
  const show = name === 'layers' || (scene.explode > P_START - 0.05 && scene.explode < P_END + 0.02);
  callouts.classList.toggle('is-on', show);
  if (!show) return;
  const anchors = scene.layerAnchors();
  if (!anchors) return;
  const W = slotEl.clientWidth;
  const narrow = NARROW.matches;
  const maxX = Math.max(...anchors.map((a) => a.x));
  const labelX = narrow ? 0 : Math.min(W - 150, maxX + 64);
  let prevY = -Infinity;
  anchors.forEach((a, i) => {
    const x = tags[i];
    let lx, ly = a.y;
    if (narrow) {
      lx = Math.min(W - 34, a.x + 22);
      ly = Math.max(a.y, prevY + 24);
    } else {
      lx = labelX;
      ly = Math.max(a.y, prevY + 30);
    }
    prevY = ly;
    x.t.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translateY(-50%)`;
    const elbow = narrow ? lx - 4 : lx - 22;
    x.pl.setAttribute('points', `${a.x.toFixed(1)},${a.y.toFixed(1)} ${elbow.toFixed(1)},${ly.toFixed(1)} ${(lx - 4).toFixed(1)},${ly.toFixed(1)}`);
    x.c.setAttribute('cx', a.x.toFixed(1));
    x.c.setAttribute('cy', a.y.toFixed(1));
  });
}

// ---------- 예약 ----------
const form = $('[data-form]');
const slip = $('[data-slip]');
const email = $('[data-email]');
const emailErr = $('[data-email-err]');
const totalEl = $('[data-total]');
const bareHint = $('[data-barebone-hint]');
const KEY = 'garak65-reservation';

function formValues() {
  const fd = new FormData(form);
  const kit = fd.get('kit');
  return {
    kit,
    color: fd.get('fcolor'),
    switch: kit === 'barebone' ? null : fd.get('fswitch'),
    total: PRICES[kit],
  };
}
function syncKit() {
  const v = formValues();
  totalEl.textContent = won(v.total);
  const bare = v.kit === 'barebone';
  formSwitchRadios.forEach((r) => { r.disabled = bare; });
  bareHint.hidden = !bare;
}
$$('input[name="kit"]').forEach((r) => r.addEventListener('change', syncKit));

function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
function showErr(msg) {
  emailErr.textContent = msg;
  emailErr.hidden = !msg;
  email.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true' && validEmail(email.value.trim())) showErr(''); });

function mask(s) {
  const [u, d] = s.split('@');
  return `${u.slice(0, 1)}${'*'.repeat(Math.max(2, u.length - 1))}@${d}`;
}
function showSlip(r, mail) {
  $('[data-slip-no]').textContent = r.no;
  $('[data-slip-kit]').textContent = r.kit === 'full' ? '완성품' : '베어본';
  $('[data-slip-color]').textContent = COLORWAYS[r.color].name;
  $('[data-slip-switch]').textContent = r.switch ? `${SWITCHES[r.switch].name} (${SWITCHES[r.switch].kind})` : '없음 (베어본)';
  $('[data-slip-total]').textContent = won(r.total);
  $('[data-slip-mail]').textContent = mail
    ? `출고 안내 메일은 ${mask(mail)} 주소로 보냅니다.`
    : '이메일 주소는 이 브라우저에도 저장하지 않았습니다.';
  form.hidden = true;
  slip.hidden = false;
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const mail = email.value.trim();
  if (!mail) { showErr('이메일을 적어 주세요. 출고 안내를 보낼 곳입니다.'); email.focus(); return; }
  if (!validEmail(mail)) { showErr('이메일 형식을 확인해 주세요. 예: name@example.com'); email.focus(); return; }
  showErr('');
  const v = formValues();
  const r = { ...v, no: `GR65-1-${String(1 + Math.floor(Math.random() * 300)).padStart(4, '0')}` };
  store.set(KEY, r);
  showSlip(r, mail);
  slip.focus();
});
$('[data-slip-reset]').addEventListener('click', () => {
  store.del(KEY);
  slip.hidden = true;
  form.hidden = false;
  email.value = '';
  form.querySelector('input[name="kit"]:checked').focus();
});
(function restore() {
  const r = store.get(KEY);
  if (r && r.no && COLORWAYS[r.color] && PRICES[r.kit]) showSlip(r, null);
})();
syncKit();

// ---------- 타건 테스트 ----------
createTyping($('[data-typer]'));

// ---------- 3D ----------
async function initScene() {
  if (!GL) return;
  let mod;
  try {
    mod = await import('./scene.js');
  } catch (e) {
    console.warn('3D 모듈을 불러오지 못했습니다', e);
    fallbackToStatic();
    return;
  }
  const fonts = { latin: '"Archivo", "Wanted Sans", sans-serif', hangul: '"Wanted Sans", sans-serif' };
  const loaded = Promise.all([
    document.fonts.load('600 40px "Wanted Sans"', 'ㅂ가'),
    document.fonts.load('600 40px "Archivo"', 'A1'),
  ]);
  let fontsReady = false;
  await Promise.race([loaded.then(() => { fontsReady = true; }), new Promise((r) => setTimeout(r, 2500))]);
  try {
    scene = await mod.createScene({
      reducedMotion: RM,
      capture: CAPTURE,
      still: (/[?&]still=(main|layers)/.exec(location.search) || [])[1],
      colorway: state.colorway,
      switchId: state.switchId,
      fonts,
      onKeyPointer: (id, down) => (down ? keyDown(id, 'pointer') : keyUp(id)),
    });
  } catch (e) {
    console.warn('WebGL 을 시작하지 못했습니다', e);
    fallbackToStatic();
    return;
  }
  if (!fontsReady) loaded.then(() => scene.repaintLegends());
  if (/[?&]debug\b/.test(location.search)) window.__scene = scene;
  scene.setSwitch(state.switchId, SWITCHES[state.switchId]);
  $$('[data-slot]').forEach((el) => scene.registerSlot(el, el.dataset.slot));
  scene.onFrame(layoutCallouts);
  const jump = /[?&]p=([\d.]+)/.exec(location.search);
  if (jump && MOTION) {
    const r = intro.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top + (r.height - window.innerHeight) * Number(jump[1]));
  }
  const at = /[?&]at=([a-z]+)/.exec(location.search);
  if (at) document.getElementById(at[1])?.scrollIntoView();
  onScroll();
  scene.setExplode(heroProgress(), true);
  if (!MOTION) setStep(0);
  // 첫 프레임 뒤에 다른 무대도 미리 그려 둔다
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scene.pickSlot();
    setTimeout(() => {
      scene.snapshotAll();
      html.classList.add('gl-ready');
      window.__garakReady = true;
    }, 60);
    if (!CAPTURE && !RM && heroProgress() < 0.02) setTimeout(() => scene.intro(), 300);
  }));

  // 히어로 시차
  if (!RM && !TOUCH) {
    window.addEventListener('pointermove', (e) => {
      if (scene.slotName !== 'main' || heroProgress() > 0.05) return;
      scene.setPointer((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
    }, { passive: true });
  }
}

function fallbackToStatic() {
  html.classList.remove('gl', 'motion');
  heroLead.textContent = '알루미늄을 깎아 만든 65% 키보드입니다. 키를 누르면 아래 사양의 배열도에 같은 키가 표시됩니다.';
  onScroll();
  setStep(0);
}

// ---------- 시작 ----------
applySwitch(state.switchId, false);
applyColorway(state.colorway, false);
onScroll();
if (!MOTION) setStep(0);
initScene();
