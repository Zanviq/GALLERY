// The live chart: sticky stage behind the scrolling story steps.
import { W, H, TOP, buildWorld, renderStatic } from './world.js';
import { Sim, DIRS, windVec } from './sim.js';
import { drawFrame } from './render.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const STILL = params.has('still');

// what the chart shows at each step
const MODES = {
  hero:     { boats: 'work', conv: 1, onshore: 1, slip: 0.6, fronts: 0.55, future: 0, arrows: 0, routes: 0, labels: 0, unload: 0 },
  problem:  { boats: 'dock', conv: 0, onshore: 3.1, slip: 0, fronts: 0, future: 0, arrows: 0, routes: 0, labels: 0, unload: 0 },
  approach: { boats: 'dock', conv: 1.5, onshore: 1, slip: 0.6, fronts: 1, future: 0, arrows: 0, routes: 0, labels: 0, unload: 0 },
  'how-1':  { boats: 'dock', conv: 1, onshore: 1, slip: 0.6, fronts: 1, future: 1, arrows: 1, routes: 0, labels: 0, unload: 0 },
  'how-2':  { boats: 'launch', conv: 1, onshore: 1, slip: 0.6, fronts: 1, future: 0, arrows: 0, routes: 1, labels: 1, unload: 0 },
  'how-3':  { boats: 'work', conv: 1, onshore: 1, slip: 0.6, fronts: 0.9, future: 0, arrows: 0, routes: 0, labels: 1, unload: 0, follow: true },
  'how-4':  { boats: 'work', conv: 1, onshore: 1, slip: 0.6, fronts: 0.5, future: 0, arrows: 0, routes: 0.6, labels: 1, unload: 0, recall: true },
  try:      { boats: 'user', conv: 1, onshore: 1, slip: 0.6, fronts: 1, future: 0, arrows: 0, routes: 0, labels: 0.85, unload: 0 },
};
// world rectangles each step wants in view
const FOCUS = {
  hero: [640, 300, 1600, 1000],
  problem: [380, 60, 1600, 1000],
  approach: [600, 270, 1360, 720],
  'how-1': [520, 220, 1600, 1000],
  'how-2': [380, -40, 1120, 600],
  'how-3': null,
  'how-4': [380, -60, 900, 330],
  try: [430, 120, 1600, 1000],
};
// phones see a narrow slice, so these are small windows around what matters (zoomed in)
const FOCUS_NARROW = {
  hero: [790, 420, 1090, 620],
  problem: [670, 260, 970, 460],
  approach: [760, 440, 1060, 640],
  'how-1': [760, 420, 1060, 640],
  'how-2': [420, 40, 720, 300],
  'how-3': null,
  'how-4': [430, 20, 690, 230],
  try: [850, 440, 1150, 660],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function startChart(root) {
  const stage = root.querySelector('.stage');
  const canvas = stage.querySelector('.stage__canvas');
  const live = document.getElementById('chart-live');
  const hud = {};
  stage.querySelectorAll('[data-hud]').forEach((el) => { hud[el.dataset.hud] = el; });

  const unloadEls = {
    total: root.querySelector('[data-unload="total"]'),
    pct: [0, 1, 2, 3].map((q) => root.querySelector(`[data-unload="${q}"]`)),
    bar: [0, 1, 2, 3].map((q) => root.querySelector(`[data-unload-bar="${q}"]`)),
  };
  let ctx = null;
  try { ctx = canvas.getContext('2d', { alpha: false }); } catch (e) { ctx = null; }
  if (!ctx || typeof Path2D === 'undefined' || params.has('fallback')) { showFallback(stage); return; }

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = reduceMQ.matches && !CAPTURE;

  const world = buildWorld();
  const big = Math.max(innerWidth, innerHeight) > 1100;
  const sim = new Sim(world, { particles: big ? 2100 : 1800 });
  // a mature bay from the first frame without simulating minutes on the main thread
  sim.seedWindrows(0.46);
  sim.sendAllToWork();
  sim.run(CAPTURE || STILL ? 16 : 3, 1 / 20);
  sim.setClock(6 * 60 + 40);

  const view = { w: 1, h: 1, dpr: 1, cover: 1, cam: { x: W * 0.7, y: H * 0.6, z: 1 }, narrow: false };
  const disp = { fronts: 0.55, future: 0, arrows: 0, routes: 0, labels: 0, unload: 0 };
  let stat = null;
  let step = 'hero';
  let mode = MODES.hero;
  let userBoats = true;
  let camTarget = { x: view.cam.x, y: view.cam.y, z: 1 };
  let snapCam = true;
  let visible = true;
  let raf = 0;
  let last = 0;

  // ---------- layout ----------
  function freeArea() {
    const w = view.w, h = view.h;
    const hudEl = stage.querySelector('.hud');
    if (STILL) return { x: 0, y: 0, w, h };
    if (!view.narrow) {
      if (step === 'hero') {
        const hero = root.querySelector('.hero');
        const hw = hero ? hero.offsetWidth : w * 0.4;
        return { x: hw, y: 0, w: w - hw, h };
      }
      const panel = root.querySelector(`[data-step="${step}"] .panel`) || root.querySelector('.panel');
      const right = (panel ? panel.getBoundingClientRect().right : w * 0.4) + 24;
      return { x: right, y: 0, w: Math.max(200, w - right - (hudEl ? 0 : 0)), h };
    }
    const top = hudEl ? hudEl.offsetHeight + 16 : 50;
    let cover;
    if (step === 'hero') {
      const hero = root.querySelector('.hero');
      const heroTop = hero ? hero.offsetTop : h * 0.46;
      return { x: 0, y: top, w, h: Math.max(160, heroTop - top) };
    }
    if (step === 'try') return { x: 0, y: top, w, h: Math.max(160, h * 0.4 - top) };
    { const panel = root.querySelector(`[data-step="${step}"] .panel`); cover = (panel ? panel.offsetHeight : h * 0.4) + 76; }
    return { x: 0, y: top + (step.startsWith('how') ? 52 : 0), w, h: Math.max(160, h - cover - top - (step.startsWith('how') ? 52 : 0)) };
  }

  function computeTarget() {
    const free = freeArea();
    const cover = view.cover;
    const rect = (view.narrow ? FOCUS_NARROW : FOCUS)[step];
    let z, cx, cy;
    if (STILL) { z = cover; cx = W / 2; cy = H / 2; }
    else if (rect) {
      const rw = rect[2] - rect[0], rh = rect[3] - rect[1];
      const zMin = view.narrow ? cover * 1.5 : cover, zMax = view.narrow ? cover * 2.1 : cover * 1.8;
      z = clamp(Math.min(free.w / rw, free.h / rh), zMin, zMax);
      cx = (rect[0] + rect[2]) / 2; cy = (rect[1] + rect[3]) / 2;
    } else {
      const b = followBoat();
      z = cover * (view.narrow ? 2 : 1.85);
      cx = b.x; cy = b.y;
    }
    const fcx = free.x + free.w / 2, fcy = free.y + free.h / 2;
    let x = cx - (fcx - view.w / 2) / z, y = cy - (fcy - view.h / 2) / z;
    const hw = view.w / 2 / z, hh = view.h / 2 / z;
    x = clamp(x, hw, W - hw); y = clamp(y, TOP + hh, H - hh);
    camTarget = { x, y, z };
  }
  let followId = 0;
  function followBoat() { return sim.boats[followId]; }

  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const changed = w !== view.w || h !== view.h || dpr !== view.dpr;
    view.w = w; view.h = h; view.dpr = dpr;
    view.narrow = w < 960;
    view.cover = Math.max(w / W, h / H);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // static layer: crisp at ~1.5× cover zoom, within a memory budget
    const want = view.cover * (view.narrow ? 2.1 : 1.9) * dpr;
    const cap = Math.min(4096 / W, 4096 / (H - TOP), Math.sqrt((big ? 11e6 : 8e6) / (W * (H - TOP))));
    const scale = Math.min(want, cap);
    if (!stat || Math.abs(stat.scale - scale) / stat.scale > 0.08 || Math.abs(stat.u - 1 / view.cover) / stat.u > 0.08) {
      stat = { scale, u: 1 / view.cover, canvas: renderStatic(world, scale, 1 / view.cover) };
      stat.scale = scale;
      // fonts may arrive later: redraw soundings once they do
    }
    computeTarget();
    if (changed) snapCam = true;
    draw();
  }

  // ---------- modes ----------
  function applyMode(next, immediate) {
    const prev = step;
    step = next;
    mode = MODES[next];
    stage.dataset.step = next;
    sim.params.conv = mode.conv;
    sim.params.onshore = mode.onshore;
    sim.params.slip = mode.slip;
    const wantBoats = mode.boats === 'user' ? userBoats : mode.boats !== 'dock';
    sim.params.boats = wantBoats;
    if (mode.boats === 'dock') sim.dockAll(!immediate);
    else if (mode.boats === 'launch') {
      if (sim.boats.every((b) => b.state === 'docked')) sim.launch(0.75);
    } else if (wantBoats) {
      sim.launch(0.4);
      for (const b of sim.boats) b.recall = false;
    } else sim.setBoats(false);
    if (next === 'how-3') {
      // follow a boat on the middle front: it frames well on every screen shape
      const onMid = sim.boats.find((b) => b.lane && b.lane.fi === 0 && (b.state === 'sweep' || b.state === 'toLane'));
      followId = onMid ? onMid.id : 0;
      sim.warpToSweep(followId, 0);
    }
    if (mode.recall) { sim.warpNearHome(0); sim.warpNearHome(1); }
    if (next === 'problem' && prev !== 'problem') sim.beachEvents.length = 0;
    computeTarget();
  }

  function setStep(next) {
    if (next === step || !MODES[next]) return;
    applyMode(next, false);
    updateRail(next);
  }

  const rail = root.querySelector('.rail');
  function updateRail(id) {
    const order = ['how-1', 'how-2', 'how-3', 'how-4'];
    const cur = order.indexOf(id);
    if (rail) rail.classList.toggle('is-on', cur > -1);
    root.querySelectorAll('[data-rail]').forEach((a) => {
      const k = order.indexOf(a.dataset.rail);
      if (k === cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      a.classList.toggle('is-past', cur > -1 && k < cur);
    });
  }

  // ---------- frame ----------
  // the one orchestrated moment: on arrival the forecast lines draw themselves across the bay
  let revealT = CAPTURE || STILL ? 1 : 0;
  function easeDisp(dt) {
    const k = reduce ? 1 : 1 - Math.exp(-dt * 4);
    for (const key of Object.keys(disp)) if (key !== 'reveal') disp[key] += ((mode[key] || 0) - disp[key]) * k;
    revealT = Math.min(1, revealT + dt / 1.8);
    disp.reveal = reduce ? 1 : 1 - Math.pow(1 - revealT, 3);
  }
  function moveCam(dt) {
    if (step === 'how-3') computeTarget();
    const c = view.cam;
    if (snapCam || reduce) { c.x = camTarget.x; c.y = camTarget.y; c.z = camTarget.z; snapCam = false; return; }
    const k = 1 - Math.exp(-dt * 2.6);
    const lz = Math.log(c.z) + (Math.log(camTarget.z) - Math.log(c.z)) * k;
    c.z = Math.exp(lz);
    c.x += (camTarget.x - c.x) * k;
    c.y += (camTarget.y - c.y) * k;
    const hw = view.w / 2 / c.z, hh = view.h / 2 / c.z;
    c.x = clamp(c.x, hw, W - hw); c.y = clamp(c.y, TOP + hh, H - hh);
  }
  function draw() {
    if (!stat) return;
    drawFrame(ctx, view, sim, world, stat, disp);
  }
  let hudT = 0;
  function updateHud(force) {
    const now = performance.now();
    if (!force && now - hudT < 250) return;
    hudT = now;
    const set = (k, v) => { if (hud[k] && hud[k].textContent !== v) hud[k].textContent = v; };
    set('clock', sim.clock());
    set('tide', sim.tideLabel());
    set('wind', `${DIRS[sim.wind.dir]} ${sim.wind.speed}\u00a0m/s`);
    set('boats', `${sim.boatsOut()}척`);
    set('collected', `${Math.round(sim.collectedKg).toLocaleString('ko-KR')}\u00a0kg`);
    set('beached', `시간당 ${sim.beachRate()}개`);
    if (hud.warn) hud.warn.hidden = sim.wind.speed < 10;
    // step 4 readout
    const kg = sim.unloadedKg, total = kg[0] + kg[1] + kg[2] + kg[3];
    if (unloadEls.total && total > 0) {
      set2(unloadEls.total, `${Math.round(total).toLocaleString('ko-KR')}\u00a0kg`);
      const pct = kg.map((v) => Math.round((v / total) * 100));
      pct.forEach((p, q) => {
        if (unloadEls.pct[q]) set2(unloadEls.pct[q], `${p}%`);
        if (unloadEls.bar[q]) unloadEls.bar[q].style.width = `calc(${(kg[q] / total) * 100}% - 2px)`;
      });
    }
  }
  function set2(el, v) { if (el.textContent !== v) el.textContent = v; }

  function frame(ts) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
    last = ts;
    // reduced motion: calmer, not still (BRIEF §000). The bay keeps drifting at 0.6x; the camera cuts
    // instead of gliding and the forecast lines appear instead of drawing (moveCam, easeDisp).
    sim.step(reduce ? dt * 0.6 : dt);
    easeDisp(dt);
    moveCam(dt);
    draw();
    updateHud(false);
    raf = requestAnimationFrame(frame);
  }
  function play() {
    stage.dataset.mode = 'playing';
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  // ---------- observers ----------
  const steps = [...root.querySelectorAll('[data-step]')];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) setStep(e.target.dataset.step);
  }, { rootMargin: '-50% 0px -50% 0px' });
  steps.forEach((s) => io.observe(s));

  const vis = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) play();
  }, { rootMargin: '80px 0px' });
  vis.observe(root);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });

  let rt = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  ro.observe(stage);
  reduceMQ.addEventListener('change', () => {
    reduce = reduceMQ.matches && !CAPTURE;
    snapCam = true;
    play();
  });

  // fonts: the static layer uses Plex for soundings
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { stat = null; resize(); });
  }

  // ---------- controls (try step) ----------
  const dial = root.querySelector('#wind-dial');
  const dirOut = root.querySelector('#wind-dir-out');
  const speed = root.querySelector('#wind-speed');
  const speedOut = root.querySelector('#wind-speed-out');
  const sw = root.querySelector('#boats-switch');
  const needle = dial && dial.querySelector('.dial__needle');
  let announceT = 0;
  function announce(msg, delay = 900) {
    clearTimeout(announceT);
    announceT = setTimeout(() => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); }, delay);
  }
  function towardName(dir) {
    const v = windVec(dir);
    const ang = Math.atan2(v.x, -v.y);              // 0 = north, clockwise
    const idx = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    return DIRS[idx];
  }
  function setDir(d, say = true) {
    d = ((d % 8) + 8) % 8;
    sim.setWind(d, sim.wind.speed);
    needle.style.transform = `rotate(${d * 45}deg)`;
    dial.setAttribute('aria-valuenow', String(d));
    dial.setAttribute('aria-valuetext', `${DIRS[d]}풍`);
    dirOut.textContent = `${DIRS[d]}풍`;
    updateHud(true);
    if (say) announce(`${DIRS[d]}풍 ${sim.wind.speed} m/s. 수렴선이 ${towardName(d)}쪽으로 옮겨집니다.`);
  }
  if (dial) {
    const ticks = dial.querySelector('.dial__ticks');
    let s = '';
    for (let q = 0; q < 16; q++) {
      const a = (q * 22.5 * Math.PI) / 180, major = q % 2 === 0;
      const r0 = major ? 36 : 39, r1 = 43;
      s += `<line class="${major ? '' : 'minor'}" x1="${48 + Math.sin(a) * r0}" y1="${48 - Math.cos(a) * r0}" x2="${48 + Math.sin(a) * r1}" y2="${48 - Math.cos(a) * r1}"/>`;
    }
    ticks.innerHTML = s;
    const fromPointer = (e) => {
      const r = dial.getBoundingClientRect();
      const ang = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2)));
      return Math.round(ang / (Math.PI / 4));
    };
    let dragging = false;
    dial.addEventListener('pointerdown', (e) => {
      dragging = true; dial.setPointerCapture(e.pointerId);
      const d = fromPointer(e); if (((d % 8) + 8) % 8 !== sim.wind.dir) setDir(d);
      e.preventDefault();
    });
    dial.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const d = ((fromPointer(e) % 8) + 8) % 8;
      if (d !== sim.wind.dir) setDir(d);
    });
    const end = () => { dragging = false; };
    dial.addEventListener('pointerup', end);
    dial.addEventListener('pointercancel', end);
    dial.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 2, PageDown: -2 };
      if (e.key in map) { setDir(sim.wind.dir + map[e.key]); e.preventDefault(); }
      else if (e.key === 'Home') { setDir(7); e.preventDefault(); }
      else if (e.key === 'End') { setDir(3); e.preventDefault(); }
    });
    needle.style.transform = `rotate(${sim.wind.dir * 45}deg)`;
  }
  if (speed) {
    speed.addEventListener('input', () => {
      const v = Number(speed.value);
      sim.setWind(sim.wind.dir, v);
      speedOut.textContent = `${v}\u00a0m/s`;
      updateHud(true);
      announce(v >= 10 ? `풍속 ${v} m/s. 보트 운용 한계에 가까운 바람입니다.` : `풍속 ${v} m/s.`, 700);
    });
  }
  function setBoats(on, say = true) {
    userBoats = on;
    sw.setAttribute('aria-checked', String(on));
    sw.querySelector('.switch__text').textContent = on ? '켜짐' : '꺼짐';
    if (step === 'try') sim.setBoats(on);
    if (say) announce(on ? '보트가 다시 나갑니다.' : '보트를 기지로 돌려보냈습니다. 해변 도착 수를 지켜보세요.', 300);
  }
  if (sw) sw.addEventListener('click', () => setBoats(sw.getAttribute('aria-checked') !== 'true'));
  root.querySelector('#spill-btn')?.addEventListener('click', () => {
    const x = 700 + (Math.random() - 0.5) * 260, y = 955;
    sim.spill(x, y, 60, 40);
    announce('남쪽 바깥 바다에서 쓰레기 한 무리가 흘러들어 옵니다.', 200);
  });
  root.querySelector('#reset-btn')?.addEventListener('click', () => {
    speed.value = '4'; speedOut.textContent = '4\u00a0m/s';
    sim.setWind(7, 4);
    setDir(7, false);
    setBoats(true, false);
    for (let i = 0; i < sim.N; i++) if (sim.st[i] === 2) sim.st[i] = 0;
    sim.beachEvents.length = 0;
    announce('처음 상태로 돌렸습니다. 북서풍 4\u00a0m/s, 보트 운항 중.', 200);
  });

  // tap the sea to add debris (try step)
  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    const c = view.cam;
    return { x: (e.clientX - r.left - view.w / 2) / c.z + c.x, y: (e.clientY - r.top - view.h / 2) / c.z + c.y };
  }
  canvas.addEventListener('click', (e) => {
    if (step !== 'try') return;
    const p = toWorld(e);
    if (world.h(p.x, p.y) > -0.1) return;
    sim.spill(p.x, p.y, 40, 30);
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = toWorld(e);
    canvas.classList.toggle('is-water', step === 'try' && world.h(p.x, p.y) < -0.1);
  });

  // ---------- go ----------
  if (STILL) document.documentElement.classList.add('is-still');
  resize();
  applyMode('hero', true);
  // start on whichever step is in view (deep links, reloads mid-page)
  const mid = innerHeight / 2;
  for (const s of steps) {
    const r = s.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) { applyMode(s.dataset.step, true); updateRail(s.dataset.step); break; }
  }
  for (const key of Object.keys(disp)) if (key !== 'reveal') disp[key] = mode[key] || 0;
  disp.reveal = reduce || CAPTURE || STILL ? 1 : 0;
  snapCam = true;
  computeTarget();
  moveCam(0);
  draw();
  updateHud(true);
  play();
  return { sim, view };
}

export function showFallback(stage) {
  const img = stage.querySelector('.stage__fallback');
  if (img && img.dataset.src && !img.getAttribute('src')) img.src = img.dataset.src;
  stage.dataset.mode = 'fallback';
}
