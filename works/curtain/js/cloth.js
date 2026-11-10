// Two velvet panels, each a 2D Verlet grid hung from rings on a rail.
// x/y are CSS pixels of the stage box. The cloth only moves in the picture plane: folds come from
// the photograph, and gathering is shown by how tightly the photograph is squeezed.

export class Cloth {
  /**
   * @param {{W:number, top:number, hem:number, floor:number, side:number, overlap:number, nx:number, ny:number}} L
   */
  constructor(L) {
    const { nx, ny } = L;
    this.L = L;
    this.nx = nx;
    this.ny = ny;
    this.S = L.W / 2 - L.side + L.overlap / 2;          // panel width, outer edge to lead edge
    this.dx = this.S / (nx - 1);
    this.dy = (L.hem - L.top) / (ny - 1);
    this.per = nx * ny;
    const n = 2 * this.per;
    this.n = n;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.ox = new Float32Array(n);
    this.oy = new Float32Array(n);
    this.held = new Uint8Array(n);
    this.gap = this.dx * 0.15;                          // rings fully bunched
    this.sOpen = (nx - 1) * this.gap;
    // fabric keeps some bulk when gathered, more at the hem than at the heading
    this.minD = new Float32Array(ny);
    for (let j = 0; j < ny; j++) this.minD[j] = this.dx * (0.16 + 0.07 * (j / (ny - 1)) ** 1.5);
    for (let p = 0; p < 2; p++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          this.x[k] = this.ox[k] = this.xOf(p, i * this.dx);
          this.y[k] = this.oy[k] = L.top + j * this.dy;
        }
      }
    }
    this.rope = [null, null];       // lead ring position (s) while a traveller rope pulls it
    this.anim = [null, null];
    this.grabs = new Map();
    this.g = 1500 * Math.max(0.6, (L.hem - L.top) / 800);
    this.ringW = [0, 0];
    this.damp = 0.985;
    this.iters = 8;
    this.quiet = 0;
    this.motion = 0;                // largest squared distance any point moved in the last step (px)
    this._px = new Float32Array(n);
    this._py = new Float32Array(n);
    // house air: a slow draught moves the hanging cloth a little at rest. `air` scales it (0 is
    // still), `airRate` slows its clock. Strength is in px/s², set so the hem drifts a few px.
    this.air = 1;
    this.airRate = 1;
    this.airT = 0;
    this.airA = 30;
    // per column: where the swell is along the panel (as sin/cos) and how much the seam pulls it;
    // per row: how much more the lower cloth moves than the heading
    this._ax = new Float32Array(nx);
    this._sinS = new Float32Array(nx);
    this._cosS = new Float32Array(nx);
    this._edge = new Float32Array(nx);
    for (let i = 0; i < nx; i++) {
      const s = i / (nx - 1);
      this._sinS[i] = Math.sin(s * 5.3);
      this._cosS[i] = Math.cos(s * 5.3);
      this._edge[i] = s ** 6;
    }
    this._rowH = new Float32Array(ny);
    for (let j = 0; j < ny; j++) this._rowH[j] = (j / (ny - 1)) ** 1.6;
    this._shut = 1;
  }

  idx(p, i, j) { return p * this.per + j * this.nx + i; }
  xOf(p, s) { return p === 0 ? this.L.side + s : this.L.W - this.L.side - s; }
  sOf(p, x) { return p === 0 ? x - this.L.side : this.L.W - this.L.side - x; }
  leadS(p) { return this.sOf(p, this.x[this.idx(p, this.nx - 1, 0)]); }

  /** 0 closed, 1 fully gathered to the sides. */
  openness() {
    let f = 0;
    for (let p = 0; p < 2; p++) f += 1 - (this.leadS(p) - this.sOpen) / (this.S - this.sOpen);
    return Math.max(0, Math.min(1, f / 2));
  }

  /** Pull both lead rings to a position along the rail (0 = gathered, 1 = closed). */
  travel(to, seconds, ease = 'inout') {
    const target = this.sOpen + (this.S - this.sOpen) * to;
    for (let p = 0; p < 2; p++) {
      const from = this.leadS(p);
      this.rope[p] = from;
      this.anim[p] = { from, to: target, t: 0, dur: seconds, ease };
    }
    this.quiet = 0;
  }

  travelling() { return !!(this.anim[0] || this.anim[1]); }

  // ---- hands ---------------------------------------------------------------------------------

  /** Which panel, if any, covers this point. */
  hit(px, py) {
    if (py < this.L.top || py > this.L.hem + 6) return -1;
    const j = Math.max(0, Math.min(this.ny - 1, Math.round((py - this.L.top) / this.dy)));
    // the right panel hangs in front
    for (const p of [1, 0]) {
      const a = this.x[this.idx(p, 0, j)], b = this.x[this.idx(p, this.nx - 1, j)];
      if (px >= Math.min(a, b) - 8 && px <= Math.max(a, b) + 8) return p;
    }
    return -1;
  }

  grab(id, px, py) {
    const p = this.hit(px, py);
    if (p < 0) return false;
    let best = -1, bd = Infinity;
    for (let k = p * this.per; k < (p + 1) * this.per; k++) {
      const d = (this.x[k] - px) ** 2 + (this.y[k] - py) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    const local = best - p * this.per;
    const hi = local % this.nx, hj = (local / this.nx) | 0;
    const items = [];
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const i = hi + di, j = hj + dj;
        if (i < 0 || j < 1 || i >= this.nx || j >= this.ny) continue;
        const r2 = di * di + dj * dj;
        const k = this.idx(p, i, j);
        if (this.held[k]) continue;
        // the fingers hold one point firmly and the cloth around it loosely
        const w = r2 === 0 ? 1 : r2 === 1 ? 0.6 : 0.25;
        if (w === 1) this.held[k] = 1;
        items.push({ k, j, w, ox: this.x[k] - px, oy: this.y[k] - py });
      }
    }
    if (!items.length || items.every((it) => it.w < 1)) { for (const it of items) this.held[it.k] = 0; return false; }
    this.rope[p] = null;
    this.anim[p] = null;
    const follow = 0.62 * (1 - 0.45 * hj / (this.ny - 1));
    this.grabs.set(id, { items, p, col: hi, row: Math.max(1, hj), px, py, hx: px, hy: py, follow });
    this.quiet = 0;
    return true;
  }

  move(id, px, py) {
    const g = this.grabs.get(id);
    if (!g) return;
    g.px = px;
    g.py = py;
    this.quiet = 0;
  }

  release(id) {
    const g = this.grabs.get(id);
    if (!g) return;
    for (const it of g.items) {
      const k = it.k;
      if (it.w < 1) continue;
      this.held[k] = 0;
      const vx = this.x[k] - this.ox[k], vy = this.y[k] - this.oy[k], v = Math.hypot(vx, vy), max = 18;
      if (v > max) { this.ox[k] = this.x[k] - (vx / v) * max; this.oy[k] = this.y[k] - (vy / v) * max; }
    }
    this.grabs.delete(id);
    this.quiet = 0;
  }

  releaseAll() { for (const id of [...this.grabs.keys()]) this.release(id); }

  /**
   * A hand passing over the cloth without holding it: the cloth near the pointer takes on a little
   * of its speed, the hem and the lead edge most, the heading hardly at all. (vx, vy) is the
   * pointer's speed in px per step. The cloth's own speed is eased toward that, never added to,
   * so a long sweep stirs the curtain without throwing it open.
   */
  brush(px, py, vx, vy, gain = 1) {
    const { x, y, ox, oy, held, nx, ny } = this;
    const R = this.L.phone ? 90 : 140, R2 = R * R, cap = 1.6 * gain;
    const tx = Math.max(-cap, Math.min(cap, vx * 0.12 * gain));
    const ty = Math.max(-cap, Math.min(cap, vy * 0.04 * gain));
    let hit = false;
    for (let p = 0; p < 2; p++) {
      for (let j = 1; j < ny; j++) {
        const row = j / (ny - 1);
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          if (held[k]) continue;
          const d2 = (x[k] - px) ** 2 + (y[k] - py) ** 2;
          if (d2 > R2) continue;
          const w = Math.min(1, (1 - Math.sqrt(d2) / R) ** 2 * (0.25 + 0.75 * row * row) * (1 + 1.2 * (i / (nx - 1)) ** 4));
          const v0x = x[k] - ox[k], v0y = y[k] - oy[k];
          ox[k] = x[k] - (v0x + (tx - v0x) * 0.35 * w);
          oy[k] = y[k] - (v0y + (ty - v0y) * 0.2 * w);
          hit = true;
        }
      }
    }
    if (hit) this.quiet = 0;
    return hit;
  }

  /** A tap or a click on the cloth: the velvet dents in, drawing the cloth around it inward. */
  poke(px, py, gain = 1) {
    const { x, y, ox, held, nx, ny } = this;
    const R = this.L.phone ? 110 : 170, R2 = R * R;
    for (let p = 0; p < 2; p++) {
      for (let j = 1; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          if (held[k]) continue;
          const dx = px - x[k], d2 = dx * dx + (y[k] - py) ** 2;
          if (d2 > R2) continue;
          const w = 1 - Math.sqrt(d2) / R;
          ox[k] -= Math.max(-3, Math.min(3, dx * 0.06 * w * gain));
        }
      }
    }
    this.quiet = 0;
  }

  /**
   * The draught, as a sideways acceleration per column for one row height. Both panels drift the
   * same way with a small lag between them, a slower swell runs across each panel (the folds
   * gather and ease as it passes), and now and then the lead edges ease apart near the floor, so
   * a thin line of the lit stage shows through the seam.
   */
  airAt(p, out) {
    const T = this.airT, nx = this.nx, { _sinS: sn, _cosS: cs, _edge: edge } = this;
    const A = this.airA * this.air * Math.max(0.6, (this.L.hem - this.L.top) / 800);
    const gust = 0.7 + 0.3 * Math.sin(T * 0.37 + 1.3) * Math.sin(T * 0.21 + 0.4);
    const ph = p === 0 ? 0 : 0.7;
    const sway = 0.72 * Math.sin(T * 0.93 + ph) + 0.28 * Math.sin(T * 0.53 + 2.1 + ph);
    const seam = Math.max(0, Math.sin(T * 0.44 + 0.9)) ** 3 * (0.65 + 0.35 * Math.sin(T * 0.17)) * this._shut;
    const sg = p === 0 ? 1 : -1;                // +s (toward the lead edge) in screen x
    // swell = 0.4 sin(wT + 2ph - 5.3 s), expanded so no column needs its own sine
    const w = T * 1.21 + ph * 2, sw = 0.4 * Math.sin(w), cw = 0.4 * Math.cos(w);
    const base = A * gust * sway, ripple = A * gust * sg, pull = A * sg * 1.3 * seam;
    for (let i = 0; i < nx; i++) out[i] = base + ripple * (sw * cs[i] - cw * sn[i]) - pull * edge[i];
  }

  // ---- simulation ----------------------------------------------------------------------------

  step(dt) {
    const { x, y, ox, oy, held, nx, ny, L } = this;
    const damp = this.damp, gdt = this.g * dt * dt;
    let moving = 0;
    this._px.set(x);
    this._py.set(y);

    for (let p = 0; p < 2; p++) {
      const a = this.anim[p];
      if (!a) continue;
      a.t = Math.min(1, a.t + dt / a.dur);
      const t = a.t;
      const e = a.ease === 'out' ? 1 - (1 - t) ** 3 : t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      this.rope[p] = a.from + (a.to - a.from) * e;
      if (t >= 1) { this.anim[p] = null; if (a.then) a.then(); }
      moving = 1;
    }

    const handOn = [false, false];
    for (const g of this.grabs.values()) handOn[g.p] = true;
    // while a hand works a panel its rings have some give: the cloth can drag them along the rail
    this.ringW[0] = handOn[0] ? 0.3 : 0;
    this.ringW[1] = handOn[1] ? 0.3 : 0;

    const airy = this.air > 0;
    if (airy) {
      this.airT += dt * this.airRate;
      // the seam only parts while the panels still meet
      const lead0 = this.leadS(0), lead1 = this.leadS(1);
      this._shut = Math.max(0, Math.min(1, (Math.min(lead0, lead1) / this.S - 0.8) / 0.2));
    }
    const ax = this._ax, dt2 = dt * dt, rowH = this._rowH;

    // integrate
    for (let p = 0; p < 2; p++) {
      const sticky = !handOn[p] && this.rope[p] === null;
      if (airy) this.airAt(p, ax);
      for (let j = 0; j < ny; j++) {
        const hj = rowH[j] * dt2;
        for (let i = 0; i < nx; i++) {
          const k = this.idx(p, i, j);
          if (held[k]) continue;
          const vx = (x[k] - ox[k]) * damp, vy = (y[k] - oy[k]) * damp;
          ox[k] = x[k]; oy[k] = y[k];
          if (j === 0) {
            // rings slide on the rail; with nobody pulling they stay where they were left
            if (i > 0 && !sticky) x[k] += vx * 0.9;
            continue;
          }
          x[k] += vx + (airy ? ax[i] * hj : 0);
          y[k] += vy + gdt;
        }
      }
    }

    // hands
    for (const g of this.grabs.values()) {
      const mx = g.px - g.hx, my = g.py - g.hy, ml = Math.hypot(mx, my), lim = 14;
      const sc = ml > lim ? lim / ml : 1;
      const ds = this.sOf(g.p, g.hx + mx * sc) - this.sOf(g.p, g.hx);
      g.hx += mx * sc;
      g.hy += my * sc;
      for (const it of g.items) {
        const k = it.k;
        if (it.w === 1) { ox[k] = x[k]; oy[k] = y[k]; }
        let tx = g.hx + it.ox, ty = g.hy + it.oy;
        // the cloth cannot be pulled longer than it is: keep the grip within reach of its ring
        const ring = this.idx(g.p, k % nx, 0);
        const rx = x[ring], reach = it.j * this.dy;
        const ddx = tx - rx, ddy = ty - L.top, dl = Math.hypot(ddx, ddy);
        if (dl > reach) { tx = rx + (ddx / dl) * reach; ty = L.top + (ddy / dl) * reach; }
        x[k] += (tx - x[k]) * it.w;
        y[k] += (Math.min(L.floor, ty) - y[k]) * it.w;
      }
      if (ds !== 0) {
        // velvet hardly stretches, so a sideways pull reaches the rail at once: opening carries
        // the rings between hand and lead edge, closing drags the ones behind the hand
        const from = ds < 0 ? g.col : 1, to = ds < 0 ? nx - 1 : g.col;
        for (let i = from; i <= to; i++) {
          const k = this.idx(g.p, i, 0);
          x[k] = this.xOf(g.p, this.sOf(g.p, x[k]) + ds * g.follow);
        }
      }
      moving = Math.max(moving, 1);
    }

    for (let it = 0; it < this.iters; it++) {
      this.relax();
      this.rings();
    }
    this.hang();
    for (let k = 0; k < this.n; k++) if (y[k] > L.floor) { y[k] = L.floor; ox[k] = x[k] - (x[k] - ox[k]) * 0.5; }

    // how far the cloth really moved (the stored speeds near the hem include sag that hang()
    // takes back every step, so they never reach zero)
    const { _px: px, _py: py } = this;
    for (let k = 0; k < this.n; k++) {
      const d2 = (x[k] - px[k]) ** 2 + (y[k] - py[k]) ** 2;
      if (d2 > moving) moving = d2;
    }
    this.motion = moving;
    if (moving < 0.0016 && !this.grabs.size) this.quiet++;
    else this.quiet = 0;
  }

  relax() {
    const { x, y, held, nx, ny, dx, dy, minD } = this;
    for (let p = 0; p < 2; p++) {
      const sg = p === 0 ? 1 : -1;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const a = this.idx(p, i, j);
          const wa = held[a] ? 0 : j === 0 ? this.ringW[p] : j === ny - 1 ? 0.45 : 1;   // the hem is weighted
          // down the warp: inextensible
          if (j < ny - 1) {
            const b = a + nx;
            const wb = held[b] ? 0 : j + 1 === ny - 1 ? 0.45 : 1;
            const ws = wa + wb;
            if (ws > 0) {
              const ex = x[b] - x[a], ey = y[b] - y[a];
              const l = Math.sqrt(ex * ex + ey * ey) || 1e-6;
              const f = (l - dy) / l / ws;
              x[a] += ex * f * wa; y[a] += ey * f * wa;
              x[b] -= ex * f * wb; y[b] -= ey * f * wb;
              // in the picture plane a row never rises above the one it hangs from: the cloth
              // would fold behind itself there, which a flat photograph cannot show
              const gap = y[b] - y[a] - dy * 0.3;
              if (gap < 0) { const g = gap / ws; y[a] += g * wa; y[b] -= g * wb; }
            }
          }
          // across the weft: never longer than cut, folds freely down to its bulk
          if (j > 0 && i < nx - 1) {
            const b = a + 1;
            const wb = held[b] ? 0 : j === ny - 1 ? 0.45 : 1;
            const ws = wa + wb;
            if (ws === 0) continue;
            const ex = x[b] - x[a], ey = y[b] - y[a];
            const l = Math.sqrt(ex * ex + ey * ey) || 1e-6;
            if (l > dx) {
              const f = (l - dx) / l / ws;
              x[a] += ex * f * wa; y[a] += ey * f * wa;
              x[b] -= ex * f * wb; y[b] -= ey * f * wb;
            }
            const sep = ex * sg;                    // separation along the panel, outer to lead
            if (sep < minD[j]) {
              const f = ((minD[j] - sep) * 0.3) / ws;
              x[a] -= sg * f * wa;
              x[b] += sg * f * wb;
            }
          }
        }
      }
    }
  }

  /**
   * Velvet does not stretch down its length. A few solver passes leave a long hanging column a
   * little elastic, so finish each step by walking every column from the rail down and pulling
   * any over-long link back (follow the leader). Held points stay where the hand has them.
   */
  hang() {
    const { x, y, ox, oy, held, nx, ny, dy } = this;
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < nx; i++) {
        for (let j = 1; j < ny; j++) {
          const b = this.idx(p, i, j);
          if (held[b]) continue;
          const a = b - nx;
          const ex = x[b] - x[a], ey = y[b] - y[a];
          const l = Math.sqrt(ex * ex + ey * ey);
          if (l > dy * 1.002) {
            // move the point and its last position together: a correction, not a kick
            const f = dy / l, cx = x[a] + ex * f - x[b], cy = y[a] + ey * f - y[b];
            x[b] += cx; y[b] += cy;
            ox[b] += cx; oy[b] += cy;
          }
        }
      }
    }
  }

  rings() {
    const { x, y, held, nx, gap, L } = this;
    for (let p = 0; p < 2; p++) {
      const s = this._s || (this._s = new Float32Array(nx));
      for (let i = 0; i < nx; i++) s[i] = this.sOf(p, x[this.idx(p, i, 0)]);
      s[0] = 0;
      const roped = this.rope[p] !== null;
      if (roped) s[nx - 1] = this.rope[p];
      s[nx - 1] = Math.max(this.sOpen, Math.min(s[nx - 1], this.S));
      for (let i = 1; i < nx; i++) {
        if (i === nx - 1 && roped) continue;
        s[i] = Math.max(s[i], s[i - 1] + gap);
        s[i] = Math.min(s[i], s[i - 1] + this.dx);
      }
      for (let i = nx - 2; i >= 1; i--) {
        s[i] = Math.min(s[i], s[i + 1] - gap);
        s[i] = Math.max(s[i], s[i + 1] - this.dx);
      }
      for (let i = 0; i < nx; i++) {
        const k = this.idx(p, i, 0);
        x[k] = this.xOf(p, s[i]);
        y[k] = L.top;
      }
    }
  }

  isQuiet() { return this.quiet > 30 && !this.travelling(); }

  /** Run without drawing until the cloth comes to rest (first layout, resize). */
  settle(maxSteps = 600) {
    const d = this.damp, a = this.air;
    this.damp = 0.8;
    this.air = 0;                                       // still air, so it can come to rest
    for (let s = 0; s < maxSteps; s++) {
      this.step(1 / 60);
      if (s > 20 && this.isQuiet()) break;
    }
    this.damp = d;
    this.air = a;
  }
}
