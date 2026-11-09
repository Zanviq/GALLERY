// The contact-sheet trailer: loupe on the sheet (wide screens) or loose strips under a ring (phones),
// a screen that shows the current frame with its subtitle, buttons, keys and the transcript.
import { FRAMES, SHOTS, PACE, shotOf } from './data.js';
import { frameBitmap, grain, onStill, prefetch, FW, FH } from './frames.js';
import {
  SHEET_W, SHEET_H, STRIP, LOOSE_GAP, LOOSE_LEN, drawSheet, drawStrip, frameCenter, looseCenter,
  nearestOnSheet, nearestLoose,
} from './sheet.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wideQuery = window.matchMedia('(min-width: 900px)');

export function initTrailer(root) {
  const reel = root.querySelector('[data-reel]');
  const paper = root.querySelector('[data-paper]');
  const loupeEl = root.querySelector('[data-loupe]');
  const loupe = loupeEl.querySelector('canvas');
  const track = root.querySelector('[data-track]');
  const ring = root.querySelector('[data-ring]');
  const screenCanvas = root.querySelector('[data-screen]');
  const subEl = root.querySelector('[data-sub]');
  const countEl = root.querySelector('[data-count]');
  const descEl = root.querySelector('[data-desc]');
  const prevBtn = root.querySelector('[data-prev]');
  const nextBtn = root.querySelector('[data-next]');
  const playBtn = root.querySelector('[data-play]');
  const scriptRows = [...root.querySelectorAll('[data-shot]')];

  let n = 1;
  let wide = wideQuery.matches;
  let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  let sheetPx = 1; // css px per mm on the sheet
  let loosePx = 1; // css px per mm on the loose strips
  let loupeD = 200;
  const MAG = 2.3;
  let loupePos = frameCenter(1); // mm on the sheet
  let dragging = false;
  let settleAnim = 0;
  let visible = false;
  let playing = 0;
  let programmatic = 0;
  let lastScreen = 0;
  let grainLoop = 0;
  let grainUntil = 0;

  // ---------- frame bitmaps: crops of stills, redrawn when a sharper still arrives ----------
  const bitmap = (fn, w) => frameBitmap(fn, w);
  let redrawRaf = 0;
  onStill(() => {
    if (redrawRaf) return;
    redrawRaf = requestAnimationFrame(() => {
      redrawRaf = 0;
      drawPaper();
      showScreen(true);
    });
  });

  // ---------- layout ----------
  function layout() {
    wide = wideQuery.matches;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    root.classList.toggle('is-wide', wide);
    if (wide) {
      const w = reel.clientWidth;
      sheetPx = w / SHEET_W;
      paper.width = Math.round(w * dpr);
      paper.height = Math.round(SHEET_H * sheetPx * dpr);
      paper.style.height = SHEET_H * sheetPx + 'px';
      loupeD = Math.round(Math.max(150, Math.min(250, w * 0.3)));
      loupeEl.style.width = loupeEl.style.height = loupeD + 'px';
      loupe.width = loupe.height = Math.round(loupeD * dpr);
      reel.scrollLeft = 0;
      drawPaper();
      loupePos = frameCenter(n);
      placeLoupe();
    } else {
      const vw = reel.clientWidth;
      const fw = Math.max(120, Math.min(176, vw * 0.42));
      loosePx = fw / STRIP.fw;
      const pad = vw / 2 - 22 * loosePx;
      track.style.width = LOOSE_LEN * loosePx + pad * 2 + 'px';
      track.style.height = STRIP.h * loosePx + 'px';
      track.style.setProperty('--pad', pad + 'px');
      const canvases = track.querySelectorAll('canvas');
      canvases.forEach((c, s) => {
        const cw = STRIP.len * loosePx;
        c.style.width = cw + 'px';
        c.style.height = STRIP.h * loosePx + 'px';
        c.style.left = pad + s * (STRIP.len + LOOSE_GAP) * loosePx + 'px';
        c.width = Math.round(cw * dpr);
        c.height = Math.round(STRIP.h * loosePx * dpr);
      });
      track.querySelectorAll('[data-snap]').forEach((m, i) => {
        m.style.left = pad + looseCenter(i + 1) * loosePx - 1 + 'px';
      });
      ring.style.width = ring.style.height = Math.round(fw * 1.04) + 'px';
      ring.style.top = track.offsetTop + (STRIP.h * loosePx) / 2 + 'px';
      drawPaper();
      scrollToFrame(n, true);
    }
    sizeScreen();
    showScreen(true);
  }

  function drawPaper() {
    if (wide) {
      const ctx = paper.getContext('2d');
      const k = sheetPx * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      drawSheet(ctx, k, bitmap);
      drawLoupe();
    } else {
      const k = loosePx * dpr;
      track.querySelectorAll('canvas').forEach((c, s) => {
        const ctx = c.getContext('2d');
        ctx.setTransform(k, 0, 0, k, 0, 0);
        drawStrip(ctx, s, k, bitmap);
      });
    }
  }

  // ---------- loupe ----------
  function placeLoupe() {
    const x = loupePos[0] * sheetPx, y = loupePos[1] * sheetPx;
    loupeEl.style.transform = `translate(${x - loupeD / 2}px, ${y - loupeD / 2}px)`;
    drawLoupe();
  }

  function drawLoupe() {
    if (!wide) return;
    const ctx = loupe.getContext('2d');
    const D = loupe.width;
    const k = sheetPx * MAG * dpr; // device px per mm inside the loupe
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, D, D);
    ctx.save();
    ctx.beginPath();
    ctx.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, D, D);
    ctx.setTransform(k, 0, 0, k, D / 2 - loupePos[0] * k, D / 2 - loupePos[1] * k);
    const half = D / 2 / k;
    drawSheet(ctx, k, bitmap, [loupePos[0] - half, loupePos[1] - half, half * 2, half * 2]);
    ctx.restore();
    // a soft fall-off at the lens edge
    const g = ctx.createRadialGradient(D / 2, D / 2, D * 0.36, D / 2, D / 2, D / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function settle() {
    cancelAnimationFrame(settleAnim);
    const target = frameCenter(n);
    if (reduced()) {
      loupePos = target;
      placeLoupe();
      return;
    }
    const from = loupePos.slice();
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 160);
      const e = 1 - (1 - p) ** 3;
      loupePos = [from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e];
      placeLoupe();
      if (p < 1) settleAnim = requestAnimationFrame(step);
    };
    settleAnim = requestAnimationFrame(step);
  }

  function pointerToSheet(e) {
    const r = reel.getBoundingClientRect();
    const lift = e.pointerType === 'touch' ? 56 : 0;
    const x = Math.max(0, Math.min(SHEET_W, (e.clientX - r.left) / sheetPx));
    const y = Math.max(0, Math.min(SHEET_H, (e.clientY - r.top - lift) / sheetPx));
    return [x, y];
  }

  reel.addEventListener('pointerdown', (e) => {
    if (!wide || e.button > 0) return;
    e.preventDefault();
    reel.focus({ preventScroll: true });
    stop();
    cancelAnimationFrame(settleAnim);
    dragging = true;
    root.classList.add('is-dragging');
    try { reel.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    loupePos = pointerToSheet(e);
    placeLoupe();
    setFrame(nearestOnSheet(loupePos[0], loupePos[1]));
  });
  reel.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    loupePos = pointerToSheet(e);
    placeLoupe();
    setFrame(nearestOnSheet(loupePos[0], loupePos[1]));
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    settle();
  };
  reel.addEventListener('pointerup', end);
  reel.addEventListener('pointercancel', end);
  reel.addEventListener('lostpointercapture', end);

  // ---------- loose strips (phones) ----------
  let scrollRaf = 0;
  reel.addEventListener('scroll', () => {
    if (wide) return;
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      if (programmatic) return;
      stop();
      const pad = parseFloat(track.style.getPropertyValue('--pad')) || 0;
      const x = (reel.scrollLeft + reel.clientWidth / 2 - pad) / loosePx;
      setFrame(nearestLoose(x));
    });
  }, { passive: true });

  function scrollToFrame(to, instant) {
    const pad = parseFloat(track.style.getPropertyValue('--pad')) || 0;
    const left = pad + looseCenter(to) * loosePx - reel.clientWidth / 2;
    clearTimeout(programmatic);
    programmatic = setTimeout(() => { programmatic = 0; }, instant || reduced() ? 60 : 520);
    reel.scrollTo({ left, behavior: instant || reduced() ? 'auto' : 'smooth' });
  }
  reel.addEventListener('scrollend', () => {
    if (!programmatic) return;
    clearTimeout(programmatic);
    programmatic = 0;
  });

  // ---------- screen ----------
  function sizeScreen() {
    const w = screenCanvas.clientWidth;
    screenCanvas.width = Math.round(w * dpr);
    screenCanvas.height = Math.round((w * FH / FW) * dpr);
  }

  function showScreen(force) {
    if (!force && lastScreen === n) return;
    lastScreen = n;
    paintScreen();
  }

  function paintScreen() {
    const ctx = screenCanvas.getContext('2d');
    const bmp = frameBitmap(n, screenCanvas.width);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (bmp) ctx.drawImage(bmp, 0, 0, screenCanvas.width, screenCanvas.height);
    else {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
    }
    return ctx;
  }

  function liveGrain() {
    if (reduced()) return;
    grainUntil = performance.now() + 800;
    if (grainLoop) return;
    let last = 0;
    const tick = (t) => {
      if (!visible || document.hidden || t > grainUntil) {
        grainLoop = 0;
        showScreen(true);
        return;
      }
      if (t - last > 80) {
        last = t;
        const ctx = paintScreen();
        grain(ctx, screenCanvas.width, screenCanvas.height, (t / 80) | 0, 0.12);
      }
      grainLoop = requestAnimationFrame(tick);
    };
    grainLoop = requestAnimationFrame(tick);
  }

  // ---------- state ----------
  function describe(fn) {
    const shot = shotOf(fn);
    return `컷 ${fn} / 36. ${shot.desc}${shot.sub ? ` 자막: ${shot.sub}` : ''}`;
  }

  function setFrame(to) {
    to = Math.max(1, Math.min(36, to));
    if (to === n && lastScreen === n) return;
    n = to;
    const shot = shotOf(n);
    subEl.textContent = shot.sub || '';
    subEl.hidden = !shot.sub;
    descEl.textContent = shot.desc;
    countEl.textContent = String(n);
    reel.setAttribute('aria-valuenow', String(n));
    reel.setAttribute('aria-valuetext', describe(n));
    prevBtn.disabled = n === 1;
    nextBtn.disabled = n === 36;
    const s = FRAMES[n - 1].shot;
    scriptRows.forEach((row, i) => {
      if (i === s) row.firstElementChild.setAttribute('aria-current', 'true');
      else row.firstElementChild.removeAttribute('aria-current');
    });
    showScreen();
    liveGrain();
    if (n < 36) prefetch(n + 1, screenCanvas.width);
    if (n < 34) prefetch(n + 3, screenCanvas.width);
    if (!playing) setPlayLabel();
  }

  function go(to, { fromPlay = false } = {}) {
    if (!fromPlay) stop();
    to = Math.max(1, Math.min(36, to));
    setFrame(to);
    if (wide) settle();
    else scrollToFrame(to);
  }

  reel.addEventListener('keydown', (e) => {
    const map = {
      ArrowLeft: n - 1, ArrowUp: n - 1, ArrowRight: n + 1, ArrowDown: n + 1,
      Home: 1, End: 36, PageUp: n - 6, PageDown: n + 6,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    go(map[e.key]);
  });
  prevBtn.addEventListener('click', () => go(n - 1));
  nextBtn.addEventListener('click', () => go(n + 1));
  scriptRows.forEach((row, i) => {
    row.querySelector('button').addEventListener('click', () => {
      go(SHOTS[i].from);
      if (!visibleEnough()) root.querySelector('.screen').scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    });
  });
  function visibleEnough() {
    const r = root.querySelector('.screen').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }

  // ---------- 넘겨 보기 ----------
  function setPlayLabel() {
    playBtn.textContent = playing ? '멈춤' : n === 36 ? '처음부터 넘겨 보기' : '넘겨 보기';
    playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }
  function tick() {
    if (!visible || document.hidden) { stop(); return; }
    if (n >= 36) { stop(); return; }
    go(n + 1, { fromPlay: true });
    playing = setTimeout(tick, FRAMES[n - 1].card ? PACE.card : PACE.frame);
  }
  function play() {
    if (n >= 36) go(1, { fromPlay: true });
    playing = setTimeout(tick, FRAMES[n - 1].card ? PACE.card : PACE.frame);
    setPlayLabel();
  }
  function stop() {
    if (!playing) return;
    clearTimeout(playing);
    playing = 0;
    setPlayLabel();
  }
  playBtn.addEventListener('click', () => {
    if (playing) stop();
    else play();
  });

  // ---------- visibility, resize ----------
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) visible = e.isIntersecting;
    if (!visible) stop();
  }, { rootMargin: '0px' });
  io.observe(root.querySelector('.trailer__stage'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 60);
  });
  ro.observe(reel);
  ro.observe(screenCanvas);
  wideQuery.addEventListener('change', () => {
    stop();
    layout();
  });

  // ---------- start ----------
  root.classList.add('is-ready');
  layout();
  setFrame(1);
  lastScreen = 0;
  showScreen();
  setPlayLabel();

  return { go, get frame() { return n; } };
}
