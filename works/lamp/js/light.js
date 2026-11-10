// 이슥: the desk scene, the dial and the colour switch (INTERACTION.md).
// The scene is one photograph split into an "off" room and three light layers (2700/4000/5600 K).
// Each frame draws off + b * light(T) with canvas 'lighter' compositing; b = 1 is the lit photograph.
import { Clicks } from './audio.js';

const LM = [0, 25, 95, 230, 420, 650];         // lumens per step
const B = [0, 0.23, 0.42, 0.62, 0.82, 1];       // light-layer strength per step (≈ (lm/650)^(1/2.2))
const KS = [2700, 4000, 5600];
const START = -135;                              // dial angle at 꺼짐, degrees
const STEP = 54;                                 // degrees per detent
const LUX_MAX = 1150;                            // centre illuminance at 650 lm, 40 cm under the head

const root = document.getElementById('try');
if (root) init();

function init() {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches;
  mq.addEventListener?.('change', (e) => { reduce = e.matches; kick(); });

  const sceneEl = root.querySelector('[data-scene]');
  const canvas = sceneEl.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const dialEl = root.querySelector('[data-dial]');
  const knob = root.querySelector('[data-knob]');
  const ticks = [...dialEl.querySelectorAll('.dial__ticks li')];
  const tempBtns = [...root.querySelectorAll('[data-temps] [role="radio"]')];
  const readLm = root.querySelector('[data-read-lm]');
  const readStep = root.querySelector('[data-read-step]');
  const readK = root.querySelector('[data-read-k]');
  const live = root.querySelector('[data-live]');
  const soundBtn = root.querySelector('[data-sound]');
  const soundState = root.querySelector('[data-sound-state]');
  const soundNote = root.querySelector('[data-sound-note]');
  const lux = document.querySelector('[data-lux]');
  const luxMax = lux?.querySelector('.lux__max');
  const luxCur = lux?.querySelector('.lux__cur');
  const luxNow = lux?.querySelector('[data-lux-now]');

  // ---- state ----
  let level = 0;
  let k = 4000;
  let b = 0;                                   // displayed light strength
  const w = { 2700: 0, 4000: 1, 5600: 0 };     // displayed colour mix
  let angle = START;                           // displayed dial angle
  let lmShown = 0;                             // displayed lumens for the chart
  let dragging = null;
  let touched = false;                         // the visitor has used a control
  let sound = 'auto';                          // auto → on at the first gesture; on; off (chosen)
  const clicks = new Clicks();
  if (!clicks.ok) {
    soundBtn.disabled = true;
    soundNote.textContent = '이 브라우저에서는 소리를 낼 수 없습니다.';
  }

  // ---- images ----
  const imgs = {};
  let ready = false;
  let inView = false;                          // any part on screen: draw
  let seen = false;                            // a third on screen: the first-view demo may run
  function load() {
    if (load.started) return;
    load.started = true;
    const big = sceneEl.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2) > 1050;
    const size = big ? 1600 : 1000;
    const names = ['off', 'l2700', 'l4000', 'l5600'];
    Promise.all(names.map((n) => new Promise((res, rej) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res([n, im]);
      im.onerror = rej;
      im.src = `./img/${n}-${size}.webp`;
    }))).then((list) => {
      for (const [n, im] of list) imgs[n] = im;
      ready = true;
      resize();
      maybeDemo();
    }, () => {
      // Keep the page usable: show the lit photograph as a still.
      const im = document.createElement('img');
      im.src = './img/scene-1600.webp';
      im.alt = '';
      im.className = 'scene__canvas';
      canvas.replaceWith(im);
    });
  }

  // ---- canvas size and drawing ----
  function resize() {
    const r = sceneEl.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(r.width * dpr));
    const ch = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    draw();
  }

  function draw() {
    if (!ready) {
      ctx.fillStyle = '#0B0C0E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const cw = canvas.width, ch = canvas.height;
    const iw = imgs.off.naturalWidth, ih = imgs.off.naturalHeight;
    const ca = cw / ch;
    let sw = iw, sh = iw / ca;
    if (sh > ih) { sh = ih; sw = ih * ca; }
    const sx = Math.min(Math.max(iw * 0.46 - sw / 2, 0), iw - sw);
    const sy = (ih - sh) / 2;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(imgs.off, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';
    for (const T of KS) {
      const a = b * w[T];
      if (a > 0.002) {
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(imgs['l' + T], sx, sy, sw, sh, 0, 0, cw, ch);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // ---- animation: render on demand ----
  let raf = 0;
  let last = 0;
  function kick() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    raf = 0;
    const dt = Math.min(64, now - last);
    last = now;
    // Reduced motion keeps every change, only slower.
    const tb = reduce ? 300 : 150;
    const tw = reduce ? 520 : 280;
    const ta = reduce ? 110 : 70;
    const kb = 1 - Math.exp(-dt / tb);
    const kw = 1 - Math.exp(-dt / tw);
    b += (B[level] - b) * kb;
    for (const T of KS) w[T] += ((T === k ? 1 : 0) - w[T]) * kw;
    lmShown += (LM[level] - lmShown) * kb;
    if (!dragging) angle += (START + level * STEP - angle) * (1 - Math.exp(-dt / ta));
    apply();
    const settled = Math.abs(B[level] - b) < 0.002
      && KS.every((T) => Math.abs((T === k ? 1 : 0) - w[T]) < 0.002)
      && Math.abs(START + level * STEP - angle) < 0.05
      && Math.abs(LM[level] - lmShown) < 0.5;
    if (settled) {
      b = B[level];
      for (const T of KS) w[T] = T === k ? 1 : 0;
      lmShown = LM[level];
      if (!dragging) angle = START + level * STEP;
      apply();
    } else {
      raf = requestAnimationFrame(tick);
    }
  }
  function apply() {
    knob.style.setProperty('--rot', angle.toFixed(2) + 'deg');
    dialEl.style.setProperty('--lit', (0.58 + 0.42 * b).toFixed(3));
    if (inView) draw();
    drawLux();
  }

  // ---- the lux chart follows the dial ----
  function luxAt(x, lm) { return LUX_MAX * (lm / 650) * Math.exp(-((x / 44) ** 2)); }
  function luxPath(lm) {
    let d = '';
    for (let x = -60; x <= 60; x += 2) {
      const X = ((x + 60) / 120) * 1200;
      const Y = 330 - luxAt(x, lm) * 0.25;
      d += (d ? 'L' : 'M') + X.toFixed(1) + ' ' + Y.toFixed(1);
    }
    return d;
  }
  if (luxMax) luxMax.setAttribute('d', luxPath(650));
  let luxLast = -1;
  function drawLux() {
    if (!luxCur) return;
    const v = Math.round(lmShown * 2) / 2;
    if (v === luxLast) return;
    luxLast = v;
    luxCur.setAttribute('d', luxPath(v));
  }

  // ---- changing state ----
  function words() {
    return level === 0 ? '꺼짐' : `${level}단계, ${LM[level]} lm`;
  }
  let liveTimer = 0;
  function announce() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      live.textContent = level === 0 ? '꺼짐' : `${level}단계, ${LM[level]} 루멘, ${k} 켈빈`;
    }, 300);
  }
  function describe() {
    knob.setAttribute('aria-valuenow', String(level));
    knob.setAttribute('aria-valuetext', words());
    readLm.textContent = String(LM[level]);
    readStep.textContent = level === 0 ? '꺼짐' : `${level}단계`;
    readK.textContent = String(k);
    ticks.forEach((li, i) => li.classList.toggle('is-on', i === level));
    sceneEl.setAttribute('aria-label', level === 0
      ? '밤의 책상. 이슥은 꺼져 있고 방이 어둡습니다.'
      : `밤의 책상. 이슥이 ${level}단계, ${k} K 빛으로 노트와 색연필, 책 두 권, 흰 컵을 비춥니다.`);
    if (luxNow) {
      luxNow.textContent = level === 0
        ? '지금 다이얼은 꺼짐입니다.'
        : `지금 다이얼은 ${level}단계, 가운데 ${Math.round(LUX_MAX * LM[level] / 650).toLocaleString('ko-KR')} lx입니다.`;
    }
  }

  function setLevel(n, user, gesture = true) {
    n = Math.max(0, Math.min(5, n));
    if (n === level) return;
    level = n;
    if (user) {
      userAct(gesture);
      if (n === 0) clicks.off(); else clicks.detent(n);
      announce();
    }
    describe();
    kick();
  }
  function setK(T, user) {
    if (T === k) return;
    k = T;
    tempBtns.forEach((btn) => {
      const on = Number(btn.dataset.k) === k;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    if (user) {
      userAct();
      clicks.press();
      announce();
    }
    describe();
    kick();
  }
  function press() {
    const i = KS.indexOf(k);
    setK(KS[(i + 1) % KS.length], true);
    knob.style.setProperty('--press', '0.965');
    setTimeout(() => knob.style.setProperty('--press', '1'), reduce ? 160 : 110);
  }

  // ---- sound ----
  function showSound() {
    const on = sound === 'on';
    soundBtn.setAttribute('aria-pressed', String(on));
    soundState.textContent = on ? '켜짐' : '꺼짐';
    if (clicks.ok) soundNote.textContent = sound === 'auto' ? '다이얼을 처음 돌리면 걸림 소리가 켜집니다.' : '';
  }
  function userAct(gesture = true) {
    touched = true;
    stopDemo();
    if (gesture && sound === 'auto' && clicks.start()) {
      sound = 'on';
      showSound();
    }
  }
  soundBtn.addEventListener('click', () => {
    if (sound === 'on') {
      sound = 'off';
    } else if (clicks.start()) {
      sound = 'on';
      clicks.detent(level || 3);
    }
    showSound();
  });
  // Clicks only play while sound is on: wrap the three sounds.
  for (const name of ['detent', 'off', 'press']) {
    const fn = clicks[name].bind(clicks);
    clicks[name] = (...a) => { if (sound === 'on') fn(...a); };
  }

  // ---- dial: drag anywhere on it to turn; tap the knob to press, tap the ring to jump ----
  function centre() {
    const r = dialEl.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2];
  }
  function pointerAngle(e, c) {
    return (Math.atan2(e.clientX - c[0], -(e.clientY - c[1])) * 180) / Math.PI;
  }
  dialEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.dial__ticks')) return;
    const c = centre();
    const dist = Math.hypot(e.clientX - c[0], e.clientY - c[1]);
    if (dist > c[2]) return;
    e.preventDefault();
    knob.focus({ preventScroll: true });
    dialEl.setPointerCapture(e.pointerId);
    const a = pointerAngle(e, c);
    dragging = { id: e.pointerId, c, onKnob: dist < c[2] * 0.6, a0: a, prev: a, turn: 0, start: angle, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    dialEl.classList.add('is-turning');
  });
  dialEl.addEventListener('pointermove', (e) => {
    const d = dragging;
    if (!d || e.pointerId !== d.id) return;
    const a = pointerAngle(e, d.c);
    let da = a - d.prev;
    if (da > 180) da -= 360;
    if (da < -180) da += 360;
    d.prev = a;
    d.turn += da;
    if (!d.moved && (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || Math.abs(d.turn) > 8)) {
      d.moved = true;
      userAct();
    }
    if (!d.moved) return;
    const raw = Math.max(START, Math.min(START + 5 * STEP, d.start + d.turn));
    const v = (raw - START) / STEP;
    const n = Math.round(v);
    angle = START + (n + (v - n) * 0.4) * STEP;   // detents: the dial sticks to each step
    setLevel(n, true);
    apply();
  });
  function endDrag(e) {
    const d = dragging;
    if (!d || e.pointerId !== d.id) return;
    dragging = null;
    dialEl.classList.remove('is-turning');
    if (!d.moved && e.type === 'pointerup' && performance.now() - d.t < 450) {
      if (d.onKnob) press();
      else {
        // A tap on the ring: turn to the detent nearest that point of the scale.
        const n = Math.round((Math.max(START, Math.min(START + 5 * STEP, d.a0)) - START) / STEP);
        setLevel(n, true);
      }
    }
    kick();
  }
  dialEl.addEventListener('pointerup', endDrag);
  dialEl.addEventListener('pointercancel', endDrag);
  dialEl.addEventListener('lostpointercapture', endDrag);

  knob.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const map = { ArrowRight: 1, ArrowUp: 1, PageUp: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: -1 };
    if (e.key in map) setLevel(level + map[e.key], true);
    else if (e.key === 'Home') setLevel(0, true);
    else if (e.key === 'End') setLevel(5, true);
    else if (e.key === ' ' || e.key === 'Enter') { if (!e.repeat) press(); }
    else return;
    e.preventDefault();
  });

  let wheelAt = 0;
  dialEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelAt < 90 || Math.abs(e.deltaY) < 1) return;
    wheelAt = now;
    setLevel(level + (e.deltaY < 0 ? 1 : -1), true, false);   // a wheel is not a gesture that may start audio
  }, { passive: false });

  ticks.forEach((li, i) => li.addEventListener('click', () => setLevel(i, true)));

  // ---- colour switch: a radio group ----
  tempBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => setK(Number(btn.dataset.k), true));
    btn.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tempBtns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + tempBtns.length - 1) % tempBtns.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tempBtns.length - 1;
      if (j === null) return;
      e.preventDefault();
      tempBtns[j].focus();
      setK(Number(tempBtns[j].dataset.k), true);
    });
  });

  // ---- first view: the lamp turns itself on once, without sound ----
  let demoTimer = 0;
  let demoDone = false;
  function maybeDemo() {
    if (demoDone || touched || !ready || !seen) return;
    demoDone = true;
    let n = 0;
    const stepMs = reduce ? 480 : 320;
    const next = () => {
      if (touched) return;
      n += 1;
      setLevel(n, false);
      if (n < 4) demoTimer = setTimeout(next, stepMs);
    };
    demoTimer = setTimeout(next, 450);
  }
  function stopDemo() { clearTimeout(demoTimer); }

  // ---- visibility, size, tab ----
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.target === sceneEl) {
        inView = en.isIntersecting;
        seen = en.isIntersecting && en.intersectionRatio >= 0.35;
        if (inView) draw();
        maybeDemo();
      }
    }
  }, { threshold: [0, 0.35, 0.6] });
  io.observe(sceneEl);
  const near = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { load(); near.disconnect(); }
  }, { rootMargin: '1200px 0px' });
  near.observe(sceneEl);
  new ResizeObserver(() => resize()).observe(sceneEl);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopDemo();
    else kick();
  });

  describe();
  showSound();
  apply();
}
