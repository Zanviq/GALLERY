// Drift simulation: tidal stream, residual drift, wind, convergence fronts,
// floating debris particles and the autonomous boats that sweep the fronts.
import { W, H, FARMS, BASE, inFarm, rng } from './world.js';

export const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
export function windVec(dir) {               // meteorological "from" → blowing-toward unit vector
  const a = dir * Math.PI / 4;
  return { x: -Math.sin(a), y: Math.cos(a) };
}

export const TIDE_PERIOD = 90;               // real seconds for one 12.4 h tide
const SIM_MIN_PER_SEC = (12.4 * 60) / TIDE_PERIOD;

// debris kinds: windage, share, kg per dot (each dot stands for a handful of pieces)
const KINDS = [
  { windage: 1.0, share: 0.55, kg: 2.2 },     // styrofoam buoy fragments
  { windage: 0.35, share: 0.2, kg: 8.0 },     // nets & rope
  { windage: 0.7, share: 0.15, kg: 1.6 },     // bottles & containers
  { windage: 0.5, share: 0.1, kg: 4.0 },      // other
];
const BOAT_CAP = 60;

// base polylines of the three convergence fronts (before wobble/offset)
const FRONT_DEFS = [
  { pts: [[505, 640], [620, 628], [745, 600], [865, 545], [985, 505], [1105, 492], [1195, 498]], wind: 1.0, tide: [0.35, 1], phase: 0 },
  { pts: [[870, 935], [1000, 905], [1140, 880], [1275, 845], [1395, 790], [1530, 728]], wind: 1.15, tide: [1, 0.25], phase: 1.7 },
  { pts: [[820, 300], [885, 336], [975, 352], [1065, 342], [1150, 306]], wind: 0.65, tide: [0.25, 0.7], phase: 3.1 },
];
const SPACING = 10;

function resample(pts, step) {
  const out = [[pts[0][0], pts[0][1]]];
  let carry = 0;                               // distance walked since the last emitted point
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    let d = step - carry;
    while (d <= len) {
      const t = d / len;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      d += step;
    }
    carry = len - (d - step);
  }
  return out;
}

export class Sim {
  constructor(world, opts = {}) {
    this.world = world;
    this.h = world.h;
    this.r = rng(opts.seed || 99);
    this.N = opts.particles || 2200;
    this.t = 0;                                // real seconds simulated
    this.phase0 = 2.2;                         // tide phase at t=0 → "밀물 2시간째"
    this.clock0 = 6 * 60 + 40;                 // 06:40
    this.wind = { dir: 7, speed: 4 };
    this.windShown = { x: 0, y: 0 };           // eased front offset driver
    const wv = windVec(7);
    this.windShown.x = wv.x * 4; this.windShown.y = wv.y * 4;
    this.params = { conv: 1, onshore: 1, slip: 0.6, boats: true };
    this.collectedKg = 1184;
    this.mix = [0, 0, 0, 0];
    this.unloadedKg = [212, 64, 41, 30];   // earlier trips today
    this.beachEvents = [];
    this.ripples = [];

    this._buildFlow();
    this._buildNav();
    this._initFronts();
    this._initParticles();
    this._initBoats();
  }

  // ---------- time ----------
  tide() { return Math.sin(this.phase0 + (2 * Math.PI * this.t) / TIDE_PERIOD); }
  tideLabel() {
    const ph = (((this.phase0 + (2 * Math.PI * this.t) / TIDE_PERIOD) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const hours = (ph / (2 * Math.PI)) * 12.4;
    // phase 0 → low water rising
    return hours < 6.2 ? `밀물 ${Math.floor(hours) + 1}시간째` : `썰물 ${Math.floor(hours - 6.2) + 1}시간째`;
  }
  setClock(minutes) { this.clock0 = minutes - this.t * SIM_MIN_PER_SEC; }
  clock() {
    const m = Math.floor(this.clock0 + this.t * SIM_MIN_PER_SEC) % (24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  beachRate() {                               // arrivals in the last simulated hour
    const win = 60 / SIM_MIN_PER_SEC;
    const ev = this.beachEvents;
    while (ev.length && ev[0] < this.t - win) ev.shift();
    return ev.length;
  }

  // ---------- static flow helpers ----------
  _buildFlow() {
    const C = 20;
    const nx = Math.ceil(W / C) + 1, ny = Math.ceil(H / C) + 1;
    const nX = new Float32Array(nx * ny), nY = new Float32Array(nx * ny), wC = new Float32Array(nx * ny);
    const h = this.h;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = i * C, y = j * C, k = j * nx + i;
        const hv = h(x, y);
        const gx = (h(x + 6, y) - h(x - 6, y)) / 12, gy = (h(x, y + 6) - h(x, y - 6)) / 12;
        const gl = Math.hypot(gx, gy) || 1;
        nX[k] = gx / gl; nY[k] = gy / gl;
        wC[k] = hv >= 0 ? 1 : Math.exp(hv * 1.25);
      }
    }
    this.flow = { C, nx, ny, nX, nY, wC };
    this.attr = { ax: new Float32Array(nx * ny), ay: new Float32Array(nx * ny), tx: new Float32Array(nx * ny), ty: new Float32Array(nx * ny), d: new Float32Array(nx * ny).fill(999) };
  }

  // sample helper: bilinear on a flow-grid array
  _bil(arr, x, y) {
    const { C, nx, ny } = this.flow;
    let gx = x / C, gy = y / C;
    if (gx < 0) gx = 0; if (gy < 0) gy = 0;
    if (gx > nx - 1.001) gx = nx - 1.001; if (gy > ny - 1.001) gy = ny - 1.001;
    const i = gx | 0, j = gy | 0, tx = gx - i, ty = gy - j, k = j * nx + i;
    const a = arr[k], b = arr[k + 1], c = arr[k + nx], d = arr[k + nx + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  // water velocity at a point, without convergence (used by particles and the arrow overlay)
  current(x, y, out) {
    const tide = this.tide();
    const nX = this._bil(this.flow.nX, x, y), nY = this._bil(this.flow.nY, x, y), w = this._bil(this.flow.wC, x, y);
    // tidal stream, east–west, slipping along coasts
    let ux = 4.4 * tide, uy = -0.7 * tide;
    let dn = ux * nX + uy * nY;
    ux -= dn * nX * Math.min(1, w * 1.1); uy -= dn * nY * Math.min(1, w * 1.1);
    // residual drift toward the north-east (pushes debris ashore)
    const on = this.params.onshore;
    let dx = 1.25 * on, dy = -2.0 * on;
    dn = dx * nX + dy * nY;
    if (dn > 0) { const s = this.params.slip * w; dx -= dn * nX * s; dy -= dn * nY * s; }
    out.x = ux + dx; out.y = uy + dy;
    return out;
  }

  // ---------- fronts ----------
  _initFronts() {
    this.fronts = FRONT_DEFS.map((def, fi) => {
      const base = resample(def.pts, SPACING);
      // a natural wobble, perpendicular to the line
      const pts = base.map(([x, y], k) => {
        const p0 = base[Math.max(0, k - 1)], p1 = base[Math.min(base.length - 1, k + 1)];
        const tx = p1[0] - p0[0], ty = p1[1] - p0[1], tl = Math.hypot(tx, ty) || 1;
        const off = 9 * Math.sin(k * SPACING / 41 + fi * 2) + 5 * Math.sin(k * SPACING / 14 + fi);
        return [x - (ty / tl) * off, y + (tx / tl) * off];
      });
      return { def, base: pts, cur: pts.map((p) => [p[0], p[1]]), n: pts.length };
    });
    this.lanes = [];
    this.fronts.forEach((f, fi) => {
      const L = 15;
      for (let s = 0; s + 6 < f.n; s += L) this.lanes.push({ fi, i0: s, i1: Math.min(f.n - 1, s + L), claimed: -1 });
    });
    this._updateFronts(true);
  }

  frontOffset(f, t) {
    const d = f.def;
    const tide = Math.sin(this.phase0 + (2 * Math.PI * t) / TIDE_PERIOD + d.phase);
    return {
      x: this.windShown.x * 5.5 * d.wind + d.tide[0] * tide * 16,
      y: this.windShown.y * 5.5 * d.wind + d.tide[1] * tide * 16,
    };
  }
  frontAt(f, t) {                             // positions of a front at (real) time t
    const o = this.frontOffset(f, t);
    return f.base.map(([x, y]) => [x + o.x, y + o.y]);
  }
  isWaterPt(x, y) { return this.h(x, y) < -0.12; }

  _updateFronts(force) {
    for (const f of this.fronts) {
      const o = this.frontOffset(f, this.t);
      for (let k = 0; k < f.n; k++) { f.cur[k][0] = f.base[k][0] + o.x; f.cur[k][1] = f.base[k][1] + o.y; }
    }
    if (force || this.t - (this._attrT || -1) > 0.25) { this._attrT = this.t; this._buildAttraction(); }
  }

  _buildAttraction() {
    const { C, nx, ny } = this.flow;
    const { ax, ay, tx, ty, d: dd } = this.attr;
    const R = 200, R2 = R * R;
    const pts = [];
    for (const f of this.fronts) {
      for (let k = 0; k < f.n; k += 2) {
        const p = f.cur[k];
        if (!this.isWaterPt(p[0], p[1])) continue;
        const a = f.cur[Math.max(0, k - 2)], b = f.cur[Math.min(f.n - 1, k + 2)];
        const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        pts.push(p[0], p[1], (b[0] - a[0]) / tl, (b[1] - a[1]) / tl);
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = i * C, y = j * C, k = j * nx + i;
        let best = R2, bx = 0, by = 0, btx = 0, bty = 0;
        for (let q = 0; q < pts.length; q += 4) {
          const dx = pts[q] - x, dy = pts[q + 1] - y;
          const d2 = dx * dx + dy * dy;
          if (d2 < best) { best = d2; bx = dx; by = dy; btx = pts[q + 2]; bty = pts[q + 3]; }
        }
        if (best >= R2) { ax[k] = 0; ay[k] = 0; tx[k] = 0; ty[k] = 0; dd[k] = R; continue; }
        const d = Math.sqrt(best);
        const g = Math.pow(1 - d / R, 1.3);
        const inv = d > 0 ? 1 / d : 0;
        // unit pull toward the line (scaled by falloff) and a slow slide along it
        ax[k] = bx * inv * g; ay[k] = by * inv * g;
        tx[k] = btx * 0.1 * g; ty[k] = bty * 0.1 * g;
        dd[k] = d;
      }
    }
  }

  setWind(dir, speed) { this.wind.dir = dir; this.wind.speed = speed; }

  // ---------- particles ----------
  _initParticles() {
    const N = this.N;
    this.px = new Float32Array(N); this.py = new Float32Array(N);
    this.vx = new Float32Array(N); this.vy = new Float32Array(N);
    this.st = new Uint8Array(N);      // 0 free, 1 drifting, 2 beached, 3 collecting
    this.kd = new Uint8Array(N);
    this.age = new Float32Array(N);
    this.tgt = new Int8Array(N);      // collecting boat
    this.seed = new Float32Array(N);
    this.band = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.seed[i] = this.r() * 100;
      const u = this.r();
      this.band[i] = 2 + u * u * 24;
      const p = this._randomWater();
      this._spawn(i, p.x, p.y);
    }
  }
  // put a share of the debris straight into the windrow bands (start-up shortcut)
  seedWindrows(share = 0.35) {
    const pts = [];
    for (const f of this.fronts) {
      for (let k = 1; k < f.n - 1; k++) {
        const p = f.cur[k];
        if (!this.isWaterPt(p[0], p[1])) continue;
        const a = f.cur[k - 1], b = f.cur[k + 1];
        const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        pts.push([p[0], p[1], -(b[1] - a[1]) / tl, (b[0] - a[0]) / tl]);
      }
    }
    if (!pts.length) return;
    const n = Math.floor(this.N * share);
    for (let i = 0; i < n; i++) {
      const [x, y, nx, ny] = pts[Math.floor(this.r() * pts.length)];
      const off = (this.r() < 0.5 ? -1 : 1) * this.band[i];
      const sx = x + nx * off + (this.r() - 0.5) * 6, sy = y + ny * off + (this.r() - 0.5) * 6;
      if (this.h(sx, sy) < -0.15) this._spawn(i, sx, sy);
    }
  }
  sendAllToWork() {
    for (const b of this.boats) { this.warpToSweep(b.id); b.alpha = 1; }
  }
  _kind() {
    let u = this.r(), k = 0;
    while (k < KINDS.length - 1 && u > KINDS[k].share) { u -= KINDS[k].share; k++; }
    return k;
  }
  _randomWater() {
    for (let tries = 0; tries < 50; tries++) {
      const x = this.r() * W, y = this.r() * H;
      if (this.h(x, y) < -0.2) return { x, y };
    }
    return { x: W * 0.5, y: H * 0.9 };
  }
  _spawn(i, x, y) {
    this.px[i] = x; this.py[i] = y; this.vx[i] = 0; this.vy[i] = 0;
    this.st[i] = 1; this.kd[i] = this._kind(); this.age[i] = 0; this.tgt[i] = -1;
  }
  _sourcePoint() {
    const u = this.r();
    if (u < 0.5) {                           // open sea, south and west edges
      if (this.r() < 0.72) return { x: this.r() * 1150, y: H + 4 };
      return { x: -4, y: 620 + this.r() * 380 };
    }
    if (u < 0.85) {                          // marine farms
      const fm = FARMS[Math.floor(this.r() * FARMS.length)];
      const a = (this.r() - 0.5) * fm.w, b = (this.r() - 0.5) * fm.h;
      const c = Math.cos(fm.rot), s = Math.sin(fm.rot);
      return { x: fm.x + a * c - b * s, y: fm.y + a * s + b * c };
    }
    const m = this.world.mouth;               // river mouth
    return { x: m.x + (this.r() - 0.5) * 30, y: m.y + 8 + this.r() * 16 };
  }
  spill(x, y, count = 40, radius = 30) {
    let made = 0;
    // reuse free → oldest beached → oldest drifting
    const order = [];
    for (let i = 0; i < this.N; i++) if (this.st[i] === 0) order.push(i);
    if (order.length < count) {
      const beached = [];
      for (let i = 0; i < this.N; i++) if (this.st[i] === 2) beached.push(i);
      beached.sort((a, b) => this.age[b] - this.age[a]);
      order.push(...beached);
    }
    if (order.length < count) {
      const drift = [];
      for (let i = 0; i < this.N; i++) if (this.st[i] === 1) drift.push(i);
      drift.sort((a, b) => this.age[b] - this.age[a]);
      order.push(...drift);
    }
    for (const i of order) {
      if (made >= count) break;
      const a = this.r() * Math.PI * 2, d = Math.sqrt(this.r()) * radius;
      const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
      if (this.h(sx, sy) > -0.1) continue;
      this._spawn(i, sx, sy);
      made++;
    }
    this.ripples.push({ x, y, t: 0 });
    return made;
  }

  _stepParticles(dt) {
    const N = this.N;
    const wv = windVec(this.wind.dir);
    const ws = this.wind.speed * 0.55;
    const conv = this.params.conv * 16;
    const { ax, ay, tx, ty, d: dd } = this.attr;
    const cur = { x: 0, y: 0 };
    let drifting = 0;
    for (let i = 0; i < N; i++) if (this.st[i] === 1) drifting++;
    const target = Math.floor(N * 0.66);
    let toSpawn = Math.min(Math.ceil((target - drifting) * 0.02) + 1, 12);
    for (let i = 0; i < N; i++) {
      const s = this.st[i];
      if (s === 0) {
        if (toSpawn > 0 && drifting < target) {
          const p = this._sourcePoint();
          if (this.h(p.x, p.y) < -0.1) { this._spawn(i, p.x, p.y); toSpawn--; drifting++; }
        }
        continue;
      }
      this.age[i] += dt;
      if (s === 2) {                          // beached: stays, eventually cleared by hand
        if (this.age[i] > 70 && this.params.boats) this.st[i] = 0;
        continue;
      }
      if (s === 3) {                          // being lifted into a boat
        const b = this.boats[this.tgt[i]];
        const k = Math.min(1, dt * 7);
        this.px[i] += (b.x - this.px[i]) * k; this.py[i] += (b.y - this.py[i]) * k;
        this.age[i] += dt;
        if (Math.abs(b.x - this.px[i]) + Math.abs(b.y - this.py[i]) < 2.5 || this.age[i] > 1.2) this.st[i] = 0;
        continue;
      }
      const x = this.px[i], y = this.py[i];
      this.current(x, y, cur);
      const kd = KINDS[this.kd[i]];
      const sd = this.seed[i];
      // each dot settles at its own distance from the line, so a windrow is a band, not a thread
      const off = this.band[i];
      const dist = this._bil(dd, x, y);
      let f = (dist - off) / Math.max(dist, 6);
      f = f < -1 ? -1 : f > 1 ? 1 : f;
      let vx = cur.x + wv.x * ws * kd.windage + (this._bil(ax, x, y) * f + this._bil(tx, x, y)) * conv + Math.sin(this.t * 0.9 + sd) * 1.4;
      let vy = cur.y + wv.y * ws * kd.windage + (this._bil(ay, x, y) * f + this._bil(ty, x, y)) * conv + Math.cos(this.t * 0.7 + sd * 1.3) * 1.4;
      this.vx[i] += (vx - this.vx[i]) * Math.min(1, dt * 3);
      this.vy[i] += (vy - this.vy[i]) * Math.min(1, dt * 3);
      const nx = x + this.vx[i] * dt, ny = y + this.vy[i] * dt;
      if (nx < -30 || nx > W + 30 || ny < -30 || ny > H + 30) { this.st[i] = 0; continue; }
      if (this.h(nx, ny) > 0) {               // reached the shore
        this.st[i] = 2; this.age[i] = 0;
        this.beachEvents.push(this.t);
        continue;
      }
      this.px[i] = nx; this.py[i] = ny;
    }
  }

  // ---------- navigation ----------
  _buildNav() {
    const C = 10, nx = Math.ceil(W / C) + 1, ny = Math.ceil(H / C) + 1;
    const blocked = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = i * C, y = j * C;
      blocked[j * nx + i] = this.h(x, y) > -0.4 || inFarm(x, y, 8) ? 1 : 0;
    }
    this.nav = { C, nx, ny, blocked };
  }
  navFree(x, y) {
    const { C, nx, ny, blocked } = this.nav;
    const i = Math.round(x / C), j = Math.round(y / C);
    if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
    return !blocked[j * nx + i];
  }
  _nearestFree(i, j) {
    const { nx, ny, blocked } = this.nav;
    for (let r = 0; r < 30; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < nx && b < ny && !blocked[b * nx + a]) return [a, b];
      }
    }
    return [i, j];
  }
  los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 5);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (!this.navFree(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }
  path(x0, y0, x1, y1) {
    if (this.los(x0, y0, x1, y1)) return [[x1, y1]];
    const { C, nx, ny, blocked } = this.nav;
    let [si, sj] = this._nearestFree(Math.round(x0 / C), Math.round(y0 / C));
    let [gi, gj] = this._nearestFree(Math.round(x1 / C), Math.round(y1 / C));
    const start = sj * nx + si, goal = gj * nx + gi;
    const g = new Float32Array(nx * ny).fill(Infinity);
    const from = new Int32Array(nx * ny).fill(-1);
    const closed = new Uint8Array(nx * ny);
    const heap = [];
    const push = (k, f) => {
      heap.push([f, k]);
      let c = heap.length - 1;
      while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let c = 0;
        for (;;) {
          const l = c * 2 + 1, r = l + 1;
          let m = c;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === c) break;
          [heap[m], heap[c]] = [heap[c], heap[m]]; c = m;
        }
      }
      return top;
    };
    const hh = (k) => {
      const dx = Math.abs((k % nx) - gi), dy = Math.abs(((k / nx) | 0) - gj);
      return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    g[start] = 0; push(start, hh(start));
    const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let found = false, iter = 0;
    while (heap.length && iter++ < 30000) {
      const [, k] = pop();
      if (closed[k]) continue;
      if (k === goal) { found = true; break; }
      closed[k] = 1;
      const i = k % nx, j = (k / nx) | 0;
      for (const [di, dj, c] of nb) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
        const kk = b * nx + a;
        if (blocked[kk] || closed[kk]) continue;
        if (di && dj && (blocked[j * nx + a] || blocked[b * nx + i])) continue;
        const ng = g[k] + c;
        if (ng < g[kk]) { g[kk] = ng; from[kk] = k; push(kk, ng + hh(kk)); }
      }
    }
    if (!found) return [[x1, y1]];
    const cells = [];
    for (let k = goal; k !== -1; k = from[k]) cells.push([(k % nx) * C, ((k / nx) | 0) * C]);
    cells.reverse();
    cells[cells.length - 1] = [x1, y1];
    // string pulling
    const out = [];
    let cx = x0, cy = y0, idx = 0;
    while (idx < cells.length) {
      let far = idx;
      for (let k = cells.length - 1; k > idx; k--) {
        if (this.los(cx, cy, cells[k][0], cells[k][1])) { far = k; break; }
      }
      out.push(cells[far]);
      cx = cells[far][0]; cy = cells[far][1];
      idx = far + 1;
    }
    return out;
  }

  // ---------- boats ----------
  _initBoats() {
    // dock slots: navigable water near the base, spaced apart
    const slots = [];
    for (let y = BASE.y + 40; y < BASE.y + 220 && slots.length < 6; y += 4) {
      for (let x = BASE.x - 60; x <= BASE.x + 60 && slots.length < 6; x += 4) {
        if (!this.navFree(x, y) || this.h(x, y) > -0.6) continue;
        if (slots.every((s) => Math.hypot(s[0] - x, s[1] - y) > 22)) slots.push([x, y]);
      }
    }
    while (slots.length < 6) slots.push([BASE.x, BASE.y + 80 + slots.length * 20]);
    this.docks = slots;
    this.boats = slots.map((d, i) => ({
      id: i, name: `누비 ${i + 1}`, x: d[0], y: d[1], heading: Math.PI / 2, speed: 0,
      state: 'docked', path: [], wp: 0, load: 0, loadKg: [0, 0, 0, 0], lane: null, idx: 0, dirSign: 1,
      timer: 0, track: [], trackT: 0, alpha: 1, fade: 0, delay: 0, recall: false,
    }));
  }

  laneDensity(lane) {
    const f = this.fronts[lane.fi];
    let n = 0;
    for (let k = lane.i0; k <= lane.i1; k += 3) {
      const [x, y] = f.cur[k];
      for (let i = 0; i < this.N; i++) {
        if (this.st[i] !== 1) continue;
        const dx = this.px[i] - x, dy = this.py[i] - y;
        if (dx * dx + dy * dy < 1600) n++;
      }
    }
    return n;
  }
  laneUsable(lane) {
    const f = this.fronts[lane.fi];
    let free = 0;
    for (let k = lane.i0; k <= lane.i1; k++) if (this.navFree(f.cur[k][0], f.cur[k][1])) free++;
    return free >= (lane.i1 - lane.i0) * 0.5;
  }

  _assign(b, only = -1) {
    let best = null, bestScore = -Infinity;
    for (const lane of this.lanes) {
      if (lane.claimed !== -1 && lane.claimed !== b.id) continue;
      if (only > -1 && lane.fi !== only) continue;
      if (!this.laneUsable(lane)) continue;
      const f = this.fronts[lane.fi];
      const mid = f.cur[(lane.i0 + lane.i1) >> 1];
      const dist = Math.hypot(mid[0] - b.x, mid[1] - b.y);
      // carrying on along the same front beats crossing the bay to a new one
      const next = b.lane && lane.fi === b.lane.fi && (lane.i0 === b.lane.i1 || lane.i1 === b.lane.i0) ? 60 : 0;
      const score = this.laneDensity(lane) - dist * 0.06 + next + this.r() * 4;
      if (score > bestScore) { bestScore = score; best = lane; }
    }
    if (!best && only > -1) { this._assign(b); return; }
    if (b.lane) b.lane.claimed = -1;
    if (!best) { this._sendHome(b); return; }
    best.claimed = b.id;
    b.lane = best;
    const f = this.fronts[best.fi];
    const a = f.cur[best.i0], z = f.cur[best.i1];
    const startAtA = Math.hypot(a[0] - b.x, a[1] - b.y) <= Math.hypot(z[0] - b.x, z[1] - b.y);
    b.dirSign = startAtA ? 1 : -1;
    b.idx = startAtA ? best.i0 : best.i1;
    let entry = f.cur[b.idx];
    // enter at the first navigable point of the lane
    for (let k = 0; k < 16 && !this.navFree(entry[0], entry[1]); k++) {
      b.idx += b.dirSign; entry = f.cur[Math.max(0, Math.min(f.n - 1, b.idx))];
    }
    b.path = this.path(b.x, b.y, entry[0], entry[1]);
    b.wp = 0;
    b.state = 'toLane';
  }
  _sendHome(b) {
    if (b.lane) { b.lane.claimed = -1; b.lane = null; }
    const d = this.docks[b.id];
    b.path = this.path(b.x, b.y, d[0], d[1]);
    b.wp = 0;
    b.state = 'home';
  }
  dockAll(fade = true) {
    for (const b of this.boats) {
      if (b.lane) { b.lane.claimed = -1; b.lane = null; }
      if (b.state === 'docked') continue;
      if (fade) { b.fade = 1; b.fadeTo = 'dock'; }
      else this._placeDocked(b);
    }
  }
  _placeDocked(b) {
    const d = this.docks[b.id];
    b.x = d[0]; b.y = d[1]; b.heading = -Math.PI / 2; b.state = 'docked'; b.path = []; b.track = [];
    this._unload(b);
  }
  _unload(b) {
    for (let k = 0; k < 4; k++) { this.unloadedKg[k] += b.loadKg[k]; b.loadKg[k] = 0; }
    b.load = 0;
  }
  launch(stagger = 0.7) {
    let n = 0;
    for (const b of this.boats) {
      if (b.state === 'docked' || b.state === 'unload') { b.delay = n * stagger; b.state = 'waiting'; b.recall = false; n++; }
    }
  }
  recall(id) {
    const b = this.boats[id];
    if (!b || b.state === 'docked' || b.state === 'home' || b.state === 'unload') return;
    b.recall = true;
    this._sendHome(b);
  }
  // story helpers: put a boat where the current step needs it, hidden behind a fade
  warpToSweep(id, front = -1) {
    const b = this.boats[id];
    if (!b) return;
    const wrongFront = front > -1 && (!b.lane || b.lane.fi !== front);
    if (b.state === 'sweep' && !wrongFront) { if (b.load > 30) this._unload(b); return; }
    if (wrongFront || !b.lane || b.state === 'docked' || b.state === 'waiting' || b.state === 'unload' || b.state === 'home') {
      if (b.load > BOAT_CAP * 0.6) this._unload(b);
      this._assign(b, front);
    }
    if (!b.lane) return;
    if (b.load > 16) this._unload(b);           // start the shot with room in the bin
    const f = this.fronts[b.lane.fi];
    const i = Math.max(0, Math.min(f.n - 1, Math.round(b.idx + b.dirSign * 3)));
    const p = f.cur[i], q = f.cur[Math.max(0, Math.min(f.n - 1, i + b.dirSign * 2))];
    b.x = p[0]; b.y = p[1];
    b.heading = Math.atan2(q[1] - p[1], q[0] - p[0]);
    b.idx = i; b.state = 'sweep'; b.path = []; b.track = []; b.alpha = 0; b.speed = 12;
  }
  warpNearHome(id) {
    const b = this.boats[id];
    if (!b || b.state === 'home' || b.state === 'unload' || b.state === 'docked') return;
    if (b.lane) { b.lane.claimed = -1; b.lane = null; }
    const d = this.docks[id];
    let sx = d[0], sy = d[1] + 105;
    for (let k = 0; k < 20 && !this.navFree(sx, sy); k++) sy -= 8;
    if (b.load < 40) {
      const add = 46 - b.load;
      b.load += add;
      const share = [0.55, 0.2, 0.15, 0.1];
      share.forEach((sh, k) => { b.loadKg[k] += add * sh * KINDS[k].kg; });
    }
    b.x = sx; b.y = sy; b.heading = -Math.PI / 2; b.track = []; b.alpha = 0; b.speed = 30;
    b.path = this.path(sx, sy, d[0], d[1]); b.wp = 0; b.state = 'home'; b.recall = false;
  }
  boatsOut() { return this.boats.filter((b) => b.state !== 'docked' && b.state !== 'unload' && b.state !== 'waiting').length; }

  _steer(b, tx, ty, speed, dt) {
    const want = Math.atan2(ty - b.y, tx - b.x);
    let da = want - b.heading;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const turn = 2.8 * dt;
    b.heading += Math.max(-turn, Math.min(turn, da));
    const slow = Math.abs(da) > 1.2 ? 0.35 : 1;
    b.speed += (speed * slow - b.speed) * Math.min(1, dt * 2.5);
    b.x += Math.cos(b.heading) * b.speed * dt;
    b.y += Math.sin(b.heading) * b.speed * dt;
    return Math.hypot(tx - b.x, ty - b.y);
  }

  _stepBoats(dt) {
    for (const b of this.boats) {
      if (b.fade > 0) {                      // fade-out teleport to the dock
        b.alpha = Math.max(0, b.alpha - dt * 3.5);
        if (b.alpha === 0) { if (b.fadeTo === 'dock') this._placeDocked(b); b.fade = 0; }
        continue;
      }
      if (b.alpha < 1) b.alpha = Math.min(1, b.alpha + dt * 3.5);
      switch (b.state) {
        case 'docked': b.speed = 0; break;
        case 'waiting':
          b.delay -= dt;
          if (b.delay <= 0) { if (this.params.boats) this._assign(b); else b.state = 'docked'; }
          break;
        case 'toLane': {
          const wp = b.path[b.wp];
          if (!wp) { b.state = 'sweep'; break; }
          const d = this._steer(b, wp[0], wp[1], 34, dt);
          if (d < 9) { b.wp++; if (b.wp >= b.path.length) b.state = 'sweep'; }
          break;
        }
        case 'sweep': {
          const lane = b.lane;
          if (!lane) { this._assign(b); break; }
          const f = this.fronts[lane.fi];
          b.idx += b.dirSign * (15 * dt) / SPACING;
          const done = b.dirSign > 0 ? b.idx >= lane.i1 : b.idx <= lane.i0;
          if (done) {
            if (b.load >= BOAT_CAP * 0.8 || !this.params.boats) this._sendHome(b);
            else this._assign(b);
            break;
          }
          let look = Math.round(b.idx + b.dirSign * 2.5);
          look = Math.max(0, Math.min(f.n - 1, look));
          let p = f.cur[look];
          let hops = 0;
          while (!this.navFree(p[0], p[1]) && hops < 12) {
            b.idx += b.dirSign; look = Math.max(0, Math.min(f.n - 1, Math.round(b.idx + b.dirSign * 2.5))); p = f.cur[look]; hops++;
          }
          if (Math.hypot(p[0] - b.x, p[1] - b.y) > 60 || !this.los(b.x, b.y, p[0], p[1])) {
            b.path = this.path(b.x, b.y, p[0], p[1]); b.wp = 0; b.state = 'toLane'; break;
          }
          this._steer(b, p[0], p[1], 15, dt);
          this._collect(b);
          if (b.load >= BOAT_CAP) this._sendHome(b);
          break;
        }
        case 'home': {
          const wp = b.path[b.wp];
          if (!wp) { b.state = 'unload'; b.timer = 3; break; }
          const d = this._steer(b, wp[0], wp[1], 34, dt);
          if (d < 8) { b.wp++; if (b.wp >= b.path.length) { b.state = 'unload'; b.timer = 3; b.speed = 0; } }
          break;
        }
        case 'unload':
          b.speed = 0;
          b.timer -= dt;
          if (b.timer <= 0) {
            this._unload(b);
            if (this.params.boats && !b.recall) { b.state = 'waiting'; b.delay = 0.3; }
            else b.state = 'docked';
          }
          break;
      }
      b.trackT += dt;
      if (b.trackT > 0.25 && b.state !== 'docked' && b.state !== 'unload' && b.state !== 'waiting') {
        b.trackT = 0;
        b.track.push(b.x, b.y);
        if (b.track.length > 28) b.track.splice(0, 2);
      }
    }
  }

  _collect(b) {
    const fx = b.x + Math.cos(b.heading) * 4, fy = b.y + Math.sin(b.heading) * 4;
    const R2 = 14 * 14;
    for (let i = 0; i < this.N; i++) {
      if (this.st[i] !== 1) continue;
      const dx = this.px[i] - fx, dy = this.py[i] - fy;
      if (dx * dx + dy * dy < R2) {
        this.st[i] = 3; this.tgt[i] = b.id; this.age[i] = 0;
        const k = this.kd[i];
        b.load++; b.loadKg[k] += KINDS[k].kg;
        this.collectedKg += KINDS[k].kg;
        if (b.load >= BOAT_CAP) break;
      }
    }
  }

  setBoats(on) {
    this.params.boats = on;
    if (on) this.launch(0.35);
    else for (const b of this.boats) if (b.state !== 'docked' && b.state !== 'unload') { if (b.state === 'waiting') b.state = 'docked'; else this._sendHome(b); }
  }

  // ---------- main step ----------
  step(dt) {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;
    // ease the wind that drives the front offset
    const wv = windVec(this.wind.dir);
    const k = Math.min(1, dt * 1.8);
    const wx = this.windShown.x + (wv.x * this.wind.speed - this.windShown.x) * k;
    const wy = this.windShown.y + (wv.y * this.wind.speed - this.windShown.y) * k;
    const moving = Math.abs(wx - this.windShown.x) + Math.abs(wy - this.windShown.y) > 0.002;
    this.windShown.x = wx; this.windShown.y = wy;
    if (moving) this._attrT = -1;
    this._updateFronts(false);
    this._stepParticles(dt);
    this._stepBoats(dt);
    for (const rp of this.ripples) rp.t += dt;
    this.ripples = this.ripples.filter((rp) => rp.t < 0.8);
  }
  run(seconds, dt = 1 / 24) {
    const n = Math.ceil(seconds / dt);
    for (let i = 0; i < n; i++) this.step(dt);
  }
}
