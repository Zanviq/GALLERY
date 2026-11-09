// The framing screen: a drawn studio (or the visitor's camera) behind a live crop guide.
// Geometry: a world point p lands on the print at f(p) = (W/2, H/2) + s * R(phi) * (p - c), in mm.
import { cm } from './formats.js';
import { SITTERS, shapes, drawShapes, landmarks, toWorld, PIVOT, INK, FLASH } from './sitter.js';

const BLUE = '#B9D3EA';
const DEG = Math.PI / 180;
const BACKDROP = { x0: -150, x1: 150, y0: -150, y1: 440 };
const WORLD = { x0: -460, x1: 460, y0: -320, y1: 560 };
const S_MIN = 0.08, S_MAX = 0.6, PHI_MAX = 15;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fmt1 = (n) => n.toFixed(1);
const cmRange = (r) => `${cm(r[0], 1)}–${cm(r[1], 1)}`;

export function createStudio(els, hooks) {
  const { screen, canvas, guide, frozen, checks, sum, how, state, announce } = els;
  const ctx = canvas.getContext('2d');
  const st = {
    format: hooks.format, sitter: 0, mode: 'drawn', video: null,
    cam: { s: 0.13, cx: 0, cy: 0, phi: 0 },
    roll: null, bgColor: hooks.format.backdrop,
    camBg: null,
  };
  const view = { w: 1, h: 1, dpr: 1, k: 8 };
  st.cam = startView(0);
  let sitterShapes = SITTERS.map((sp) => shapes(sp));
  let raf = 0, loop = 0, visible = true, lastResult = null;

  // ---------- geometry
  const sp = () => SITTERS[st.sitter];
  function marks() {
    const s = sp(), L = landmarks(s);
    return {
      crown: toWorld(s, L.crown), chin: toWorld(s, L.chin), eye: toWorld(s, L.eyeMid),
      shL: toWorld(s, L.shoulders[0]), shR: toWorld(s, L.shoulders[1]),
    };
  }
  function toFrame(p, cam = st.cam) {
    const F = st.format, a = cam.phi * DEG, dx = p[0] - cam.cx, dy = p[1] - cam.cy;
    return [F.w / 2 + cam.s * (dx * Math.cos(a) - dy * Math.sin(a)), F.h / 2 + cam.s * (dx * Math.sin(a) + dy * Math.cos(a))];
  }
  function toWorldFromFrame(q, cam = st.cam) {
    const F = st.format, a = -cam.phi * DEG, x = (q[0] - F.w / 2) / cam.s, y = (q[1] - F.h / 2) / cam.s;
    return [cam.cx + x * Math.cos(a) - y * Math.sin(a), cam.cy + x * Math.sin(a) + y * Math.cos(a)];
  }
  // screen px (relative to the screen's centre) <-> world
  function screenToWorld(q, cam = st.cam) {
    const a = -cam.phi * DEG, x = q[0] / (view.k * cam.s), y = q[1] / (view.k * cam.s);
    return [cam.cx + x * Math.cos(a) - y * Math.sin(a), cam.cy + x * Math.sin(a) + y * Math.cos(a)];
  }
  function anchorAt(p, q, cam) { // choose c so that world p sits under screen point q
    const a = -cam.phi * DEG, x = q[0] / (view.k * cam.s), y = q[1] / (view.k * cam.s);
    cam.cx = p[0] - (x * Math.cos(a) - y * Math.sin(a));
    cam.cy = p[1] - (x * Math.sin(a) + y * Math.cos(a));
  }
  function clampCam(cam = st.cam) {
    cam.s = Math.min(S_MAX, Math.max(S_MIN, cam.s));
    cam.phi = Math.min(PHI_MAX, Math.max(-PHI_MAX, cam.phi));
    const b = st.mode === 'camera' ? camBounds() : WORLD;
    cam.cx = Math.min(b.x1, Math.max(b.x0, cam.cx));
    cam.cy = Math.min(b.y1, Math.max(b.y0, cam.cy));
  }

  // where each customer first sits in the frame: small, off to one side, the roll's edge showing
  function startView(i = st.sitter) {
    const s = SITTERS[i], L = landmarks(s), eye = toWorld(s, L.eyeMid);
    const side = i === 1 ? -1 : 1;
    return { s: 0.13, cx: eye[0] + side * 36, cy: eye[1] + 72, phi: 0 };
  }
  // the shop's own framing, used for the file preview before any shot
  function idealView(i, F) {
    const s = SITTERS[i], L = landmarks(s), eye = toWorld(s, L.eyeMid);
    const cam = { s: (F.head[0] + F.head[1]) / 200, phi: -s.tilt, cx: 0, cy: 0 };
    const a = -cam.phi * DEG, x = 0, y = (F.h - (F.eye[0] + F.eye[1]) / 2 - F.h / 2) / cam.s;
    cam.cx = eye[0] - (x * Math.cos(a) - y * Math.sin(a));
    cam.cy = eye[1] - (x * Math.sin(a) + y * Math.cos(a));
    return cam;
  }

  // ---------- checks
  function evaluate() {
    const F = st.format, cam = st.cam;
    const corners = [[0, 0], [F.w, 0], [0, F.h], [F.w, F.h]].map((q) => toWorldFromFrame(q));
    const inside = corners.every(([x, y]) => x >= BACKDROP.x0 && x <= BACKDROP.x1 && y >= BACKDROP.y0 && y <= BACKDROP.y1);
    if (st.mode === 'camera') {
      const manual = { manual: true, state: '직접 보기', read: '카메라 화면은 재지 않습니다' };
      const bg = st.camBg == null ? { ok: false, state: '재는 중', read: '배경을 읽고 있습니다' }
        : st.camBg < 9 ? { ok: true, state: '맞음', read: `얼룩 ${fmt1(st.camBg)} (9 미만)` }
        : { ok: false, state: '아직', read: `얼룩 ${fmt1(st.camBg)}: 무늬나 그림자가 보입니다` };
      return { head: manual, eye: manual, center: manual, level: manual, bg };
    }
    const m = marks();
    const head = cam.s * 100;
    const eyeF = toFrame(m.eye);
    const eyeUp = F.h - eyeF[1];
    const off = eyeF[0] - F.w / 2;
    const tilt = sp().tilt + cam.phi;
    const r = {};
    r.head = head >= F.head[0] && head <= F.head[1]
      ? { ok: true, state: '맞음', read: `${cm(head)} cm (${cmRange(F.head)})` }
      : { ok: false, state: head < F.head[0] ? '작음' : '큼', read: `${cm(head)} cm (${cmRange(F.head)})` };
    r.eye = eyeUp >= F.eye[0] && eyeUp <= F.eye[1]
      ? { ok: true, state: '맞음', read: `아래에서 ${cm(eyeUp)} cm (${cmRange(F.eye)})` }
      : { ok: false, state: eyeUp < F.eye[0] ? '낮음' : '높음', read: `아래에서 ${cm(eyeUp)} cm (${cmRange(F.eye)})` };
    r.center = Math.abs(off) <= 1
      ? { ok: true, state: '맞음', read: Math.abs(off) < 0.05 ? '가운데' : `가운데에서 ${fmt1(Math.abs(off))} mm (1 mm 안)` }
      : { ok: false, state: '아직', read: `얼굴이 ${off > 0 ? '오른쪽' : '왼쪽'}으로 ${fmt1(Math.abs(off))} mm` };
    r.level = Math.abs(tilt) <= 1
      ? { ok: true, state: '맞음', read: Math.abs(tilt) < 0.05 ? '수평' : `${fmt1(Math.abs(tilt))}° (1° 안)` }
      : { ok: false, state: '아직', read: `화면 ${tilt > 0 ? '오른쪽' : '왼쪽'}이 ${fmt1(Math.abs(tilt))}° 낮음` };
    r.bg = inside ? { ok: true, state: '맞음', read: '배경지 안' } : { ok: false, state: '아직', read: '배경지 끝이 보입니다' };
    r.raw = { head, eyeUp, off, tilt };
    return r;
  }
  const KEYS = ['head', 'eye', 'center', 'level', 'bg'];
  const NAMES = { head: '머리 크기', eye: '눈높이', center: '좌우 중앙', level: '어깨 수평', bg: '배경 균일' };
  let announceTimer = 0, lastCount = -1, silentOnce = true; // silent on load, and when a customer change is announced by its description instead
  function showChecks(r) {
    let n = 0;
    for (const key of KEYS) {
      const li = checks.querySelector(`[data-check="${key}"]`), c = r[key];
      li.classList.toggle('is-ok', !!c.ok);
      li.classList.toggle('is-manual', !!c.manual);
      li.querySelector('[data-state]').textContent = c.state;
      li.querySelector('[data-read]').textContent = c.read;
      if (c.ok) n++;
    }
    sum.textContent = st.mode === 'camera' ? '카메라 화면에서는 배경만 잽니다' : `5개 중 ${n}개 맞음`;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      state.textContent = describe(r);
      if (st.mode === 'drawn' && n !== lastCount) {
        lastCount = n;
        if (silentOnce) { silentOnce = false; return; }
        const left = KEYS.filter((k) => !r[k].ok).map((k) => NAMES[k]);
        announce(n === 5 ? '5개 모두 맞았습니다. 셔터를 누르세요.' : `5개 중 ${n}개 맞음. 아직: ${left.join(', ')}.`);
      }
    }, 600);
  }
  function describe(r) {
    const F = st.format;
    if (st.mode === 'camera') return `${F.name} 가이드, 카메라 화면.`;
    return `${F.name} 가이드, 손님 ${sp().id}. 머리 ${r.head.read}. 눈높이 ${r.eye.read}. ${r.center.read}. ${r.level.read}. ${r.bg.read}.`;
  }

  // ---------- drawing
  function drawStudio(c) {
    c.lineCap = 'round';
    c.strokeStyle = FLASH;
    c.globalAlpha = 0.55;
    c.lineWidth = 1.6;
    // roll stands and the paper roll
    c.beginPath();
    c.moveTo(BACKDROP.x0 - 14, BACKDROP.y0 - 30); c.lineTo(BACKDROP.x0 - 14, WORLD.y1 + 40);
    c.moveTo(BACKDROP.x1 + 14, BACKDROP.y0 - 30); c.lineTo(BACKDROP.x1 + 14, WORLD.y1 + 40);
    c.moveTo(BACKDROP.x0 - 30, BACKDROP.y0 - 14); c.lineTo(BACKDROP.x1 + 30, BACKDROP.y0 - 14);
    c.stroke();
    c.strokeRect(BACKDROP.x0 - 6, BACKDROP.y0 - 22, BACKDROP.x1 - BACKDROP.x0 + 12, 18);
    // key light: a softbox on a stand, left
    c.beginPath();
    c.moveTo(-372, -150); c.lineTo(-262, -118); c.lineTo(-262, 0); c.lineTo(-372, 32); c.closePath();
    c.moveTo(-262, -59); c.lineTo(-240, -59);
    c.moveTo(-300, 14); c.lineTo(-300, 520); c.moveTo(-300, 520); c.lineTo(-340, 580); c.moveTo(-300, 520); c.lineTo(-260, 580);
    c.stroke();
    // fill light: an umbrella, right
    c.beginPath();
    c.moveTo(352, -170); c.quadraticCurveTo(250, -150, 230, -40); c.quadraticCurveTo(300, -60, 352, -170);
    c.moveTo(300, -100); c.lineTo(330, 560);
    c.stroke();
    c.globalAlpha = 0.18;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-262, -110 + i * 13.5); c.lineTo(-372, -142 + i * 21); c.stroke(); }
    c.globalAlpha = 1;
    // the paper
    const col = (name) => name === 'blue' ? BLUE : FLASH;
    c.fillStyle = col(st.roll ? st.roll.from : st.bgColor);
    c.fillRect(BACKDROP.x0, BACKDROP.y0, BACKDROP.x1 - BACKDROP.x0, BACKDROP.y1 - BACKDROP.y0);
    if (st.roll) {
      const hgt = (BACKDROP.y1 - BACKDROP.y0) * st.roll.p;
      c.fillStyle = col(st.roll.to);
      c.fillRect(BACKDROP.x0, BACKDROP.y0, BACKDROP.x1 - BACKDROP.x0, hgt);
      c.strokeStyle = INK; c.globalAlpha = 0.4; c.lineWidth = 2;
      c.beginPath(); c.moveTo(BACKDROP.x0, BACKDROP.y0 + hgt); c.lineTo(BACKDROP.x1, BACKDROP.y0 + hgt); c.stroke();
      c.globalAlpha = 1;
    }
  }
  function drawSitter(c, i = st.sitter) {
    const s = SITTERS[i];
    c.save();
    c.translate(PIVOT[0] + s.seat[0], PIVOT[1] + s.seat[1]);
    c.rotate(s.tilt * DEG);
    c.translate(-PIVOT[0], -PIVOT[1]);
    drawShapes(c, sitterShapes[i]);
    c.restore();
  }
  function camRect() {
    const v = st.video, ar = v && v.videoWidth ? v.videoWidth / v.videoHeight : 4 / 3;
    const hh = 560, ww = hh * ar;
    return { x: -ww / 2, y: 120 - hh / 2, w: ww, h: hh };
  }
  function camBounds() { const r = camRect(); return { x0: r.x, x1: r.x + r.w, y0: r.y, y1: r.y + r.h }; }
  function drawWorld(c, i) {
    if (st.mode === 'camera' && st.video) {
      const r = camRect();
      c.save();
      c.translate(r.x + r.w, r.y); c.scale(-1, 1); // mirrored like a mirror
      c.drawImage(st.video, 0, 0, r.w, r.h);
      c.restore();
      return;
    }
    drawStudio(c);
    drawSitter(c, i);
  }
  function applyCam(c, cam = st.cam) {
    c.rotate(cam.phi * DEG); c.scale(cam.s, cam.s); c.translate(-cam.cx, -cam.cy);
  }

  function render() {
    raf = 0;
    const { w, h, dpr, k } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(k, k);
    applyCam(ctx);
    drawWorld(ctx);
    ctx.restore();
    lastResult = evaluate();
    drawGuide(lastResult);
    showChecks(lastResult);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }

  // ---------- the guide overlay (SVG, crisp text)
  function drawGuide(r) {
    const { w, h, k } = view, F = st.format;
    const fw = F.w * k, fh = F.h * k, fx = (w - fw) / 2, fy = (h - fh) / 2;
    const Y = (mmFromTop) => fy + mmFromTop * k;
    const band = (a, b, label) => {
      const y0 = Y(a), y1 = Y(b);
      return `<rect x="${fx}" y="${y0}" width="${fw}" height="${y1 - y0}" fill="rgb(31 90 146 / .16)"/>` +
        `<path d="M${fx} ${y0}h${fw}M${fx} ${y1}h${fw}" stroke="#1F5A92" stroke-width="1.5" stroke-dasharray="5 4"/>` +
        // a small guide-blue tag, so the word stays legible however narrow the band is
        `<rect x="${fx}" y="${(y0 + y1) / 2 - 8}" width="${label.length * 12 + 8}" height="16" fill="#1F5A92"/>` +
        `<text class="guide-text" x="${fx + 4}" y="${(y0 + y1) / 2 + 4.5}" fill="#FFFFFF">${label}</text>`;
    };
    let s = `<path d="M0 0H${w}V${h}H0Z M${fx} ${fy}v${fh}h${fw}v${-fh}Z" fill="rgb(16 18 20 / .62)" fill-rule="evenodd"/>`;
    s += band(F.crown[0], F.crown[1], '정수리');
    s += band(F.h - F.eye[1], F.h - F.eye[0], '눈');
    s += band(F.chin[0], F.chin[1], '턱');
    s += `<path d="M${fx + fw / 2} ${fy}v${fh}" stroke="#1F5A92" stroke-width="1" stroke-dasharray="3 4"/>`;
    // crop corners
    const L = 16, o = 5;
    s += `<path d="M${fx - o} ${fy + L}V${fy - o}H${fx + L}M${fx + fw - L} ${fy - o}H${fx + fw + o}V${fy + L}M${fx + fw + o} ${fy + fh - L}V${fy + fh + o}H${fx + fw - L}M${fx + L} ${fy + fh + o}H${fx - o}V${fy + fh - L}" fill="none" stroke="#FFFFFF" stroke-width="2"/>`;
    // rulers: left counts up from the bottom (the eye line is measured from there), bottom from the left
    let ticks = '', labels = '';
    for (let mm = 0; mm <= F.h; mm++) {
      const y = fy + fh - mm * k, len = mm % 10 === 0 ? 10 : mm % 5 === 0 ? 7 : 4;
      ticks += `M${fx - o - 3} ${y}h${-len}`;
      if (mm % 10 === 0 && mm > 0) labels += `<text class="guide-text" x="${fx - o - 17}" y="${y + 4}" text-anchor="end" fill="#FFFFFF">${mm / 10}</text>`;
    }
    for (let mm = 0; mm <= F.w; mm++) {
      const x = fx + mm * k, len = mm % 10 === 0 ? 10 : mm % 5 === 0 ? 7 : 4;
      ticks += `M${x} ${fy + fh + o + 3}v${len}`;
      if (mm % 10 === 0 && mm > 0) labels += `<text class="guide-text" x="${x}" y="${fy + fh + o + 27}" text-anchor="middle" fill="#FFFFFF">${mm / 10}</text>`;
    }
    s += `<path d="${ticks}" stroke="#FFFFFF" stroke-width="1" opacity=".85"/>` + labels;
    s += `<text class="guide-text" x="12" y="20" fill="#FFFFFF">${F.name} ${cm(F.w, F.w % 10 ? 1 : 0)} × ${cm(F.h, F.h % 10 ? 1 : 0)} cm</text>`;
    // status line: the checks at a glance, visible while adjusting on a phone
    if (r) {
      const items = st.mode === 'camera' ? [['bg', '배경']] : [['head', '머리'], ['eye', '눈'], ['center', '중앙'], ['level', '수평'], ['bg', '배경']];
      let x = 12;
      for (const [key, word] of items) {
        const ok = r[key].ok;
        s += `<rect x="${x + 0.75}" y="30.75" width="9.5" height="9.5" fill="${ok ? '#FFFFFF' : 'none'}" stroke="#FFFFFF" stroke-width="1.5"/>`;
        s += `<text class="guide-text" x="${x + 15}" y="40" fill="#FFFFFF">${word}</text>`;
        x += 15 + word.length * 12 + 10;
      }
      if (st.mode === 'camera') s += `<text class="guide-text" x="${x}" y="40" fill="#FFFFFF">나머지는 직접 보기</text>`;
    }
    if (st.mode === 'drawn') {
      const m = marks();
      const P = (p) => { const q = toFrame(p); return [fx + q[0] * k, fy + q[1] * k]; };
      const cr = P(m.crown), ch = P(m.chin), ey = P(m.eye), a = P(m.shL), b = P(m.shR);
      // head height as a dimension line right of the frame
      const dx = Math.min(w - 10, fx + fw + o + 12);
      const yc = Math.max(4, Math.min(h - 4, cr[1])), yh = Math.max(4, Math.min(h - 4, ch[1]));
      s += `<path d="M${dx} ${yc}V${yh}M${dx - 5} ${yc}h10M${dx - 5} ${yh}h10" stroke="#FFFFFF" stroke-width="1.5"/>`;
      s += `<path d="M${dx - 6} ${cr[1]}H${cr[0]}M${dx - 6} ${ch[1]}H${ch[0]}" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2 3" opacity=".8"/>`;
      s += `<text class="guide-text" x="${w - 12}" y="20" text-anchor="end" fill="#FFFFFF">머리 ${cm(st.cam.s * 100)} cm</text>`;
      // eye line ticks on both frame edges
      s += `<path d="M${fx - 9} ${ey[1]}h9M${fx + fw} ${ey[1]}h9" stroke="#FFFFFF" stroke-width="2.5"/>`;
      // shoulder line
      s += `<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="6 5"/>`;
      s += `<circle cx="${a[0]}" cy="${a[1]}" r="3.5" fill="#FFFFFF"/><circle cx="${b[0]}" cy="${b[1]}" r="3.5" fill="#FFFFFF"/>`;
    }
    guide.setAttribute('viewBox', `0 0 ${w} ${h}`);
    guide.innerHTML = s;
  }

  // ---------- size
  function resize() {
    const r = screen.getBoundingClientRect();
    view.w = Math.max(1, r.width); view.h = Math.max(1, r.height);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.k = Math.min(view.w / 62, view.h / 66);
    canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
    render();
  }
  new ResizeObserver(resize).observe(screen);

  // ---------- input
  const pts = new Map();
  let gest = null;
  const local = (x, y) => { const r = screen.getBoundingClientRect(); return [x - r.left - r.width / 2, y - r.top - r.height / 2]; };
  function beginGesture() {
    const list = [...pts.values()];
    if (list.length >= 2) {
      const [p, q] = list;
      gest = { two: true, d0: Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, a0: Math.atan2(q[1] - p[1], q[0] - p[0]), mid: local((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), cam: { ...st.cam }, rot: false };
      gest.anchor = screenToWorld(gest.mid, gest.cam);
    } else if (list.length === 1) {
      gest = { two: false, last: list[0] };
    } else gest = null;
  }
  screen.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    screen.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    screen.classList.add('is-dragging');
    beginGesture();
  });
  screen.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !gest) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const cam = st.cam;
    if (!gest.two) {
      const [x, y] = pts.get(e.pointerId), dx = x - gest.last[0], dy = y - gest.last[1];
      gest.last = [x, y];
      const a = -cam.phi * DEG, ux = dx / (view.k * cam.s), uy = dy / (view.k * cam.s);
      cam.cx -= ux * Math.cos(a) - uy * Math.sin(a);
      cam.cy -= ux * Math.sin(a) + uy * Math.cos(a);
    } else {
      const [p, q] = [...pts.values()];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      let da = (ang - gest.a0) / DEG;
      if (da > 180) da -= 360; if (da < -180) da += 360;
      if (Math.abs(da) > 3) gest.rot = true;
      cam.s = gest.cam.s * d / gest.d0;
      cam.phi = gest.cam.phi + (gest.rot ? da : 0);
      clampCam(cam);
      anchorAt(gest.anchor, local((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), cam);
    }
    clampCam();
    schedule();
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (!pts.size) screen.classList.remove('is-dragging');
    beginGesture();
  };
  screen.addEventListener('pointerup', up);
  screen.addEventListener('pointercancel', up);
  screen.addEventListener('lostpointercapture', up);
  screen.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return; // plain wheel scrolls the page
    e.preventDefault();
    const q = local(e.clientX, e.clientY), p = screenToWorld(q);
    st.cam.s *= Math.exp(-e.deltaY * 0.01);
    clampCam(); anchorAt(p, q, st.cam); clampCam();
    schedule();
  }, { passive: false });

  function move(dx, dy, big) {
    const cam = st.cam, step = big ? 2 : 0.5, a = -cam.phi * DEG;
    const ux = dx * step / cam.s, uy = dy * step / cam.s;
    cam.cx -= ux * Math.cos(a) - uy * Math.sin(a);
    cam.cy -= ux * Math.sin(a) + uy * Math.cos(a);
    clampCam(); schedule();
  }
  function zoom(dir, big) { st.cam.s *= Math.pow(big ? 1.06 : 1.015, dir); clampCam(); schedule(); }
  function tilt(dir, big) { st.cam.phi = Math.round((st.cam.phi + dir * (big ? 2 : 0.5)) * 10) / 10; clampCam(); schedule(); }
  function reset() {
    st.cam = st.mode === 'camera' ? cameraStart() : startView();
    schedule();
  }
  screen.addEventListener('keydown', (e) => {
    const big = e.shiftKey;
    const k = e.key;
    if (k === 'ArrowLeft') move(-1, 0, big);
    else if (k === 'ArrowRight') move(1, 0, big);
    else if (k === 'ArrowUp') move(0, -1, big);
    else if (k === 'ArrowDown') move(0, 1, big);
    else if (k === '+' || k === '=' || e.code === 'NumpadAdd') zoom(1, big);
    else if (k === '-' || k === '_' || e.code === 'NumpadSubtract') zoom(-1, big);
    else if (k === '[' || k === '{') tilt(-1, big);
    else if (k === ']' || k === '}') tilt(1, big);
    else return;
    e.preventDefault();
  });

  // ---------- modes
  function cameraStart() { return { s: 0.16, cx: 0, cy: 90, phi: 0 }; }
  function useCamera(video) {
    st.mode = 'camera'; st.video = video; st.camBg = null;
    st.cam = cameraStart();
    lastCount = -1;
    startLoop();
    schedule();
  }
  function useDrawing(next = false) {
    const wasCamera = st.mode === 'camera';
    st.mode = 'drawn'; st.video = null; stopLoop();
    if (next || wasCamera) {
      if (next) st.sitter = (st.sitter + 1) % SITTERS.length;
      st.cam = startView();
      lastCount = -1;
      silentOnce = !!next;
    }
    schedule();
    return SITTERS[st.sitter];
  }
  // camera mode redraws every frame while visible; the drawn studio only on change
  let bgTimer = 0;
  function startLoop() {
    stopLoop();
    const tick = (t) => {
      loop = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      render();
      if (t - bgTimer > 400) { bgTimer = t; measureCameraBackground(); }
    };
    loop = requestAnimationFrame(tick);
  }
  function stopLoop() { if (loop) cancelAnimationFrame(loop); loop = 0; }
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (st.mode === 'camera') { if (visible) startLoop(); else stopLoop(); }
  }).observe(screen);

  // camera-mode background: spread of luminance in the top band and the two upper side bands of the cut
  const probe = document.createElement('canvas');
  function measureCameraBackground() {
    if (!st.video || !st.video.videoWidth) return;
    const F = st.format, W = 60, H = Math.round(60 * F.h / F.w);
    probe.width = W; probe.height = H;
    const c = probe.getContext('2d', { willReadFrequently: true });
    c.setTransform(W / F.w, 0, 0, H / F.h, 0, 0);
    c.fillStyle = INK; c.fillRect(0, 0, F.w, F.h);
    c.translate(F.w / 2, F.h / 2); applyCam(c); drawWorld(c);
    const d = c.getImageData(0, 0, W, H).data;
    let n = 0, sum1 = 0, sum2 = 0;
    for (let y = 0; y < H * 0.55; y++) for (let x = 0; x < W; x++) {
      if (y > H * 0.14 && x > W * 0.12 && x < W * 0.88) continue;
      const i = (y * W + x) * 4, l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      n++; sum1 += l; sum2 += l * l;
    }
    const mean = sum1 / n;
    st.camBg = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  }

  // ---------- format and backdrop roll
  function setFormat(F) {
    st.format = F;
    if (F.backdrop !== st.bgColor && st.mode === 'drawn') {
      const from = st.bgColor;
      st.bgColor = F.backdrop;
      if (reduced.matches) { st.roll = null; }
      else {
        const t0 = performance.now();
        st.roll = { from, to: F.backdrop, p: 0 };
        const step = (t) => {
          if (!st.roll) return;
          st.roll.p = Math.min(1, (t - t0) / 420);
          st.roll.p = 1 - Math.pow(1 - st.roll.p, 3);
          if ((t - t0) >= 420) st.roll = null; else requestAnimationFrame(step);
          render();
        };
        requestAnimationFrame(step);
      }
    } else st.bgColor = F.backdrop;
    lastCount = -1;
    schedule();
  }

  // ---------- capture (300 dpi by default); camera shots come out the right way round
  function capture(dpi = 300, opt = {}) {
    const F = opt.format || st.format;
    const cam = opt.cam || st.cam;
    const i = opt.sitter ?? st.sitter;
    const pw = Math.round(F.w / 25.4 * dpi), ph = Math.round(F.h / 25.4 * dpi);
    const out = document.createElement('canvas');
    out.width = pw; out.height = ph;
    const c = out.getContext('2d');
    if (st.mode === 'camera' && !opt.cam) { c.translate(pw, 0); c.scale(-1, 1); }
    c.scale(pw / F.w, ph / F.h);
    c.fillStyle = INK; c.fillRect(0, 0, F.w, F.h);
    c.translate(F.w / 2, F.h / 2);
    applyCam(c, cam);
    if (opt.cam) { // shop framing preview: always the drawing, on the format's own roll
      const keep = { mode: st.mode, bg: st.bgColor, roll: st.roll };
      st.mode = 'drawn'; st.bgColor = F.backdrop; st.roll = null;
      drawWorld(c, i);
      st.mode = keep.mode; st.bgColor = keep.bg; st.roll = keep.roll;
    } else drawWorld(c, i);
    return out;
  }
  function freeze(ms) {
    frozen.hidden = false; screen.classList.add('is-frozen');
    setTimeout(() => { frozen.hidden = true; screen.classList.remove('is-frozen'); }, ms);
  }

  return {
    setFormat, move, zoom, tilt, reset, useCamera, useDrawing, capture, freeze,
    idealView, render: schedule,
    get result() { return lastResult || evaluate(); },
    get mode() { return st.mode; },
    get sitter() { return SITTERS[st.sitter]; },
    get format() { return st.format; },
    setHow(text) { how.textContent = text; },
  };
}
