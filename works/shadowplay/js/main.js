import { SHAPES, svgPath } from './puppets.js';
import { compile } from './scene.js';

// ---------------------------------------------------------------- palette, world
const BLUE = '#10335A', WHITE = '#FFFFFF', T06 = '#1E3F64', T14 = '#315071', T30 = '#58708C', T60 = '#9FADBD';
const FONT = '"Gamja Flower", "Malgun Gothic", sans-serif';

const STAGE_W = 120, SCREEN_H = 60, PLAN_D = 44;
const TOP = 5, GAP = 11, FLOOR = 8, BOTTOM = 5;
const WORLD_H = TOP + PLAN_D + GAP + SCREEN_H + FLOOR + BOTTOM;
const RAIL = [3, 14], LZ = [20, 42], LY = [2, 58], LX = [-4, 124], PXR = [-8, 128];
const LIGHT_R = 1.1, ROD_W = 0.5, ROD_END = -16;

const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceMQ.matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v) => Math.round(v);

// ---------------------------------------------------------------- state
const DEFAULTS = {
  house: { on: true, x: 24, y: 15, z: 6, flip: 1 },
  pine: { on: true, x: 44, y: 16, z: 10, flip: 1 },
  fox: { on: true, x: 72, y: 14.6, z: 9, flip: 1 },
  moon: { on: true, x: 98, y: 42, z: 3, flip: 1 },
  bearer: { on: false, x: 90, y: 20, z: 8, flip: -1 },
  boat: { on: false, x: 58, y: 10, z: 5, flip: 1 },
};
const ORDER = ['fox', 'bearer', 'house', 'pine', 'boat', 'moon'];
const puppets = ORDER.map((id) => {
  const shape = SHAPES.find((s) => s.id === id);
  return { kind: 'puppet', id, shape, name: shape.name, angle: 0, ...DEFAULTS[id] };
});
const lights = [
  { kind: 'light', id: 'l1', name: '빛 1', on: true, x: 62, y: 20, z: 34 },
  { kind: 'light', id: 'l2', name: '빛 2', on: false, x: 100, y: 44, z: 30 },
];
const byId = Object.fromEntries([...puppets, ...lights].map((o) => [o.id, o]));
let sel = null;            // last touched object (puppet or light)
let activeLight = lights[0];

// ---------------------------------------------------------------- dom
const $ = (s, r = document) => r.querySelector(s);
const drawing = $('[data-drawing]');
const canvas = $('[data-canvas]');
const ctx = canvas.getContext('2d');
const mask = document.createElement('canvas');
const mctx = mask.getContext('2d');
const targetsEl = $('[data-targets]');
const captionEl = $('[data-caption]');
const statusEl = $('[data-status]');
const showBtn = $('[data-show]');
const lightBtn = $('[data-light2]');
const toolName = $('[data-tool-name]');
const toolRow = $('[data-tool-row]');
const partsList = $('[data-parts]');
const IDLE_CAPTION = captionEl.textContent.trim();

// ---------------------------------------------------------------- geometry
function worldRings(p) {
  const a = (-p.angle * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  const f = p.flip;
  const out = [];
  for (const r of p.shape.rings) {
    let pts = r.pts.map(([x, y]) => {
      const fx = x * f;
      return [p.x + fx * c - y * s, p.y + fx * s + y * c];
    });
    if (f < 0) pts = pts.reverse();
    out.push({ hole: r.hole, pts });
  }
  const w = ROD_W / 2;
  out.push({ hole: false, rod: true, pts: [[p.x - w, ROD_END], [p.x + w, ROD_END], [p.x + w, p.y], [p.x - w, p.y]] });
  return out;
}
const kOf = (L, p) => L.z / (L.z - p.z);
function extentX(rings) {
  let a = Infinity, b = -Infinity;
  for (const r of rings) if (!r.rod) for (const [x] of r.pts) { if (x < a) a = x; if (x > b) b = x; }
  return [a, b];
}

// ---------------------------------------------------------------- layout
let cw = 0, ch = 0, dpr = 1, s = 6, ox = 0, top = 0, xl = -10, xr = 132, fs = 16;
const X = (x) => ox + x * s;
const PZ = (z) => top + (TOP + PLAN_D - z) * s;
const EY = (y) => top + (TOP + PLAN_D + GAP + SCREEN_H - y) * s;

function layout() {
  const r = drawing.getBoundingClientRect();
  cw = r.width; ch = r.height;
  const narrow = cw < 640;
  xl = narrow ? -5 : -10; xr = narrow ? 125 : 132;
  const toFloor = TOP + PLAN_D + GAP + SCREEN_H + 6;       // cm from the top margin to the floor line
  const s0 = Math.min(cw / (xr - xl), ch / WORLD_H);
  fs = Math.round(clamp(s0 * 3.3, 15, 21));
  const below = fs + 18;                                  // the view title under the floor line
  s = Math.min(cw / (xr - xl), (ch - below) / toFloor);
  ox = (cw - (xr - xl) * s) / 2 - xl * s;
  // the caption lines up with the drawing's left edge
  drawing.parentElement.style.setProperty('--draw-left', `${Math.max(0, X(xl) + 6).toFixed(0)}px`);
  top = Math.max(0, (ch - (toFloor * s + below)) / 2);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  invalidate();
}

// ---------------------------------------------------------------- shadows
function vogel(i, n) {
  if (n === 1) return [0, 0];
  const r = Math.sqrt((i + 0.5) / n), t = i * 2.399963;
  return [r * Math.cos(t), r * Math.sin(t)];
}
let cache = new Map();
function ringsOf(p) {
  let r = cache.get(p);
  if (!r) { r = worldRings(p); cache.set(p, r); }
  return r;
}

function renderShadows() {
  const sc = s * dpr;
  const sw = Math.max(1, Math.round(STAGE_W * sc)), sh = Math.max(1, Math.round(SCREEN_H * sc));
  if (mask.width !== sw || mask.height !== sh) { mask.width = sw; mask.height = sh; }
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.globalCompositeOperation = 'source-over';
  mctx.clearRect(0, 0, sw, sh);
  const on = puppets.filter((p) => p.on);
  const lit = lights.filter((l) => l.on);
  if (!on.length) return false;
  mctx.globalCompositeOperation = 'lighter';
  for (const L of lit) {
    let kmax = 1;
    for (const p of on) kmax = Math.max(kmax, kOf(L, p));
    const pen = (kmax - 1) * 2 * LIGHT_R * sc;
    const n = pen < 1.2 ? 1 : clamp(Math.ceil(pen / 2.4), 3, 16);
    mctx.fillStyle = `rgba(255,255,255,${1 / (n * lit.length)})`;
    for (let i = 0; i < n; i++) {
      const [vx, vy] = vogel(i, n);
      const lx = L.x + vx * LIGHT_R, ly = L.y + vy * LIGHT_R;
      mctx.beginPath();
      for (const p of on) {
        const k = kOf(L, p);
        for (const r of ringsOf(p)) {
          const pts = r.pts;
          for (let j = 0; j < pts.length; j++) {
            const x = (lx + k * (pts[j][0] - lx)) * sc;
            const y = (SCREEN_H - (ly + k * (pts[j][1] - ly))) * sc;
            if (j) mctx.lineTo(x, y); else mctx.moveTo(x, y);
          }
          mctx.closePath();
        }
      }
      mctx.fill('nonzero');
    }
  }
  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = BLUE;
  mctx.fillRect(0, 0, sw, sh);
  mctx.globalCompositeOperation = 'source-over';
  return true;
}

// ---------------------------------------------------------------- drawing helpers
function line(x0, y0, x1, y1, color, w = 1, dash) {
  ctx.beginPath();
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.setLineDash(dash || []);
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.setLineDash([]);
}
function hatchRect(x0, y0, x1, y1, color, pitch = 5) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1;
  const h = y1 - y0;
  for (let x = x0 - h; x < x1 + h; x += pitch) { ctx.moveTo(x, y1); ctx.lineTo(x + h, y0); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = WHITE; ctx.lineWidth = 1.2;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
}
function text(str, x, y, color, align = 'left', size = fs, base = 'alphabetic') {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}
function arrowHead(x, y, dir, color) {
  const a = 6, b = 3;
  ctx.beginPath(); ctx.fillStyle = color;
  ctx.moveTo(x, y); ctx.lineTo(x - b, y - dir * a); ctx.lineTo(x + b, y - dir * a); ctx.closePath(); ctx.fill();
}
function lampSymbol(cx, cy, active) {
  const r = Math.max(8, 1.9 * s);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = BLUE; ctx.fill();
  ctx.strokeStyle = WHITE; ctx.lineWidth = active ? 2.6 : 1.6; ctx.stroke();
  const d = r * 0.7071;
  ctx.beginPath();
  ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
  ctx.lineWidth = active ? 2 : 1.3; ctx.stroke();
  return r;
}

// ---------------------------------------------------------------- render
function drawPlan() {
  const z0 = PZ(0);
  const placed = [];
  const free = (box) => !placed.some((q) => !(box[2] < q[0] || box[0] > q[2] || box[3] < q[1] || box[1] > q[3]));
  // a label with a blue backing so lines never cut through it; returns false if it would collide
  const label = (str, x, y, color, align, size, force) => {
    ctx.font = `${size}px ${FONT}`;
    const w = ctx.measureText(str).width;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const box = [x0 - 3, y - size * 0.82, x0 + w + 3, y + size * 0.28];
    if (!force && !free(box)) return false;
    placed.push(box);
    ctx.fillStyle = BLUE; ctx.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
    text(str, x, y, color, align, size);
    return true;
  };

  // view title
  const ty = PZ(PLAN_D) + fs;
  const w = text('평면도', X(xl) + 6, ty, WHITE, 'left', fs + 2);
  line(X(xl) + 6, ty + 5, X(xl) + 6 + w, ty + 5, WHITE, 1);
  const w2 = text('위에서 본 무대', X(xl) + 14 + w, ty, T60, 'left', fs - 1);
  placed.push([X(xl), ty - fs - 4, X(xl) + 14 + w + w2 + 4, ty + 8]);

  // rail
  const ra = PZ(RAIL[1]), rb = PZ(RAIL[0]);
  ctx.fillStyle = T06; ctx.fillRect(X(PXR[0]), ra, X(PXR[1]) - X(PXR[0]), rb - ra);
  line(X(PXR[0]), ra, X(PXR[1]), ra, T30, 1);
  line(X(PXR[0]), rb, X(PXR[1]), rb, T30, 1);
  ctx.beginPath(); ctx.strokeStyle = T14; ctx.lineWidth = 1;
  for (let x = 0; x <= STAGE_W; x += 10) { ctx.moveTo(X(x), rb); ctx.lineTo(X(x), rb - (x % 50 ? 0.9 : 1.8) * s); }
  ctx.stroke();
  hatchRect(X(PXR[0]) - 1.6 * s, ra, X(PXR[0]), rb, T30, 4);
  hatchRect(X(PXR[1]), ra, X(PXR[1]) + 1.6 * s, rb, T30, 4);

  // screen line + posts
  line(X(0), z0, X(STAGE_W), z0, WHITE, Math.max(2, 0.5 * s));
  hatchRect(X(-1.8), z0 - 0.9 * s, X(0), z0 + 0.9 * s, T30, 4);
  hatchRect(X(STAGE_W), z0 - 0.9 * s, X(STAGE_W + 1.8), z0 + 0.9 * s, T30, 4);

  const lit = lights.filter((l) => l.on);
  for (const L of lit) {
    line(X(L.x), PZ(L.z), X(0), z0, T30, 1, [3, 5]);
    line(X(L.x), PZ(L.z), X(STAGE_W), z0, T30, 1, [3, 5]);
  }

  // construction for the selected puppet: rays past its edges, its footprint, drop lines
  const sp = sel && sel.kind === 'puppet' && sel.on ? sel : null;
  let kLabel = null;
  if (sp) {
    const [a, b] = extentX(ringsOf(sp));
    lit.forEach((L, i) => {
      const k = kOf(L, sp);
      const xa = L.x + k * (a - L.x), xb = L.x + k * (b - L.x);
      line(X(L.x), PZ(L.z), X(xa), z0, T60, 1, [5, 4]);
      line(X(L.x), PZ(L.z), X(xb), z0, T60, 1, [5, 4]);
      const ca = clamp(xa, 0, STAGE_W), cb = clamp(xb, 0, STAGE_W);
      if (cb > ca) {
        line(X(ca), z0 + 3, X(cb), z0 + 3, T60, 3);
        line(X(ca), z0 + 4, X(ca), EY(SCREEN_H) - 2, T30, 1, [2, 4]);
        line(X(cb), z0 + 4, X(cb), EY(SCREEN_H) - 2, T30, 1, [2, 4]);
      }
      if (i === 0) kLabel = { k, mid: clamp((xa + xb) / 2, 10, STAGE_W - 10) };
    });
  }

  // dimension line: depth of the active light
  const L = activeLight.on ? activeLight : lights[0];
  const right = X(L.x) + 3.6 * s + fs * 5 < cw;
  const dx = X(L.x) + (right ? 1 : -1) * 3.6 * s;
  const dly = PZ(L.z);
  line(X(L.x) + (right ? 2.4 : -2.4) * s, dly, dx + (right ? 6 : -6), dly, T60, 1);
  line(dx, dly, dx, z0 - 1, T60, 1);
  arrowHead(dx, dly, -1, T60);
  arrowHead(dx, z0 - 1, 1, T60);

  // puppets as sheets seen from above
  ctx.save();
  ctx.beginPath(); ctx.rect(X(xl), PZ(PLAN_D) - 4, X(xr) - X(xl), z0 - PZ(PLAN_D) + 8); ctx.clip();
  const segs = [];
  for (const p of puppets) {
    if (!p.on) continue;
    const [a, b] = extentX(ringsOf(p));
    const y = PZ(p.z);
    line(X(a), y, X(b), y, WHITE, p === sel ? 4 : 2.4);
    ctx.beginPath(); ctx.arc(X(p.x), y, Math.max(3.2, 0.8 * s), 0, Math.PI * 2);
    ctx.fillStyle = BLUE; ctx.fill(); ctx.strokeStyle = WHITE; ctx.lineWidth = 1.4; ctx.stroke();
    segs.push({ p, a, b, y });
  }
  ctx.restore();

  // lights
  const lamps = lit.map((Lx) => ({ Lx, r: lampSymbol(X(Lx.x), PZ(Lx.z), Lx === sel) }));

  // labels last, on top, without collisions
  const lfs = fs - 1;
  for (const { Lx, r } of lamps) {
    const lx = X(Lx.x), ly = PZ(Lx.z) + lfs * 0.33;
    placed.push([lx - r - 2, PZ(Lx.z) - r - 2, lx + r + 2, PZ(Lx.z) + r + 2]);
    const off = Math.max(r + 7, 27);
    if (!label(Lx.name, lx - off, ly, Lx === sel ? WHITE : T60, 'right', lfs)) label(Lx.name, lx + off, ly, Lx === sel ? WHITE : T60, 'left', lfs, true);
  }
  {
    const my = (dly + z0) / 2 + lfs * 0.33;
    const str = `막에서 ${round(L.z)}cm`;
    const tx = right ? dx + 7 : dx - 7;
    if (!label(str, tx, my, T60, right ? 'left' : 'right', lfs)) label(str, tx, dly + (z0 - dly) * 0.3, T60, right ? 'left' : 'right', lfs, true);
  }
  if (kLabel) label(`그림자 ${kLabel.k.toFixed(1)}배`, X(kLabel.mid), (z0 + EY(SCREEN_H)) / 2 + fs * 0.33, WHITE, 'center', fs, true);
  const railX = X(Math.max(PXR[0], xl + 1));
  label('인형 레일', railX, PZ(RAIL[1]) - 6, T60, 'left', fs - 1);
  label('종이 막', X(STAGE_W), z0 + fs + 2, T60, 'right', fs - 1);
  for (const { p, a, b, y } of segs.sort((m, n) => (n.p === sel) - (m.p === sel))) {
    if (b < xl || a > xr) continue;
    const cx = clamp(X((a + b) / 2), X(xl) + 30, X(xr) - 30);
    const col = p === sel ? WHITE : T60;
    if (!label(p.name, cx, y - 7, col, 'center', lfs)) label(p.name, cx, y + lfs + 4, col, 'center', lfs, p === sel);
  }
}

function drawElevation() {
  const x0 = X(0), x1 = X(STAGE_W), yTop = EY(SCREEN_H), yBot = EY(0);
  // posts, floor
  hatchRect(X(-1.4), yBot, x0, EY(-6), T30, 4);
  hatchRect(x1, yBot, X(STAGE_W + 1.4), EY(-6), T30, 4);
  line(X(xl) + 4, EY(-6), X(xr) - 4, EY(-6), WHITE, 1.5);
  ctx.beginPath(); ctx.strokeStyle = T30; ctx.lineWidth = 1;
  for (let x = X(xl) + 8; x < X(xr) - 6; x += 7) { ctx.moveTo(x, EY(-6)); ctx.lineTo(x - 5, EY(-6) + 5); }
  ctx.stroke();
  // frame + paper
  ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5;
  ctx.strokeRect(X(-1.4), EY(SCREEN_H + 1.4), X(STAGE_W + 1.4) - X(-1.4), EY(0) - EY(SCREEN_H + 1.4));
  ctx.fillStyle = WHITE; ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  if (renderShadows()) ctx.drawImage(mask, x0, yTop, x1 - x0, yBot - yTop);

  // hidden lines (behind the paper): the selected puppet's real outline, the light markers
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, yTop, x1 - x0, yBot - yTop); ctx.clip();
  const sp = sel && sel.kind === 'puppet' && sel.on ? sel : null;
  if (sp) {
    ctx.setLineDash([5, 4]); ctx.strokeStyle = T30; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const r of ringsOf(sp)) {
      r.pts.forEach(([x, y], j) => (j ? ctx.lineTo(X(x), EY(y)) : ctx.moveTo(X(x), EY(y))));
      ctx.closePath();
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
  for (const L of lights) {
    if (!L.on || show.playing) continue;
    const cx = X(L.x), cy = EY(L.y);
    const inside = L.x >= 0 && L.x <= STAGE_W && L.y <= SCREEN_H;
    const col = inside ? T30 : T60;
    const r = Math.max(7, 1.5 * s);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = col; ctx.lineWidth = L === sel ? 2 : 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const d = r * 0.7071;
    ctx.beginPath(); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d); ctx.stroke();
  }

  // view title
  const ty = EY(-6) + fs + 10;
  const w = text('정면도', X(xl) + 6, ty, WHITE, 'left', fs + 2);
  line(X(xl) + 6, ty + 5, X(xl) + 6 + w, ty + 5, WHITE, 1);
  text('관객이 보는 막', X(xl) + 14 + w, ty, T60, 'left', fs - 1);
}

function draw() {
  cache = new Map();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  drawElevation();
  drawPlan();
  placeTargets();
}

// ---------------------------------------------------------------- loop
let raf = 0, last = 0, inView = true;
const anims = [];
const show = { playing: false, t: 0, step: -1, saved: null, prog: compile() };
const canRun = () => !document.hidden && inView;

function invalidate() { if (!raf) raf = requestAnimationFrame(frame); }
function frame(now) {
  raf = 0;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  let more = false, dirty = true;
  if (show.playing) {
    if (canRun()) {
      show.t += dt;
      if (show.t >= show.prog.duration) { stopShow(true); }
      else {
        const { state, step } = show.prog.evaluate(show.t, reduced());
        if (reduced() && step === show.step) dirty = false;
        else applyState(state);
        if (step !== show.step) { show.step = step; captionEl.textContent = show.prog.steps[step].cap; }
        more = true;
      }
    } else { last = 0; dirty = false; }
  }
  if (anims.length) {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      const u = clamp((now - a.t0) / a.dur, 0, 1);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      a.obj[a.prop] = a.from + (a.to - a.from) * e;
      if (u >= 1) { a.obj[a.prop] = a.to; anims.splice(i, 1); }
    }
    more = more || anims.length > 0;
    dirty = true;
  }
  if (dirty) draw();
  if (more) invalidate(); else last = 0;
}
function animate(obj, prop, to, dur = 180) {
  for (let i = anims.length - 1; i >= 0; i--) if (anims[i].obj === obj && anims[i].prop === prop) anims.splice(i, 1);
  if (reduced()) { obj[prop] = to; invalidate(); return; }
  anims.push({ obj, prop, from: obj[prop], to, t0: performance.now(), dur });
  invalidate();
}

// ---------------------------------------------------------------- announcements
let sayTimer = 0;
function say(msg, now = false) {
  clearTimeout(sayTimer);
  const put = () => { statusEl.textContent = ''; requestAnimationFrame(() => { statusEl.textContent = msg; }); };
  if (now) put(); else sayTimer = setTimeout(put, 380);
}
function describe(o) {
  if (o.kind === 'light') return `${o.name}, 막에서 ${round(o.z)}cm, 높이 ${round(o.y)}cm`;
  let t = `${o.name}, 막에서 ${round(o.z)}cm, 그림자 ${kOf(lights[0], o).toFixed(1)}배`;
  const a = round(((o.angle % 360) + 540) % 360 - 180);
  if (a) t += `, ${a > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(a)}도 기울임`;
  if (o.flip < 0) t += ', 왼쪽을 봄';
  return t;
}

// ---------------------------------------------------------------- focus targets (keyboard)
const targets = new Map();
function makeTargets() {
  for (const o of [...lights, ...puppets]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'target' + (o.kind === 'light' ? ' target--light' : '');
    b.setAttribute('aria-describedby', 'keys');
    b.addEventListener('focus', () => { select(o); });
    b.addEventListener('click', () => { select(o); say(describe(o), true); });
    b.addEventListener('keydown', (e) => onKey(e, o));
    targetsEl.appendChild(b);
    targets.set(o, b);
  }
}
function placeTargets() {
  for (const [o, b] of targets) {
    if (!o.on) { if (!b.hidden) b.hidden = true; continue; }
    if (b.hidden) b.hidden = false;
    let x, y, w, h;
    if (o.kind === 'light') { x = X(o.x); y = PZ(o.z); w = h = 44; }
    else {
      const [a, c] = extentX(ringsOf(o));
      x = X((a + c) / 2); y = PZ(o.z); w = Math.max(44, (c - a) * s + 8); h = 30;
    }
    b.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px)`;
    b.style.width = w.toFixed(1) + 'px';
    b.style.height = h + 'px';
    const label = describe(o);
    if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label);
  }
}

// ---------------------------------------------------------------- selection + tools
function select(o) {
  if (sel === o) return;
  sel = o;
  if (o && o.kind === 'light') activeLight = o;
  updateTools();
  invalidate();
}
function updateTools() {
  const p = sel && sel.kind === 'puppet' && sel.on ? sel : null;
  toolRow.hidden = !p;
  toolName.textContent = p ? `${objParticle(p.name)} 골랐어요.`
    : '인형을 누르면 여기서 돌리고, 뒤집고, 내릴 수 있어요.';
  for (const b of toolRow.querySelectorAll('button')) b.disabled = show.playing;
}
function objParticle(name) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return name + (code >= 0 && code % 28 ? '을' : '를');
}
function rotate(p, deg) {
  animate(p, 'angle', p.angle + deg, 160);
  say(describe({ ...p, angle: p.angle + deg }));
}
function flip(p) {
  animate(p, 'flip', p.flip > 0 ? -1 : 1, 280);
  say(`${objParticle(p.name)} 뒤집었어요. 이제 ${p.flip > 0 ? '왼쪽' : '오른쪽'}을 봐요.`);
}
function setOn(p, on, announce = true) {
  p.on = on;
  if (!on && sel === p) sel = null;
  if (on) sel = p;
  syncParts();
  updateTools();
  invalidate();
  if (announce) say(on ? `${objParticle(p.name)} 무대에 올렸어요.` : `${objParticle(p.name)} 무대에서 내렸어요.`, true);
}
function remove(o) {
  if (o.kind === 'light') {
    if (o === lights[0]) { say('빛 1은 끌 수 없어요. 빛 2만 끌 수 있어요.', true); return; }
    setLight2(false);
    targets.get(lights[0]).focus();
    return;
  }
  const list = [...lights.filter((l) => l.on), ...puppets.filter((p) => p.on)];
  const i = list.indexOf(o);
  setOn(o, false);
  const next = list.filter((x) => x !== o)[Math.min(i, list.length - 2)];
  requestAnimationFrame(() => {
    if (next && next.on) targets.get(next).focus();
    else partButtons.get(o)?.focus();
  });
}
function setLight2(on) {
  const L = lights[1];
  L.on = on;
  if (on) { sel = L; activeLight = L; } else { if (sel === L) sel = null; activeLight = lights[0]; }
  lightBtn.textContent = on ? '빛 2 끄기' : '빛 하나 더 켜기';
  updateTools();
  invalidate();
  say(on ? '빛 2를 켰어요. 그림자가 둘씩 생겨요.' : '빛 2를 껐어요.', true);
}

// ---------------------------------------------------------------- keyboard
function onKey(e, o) {
  const k = e.key;
  const moveKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Delete', 'Backspace'];
  const letter = (e.code || '').replace('Key', '').toLowerCase();
  if (show.playing) {
    if (moveKeys.includes(k) || letter === 'r' || letter === 'f') {
      e.preventDefault();
      say('공연 중이에요. 공연 멈추기를 누르면 직접 움직일 수 있어요.', true);
    }
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const step = e.shiftKey ? 8 : 2;
  let handled = true;
  if (o.kind === 'light') {
    if (k === 'ArrowLeft') o.x = clamp(o.x - step, ...LX);
    else if (k === 'ArrowRight') o.x = clamp(o.x + step, ...LX);
    else if (k === 'ArrowUp') o.z = clamp(o.z + 2, ...LZ);
    else if (k === 'ArrowDown') o.z = clamp(o.z - 2, ...LZ);
    else if (k === 'PageUp') o.y = clamp(o.y + 2, ...LY);
    else if (k === 'PageDown') o.y = clamp(o.y - 2, ...LY);
    else if (k === 'Delete' || k === 'Backspace') { remove(o); e.preventDefault(); return; }
    else handled = false;
  } else {
    if (k === 'ArrowLeft') o.x = clamp(o.x - step, ...PXR);
    else if (k === 'ArrowRight') o.x = clamp(o.x + step, ...PXR);
    else if (k === 'ArrowUp') o.z = clamp(o.z + 1, ...RAIL);
    else if (k === 'ArrowDown') o.z = clamp(o.z - 1, ...RAIL);
    else if (letter === 'r') { e.preventDefault(); rotate(o, e.shiftKey ? -15 : 15); return; }
    else if (letter === 'f') { e.preventDefault(); flip(o); return; }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); remove(o); return; }
    else handled = false;
  }
  if (!handled) return;
  e.preventDefault();
  select(o);
  invalidate();
  say(describe(o));
}

// ---------------------------------------------------------------- pointer
let drag = null;
function local(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function hit(cx, cy) {
  const slop = 22;
  const lit = lights.filter((l) => l.on);
  const near = (ax, ay) => Math.hypot(cx - ax, cy - ay);
  const midY = (PZ(0) + EY(SCREEN_H)) / 2;
  if (cy < midY) {
    let best = null, bd = slop;
    for (const L of lit) { const d = near(X(L.x), PZ(L.z)); if (d < bd) { bd = d; best = L; } }
    if (best) return { obj: best, view: 'plan' };
    bd = slop;
    for (const p of puppets) {
      if (!p.on) continue;
      const [a, b] = extentX(ringsOf(p));
      const y = PZ(p.z);
      const dx = cx < X(a) ? X(a) - cx : cx > X(b) ? cx - X(b) : 0;
      const d = Math.hypot(dx, cy - y) - (p === sel ? 4 : 0);
      if (d < bd) { bd = d; best = p; }
    }
    return best ? { obj: best, view: 'plan' } : null;
  }
  for (const L of lit) if (near(X(L.x), EY(L.y)) < slop) return { obj: L, view: 'elev' };
  const L = lights[0];
  const order = puppets.filter((p) => p.on).sort((a, b) => (a === sel) - (b === sel)).reverse();
  for (const p of order) {
    const k = kOf(L, p);
    for (const r of ringsOf(p)) {
      if (r.hole || r.rod) continue;
      const pts = r.pts.map(([x, y]) => [X(L.x + k * (x - L.x)), EY(L.y + k * (y - L.y))]);
      if (pointInPoly(cx, cy, pts)) return { obj: p, view: 'elev', k };
    }
  }
  return null;
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (show.playing) { say('공연 중이에요. 공연 멈추기를 누르면 직접 움직일 수 있어요.', true); return; }
  const [cx, cy] = local(e);
  const h = hit(cx, cy);
  if (!h) { return; }
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const o = h.obj;
  select(o);
  drag = { id: e.pointerId, o, view: h.view, cx, cy, x: o.x, y: o.y, z: o.z, k: h.k || 1 };
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (e) => {
  const [cx, cy] = local(e);
  if (!drag) {
    if (e.pointerType === 'mouse') canvas.style.cursor = !show.playing && hit(cx, cy) ? 'grab' : '';
    return;
  }
  if (e.pointerId !== drag.id) return;
  const o = drag.o;
  const dx = (cx - drag.cx) / s, dy = (cy - drag.cy) / s;
  if (o.kind === 'light') {
    o.x = clamp(drag.x + dx, ...LX);
    if (drag.view === 'plan') o.z = clamp(drag.z - dy, ...LZ);
    else o.y = clamp(drag.y - dy, ...LY);
  } else if (drag.view === 'plan') {
    o.x = clamp(drag.x + dx, ...PXR);
    o.z = clamp(drag.z - dy, ...RAIL);
  } else {
    o.x = clamp(drag.x + dx / drag.k, ...PXR);
  }
  invalidate();
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const o = drag.o;
  const moved = o.x !== drag.x || o.y !== drag.y || o.z !== drag.z;
  drag = null;
  canvas.style.cursor = '';
  if (moved) say(describe(o));
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);

// ---------------------------------------------------------------- parts list (tray)
const partButtons = new Map();
function buildParts() {
  for (const p of puppets) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'part';
    const [x0, y0, x1, y1] = p.shape.box;
    const pad = 1;
    b.innerHTML = `<svg class="part__fig" viewBox="${(x0 - pad).toFixed(2)} ${(-y1 - pad).toFixed(2)} ${(x1 - x0 + 2 * pad).toFixed(2)} ${(y1 - y0 + 2 * pad).toFixed(2)}" aria-hidden="true" focusable="false"><path d="${svgPath(p.shape)}"/></svg><span class="part__name">${p.name}</span><span class="part__state" aria-hidden="true"></span>`;
    b.addEventListener('click', () => {
      if (show.playing) return;
      setOn(p, !p.on);
    });
    li.appendChild(b);
    partsList.appendChild(li);
    partButtons.set(p, b);
  }
  syncParts();
}
function syncParts() {
  for (const [p, b] of partButtons) {
    b.setAttribute('aria-pressed', String(p.on));
    b.querySelector('.part__state').textContent = p.on ? '무대 위' : '상자 안';
    b.disabled = show.playing;
  }
}

// ---------------------------------------------------------------- show
function snapshot() {
  return {
    p: puppets.map((p) => ({ on: p.on, x: p.x, y: p.y, z: p.z, angle: p.angle, flip: p.flip })),
    l: lights.map((l) => ({ on: l.on, x: l.x, y: l.y, z: l.z })),
    sel, activeLight,
  };
}
function applyState(st) {
  for (const [id, v] of Object.entries(st)) {
    const o = byId[id];
    if (!o) continue;
    for (const [k, val] of Object.entries(v)) o[k] = k === 'on' ? !!val : val;
  }
}
function startShow() {
  anims.length = 0;
  show.saved = snapshot();
  show.playing = true; show.t = 0; show.step = -1;
  sel = null;
  drawing.classList.add('is-playing');
  showBtn.textContent = '공연 멈추기';
  lightBtn.disabled = true;
  syncParts(); updateTools();
  captionEl.classList.add('is-on');
  last = 0;
  invalidate();
}
function stopShow(finished) {
  if (!show.playing) return;
  show.playing = false;
  const sv = show.saved;
  puppets.forEach((p, i) => Object.assign(p, sv.p[i]));
  lights.forEach((l, i) => Object.assign(l, sv.l[i]));
  sel = sv.sel; activeLight = sv.activeLight;
  drawing.classList.remove('is-playing');
  showBtn.textContent = '공연 보기';
  lightBtn.disabled = false;
  lightBtn.textContent = lights[1].on ? '빛 2 끄기' : '빛 하나 더 켜기';
  syncParts(); updateTools();
  captionEl.classList.remove('is-on');
  captionEl.textContent = IDLE_CAPTION;
  say(finished ? '공연이 끝났어요. 무대를 공연 전으로 돌려놓았어요.' : '공연을 멈췄어요. 무대를 공연 전으로 돌려놓았어요.', true);
  invalidate();
}
showBtn.addEventListener('click', () => (show.playing ? stopShow(false) : startShow()));
lightBtn.addEventListener('click', () => { if (!show.playing) setLight2(!lights[1].on); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && show.playing) stopShow(false); });
toolRow.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  const p = sel && sel.kind === 'puppet' ? sel : null;
  if (!b || !p || show.playing) return;
  const act = b.dataset.act;
  if (act === 'cw') rotate(p, 15);
  else if (act === 'ccw') rotate(p, -15);
  else if (act === 'flip') flip(p);
  else if (act === 'remove') { setOn(p, false); partButtons.get(p).focus(); }
});

// ---------------------------------------------------------------- lifecycle
document.addEventListener('visibilitychange', () => { if (canRun()) { last = 0; invalidate(); } });
if ('IntersectionObserver' in window) {
  new IntersectionObserver((es) => {
    inView = es[es.length - 1].isIntersecting;
    if (canRun()) { last = 0; invalidate(); }
  }).observe(drawing);
}
new ResizeObserver(layout).observe(drawing);
reduceMQ.addEventListener?.('change', invalidate);

makeTargets();
buildParts();
updateTools();
layout();
if (document.fonts && document.fonts.load) {
  document.fonts.load(`16px "Gamja Flower"`).then(invalidate, invalidate);
  document.fonts.ready.then(invalidate);
}
if (/[?&]capture/.test(location.search)) {
  const arrange = (st) => { applyState(st); syncParts(); updateTools(); invalidate(); };
  window.__shadowplay = { byId, select, setLight2, startShow, stopShow, show, invalidate, applyState, arrange };
}
