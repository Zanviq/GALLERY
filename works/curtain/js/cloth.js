// Verlet cloth for two curtain panels hanging from rings on one rail.
// World units are CSS pixels of the stage box; y points down, z points at the audience.

const H_LINK = 0, V_LINK = 1, SHEAR = 2, BEND = 3, CORD = 4;
const FREE = 0, FIXED = 1, RING = 2;
const TEAR = 1.75;
const TEAR_WEFT = 1.95;  // across the width the pleats give a little more before the weave goes
const TEAR_RING = 3.4;   // the heading is reinforced: it rips off its rings only when yanked hard
const MEND_SECONDS = 1.2;

/** One Gauss-Seidel pass over a list of distance links. Kept small so the JIT keeps it fast. */
function relax(x, y, z, im, la, lb, rest, stiff, stiffC, alive, list, fwd) {
  const n = list.length;
  for (let q = 0; q < n; q++) {
    const c = list[fwd ? q : n - 1 - q];
    if (alive[c] === 0) continue;
    const a = la[c], b = lb[c];
    const wa = im[a], wb = im[b], ws = wa + wb;
    if (ws === 0) continue;
    const dx = x[b] - x[a], dy = y[b] - y[a], dz = z[b] - z[a];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6) continue;
    const r = rest[c];
    // folding is easy, stretching is not: bending links barely resist being pushed together
    const f = ((len - r) / len) * (len < r ? stiffC[c] : stiff[c]) / ws;
    const fx = dx * f, fy = dy * f, fz = dz * f;
    x[a] += fx * wa; y[a] += fy * wa; z[a] += fz * wa;
    x[b] -= fx * wb; y[b] -= fy * wb; z[b] -= fz * wb;
  }
}

export class Curtain {
  constructor(L, opt) {
    this.L = L;
    this.opt = opt;
    const center = (L.left + L.right) / 2;
    const panelW = center + L.overlap / 2 - L.left;
    const top = L.railY + L.ringDrop;
    const height = L.hemY - top;
    let dx = Math.sqrt((2 * panelW * height) / (1.25 * opt.maxParticles));
    const nx = Math.max(13, Math.round(panelW / dx / 3) * 3 + 1);
    dx = panelW / (nx - 1);
    const ny = Math.max(14, Math.round(height / (dx * 1.25)) + 1);
    const dy = height / (ny - 1);
    const A = dx * 1.35;
    Object.assign(this, { center, panelW, top, height, nx, ny, dx, dy, A });
    this.zRail = [A * 1.4, -A * 1.4];
    this.perPanel = nx * ny;
    this.clothCount = 2 * nx * ny;
    this.tasselLen = Math.max(46, Math.min(120, height * 0.15));
    this.tasselSeg = [0.2, 0.2, 0.2, 0.16, 0.24].map((f) => f * this.tasselLen);
    this.tasselStart = this.clothCount;
    const n = this.clothCount + 2 * this.tasselSeg.length;
    this.n = n;

    this.x = new Float64Array(n); this.y = new Float64Array(n); this.z = new Float64Array(n);
    this.ox = new Float64Array(n); this.oy = new Float64Array(n); this.oz = new Float64Array(n);
    this.im = new Float32Array(n);      // base inverse mass
    this.imNow = new Float32Array(n);   // 0 while held
    this.pin = new Uint8Array(n);
    this.held = new Uint8Array(n);
    this.tx = new Float32Array(n); this.ty = new Float32Array(n); this.tz = new Float32Array(n);
    this.crush = new Float32Array(n);
    this.mx = new Float32Array(n); this.my = new Float32Array(n); // flat material coords
    this.panelOf = new Uint8Array(n);

    for (let p = 0; p < 2; p++) {
      for (let j = 0; j < ny; j++) {
        let arc = 0, px = 0, pz = 0;
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          const x = this.xOf(p, i * dx);
          const z = this.restZ(p, i);
          if (i > 0) arc += Math.hypot(x - px, z - pz);
          px = x; pz = z;
          this.x[k] = this.ox[k] = x;
          this.y[k] = this.oy[k] = top + j * dy;
          this.z[k] = this.oz[k] = z;
          this.mx[k] = arc;
          this.my[k] = j * dy;
          this.im[k] = j === ny - 1 ? 1 / 3 : j === ny - 2 ? 1 / 1.6 : 1;
          this.panelOf[k] = p;
          if (j === 0 && i % 3 === 0) { this.pin[k] = i === 0 ? FIXED : RING; this.im[k] = 4; }
        }
      }
    }
    this.closedS = (nx - 1) * dx;
    this.maxS = this.closedS + L.overlap * 0.4;
    this.ringGap = 3 * dx * 0.22;
    this.rings = [[], []];
    for (let p = 0; p < 2; p++) for (let i = 0; i < nx; i += 3) this.rings[p].push(this.idx(p, i, 0));
    this.rope = [this.closedS, this.closedS];
    this.sticky = [true, true];
    this.tearWindow = 0;
    this.ropeAnim = [null, null];

    this.buildLinks();
    this.buildTassels();
    this.buildLists();
    this.buildTriangles();
    this.imNow.set(this.im);
    for (let k = 0; k < n; k++) if (this.pin[k] === FIXED) this.imNow[k] = 0;

    this.grabs = new Map();
    this.g = (9.8 * height) / 5;     // the curtain is about five metres tall
    this.damp = 0.988;
    this.iterations = opt.iterations;
    this.torn = 0;                   // links broken since the last mend
    this.everTorn = false;
    this.mending = 0;                // seconds into a mend, 0 = not mending
    this.trisDirty = true;
    this.quiet = 0;
    this.onTear = null;
    this.yank = null;
  }

  idx(p, i, j) { return p * this.perPanel + j * this.nx + i; }
  xOf(p, s) { return p === 0 ? this.L.left + s : this.L.right - s; }
  sOf(p, x) { return p === 0 ? x - this.L.left : this.L.right - x; }
  restZ(p, i) {
    // each pleat a little different, as sewn by hand
    const q = (i / 3) | 0, h = Math.sin(q * 12.9898 + p * 78.233) * 43758.5453;
    const jit = 0.72 + 0.56 * (h - Math.floor(h));
    return this.zRail[p] + this.A * jit * Math.sin((Math.PI * i) / 3);
  }

  buildLinks() {
    const { nx, ny } = this;
    const cap = 2 * (5 * nx * ny) + 16;
    this.la = new Int32Array(cap); this.lb = new Int32Array(cap);
    this.rest = new Float64Array(cap); this.rest0 = new Float64Array(cap); this.mendFrom = new Float64Array(cap);
    this.stiff = new Float32Array(cap); this.type = new Uint8Array(cap);
    this.alive = new Uint8Array(cap); this.stitched = new Uint8Array(cap); this.mendingLink = new Uint8Array(cap);
    this.strain = new Uint8Array(cap);
    this.spanA = new Int32Array(cap).fill(-1); this.spanB = new Int32Array(cap).fill(-1);
    this.hLink = new Int32Array(this.clothCount).fill(-1);
    this.vLink = new Int32Array(this.clothCount).fill(-1);
    this.dLink = new Int32Array(this.clothCount).fill(-1);
    let c = 0;
    const add = (a, b, t, s, shrink = 1) => {
      this.la[c] = a; this.lb[c] = b; this.type[c] = t; this.stiff[c] = s; this.alive[c] = 1;
      const r = Math.hypot(this.x[b] - this.x[a], this.y[b] - this.y[a], this.z[b] - this.z[a]) * shrink;
      this.rest[c] = this.rest0[c] = r;
      c++;
      this.linkCount = c;
      return c - 1;
    };
    for (let p = 0; p < 2; p++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          if (i < nx - 1) this.hLink[k] = add(k, this.idx(p, i + 1, j), H_LINK, 1);
          if (j < ny - 1) this.vLink[k] = add(k, this.idx(p, i, j + 1), V_LINK, 1, 0.962);
          if (i < nx - 1 && j < ny - 1) {
            this.dLink[k] = (i + j) % 2 === 0
              ? add(k, this.idx(p, i + 1, j + 1), SHEAR, 0.9)
              : add(this.idx(p, i + 1, j), this.idx(p, i, j + 1), SHEAR, 0.9);
          }
        }
      }
      // bending links span two struct links; remember them so a tear can cut them too
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          if (i < nx - 2) {
            const b = add(k, this.idx(p, i + 2, j), BEND, 0.3);
            this.addSpan(this.hLink[k], b); this.addSpan(this.hLink[this.idx(p, i + 1, j)], b);
          }
          if (j < ny - 2) {
            const b = add(k, this.idx(p, i, j + 2), BEND, 0.3, 0.962);
            this.addSpan(this.vLink[k], b); this.addSpan(this.vLink[this.idx(p, i, j + 1)], b);
          }
        }
      }
    }
    this._add = add;
  }

  buildLists() {
    const L = this.linkCount;
    let nb = 0;
    for (let c = 0; c < L; c++) if (this.type[c] === BEND) nb++;
    this.mainList = new Int32Array(L - nb);
    this.bendList = new Int32Array(nb);
    this.stiffC = new Float64Array(L);
    for (let c = 0, i = 0, j = 0; c < L; c++) {
      if (this.type[c] === BEND) { this.bendList[j++] = c; this.stiffC[c] = this.stiff[c] * 0.12; }
      else { this.mainList[i++] = c; this.stiffC[c] = this.stiff[c]; }
    }
    this.stiff = Float64Array.from(this.stiff.subarray(0, L));
  }

  addSpan(structLink, bend) {
    if (this.spanA[structLink] < 0) this.spanA[structLink] = bend; else this.spanB[structLink] = bend;
  }

  buildTassels() {
    const segs = this.tasselSeg;
    this.tassels = [];
    for (let p = 0; p < 2; p++) {
      const anchor = this.idx(p, this.nx - 1, 0);
      const chain = [anchor];
      let y = this.y[anchor];
      const x = this.x[anchor] + (p === 0 ? -2 : 2);
      const z = this.zRail[p] + this.A * 2.2;
      for (let s = 0; s < segs.length; s++) {
        const k = this.tasselStart + p * segs.length + s;
        y += segs[s];
        this.x[k] = this.ox[k] = x; this.y[k] = this.oy[k] = y; this.z[k] = this.oz[k] = z;
        this.im[k] = s >= 3 ? 1.2 : 2;
        this.panelOf[k] = p;
        chain.push(k);
      }
      for (let s = 0; s < segs.length; s++) {
        const c = this._add(chain[s], chain[s + 1], CORD, 1);
        this.rest[c] = this.rest0[c] = segs[s];
      }
      this.tassels.push(chain);
    }
  }

  buildTriangles() {
    const { nx, ny } = this;
    const cells = 2 * (nx - 1) * (ny - 1);
    this.triV = new Uint16Array(cells * 6);
    this.triE = new Int32Array(cells * 6);
    let t = 0;
    for (let p = 0; p < 2; p++) {
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const a = this.idx(p, i, j), b = this.idx(p, i + 1, j);
          const c = this.idx(p, i, j + 1), d = this.idx(p, i + 1, j + 1);
          const top = this.hLink[a], bottom = this.hLink[c], lft = this.vLink[a], rgt = this.vLink[b], diag = this.dLink[a];
          const tri = (v0, v1, v2, e0, e1, e2) => {
            this.triV[t * 3] = v0; this.triV[t * 3 + 1] = v1; this.triV[t * 3 + 2] = v2;
            this.triE[t * 3] = e0; this.triE[t * 3 + 1] = e1; this.triE[t * 3 + 2] = e2;
            t++;
          };
          if ((i + j) % 2 === 0) { tri(a, b, d, top, rgt, diag); tri(a, d, c, diag, bottom, lft); }
          else { tri(a, b, c, top, diag, lft); tri(b, d, c, rgt, bottom, diag); }
        }
      }
    }
    this.triCount = t;
    this.triAlive = new Uint8Array(t).fill(1);
    this.visibleIdx = new Uint16Array(t * 3);
    this.visibleCount = 0;
  }

  /** Recompute which triangles are drawn. Cheap; called when links change or while mending. */
  refreshTriangles() {
    let n = 0;
    const mend = this.mending > 0;
    for (let t = 0; t < this.triCount; t++) {
      let ok = 1;
      for (let e = 0; e < 3; e++) {
        const c = this.triE[t * 3 + e];
        if (!this.alive[c]) { ok = 0; break; }
        if (mend && this.mendingLink[c] && this.len(c) > this.rest0[c] * 1.3) { ok = 0; break; }
      }
      this.triAlive[t] = ok;
      if (ok) {
        this.visibleIdx[n++] = this.triV[t * 3];
        this.visibleIdx[n++] = this.triV[t * 3 + 1];
        this.visibleIdx[n++] = this.triV[t * 3 + 2];
      }
    }
    this.visibleCount = n;
    this.trisDirty = mend;
  }

  len(c) {
    const a = this.la[c], b = this.lb[c];
    return Math.hypot(this.x[b] - this.x[a], this.y[b] - this.y[a], this.z[b] - this.z[a]);
  }

  // ---- input -------------------------------------------------------------------------------

  nearest(px, py, radius) {
    let best = -1, bd = radius * radius;
    // tassels first: they are small and in front
    for (let k = this.tasselStart; k < this.n; k++) {
      const d = (this.x[k] - px) ** 2 + (this.y[k] - py) ** 2;
      if (d < bd * 1.4) { bd = d; best = k; }
    }
    if (best >= 0) return best;
    for (let k = 0; k < this.clothCount; k++) {
      const d = (this.x[k] - px) ** 2 + (this.y[k] - py) ** 2 - this.z[k] * 0.5;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  grab(id, px, py, radius) {
    const hit = this.nearest(px, py, radius);
    if (hit < 0) return false;
    const set = [];
    if (hit >= this.tasselStart) {
      set.push([hit, 1]);
    } else {
      const p = this.panelOf[hit];
      const local = hit - p * this.perPanel;
      const hi = local % this.nx, hj = (local / this.nx) | 0;
      const ratio = this.dy / this.dx;
      for (let dj = -2; dj <= 2; dj++) {
        for (let di = -2; di <= 2; di++) {
          const i = hi + di, j = hj + dj;
          if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) continue;
          const r2 = di * di + dj * dj * ratio * ratio;
          if (r2 > 3.0) continue;
          set.push([this.idx(p, i, j), Math.exp(-r2 * 0.6)]);
        }
      }
      // pile under the hand gets crushed
      for (let dj = -3; dj <= 3; dj++) {
        for (let di = -3; di <= 3; di++) {
          const i = hi + di, j = hj + dj;
          if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) continue;
          const k = this.idx(p, i, j);
          const w = Math.exp(-(di * di + dj * dj * ratio * ratio) * 0.35);
          this.crush[k] = Math.min(1, this.crush[k] + 0.55 * w);
        }
      }
    }
    const items = [];
    for (const [k, w] of set) {
      if (this.pin[k] === FIXED) continue;
      if (this.held[k]) continue;
      this.held[k] = 1;
      this.imNow[k] = 0;
      items.push({ k, w, dx: this.x[k] - px, dy: this.y[k] - py, z: this.z[k] });
    }
    if (!items.length) return false;
    const p = this.panelOf[hit];
    this.rope[p] = null;
    this.ropeAnim[p] = null;
    // velvet barely stretches, so a sideways pull reaches the rail at once: the ring above the
    // hand is carried along (more firmly the higher the grip)
    let ring = -1, follow = 0;
    if (hit < this.tasselStart) {
      const local = hit - p * this.perPanel;
      ring = Math.max(1, Math.round((local % this.nx) / 3));
      follow = 0.55 * Math.max(0.45, 1 - 0.7 * ((local / this.nx) | 0) / (this.ny - 1));
    }
    this.grabs.set(id, { items, px, py, hx: px, hy: py, panel: p, ring, follow });
    this.quiet = 0;
    return true;
  }

  move(id, px, py) {
    const g = this.grabs.get(id);
    if (!g) return;
    g.px = px;
    g.py = Math.min(py, this.L.floorY);
    this.quiet = 0;
  }

  release(id) {
    const g = this.grabs.get(id);
    if (!g) return;
    for (const it of g.items) {
      const k = it.k;
      this.held[k] = 0;
      this.imNow[k] = this.pin[k] === FIXED ? 0 : this.im[k];
      // cap the throw so a flick does not launch the cloth into orbit
      const vx = this.x[k] - this.ox[k], vy = this.y[k] - this.oy[k];
      const v = Math.hypot(vx, vy), max = 24;
      if (v > max) { this.ox[k] = this.x[k] - (vx / v) * max; this.oy[k] = this.y[k] - (vy / v) * max; }
    }
    this.grabs.delete(id);
    this.quiet = 0;
  }

  releaseAll() { for (const id of [...this.grabs.keys()]) this.release(id); }

  // ---- traveller rope ------------------------------------------------------------------------

  leadS(p) { return this.sOf(p, this.x[this.rings[p][this.rings[p].length - 1]]); }
  openS() { return (this.rings[0].length - 1) * this.ringGap + 2; }

  openness() {
    const lo = this.openS(), hi = this.closedS;
    let f = 0;
    for (let p = 0; p < 2; p++) f += 1 - (this.leadS(p) - lo) / (hi - lo);
    return Math.max(0, Math.min(1, f / 2));
  }

  travel(target, seconds) {
    for (let p = 0; p < 2; p++) {
      const from = this.leadS(p);
      this.rope[p] = from;
      this.ropeAnim[p] = { from, to: target === 'open' ? this.openS() : this.closedS, t: 0, dur: seconds };
    }
    this.quiet = 0;
  }

  // ---- tearing and mending -------------------------------------------------------------------

  cut(c) {
    if (!this.alive[c]) return;
    this.alive[c] = 0;
    this.mendingLink[c] = 0;
    this.strain[c] = 0;
    if (this.spanA[c] >= 0) this.alive[this.spanA[c]] = 0;
    if (this.spanB[c] >= 0) this.alive[this.spanB[c]] = 0;
    this.torn++;
    this.everTorn = true;
    this.trisDirty = true;
    if (this.onTear) this.onTear();
  }

  /** A virtual hand grabs one panel low down and yanks it until it gives. */
  startYank(p, seed) {
    // closed: somewhere in the middle of the panel; open: the inner folds, where it can be seen
    const i = this.openness() > 0.5
      ? this.nx - 2 - Math.round(3 * seed)
      : Math.round((this.nx - 1) * (0.42 + 0.3 * seed));
    const j = Math.round((this.ny - 1) * (0.5 + 0.22 * ((seed * 7.3) % 1)));
    const k = this.idx(p, i, j);
    const id = 'yank' + p;
    this.release(id);
    if (!this.grab(id, this.x[k], this.y[k], this.dx * 3)) return;
    const out = p === 0 ? -1 : 1;
    this.yank = {
      id, t: 0, dur: 0.5,
      x0: this.x[k], y0: this.y[k],
      x1: this.x[k] + out * this.panelW * 0.28, y1: Math.min(this.L.floorY, this.y[k] + this.height * 0.55),
      before: this.torn,
    };
  }

  mend() {
    let any = false;
    for (let c = 0; c < this.linkCount; c++) {
      if (this.alive[c] || this.type[c] === CORD) continue;
      any = true;
      const l = this.len(c);
      this.alive[c] = 1;
      this.mendingLink[c] = 1;
      this.mendFrom[c] = Math.max(l, this.rest0[c]);
      this.rest[c] = this.mendFrom[c];
      if (this.type[c] === H_LINK || this.type[c] === V_LINK) this.stitched[c] = 1;
    }
    if (!any) return false;
    this.mending = 1e-6;
    this.torn = 0;
    this.trisDirty = true;
    this.quiet = 0;
    return true;
  }

  // ---- simulation ----------------------------------------------------------------------------

  step(dt) {
    const { x, y, z, ox, oy, oz, imNow, pin, held } = this;
    const n = this.n;
    const damp = this.damp;
    const gdt = this.g * dt * dt;
    const floor = this.L.floorY;
    let maxV = 0;

    // rope
    for (let p = 0; p < 2; p++) {
      const a = this.ropeAnim[p];
      if (!a) continue;
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
      this.rope[p] = a.from + (a.to - a.from) * e;
      if (a.t >= 1) this.ropeAnim[p] = null;
      maxV = 1;
    }

    // scripted yank (the 찢기 button)
    if (this.yank) {
      const yk = this.yank;
      yk.t = Math.min(1, yk.t + dt / yk.dur);
      const e = yk.t * yk.t;
      this.move(yk.id, yk.x0 + (yk.x1 - yk.x0) * e, yk.y0 + (yk.y1 - yk.y0) * e);
      if (yk.t >= 1 || this.torn > yk.before + 6) {
        if (yk.t >= 1 && this.torn === yk.before) this.forceRip(yk);
        this.release(yk.id);
        this.yank = null;
      }
    }

    // mending: shrink rest lengths back
    if (this.mending > 0) {
      this.mending += dt;
      const t = Math.min(1, this.mending / MEND_SECONDS);
      const e = 1 - (1 - t) ** 3;
      for (let c = 0; c < this.linkCount; c++) {
        if (!this.mendingLink[c]) continue;
        this.rest[c] = this.mendFrom[c] + (this.rest0[c] - this.mendFrom[c]) * e;
        if (t >= 1) { this.rest[c] = this.rest0[c]; this.mendingLink[c] = 0; }
      }
      if (t >= 1) { this.mending = 0; this.trisDirty = true; }
      maxV = 1;
    }

    // integrate
    for (let k = 0; k < n; k++) {
      if (pin[k] === FIXED || held[k]) continue;
      let vx = (x[k] - ox[k]) * damp, vy = (y[k] - oy[k]) * damp, vz = (z[k] - oz[k]) * damp;
      ox[k] = x[k]; oy[k] = y[k]; oz[k] = z[k];
      if (pin[k] === RING) {
        if (!this.sticky[this.panelOf[k]]) x[k] += vx * 0.9;
        continue;
      }
      const v2 = vx * vx + vy * vy + vz * vz;
      if (v2 > 900) { const s = 30 / Math.sqrt(v2); vx *= s; vy *= s; vz *= s; }
      if (v2 > maxV) maxV = v2;
      x[k] += vx; y[k] += vy + gdt; z[k] += vz;
    }

    // held particles follow their hand
    for (const g of this.grabs.values()) {
      // the hand itself moves at most 10px a step (600px/s): heavy cloth drags behind a flick
      const mx = g.px - g.hx, my = g.py - g.hy, ml = Math.hypot(mx, my), lim = 10;
      const sc = ml > lim ? lim / ml : 1;
      const ds = this.sOf(g.panel, g.hx + mx * sc) - this.sOf(g.panel, g.hx);
      g.hx += mx * sc; g.hy += my * sc;
      for (const it of g.items) {
        const k = it.k;
        ox[k] = x[k]; oy[k] = y[k]; oz[k] = z[k];
        x[k] = g.hx + it.dx;
        if (pin[k] !== RING) { y[k] = Math.min(floor, g.hy + it.dy); z[k] = it.z; }
        const w = it.w;
        if (k < this.clothCount) this.crush[k] = Math.min(1, this.crush[k] + 0.004 * w);
      }
      if (g.ring > 0 && ds !== 0) {
        // opening carries the rings between hand and lead edge; closing drags those behind it
        const rs = this.rings[g.panel];
        const from = ds < 0 ? g.ring : 1, to = ds < 0 ? rs.length - 1 : g.ring;
        for (let r = from; r <= to; r++) {
          const k = rs[r];
          if (held[k] || (r === rs.length - 1 && this.rope[g.panel] !== null)) continue;
          x[k] = this.xOf(g.panel, this.sOf(g.panel, x[k]) + ds * g.follow);
        }
      }
      maxV = Math.max(maxV, 1);
    }

    // rings: light while a hand works the panel, heavy and sticky once it lets go
    for (let p = 0; p < 2; p++) {
      let hand = false;
      for (const g of this.grabs.values()) if (g.panel === p) hand = true;
      const m = hand ? 4 : this.ropeAnim[p] ? 1.5 : 0;
      this.sticky[p] = !hand && !this.ropeAnim[p];
      const rs = this.rings[p];
      for (let r = 1; r < rs.length; r++) if (!held[rs[r]]) imNow[rs[r]] = m;
      const lead = rs[rs.length - 1];
      if (this.rope[p] !== null && !held[lead]) { imNow[lead] = 0; x[lead] = this.xOf(p, this.rope[p]); }
    }

    const iters = this.iterations;
    const { la, lb, rest, stiff, alive, type, rest0, strain } = this;
    const { mainList, bendList, stiffC } = this;
    for (let it = 0; it < iters; it++) {
      const fwd = (it & 1) === 0;
      relax(x, y, z, imNow, la, lb, rest, stiff, stiffC, alive, mainList, fwd);
      // bending only every other pass: it shapes folds, it does not hold the cloth up
      if ((it & 1) === 0) relax(x, y, z, imNow, la, lb, rest, stiff, stiffC, alive, bendList, !fwd);
      if (it === iters - 1) this.ringFriction();
      this.projectRings();
      if (this.mending > 0) this.shapePull(it === 0);
      if (it === (iters >> 1) || it === iters - 1) {
        for (let k = 0; k < n; k++) {
          if (y[k] > floor) {
            y[k] = floor;
            ox[k] = x[k] - (x[k] - ox[k]) * 0.5;
            oz[k] = z[k] - (z[k] - oz[k]) * 0.5;
          }
        }
      }
    }

    // tearing: a link gives only under a pull that lasts a few steps, not a solver spike, and only
    // while a hand is (or was a moment ago) pulling: the traveller rope never rips its own curtain
    const { mendingLink } = this;
    if (this.grabs.size) this.tearWindow = 90; else if (this.tearWindow > 0) this.tearWindow--;
    for (let q = 0; this.tearWindow > 0 && q < mainList.length; q++) {
      const c = mainList[q];
      if (!alive[c] || type[c] > SHEAR || mendingLink[c]) continue;
      const a = la[c], b = lb[c];
      const ddx = x[b] - x[a], ddy = y[b] - y[a], ddz = z[b] - z[a];
      const lim = rest0[c] * (pin[a] || pin[b] ? TEAR_RING : type[c] === H_LINK ? TEAR_WEFT : TEAR);
      if (ddx * ddx + ddy * ddy + ddz * ddz > lim * lim) {
        if (++strain[c] >= 5) this.cut(c);
      } else if (strain[c]) strain[c]--;
    }

    // velvet slowly recovers its pile while it moves
    if (maxV > 0.01) for (let k = 0; k < this.clothCount; k++) if (this.crush[k] > 0) this.crush[k] = Math.max(0, this.crush[k] - dt * 0.012);

    if (maxV < 0.0025 && !this.grabs.size && !this.yank) this.quiet++; else this.quiet = 0;
    if (this.trisDirty) this.refreshTriangles();
  }

  /** Static friction on the rail: a ring that would only creep stays where it is. */
  ringFriction() {
    for (let p = 0; p < 2; p++) {
      if (!this.sticky[p]) continue;
      for (const k of this.rings[p]) {
        if (this.held[k] || this.pin[k] !== RING) continue;
        if (Math.abs(this.x[k] - this.ox[k]) < 0.8) this.x[k] = this.ox[k];
      }
    }
  }

  /** Rings slide on the rail: fixed y and z, kept in order with a minimum gap. */
  projectRings() {
    const { x, y, z, held } = this;
    const gap = this.ringGap;
    for (let p = 0; p < 2; p++) {
      const rs = this.rings[p];
      const K = rs.length - 1;
      const s = this._s || (this._s = new Float32Array(64));
      for (let r = 0; r <= K; r++) s[r] = this.sOf(p, x[rs[r]]);
      s[0] = 0;
      const roped = this.rope[p] !== null && !held[rs[K]];
      if (roped) s[K] = this.rope[p];
      s[K] = Math.max(K * gap, Math.min(s[K], this.maxS));
      // rings in a hand or on the rope stay put; the others are pushed out of their way
      for (let r = 1; r <= K; r++) {
        if (held[rs[r]] || (r === K && roped)) continue;
        s[r] = Math.max(s[r], s[r - 1] + gap);
      }
      for (let r = K - 1; r >= 1; r--) {
        if (held[rs[r]]) continue;
        s[r] = Math.min(s[r], s[r + 1] - gap);
      }
      for (let r = 0; r <= K; r++) {
        const k = rs[r];
        x[k] = this.xOf(p, s[r]);
        y[k] = this.top;
        z[k] = this.zRail[p];
      }
      // heading tape: the top edge between rings may only dip a little
      const base = p * this.perPanel, maxDip = this.dy * 0.35;
      for (let i = 1; i < this.nx; i++) {
        if (i % 3 === 0) continue;
        const k = base + i;
        if (held[k] || !this.alive[this.vLink[k]]) continue;
        if (y[k] > this.top + maxDip) y[k] = this.top + maxDip + (y[k] - this.top - maxDip) * 0.3;
      }
    }
  }

  /** While mending, a soft pull toward the hanging shape so torn flaps come back the right way round. */
  shapePull(first) {
    if (!first) return;
    const t = Math.min(1, this.mending / MEND_SECONDS);
    const k0 = 0.12 * Math.sin(Math.PI * t);
    if (k0 <= 0) return;
    const { nx, ny } = this;
    for (let p = 0; p < 2; p++) {
      const rs = this.rings[p];
      for (let j = 1; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          if (this.held[k]) continue;
          const m = Math.min(rs.length - 2, (i / 3) | 0);
          const f = (i - m * 3) / 3;
          const ra = rs[m], rb = rs[m + 1];
          const tx = this.x[ra] + (this.x[rb] - this.x[ra]) * f;
          const ty = this.top + j * this.dy;
          const tz = this.restZ(p, i);
          this.x[k] += (tx - this.x[k]) * k0;
          this.y[k] += (ty - this.y[k]) * k0;
          this.z[k] += (tz - this.z[k]) * k0;
        }
      }
    }
  }

  forceRip(yk) {
    // the hand pulled but nothing gave: cut a short run of links under the grip
    const g = this.grabs.get(yk.id);
    if (!g) return;
    const k = g.items[0].k;
    const p = this.panelOf[k];
    const local = k - p * this.perPanel;
    const i = local % this.nx, j0 = (local / this.nx) | 0;
    for (let j = Math.max(0, j0 - 4); j < Math.min(this.ny - 1, j0 + 3); j++) {
      const kk = this.idx(p, Math.min(i, this.nx - 2), j);
      if (this.hLink[kk] >= 0) this.cut(this.hLink[kk]);
      if (this.dLink[kk] >= 0) this.cut(this.dLink[kk]);
    }
  }

  /** Area-weighted vertex normals from the visible triangles, and a fold-cavity term from z. */
  computeShading() {
    const N = this.clothCount;
    if (!this.nrm) { this.nrm = new Float32Array(N * 3); this.cav = new Float32Array(N); }
    const nrm = this.nrm, { x, y, z } = this;
    nrm.fill(0);
    const half = this.perPanel;
    for (let t = 0; t < this.triCount; t++) {
      if (!this.triAlive[t]) continue;
      const a = this.triV[t * 3], b = this.triV[t * 3 + 1], c = this.triV[t * 3 + 2];
      const e1x = x[b] - x[a], e1y = y[b] - y[a], e1z = z[b] - z[a];
      const e2x = x[c] - x[a], e2y = y[c] - y[a], e2z = z[c] - z[a];
      const sg = a < half ? 1 : -1;
      const nx = (e1y * e2z - e1z * e2y) * sg, ny = (e1z * e2x - e1x * e2z) * sg, nz = (e1x * e2y - e1y * e2x) * sg;
      nrm[a * 3] += nx; nrm[a * 3 + 1] += ny; nrm[a * 3 + 2] += nz;
      nrm[b * 3] += nx; nrm[b * 3 + 1] += ny; nrm[b * 3 + 2] += nz;
      nrm[c * 3] += nx; nrm[c * 3 + 1] += ny; nrm[c * 3 + 2] += nz;
    }
    for (let k = 0; k < N; k++) {
      const l = Math.hypot(nrm[k * 3], nrm[k * 3 + 1], nrm[k * 3 + 2]);
      if (l > 1e-9) { nrm[k * 3] /= l; nrm[k * 3 + 1] /= l; nrm[k * 3 + 2] /= l; }
      else { nrm[k * 3] = 0; nrm[k * 3 + 1] = 0; nrm[k * 3 + 2] = 1; }
    }
    const { nx, ny } = this;
    const invA = 1 / this.A;
    for (let p = 0; p < 2; p++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          let s = 0, m = 0;
          if (i > 1) { s += z[k - 2]; m++; }
          if (i < nx - 2) { s += z[k + 2]; m++; }
          if (i > 0) { s += z[k - 1]; m++; }
          if (i < nx - 1) { s += z[k + 1]; m++; }
          if (j > 0) { s += z[k - nx]; m++; }
          if (j < ny - 1) { s += z[k + nx]; m++; }
          this.cav[k] = m ? Math.max(-1.5, Math.min(1.5, (z[k] - s / m) * invA)) : 0;
        }
      }
    }
  }

  isQuiet() { return this.quiet > 30 && !this.ropeAnim[0] && !this.ropeAnim[1] && this.mending === 0 && !this.yank; }

  /** Run without drawing until it comes to rest (reduced motion and resize). */
  settle(maxSteps = 400) {
    const d = this.damp;
    this.damp = 0.8;
    for (let s = 0; s < maxSteps; s++) {
      this.step(1 / 60);
      if (s > 20 && this.isQuiet()) break;
    }
    this.damp = d;
  }

  /** Jump the rope to its end and let the cloth find its rest, without drawing the way there. */
  finishNow() {
    // the rope still travels, only nobody watches: a jump would rip the heading off its rings
    this.settle(600);
  }
}
