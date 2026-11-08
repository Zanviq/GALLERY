// Terrain for a fictional bay ("윤슬만 일대"): a height field, its contours, and a
// nautical-chart rendering of everything that never moves.
// World units: 1 unit ≈ 10 m. North is up.

export const W = 1600;
export const H = 1000;

// ---------- deterministic randomness ----------
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(seed) {
  const r = rng(seed);
  const perm = new Uint16Array(512);
  const vals = new Float32Array(256);
  const p = [];
  for (let i = 0; i < 256; i++) { p.push(i); vals[i] = r() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const s = (t) => t * t * (3 - 2 * t);
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = vals[perm[X + perm[Y]]], b = vals[perm[X + 1 + perm[Y]]];
    const c = vals[perm[X + perm[Y + 1]]], d = vals[perm[X + 1 + perm[Y + 1]]];
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
const n1 = valueNoise(7);
const n2 = valueNoise(19);
function fbm(noise, x, y, oct) {
  let f = 0, amp = 0.5, fr = 1;
  for (let i = 0; i < oct; i++) { f += amp * noise(x * fr, y * fr); fr *= 2.03; amp *= 0.5; }
  return f;
}

// ---------- the map ----------
export const ISLANDS = [
  { name: '뱃머리섬', x: 230, y: 610, rx: 160, ry: 92, rot: 0.22, lx: -10, ly: 6,
    lobes: [[-118, -62, 72, 38, -0.5], [112, 52, 62, 30, 0.6], [-30, 70, 50, 26, 0.1]] },
  { name: '갈매섬', x: 770, y: 430, rx: 74, ry: 46, rot: 0.42, lx: 0, ly: 4,
    lobes: [[-62, 30, 42, 20, 0.9], [52, -30, 30, 18, 0.1]] },
  { name: '큰솔섬', x: 1125, y: 725, rx: 140, ry: 72, rot: -0.33, lx: 0, ly: 4,
    lobes: [[-142, 44, 62, 30, 0.3], [92, -72, 52, 28, -0.8], [40, 70, 46, 22, 0.2]] },
  { name: '작은솔섬', x: 1405, y: 565, rx: 42, ry: 30, rot: 0.3, lx: 0, ly: 50, lobes: [[32, 26, 22, 13, 0.5]] },
  { name: '등대섬', x: 935, y: 578, rx: 22, ry: 15, rot: 0.2, lx: 0, ly: 34, light: true },
  { name: '곰섬', x: 695, y: 830, rx: 58, ry: 36, rot: -0.2, lx: 0, ly: 4, lobes: [[-52, -24, 30, 17, -0.4]] },
  { name: '', x: 498, y: 860, rx: 22, ry: 16, rot: 0.6 },
  { name: '', x: 1490, y: 885, rx: 30, ry: 20, rot: -0.4 },
  { name: '', x: 1235, y: 380, rx: 30, ry: 22, rot: 0.2 },
  { name: '', x: 395, y: 330, rx: 40, ry: 28, rot: -0.5 },
];

export const BASE = { x: 556, y: 60, name: '물길 기지' };
export const RIVER_X = 985;

// marine farms (styrofoam buoys): debris sources, no-go for boats
export const FARMS = [
  { x: 640, y: 260, w: 110, h: 44, rot: -0.12 },
  { x: 455, y: 440, w: 90, h: 40, rot: 0.35 },
  { x: 1505, y: 430, w: 96, h: 40, rot: -0.35 },
  { x: 1010, y: 860, w: 100, h: 42, rot: -0.3 },
  { x: 880, y: 300, w: 70, h: 34, rot: 0.1 },
];

export const WATER_NAMES = [
  { text: '윤 슬 만', x: 735, y: 222, size: 17 },
  { text: '솔 섬 수 도', x: 1290, y: 640, size: 14, rot: -0.42 },
  { text: '바 깥 바 다', x: 360, y: 930, size: 15 },
];

function coastY(x) {
  let y = 165 + 34 * Math.sin(x / 150 + 0.5) + 18 * Math.sin(x / 53 + 2.1);
  y -= 74 * Math.exp(-(((x - BASE.x) / 60) ** 2));       // the inlet with our base
  y += 285 * Math.exp(-(((x - 1360) / 96) ** 2));          // eastern peninsula
  y -= 40 * Math.exp(-(((x - RIVER_X) / 40) ** 2));       // river mouth bight
  return y;
}

// every ellipse the islands are made of, with its rotation precomputed
const SHAPES = [];
for (const s of ISLANDS) {
  const add = (cx, cy, rx, ry, rot) => SHAPES.push({ cx, cy, irx: 1 / rx, iry: 1 / ry, c: Math.cos(rot), s: Math.sin(rot), k: Math.min(rx, ry) / 45, reach: Math.max(rx, ry) });
  add(s.x, s.y, s.rx, s.ry, s.rot);
  if (s.lobes) for (const [ox, oy, rx, ry, rot] of s.lobes) add(s.x + ox, s.y + oy, rx, ry, rot);
}

export function height(x, y) {
  let h = (coastY(x) - y) / 45;
  for (let q = 0; q < SHAPES.length; q++) {
    const e = SHAPES[q];
    const dx = x - e.cx, dy = y - e.cy;
    // this shape can't beat the current value when it is far away
    if (e.k * (1 - Math.max(Math.abs(dx), Math.abs(dy)) / e.reach) <= h) continue;
    const u = (dx * e.c + dy * e.s) * e.irx, v = (-dx * e.s + dy * e.c) * e.iry;
    const val = (1 - Math.sqrt(u * u + v * v)) * e.k;
    if (val > h) h = val;
  }
  // domain-warped noise gives the coast headlands and coves
  const wx = x + fbm(n2, x / 240 + 3, y / 240, 3) * 85, wy = y + fbm(n1, x / 240, y / 240 + 7, 3) * 85;
  h += fbm(n1, wx / 120, wy / 120, 5) * 0.9 + fbm(n2, x / 30, y / 30, 3) * 0.3;
  return h;
}

// ---------- grid & contours ----------
export const CELL = 5;
export const PAD = 40;
// land above the chart's top edge, so the camera can frame the base with room above it
export const TOP = -170;
const Y0 = TOP - PAD;
export function buildField() {
  const nx = Math.ceil((W + 2 * PAD) / CELL) + 1;
  const ny = Math.ceil((H - TOP + 2 * PAD) / CELL) + 1;
  const f = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = Y0 + j * CELL;
    for (let i = 0; i < nx; i++) {
      const x = -PAD + i * CELL;
      let h = height(x, y);
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) h = -50; // close every contour
      f[j * nx + i] = h;
    }
  }
  return { nx, ny, f };
}

export function sampler(field) {
  const { nx, ny, f } = field;
  return function (x, y) {
    const gx = (x + PAD) / CELL, gy = (y - Y0) / CELL;
    if (gx < 0 || gy < 0 || gx >= nx - 1 || gy >= ny - 1) return -50;
    const i = gx | 0, j = gy | 0, tx = gx - i, ty = gy - j;
    const k = j * nx + i;
    const a = f[k], b = f[k + 1], c = f[k + nx], d = f[k + nx + 1];
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
  };
}

// marching squares → closed loops of [x0,y0,x1,y1,...] in world units
export function contours(field, level) {
  const { nx, ny, f } = field;
  const segs = new Map(); // edgeKey -> list of {other edgeKey}
  const pts = new Map();  // edgeKey -> [x,y]
  const ek = (i, j, dir) => (j * nx + i) * 2 + dir; // dir 0: horizontal edge to (i+1,j), 1: vertical to (i,j+1)
  const pt = (i, j, dir) => {
    const key = ek(i, j, dir);
    if (!pts.has(key)) {
      const a = f[j * nx + i];
      const b = dir === 0 ? f[j * nx + i + 1] : f[(j + 1) * nx + i];
      const t = (level - a) / (b - a);
      const x = -PAD + (i + (dir === 0 ? t : 0)) * CELL;
      const y = Y0 + (j + (dir === 1 ? t : 0)) * CELL;
      pts.set(key, [x, y]);
    }
    return key;
  };
  const link = (a, b) => {
    if (!segs.has(a)) segs.set(a, []);
    if (!segs.has(b)) segs.set(b, []);
    segs.get(a).push(b); segs.get(b).push(a);
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const tl = f[j * nx + i] > level, tr = f[j * nx + i + 1] > level;
      const br = f[(j + 1) * nx + i + 1] > level, bl = f[(j + 1) * nx + i] > level;
      const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const T = () => pt(i, j, 0), B = () => pt(i, j + 1, 0), L = () => pt(i, j, 1), R = () => pt(i + 1, j, 1);
      switch (code) {
        case 1: case 14: link(L(), B()); break;
        case 2: case 13: link(B(), R()); break;
        case 3: case 12: link(L(), R()); break;
        case 4: case 11: link(T(), R()); break;
        case 6: case 9: link(T(), B()); break;
        case 7: case 8: link(L(), T()); break;
        case 5: case 10: {
          const center = (f[j * nx + i] + f[j * nx + i + 1] + f[(j + 1) * nx + i] + f[(j + 1) * nx + i + 1]) / 4 > level;
          if ((code === 5) === center) { link(L(), T()); link(B(), R()); }
          else { link(L(), B()); link(T(), R()); }
          break;
        }
      }
    }
  }
  const loops = [];
  const used = new Set();
  for (const start of segs.keys()) {
    if (used.has(start)) continue;
    const loop = [];
    let prev = -1, cur = start;
    while (cur !== undefined && !used.has(cur)) {
      used.add(cur);
      const p = pts.get(cur);
      loop.push(p[0], p[1]);
      const nb = segs.get(cur);
      const next = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur; cur = next;
    }
    if (loop.length >= 8) loops.push(loop);
  }
  return loops;
}

function chaikin(loop) {
  const out = [];
  const n = loop.length / 2;
  for (let k = 0; k < n; k++) {
    const x0 = loop[k * 2], y0 = loop[k * 2 + 1];
    const k1 = (k + 1) % n;
    const x1 = loop[k1 * 2], y1 = loop[k1 * 2 + 1];
    out.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
  }
  return out;
}

function loopsToPath(loops) {
  const p = new Path2D();
  for (const loop of loops) {
    p.moveTo(loop[0], loop[1]);
    for (let k = 2; k < loop.length; k += 2) p.lineTo(loop[k], loop[k + 1]);
    p.closePath();
  }
  return p;
}

// Everything derived once from the height field.
export function buildWorld() {
  const field = buildField();
  const h = sampler(field);
  const lv = { coast: 0, d2: -0.3, d5: -0.7, d10: -1.35, d20: -2.4, hill1: 1.0, hill2: 2.3 };
  const paths = {};
  const raw = {};
  for (const [k, level] of Object.entries(lv)) {
    raw[k] = contours(field, level).map(chaikin);
    paths[k] = loopsToPath(raw[k]);
  }
  // river: from the mouth up to the top edge, meandering
  let mouthY = 0;
  for (let y = 0; y < 400; y += 1) { if (h(RIVER_X, y) < 0) { mouthY = y; break; } }
  const river = [];
  for (let y = mouthY + 2; y >= Y0; y -= 6) {
    const t = (mouthY - y) / 200;
    river.push(RIVER_X + Math.sin(y / 23) * 7 * Math.min(1, t * 2) + Math.sin(y / 61 + 1) * 14 * Math.min(1, t), y);
  }
  const r = rng(31);
  const soundings = [];
  const SP = 62;
  for (let y = SP / 2; y < H; y += SP) {
    for (let x = SP / 2; x < W; x += SP) {
      const sx = x + (r() - 0.5) * SP * 0.8, sy = y + (r() - 0.5) * SP * 0.8;
      const hv = h(sx, sy);
      if (hv > -0.45) continue;
      if (inFarm(sx, sy, 16)) continue;
      const depth = Math.min(48, Math.max(2, Math.round(2.2 + -hv * 6.2 + (r() - 0.5) * 2)));
      soundings.push({ x: sx, y: sy, d: depth, sub: depth < 20 && r() < 0.5 ? Math.floor(r() * 10) : -1 });
    }
  }
  return { field, h, paths, raw, river, mouth: { x: RIVER_X, y: mouthY }, soundings };
}

export function farmCorners(fm) {
  const c = Math.cos(fm.rot), s = Math.sin(fm.rot);
  const hw = fm.w / 2, hh = fm.h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => [fm.x + u * c - v * s, fm.y + u * s + v * c]);
}
export function inFarm(x, y, margin = 0) {
  for (const fm of FARMS) {
    const dx = x - fm.x, dy = y - fm.y;
    const c = Math.cos(fm.rot), s = Math.sin(fm.rot);
    const u = dx * c + dy * s, v = -dx * s + dy * c;
    if (Math.abs(u) <= fm.w / 2 + margin && Math.abs(v) <= fm.h / 2 + margin) return true;
  }
  return false;
}

// ---------- static chart layer ----------
// scale: device pixels per world unit; u: world units per CSS pixel at the design zoom
export function renderStatic(world, scale, u) {
  const cw = Math.ceil(W * scale), chh = Math.ceil((H - TOP) * scale);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = chh;
  const ctx = cv.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, -TOP * scale);
  const P = world.paths;

  ctx.fillStyle = '#fbfcfc';
  ctx.fillRect(0, TOP, W, H - TOP);
  const band = (path, color) => { ctx.fillStyle = color; ctx.fill(path, 'evenodd'); };
  band(P.d20, '#f1f7f9');
  band(P.d10, '#e5f0f4');
  band(P.d5, '#d5e7ee');
  band(P.d2, '#c3dce7');

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const line = (path, color, width, dash) => {
    ctx.strokeStyle = color; ctx.lineWidth = width * u;
    ctx.setLineDash(dash ? dash.map((d) => d * u) : []);
    ctx.stroke(path);
  };
  line(P.d20, '#b5cdd8', 0.7);
  line(P.d10, '#a3c1ce', 0.75);
  line(P.d5, '#8fb3c3', 0.8);
  line(P.d2, '#7aa5b8', 0.8, [1.2, 2.4]);

  // land
  ctx.setLineDash([]);
  ctx.fillStyle = '#e9dcaf';
  ctx.fill(P.coast, 'evenodd');
  ctx.save();
  ctx.clip(P.coast, 'evenodd');
  line(P.hill1, '#cdbb83', 0.7);
  line(P.hill2, '#c2ad70', 0.7);
  // river
  ctx.strokeStyle = '#6f9fb4';
  ctx.lineWidth = 1.6 * u;
  ctx.setLineDash([]);
  ctx.beginPath();
  const rv = world.river;
  ctx.moveTo(rv[0], rv[1]);
  for (let k = 2; k < rv.length; k += 2) ctx.lineTo(rv[k], rv[k + 1]);
  ctx.stroke();
  ctx.restore();

  // coastline
  ctx.strokeStyle = '#2b4253';
  ctx.lineWidth = 1.15 * u;
  ctx.stroke(P.coast);

  // marine farms: magenta dashed boundary + buoy rows
  for (const fm of FARMS) {
    const cs = farmCorners(fm);
    ctx.beginPath();
    cs.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(168, 24, 111, 0.035)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 24, 111, 0.75)';
    ctx.lineWidth = 0.9 * u;
    ctx.setLineDash([4 * u, 2.5 * u]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(fm.x, fm.y);
    ctx.rotate(fm.rot);
    ctx.fillStyle = 'rgba(19, 41, 61, 0.55)';
    const rows = Math.max(2, Math.round(fm.h / 11));
    for (let rr = 0; rr < rows; rr++) {
      const vy = -fm.h / 2 + (rr + 0.5) * (fm.h / rows);
      for (let ux = -fm.w / 2 + 5; ux < fm.w / 2 - 3; ux += 6.5) {
        ctx.beginPath();
        ctx.arc(ux, vy, 0.95 * u, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // pier at the base
  ctx.strokeStyle = '#2b4253';
  ctx.lineWidth = 2.2 * u;
  ctx.beginPath();
  ctx.moveTo(BASE.x - 30, BASE.y + 2);
  ctx.lineTo(BASE.x - 30, BASE.y + 24);
  ctx.moveTo(BASE.x - 30, BASE.y + 24);
  ctx.lineTo(BASE.x + 2, BASE.y + 24);
  ctx.stroke();

  return cv;
}
