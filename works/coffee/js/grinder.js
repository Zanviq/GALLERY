// 얼마나 곱게 갈까요: brew method + 40-step grind dial + a pile of grounds that grows at that particle
// size + the recipe beside it. See design/works/coffee/INTERACTION.md.
import { GrinderSound } from './sound.js';

const root = document.getElementById('grinder');
if (root) init();

function init() {
  const $ = (id) => document.getElementById(id);
  const dial = $('dial');
  const knob = $('dial-knob');
  const valueText = $('dial-value');
  const imgsBox = $('pile-imgs');
  const imgs = [...root.querySelectorAll('.pile__img')];
  const canvas = $('specks');
  const ctx = canvas.getContext('2d');
  const scaleOut = $('scale');
  const sizeOut = $('pile-size');
  const soundBtn = $('sound');
  const soundState = $('sound-state');
  const soundNote = $('sound-note');
  const out = {
    title: $('recipe-title'), dose: $('r-dose'), water: $('r-water'), temp: $('r-temp'),
    time: $('r-time'), fit: $('r-fit'), how: $('r-how'), live: $('r-live'),
  };
  const radios = [...root.querySelectorAll('input[name="method"]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const MIN = 1, MAX = 40, SWEEP = 270;
  const STEP_DEG = SWEEP / (MAX - MIN);
  const mmss = (s) => {
    s = Math.round(s);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const METHODS = {
    espresso: {
      name: '에스프레소', lo: 3, hi: 8, best: 5, dose: 18, immersion: false,
      title: '에스프레소 한 잔', water: '36 g', temp: '93 °C', how: '바스켓에 고르게 담아 평평하게 누르고, 잔에 36 g이 모이면 멈춥니다.',
      time: (g) => `${Math.round(clamp(28 + (5 - g) * 2.5, 10, 45))}초`,
    },
    moka: {
      name: '모카포트', lo: 9, hi: 14, best: 11, dose: 15, immersion: false,
      title: '모카포트 한 주전자', water: '150 ml', temp: '끓인 물', how: '아래 칸에 끓인 물을 밸브 아래까지 붓고, 약불에 올려 꿀렁이는 소리가 나면 불을 끕니다.',
      time: (g) => mmss(clamp(270 + (11 - g) * 10, 150, 360)),
    },
    drip: {
      name: '핸드드립', lo: 16, hi: 24, best: 20, dose: 15, immersion: false,
      title: '핸드드립 한 잔', water: '240 g', temp: '92 °C', how: '뜸을 30초 들이고, 세 번에 나눠 붓습니다.',
      time: (g) => mmss(clamp(165 + (20 - g) * 8, 90, 270)),
    },
    press: {
      name: '프렌치프레스', lo: 27, hi: 33, best: 30, dose: 18, immersion: true,
      title: '프렌치프레스 두 잔', water: '300 g', temp: '94 °C', how: '물을 다 붓고 기다린 뒤, 위에 뜬 거품을 걷어 내고 천천히 누릅니다.',
      time: (g) => mmss(clamp(240 + (g - 30) * 12, 150, 330)),
    },
    cold: {
      name: '콜드브루', lo: 34, hi: 40, best: 37, dose: 60, immersion: true,
      title: '콜드브루 한 병', water: '600 g', temp: '찬물, 냉장', how: '찬물에 담가 냉장고에서 우리고, 종이 필터에 한 번 거릅니다.',
      time: (g) => `${clamp(Math.round((14 + (g - 37) * 0.75) * 2) / 2, 8, 18)}시간`,
    },
  };
  const ORDER = ['espresso', 'moka', 'drip', 'press', 'cold'];
  const ANCHORS = [['espresso', 5], ['moka', 11], ['drip', 20], ['press', 30], ['cold', 37]];
  const imgBy = Object.fromEntries(imgs.map((im) => [im.dataset.g, im]));

  const sizeLabel = (g) => (g <= 8 ? '아주 고움' : g <= 15 ? '고움' : g <= 25 ? '중간' : g <= 33 ? '굵음' : '아주 굵음');
  const microns = (g) => Math.round((150 + g * 32) / 10) * 10;
  const methodAt = (g) => ORDER.find((k) => g >= METHODS[k].lo && g <= METHODS[k].hi);
  const josa = (word, a, b) => {
    const c = word.charCodeAt(word.length - 1) - 0xac00;
    return word + (c >= 0 && c % 28 ? a : b);
  };
  function between(g) {
    let below = null, above = null;
    for (const k of ORDER) {
      if (METHODS[k].hi < g) below = k;
      if (METHODS[k].lo > g && !above) above = k;
    }
    return [below, above];
  }
  function describeFit(key, g) {
    const m = METHODS[key];
    if (g >= m.lo && g <= m.hi) return { ok: true, text: `${m.name}에 맞는 굵기입니다.` };
    const other = methodAt(g);
    const tail = other ? ` 이 굵기는 ${METHODS[other].name}에 맞습니다.` : '';
    if (g < m.lo) {
      return { ok: false, text: m.immersion
        ? `${m.name}에는 너무 곱습니다. 가루가 걸러지지 않고 쓴맛이 납니다.${tail}`
        : `${m.name}에는 너무 곱습니다. 물이 잘 빠지지 않아 쓰고 텁텁합니다.${tail}` };
    }
    return { ok: false, text: `${m.name}에는 너무 굵습니다. 덜 우러나 싱겁고 시큼합니다.${tail}` };
  }
  function grindName(g) {
    const k = methodAt(g);
    if (k) return METHODS[k].name;
    const [a, b] = between(g);
    if (a && b) return `${josa(METHODS[a].name, '과', '와')} ${METHODS[b].name} 사이`;
    return METHODS[a || b].name;
  }

  // ── dial drawing (ticks, numerals, method arcs) ─────────────────────
  const NS = 'http://www.w3.org/2000/svg';
  const angleOf = (v) => -SWEEP / 2 + (v - MIN) * STEP_DEG;
  const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [r * Math.sin(a), -r * Math.cos(a)];
  };
  const ticks = $('dial-ticks');
  for (let i = MIN; i <= MAX; i++) {
    const major = i === 1 || i % 5 === 0;
    const [x1, y1] = pt(150, angleOf(i));
    const [x2, y2] = pt(major ? 170 : 160, angleOf(i));
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1));
    l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1));
    if (major) l.classList.add('is-major');
    ticks.append(l);
    if (major) {
      const [tx, ty] = pt(188, angleOf(i));
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', tx.toFixed(1)); t.setAttribute('y', (ty + 6).toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.textContent = String(i);
      ticks.append(t);
    }
  }
  const arcs = $('dial-arcs');
  const arcEls = {};
  for (const k of ORDER) {
    const m = METHODS[k];
    const a0 = angleOf(m.lo - 0.4), a1 = angleOf(m.hi + 0.4);
    const [x0, y0] = pt(136, a0), [x1, y1] = pt(136, a1);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)} A136 136 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    arcs.append(p);
    arcEls[k] = p;
  }

  // ── state ───────────────────────────────────────────────────────────
  const sound = new GrinderSound();
  const state = {
    method: radios.find((r) => r.checked)?.value || 'drip',
    v: 20,          // continuous dial position
    g: 20,          // integer setting
    shown: 20,      // knob angle in steps (tweened)
    tween: null,    // { from, to, t0, dur }
    amount: 1,      // how much of the dose is on the scale, 0..1
    motorUntil: 0,
    userOff: false,
    touched: false,
    visible: false,
    demoDone: false,
  };
  let raf = 0, last = 0;
  let palette = ['#6b3d24', '#7d4b2c', '#55301b', '#8c5a38'];
  const palettes = {};

  // sample the grounds' own colours from each photograph for the falling specks
  function sample(im) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 40;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0, 40, 40);
      const d = x.getImageData(8, 8, 24, 24).data;
      const cols = [];
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        if (l < 165) cols.push(`rgb(${d[i]} ${d[i + 1]} ${d[i + 2]})`);
      }
      if (cols.length > 6) palettes[im.dataset.g] = cols;
    } catch (e) { /* keep the default palette */ }
  }
  for (const im of imgs) {
    if (im.complete && im.naturalWidth) sample(im);
    else im.addEventListener('load', () => sample(im), { once: true });
  }

  // ── rendering of the readouts ───────────────────────────────────────
  // the photograph nearest to the dial (boundaries half-way between anchors); CSS fades between them
  let shownKey = '';
  function setPhoto(v) {
    let key = ANCHORS[0][0];
    for (let i = 1; i < ANCHORS.length; i++) {
      if (v > (ANCHORS[i - 1][1] + ANCHORS[i][1]) / 2) key = ANCHORS[i][0];
    }
    if (palettes[key]) palette = palettes[key];
    if (key === shownKey) return;
    shownKey = key;
    for (const im of imgs) im.classList.toggle('is-on', im.dataset.g === key);
  }

  function render() {
    const m = METHODS[state.method];
    const g = state.g;
    const fit = describeFit(state.method, g);
    dial.setAttribute('aria-valuenow', String(g));
    const fitsAt = methodAt(g);
    dial.setAttribute('aria-valuetext', `${g}, ${sizeLabel(g)}, ${fitsAt ? `${METHODS[fitsAt].name}에 맞습니다` : `${grindName(g)} 굵기`}`);
    sizeOut.innerHTML = `${sizeLabel(g)}, 약 <span class="num">${microns(g)}</span>μm`;
    out.title.textContent = m.title;
    out.dose.textContent = `${m.dose} g`;
    out.water.textContent = m.water;
    out.temp.textContent = m.temp;
    out.time.textContent = m.time(g);
    out.fit.textContent = fit.text;
    out.fit.classList.toggle('is-off', !fit.ok);
    out.how.textContent = m.how;
    for (const k of ORDER) arcEls[k].classList.toggle('is-on', k === state.method);
    sound.setLoad(1 - (g - MIN) / (MAX - MIN));
    document.dispatchEvent(new CustomEvent('grind:change', { detail: { g, name: grindName(g) } }));
  }

  function drawKnob() {
    knob.setAttribute('transform', `rotate(${angleOf(state.shown).toFixed(2)})`);
    const shownG = String(Math.round(state.shown));
    if (valueText.textContent !== shownG) valueText.textContent = shownG;
    setPhoto(state.shown);
  }

  function drawPile() {
    const a = Math.min(1, state.amount);
    const r = 1 - Math.pow(1 - a, 2.2);
    imgsBox.style.setProperty('--r', r.toFixed(3));
    imgsBox.classList.toggle('is-growing', a < 1);
    scaleOut.textContent = (METHODS[state.method].dose * a).toFixed(1);
  }

  // ── setting the dial ────────────────────────────────────────────────
  function setValue(v, { tween = 0 } = {}) {
    v = Math.min(MAX, Math.max(MIN, v));
    const g = Math.round(v);
    state.v = v;
    if (tween) {
      state.tween = { from: state.shown, to: v, t0: performance.now(), dur: tween };
    } else {
      state.tween = null;
      state.shown = v;
    }
    if (g !== state.g) {
      const steps = Math.abs(g - state.g);
      state.g = g;
      if (!tween) { sound.tick(); if (steps > 1) setTimeout(() => sound.tick(), 18); }
      render();
    }
    runMotor(tween ? tween + 350 : 420);
    wake();
  }

  function runMotor(ms) {
    state.motorUntil = Math.max(state.motorUntil, performance.now() + ms);
    sound.start();
  }

  function chooseMethod(key, { fromUser = true } = {}) {
    state.method = key;
    const m = METHODS[key];
    for (const r of radios) r.checked = r.value === key;
    state.amount = 0;
    const dist = Math.abs(m.best - state.v);
    const dur = Math.min(1100, 260 + dist * 26) * (reduce.matches ? 1.4 : 1);
    if (Math.round(m.best) === state.g) render();
    setValue(m.best, { tween: dur });
    runMotor(Math.max(dur + 300, 1700));
    if (fromUser) {
      out.live.textContent = `${m.title}: 원두 ${m.dose} g, 물 ${m.water}, ${m.temp}, 눈금 ${m.best}.`;
    }
    drawPile();
  }

  // ── animation loop: knob tween, pile growth, specks ─────────────────
  const specks = [];
  let carry = 0;
  function wake() {
    if (!raf && state.visible && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const calm = reduce.matches ? 0.6 : 1;

    if (state.tween) {
      const { from, to, t0, dur } = state.tween;
      const p = Math.min(1, (now - t0) / dur);
      const e = reduce.matches ? p : 1 - Math.pow(1 - p, 3);
      const prev = Math.round(state.shown);
      state.shown = from + (to - from) * e;
      if (Math.round(state.shown) !== prev) sound.tick();
      if (p >= 1) state.tween = null;
    }
    drawKnob();

    const running = now < state.motorUntil;
    if (!running && sound.running) sound.stop();
    if (running && state.amount < 1) {
      state.amount = Math.min(1, state.amount + dt / 1.5);
      drawPile();
    }

    // specks: grounds landing on the pile, seen from above
    const W = canvas.width, H = canvas.height;
    if (running) {
      const fine = 1 - (state.shown - MIN) / (MAX - MIN);
      carry += dt * (36 + 70 * fine) * calm;
      while (carry >= 1) {
        carry -= 1;
        const a = Math.random() * Math.PI * 2;
        const r0 = Math.sqrt(Math.random()) * 0.16 * (0.4 + 0.6 * Math.min(1, state.amount + 0.2));
        specks.push({
          x: 0.5 + Math.cos(a) * r0, y: 0.5 + Math.sin(a) * r0,
          vx: Math.cos(a) * (0.02 + Math.random() * 0.09) * calm, vy: Math.sin(a) * (0.02 + Math.random() * 0.09) * calm,
          life: 0, max: 0.35 + Math.random() * 0.45,
          s: (1.3 + 3.4 * (1 - fine)) * (0.6 + Math.random() * 0.8),
          rot: Math.random() * Math.PI,
          c: palette[(Math.random() * palette.length) | 0],
        });
      }
    }
    ctx.clearRect(0, 0, W, H);
    if (specks.length) {
      const unit = W / 520; // speck sizes are given for a 520px-wide pile
      for (let i = specks.length - 1; i >= 0; i--) {
        const p = specks[i];
        p.life += dt;
        if (p.life >= p.max) { specks.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.9; p.vy *= 0.9;
        const k = p.life / p.max;
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45);
        ctx.fillStyle = p.c;
        const s = p.s * unit * (k < 0.15 ? 1.6 - 0.6 * (k / 0.15) : 1);
        ctx.save();
        ctx.translate(p.x * W, p.y * H);
        ctx.rotate(p.rot);
        ctx.fillRect(-s / 2, -s / 2.6, s, s / 1.3);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    if (state.tween || running || specks.length || state.amount < 1 && running) {
      raf = requestAnimationFrame(frame);
    }
  }

  // ── sound on / off ──────────────────────────────────────────────────
  function showSound() {
    soundBtn.setAttribute('aria-pressed', String(sound.on));
    soundState.textContent = sound.on ? '켜짐' : '꺼짐';
    soundNote.textContent = !sound.available
      ? '이 브라우저에서는 소리를 낼 수 없습니다.'
      : sound.on ? '다이얼을 돌리면 그라인더가 돕니다.'
        : state.userOff ? '소리를 껐습니다.' : '다이얼을 처음 잡으면 그라인더 소리가 켜집니다.';
  }
  function gesture() {
    state.touched = true;
    if (!state.userOff && !sound.on && sound.ensure()) {
      sound.setOn(true);
      showSound();
    } else if (sound.on) {
      sound.ensure();
    }
  }
  if (!sound.available) soundBtn.disabled = true;
  soundBtn.addEventListener('click', () => {
    if (sound.on) {
      sound.setOn(false);
      state.userOff = true;
    } else if (sound.ensure()) {
      state.userOff = false;
      sound.setOn(true);
      setTimeout(() => runMotor(650), 60);
      wake();
    }
    showSound();
  });

  // ── input: methods ──────────────────────────────────────────────────
  for (const r of radios) {
    r.addEventListener('change', () => { if (r.checked) { gesture(); chooseMethod(r.value); } });
    r.closest('label').addEventListener('pointerdown', gesture);
  }

  // ── input: drag ─────────────────────────────────────────────────────
  let drag = null;
  dial.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    gesture();
    const r = dial.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    drag = { id: e.pointerId, cx, cy, R: r.width / 2, ang: Math.atan2(dx, -dy), x: e.clientX, y: e.clientY, v: state.v };
    dial.setPointerCapture(e.pointerId);
    dial.classList.add('is-drag');
    dial.focus({ preventScroll: true });
    state.tween = null;
    state.shown = state.v;
    e.preventDefault();
  });
  dial.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
    const dist = Math.hypot(dx, dy);
    let dv;
    if (dist > drag.R * 0.28) {
      const ang = Math.atan2(dx, -dy);
      let d = ang - drag.ang;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      drag.ang = ang;
      dv = (d * 180) / Math.PI / STEP_DEG;
    } else {
      dv = ((e.clientX - drag.x) - (e.clientY - drag.y)) / 9;
    }
    drag.x = e.clientX; drag.y = e.clientY;
    setValue(state.v + dv);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    dial.classList.remove('is-drag');
    setValue(Math.round(state.v));
  };
  dial.addEventListener('pointerup', endDrag);
  dial.addEventListener('pointercancel', endDrag);

  // ── input: wheel (only when the wheel started on the dial, not mid page-scroll) ──
  let lastScroll = 0, wheelAcc = 0;
  addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  dial.addEventListener('wheel', (e) => {
    if (performance.now() - lastScroll < 250) return;
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    wheelAcc += d;
    const steps = Math.trunc(wheelAcc / 40);
    if (steps) {
      wheelAcc -= steps * 40;
      if (sound.on) sound.ensure();
      setValue(Math.round(state.v) - steps);
    }
  }, { passive: false });

  // ── input: keyboard ─────────────────────────────────────────────────
  dial.addEventListener('keydown', (e) => {
    const k = e.key;
    let v = null;
    if (k === 'ArrowRight' || k === 'ArrowUp') v = state.g + 1;
    else if (k === 'ArrowLeft' || k === 'ArrowDown') v = state.g - 1;
    else if (k === 'PageUp') v = state.g + 5;
    else if (k === 'PageDown') v = state.g - 5;
    else if (k === 'Home') v = MIN;
    else if (k === 'End') v = MAX;
    if (v === null) return;
    e.preventDefault();
    gesture();
    setValue(v);
  });

  // ── visibility: run only on screen and in a visible tab ─────────────
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      state.visible = en.isIntersecting;
      if (state.visible) {
        sizeCanvas();
        if (!state.demoDone && en.intersectionRatio >= 0.35) demo();
        else if (state.amount < 1) runMotor(1500 * (1 - state.amount) + 200);
        wake();
      } else {
        state.motorUntil = 0;
        sound.stop(true);
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }
    }
  }, { threshold: [0, 0.35] });
  io.observe(root);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.motorUntil = 0;
      sound.stop(true);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } else wake();
  });
  addEventListener('resize', () => { if (state.visible) sizeCanvas(); });

  // first time the section is on screen: grind one dose so it is clear the pile is made here
  function demo() {
    state.demoDone = true;
    if (state.touched) return;
    state.amount = 0;
    drawPile();
    state.shown = 14;
    state.v = 14;
    const dur = reduce.matches ? 2200 : 1600;
    setValue(METHODS[state.method].best, { tween: dur });
    runMotor(dur + 300);
  }

  render();
  drawKnob();
  drawPile();
  showSound();
}
