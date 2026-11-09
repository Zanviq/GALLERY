// Falling sand in the bottle's own frame, on a fine grid traced from the photographed glass.
//
// g: one byte per cell. 0 empty, 255 glass or outside, otherwise colour * 32 + shade
//    (colour 1..5, shade 0..31). A grain keeps its byte for life, so colours never blend.
// m: momentum per grain. 0 = at rest. A grain slides diagonally down any 45 degree face; a rolling
//    grain, or one resting on a cell that cannot hold a steep face (half the cells, fixed at random),
//    also takes 2-across, 1-down steps, which a 26.6 degree face cannot hold. The mix stands at about
//    33 degrees with irregular flanks, and piles slip in small avalanches as rolling grains knock
//    resting ones loose.
// Work is done in 16 x 16 chunks: only chunks where something moved (or may move) are scanned,
// so a settled bottle costs nothing and a pour costs only the pile's surface.
// The stream is particles in the same frame: they fall under the tilted gravity, are drawn as
// short streaks (like a camera shutter), and become grains where they hit the pile, running down it
// at once by the same rules so a heavy pour spreads over the cone.

export const EMPTY = 0;
export const WALL = 255;
export const MAX_TILT = 35;

const SH = 4;
const CS = 1 << SH;
const LONG = 0.9;        // chance per try that a free grain takes a 2-across, 1-down step
const STICKY = 0.5;     // share of cells where a resting grain can hold a 45 degree face
const KNOCK = 0.14;      // chance a rolling grain sets a resting neighbour rolling
const G = 0.42;          // stream gravity, cells per frame squared
const VMAX = 19;         // stream speed cap, cells per frame

export class Sand {
  constructor(geo, seed = 0x9e3779b9) {
    const W = (this.W = geo.W);
    const H = (this.H = geo.H);
    this.cx = geo.cx;
    this.mouth = geo.mouth;
    this.bottom = geo.bottom;
    this.hw = Float32Array.from(geo.hw);
    this.g = new Uint8Array(W * H);
    this.m = new Uint8Array(W * H);
    this.st = new Uint8Array(W * H);
    this.shade = new Uint8Array(W * H);
    // where a resting grain can hold a 45 degree face (half the cells, fixed and random);
    // elsewhere it only holds a 1-in-2 face. The mix gives piles of about 33 degrees.
    this.sticky = new Uint8Array(W * H);
    for (let i = 0, r = 0x6d2b79f5; i < W * H; i++) { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; this.sticky[i] = (r >>> 0) / 4294967296 < STICKY ? 1 : 0; }
    this.rowMin = new Int16Array(H).fill(W);
    this.rowMax = new Int16Array(H).fill(-1);
    this.cw = (W + CS - 1) >> SH;
    this.ch = (H + CS - 1) >> SH;
    this.awake = new Uint8Array(this.cw * this.ch);
    this.next = new Uint8Array(this.cw * this.ch);
    this.sid = 1;
    this.rng = seed >>> 0 || 1;
    this.frame = 0;
    this.tilt = 0;
    this.wakeTilt = 0;
    this.count = 0;
    this.capacity = 0;
    this.active = 0;
    this.landed = 0;          // grains that reached the pile since the last read (for the sound)
    this.spilled = 0;
    for (let y = 0; y < H; y++) {
      const hw = this.hw[y];
      for (let x = 0; x < W; x++) {
        const u = Math.abs(x + 0.5 - this.cx);
        const inside = hw > 0 && u < hw;
        const i = y * W + x;
        this.g[i] = inside ? EMPTY : WALL;
        if (!inside) continue;
        this.capacity++;
        if (x < this.rowMin[y]) this.rowMin[y] = x;
        if (x > this.rowMax[y]) this.rowMax[y] = x;
        // the glass curves away at the sides: sand seen through it there is a little darker
        const e = Math.max(0, (u / hw - 0.8) / 0.2);
        this.shade[i] = Math.min(7, Math.round(Math.pow(e, 1.3) * 7));
      }
    }
    // output: the page hands in a pixel buffer and a lookup from (byte << 3 | shade) to a pixel
    this.px = new Uint32Array(W * H);
    this.lut = new Uint32Array(256 * 8);
    this.dirty = [W, H, -1, -1];
    // stream particles
    const cap = (this.pcap = 5000);
    this.pn = 0;
    this.pxs = new Float32Array(cap);
    this.pys = new Float32Array(cap);
    this.pvx = new Float32Array(cap);
    this.pvy = new Float32Array(cap);
    this.pv = new Uint8Array(cap);
    this.pw = new Uint8Array(cap);
    this.trail = new Int32Array(60000);
    this.trailN = 0;
    this.specks = null;
    this.glints = new Int32Array(4096);
    this.glintN = 0;
  }

  setOutput(px, lut) {
    this.px = px;
    this.lut = lut;
    this.repaint();
  }

  rand() {
    let x = this.rng;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.rng = x >>> 0;
    return this.rng / 4294967296;
  }

  shadeFor() {
    const r = this.rand();
    if (r < 0.035) return 28 + ((r * 1000) & 1);       // darker speck
    if (r < 0.065) return 30 + ((r * 1000) & 1);       // bare quartz showing through: these glint
    return (this.rand() * 28) | 0;
  }

  repaint() {
    const { g, px, lut, shade } = this;
    for (let i = 0; i < g.length; i++) px[i] = lut[(g[i] << 3) | shade[i]];
    this.dirty[0] = 0; this.dirty[1] = 0; this.dirty[2] = this.W - 1; this.dirty[3] = this.H - 1;
    this.specks = null;
  }

  takeDirty() {
    const d = this.dirty.slice();
    this.dirty[0] = this.W; this.dirty[1] = this.H; this.dirty[2] = -1; this.dirty[3] = -1;
    return d[2] < d[0] ? null : d;
  }

  mark(x, y) {
    const d = this.dirty;
    if (x < d[0]) d[0] = x;
    if (x > d[2]) d[2] = x;
    if (y < d[1]) d[1] = y;
    if (y > d[3]) d[3] = y;
  }

  wake(x, y) {
    const n = this.next, cw = this.cw;
    const c0 = (x - 2) >> SH, c1 = (x + 2) >> SH;
    const r0 = ((y - 2) >> SH) * cw, r1 = ((y + 2) >> SH) * cw;
    n[r0 + c0] = 1; n[r0 + c1] = 1; n[r1 + c0] = 1; n[r1 + c1] = 1;
  }

  wakeAll() { this.next.fill(1); this.active = 1; }

  markInterior() {
    let x0 = this.W, x1 = 0;
    for (let y = this.mouth; y < this.bottom; y++) { if (this.rowMin[y] < x0) x0 = this.rowMin[y]; if (this.rowMax[y] > x1) x1 = this.rowMax[y]; }
    this.mark(x0, this.mouth); this.mark(x1, this.bottom - 1);
  }

  /** Sensor readings jitter, so the grid is only rescanned after a real change of tilt. */
  setTilt(deg) {
    const t = Math.max(-MAX_TILT, Math.min(MAX_TILT, deg));
    this.tilt = t;
    if (Math.abs(t - this.wakeTilt) > 1.5) {
      this.wakeTilt = t;
      this.wakeAll();
    }
  }

  /**
   * A grain from the stream lands at cell i (or the nearest free cell beside or above it) and
   * runs down the pile at once, by the same rules the automaton uses. A real stream spreads over
   * the cone as it lands; doing the run here keeps a heavy pour from stacking into a tower.
   */
  place(i, v, mom, moves = 40) {
    const g = this.g, W = this.W;
    const side = this.rand() < 0.5 ? 1 : -1;
    let at = -1;
    for (let k = 0; k < 14; k++, i -= W) {
      if (i < this.mouth * W) return false;
      if (g[i] === EMPTY) { at = i; break; }
      if (g[i + side] === EMPTY) { at = i + side; break; }
      if (g[i - side] === EMPTY) { at = i - side; break; }
    }
    if (at < 0) return false;
    return this.put(this.run(at, v, mom, moves), v, mom > 1 && moves < 100 ? 2 : 0);
  }

  /** Where a grain at cell i with momentum `mom` comes to rest within `moves` moves. */
  run(i, v, mom, moves) {
    const g = this.g, W = this.W;
    const tl = Math.abs(this.tilt) < 1.5 ? 0 : (this.tilt * Math.PI) / 180;
    const s = tl > 0 ? 1 : tl < 0 ? -1 : 0;
    const a = Math.abs(tl);
    const pdiag = Math.tan(a), steepUp = a > 0.16;
    const roll = s ? Math.min(0.85, Math.max(0, (a - 0.07) * 1.7)) : 0;
    for (let n = 0; n < moves; n++) {
      const dn = i + W;
      if (s !== 0 && g[dn + s] === EMPTY && this.rand() < pdiag) { i = dn + s; continue; }
      if (g[dn] === EMPTY) { i = dn; continue; }
      const dd = s !== 0 ? s : this.rand() < 0.5 ? 1 : -1;
      if (g[dn + dd] === EMPTY) { i = dn + dd; continue; }
      if (g[dn - dd] === EMPTY && (s === 0 || !steepUp || g[dn + W - dd] === EMPTY)) { i = dn - dd; continue; }
      if (mom <= 0 && this.sticky[i]) break;
      mom--;
      if (s === 0) {
        if (g[i + dd] === EMPTY && g[dn + 2 * dd] === EMPTY && this.rand() < LONG) { i += dd; continue; }
        if (g[i - dd] === EMPTY && g[dn - 2 * dd] === EMPTY && this.rand() < LONG) { i -= dd; continue; }
      } else if (g[i + s] === EMPTY && (g[dn + 2 * s] === EMPTY || this.rand() < roll)) { i += s; continue; }
    }
    return i;
  }

  put(i, v, mom) {
    const W = this.W;
    this.g[i] = v;
    this.m[i] = mom;
    this.px[i] = this.lut[(v << 3) | this.shade[i]];
    const x = i % W, y = (i / W) | 0;
    this.mark(x, y);
    this.wake(x, y);
    this.count++;
    this.landed++;
    this.specks = null;
    return true;
  }

  /** One automaton step over the awake chunks. Returns how many grains moved or may still move. */
  step() {
    const sticky = this.sticky;
    const W = this.W, g = this.g, m = this.m, st = this.st, px = this.px, lut = this.lut, sh = this.shade;
    const cw = this.cw;
    const sid = (this.sid = this.sid === 255 ? 1 : this.sid + 1);
    const cur = this.next;
    this.next = this.awake;
    this.awake = cur;
    const nxt = this.next;
    nxt.fill(0);
    const tl = Math.abs(this.tilt) < 1.5 ? 0 : (this.tilt * Math.PI) / 180;
    const s = tl > 0 ? 1 : tl < 0 ? -1 : 0;
    const a = Math.abs(tl);
    const pdiag = Math.tan(a);                                 // free fall follows the tilted gravity
    const steepUp = a > 0.16;                                  // high-side faces may stand steeper than 45
    const roll = s ? Math.min(0.85, Math.max(0, (a - 0.07) * 1.7)) : 0;   // rolling downhill on flat ground
    const creep = a > 0.45;                                    // strong tilt: resting grains creep downhill
    const d = this.dirty;
    let active = 0;
    this.frame = (this.frame + 1) & 0xffff;
    const fr = this.frame;
    for (let y = this.bottom - 1; y >= this.mouth; y--) {
      const rowBase = (y >> SH) * cw;
      const rmn = this.rowMin[y], rmx = this.rowMax[y];
      const ltr = ((y + fr) & 1) === 0;
      for (let k = 0; k < cw; k++) {
        const ccx = ltr ? k : cw - 1 - k;
        if (!cur[rowBase + ccx]) continue;
        let x0 = ccx << SH, x1 = x0 + CS - 1;
        if (x0 < rmn) x0 = rmn;
        if (x1 > rmx) x1 = rmx;
        if (x0 > x1) continue;
        const len = x1 - x0;
        for (let n = 0; n <= len; n++) {
          const x = ltr ? x0 + n : x1 - n;
          const i = y * W + x;
          const v = g[i];
          if (v === EMPTY || st[i] === sid) continue;
          const mv = m[i];
          const dn = i + W;
          let t = -1, nm = 0;
          if (s !== 0 && g[dn + s] === EMPTY && this.rand() < pdiag) { t = dn + s; nm = mv < 6 ? mv + 1 : 6; }
          else if (g[dn] === EMPTY) {
            t = dn; nm = mv < 6 ? mv + 1 : 6;
            if (mv > 2 && g[dn + W] === EMPTY) t = dn + W;      // falling fast: two cells this step
          } else {
            const dd = s !== 0 ? s : this.rand() < 0.5 ? 1 : -1;
            if (g[dn + dd] === EMPTY) { t = dn + dd; nm = mv; }
            else if (g[dn - dd] === EMPTY && (s === 0 || !steepUp || !sticky[i] || g[dn + W - dd] === EMPTY)) { t = dn - dd; nm = mv; }
            else if (mv > 0 || !sticky[i]) {         // rolling, or resting where the pile cannot hold a 45 degree face
              nm = mv > 0 ? mv - 1 : 0;
              if (s === 0) {
                if (g[i + dd] === EMPTY && g[dn + 2 * dd] === EMPTY && this.rand() < LONG) t = i + dd;
                else if (g[i - dd] === EMPTY && g[dn - 2 * dd] === EMPTY && this.rand() < LONG) t = i - dd;
              } else if (g[i + s] === EMPTY && (g[dn + 2 * s] === EMPTY || this.rand() < roll)) t = i + s;
            } else if (creep && g[i + s] === EMPTY && g[dn + 2 * s] === EMPTY && this.rand() < 0.5) { t = i + s; nm = 1; }
          }
          if (t >= 0) {
            g[t] = v; g[i] = EMPTY; st[t] = sid; m[t] = nm; m[i] = 0;
            px[t] = lut[(v << 3) | sh[t]];
            px[i] = 0;
            const tx = t % W, ty = (t / W) | 0;
            if (x - 2 < d[0]) d[0] = x - 2;
            if (x + 2 > d[2]) d[2] = x + 2;
            if (y < d[1]) d[1] = y;
            if (ty > d[3]) d[3] = ty;
            // wake the neighbourhood of both cells for the next step
            const c0 = (x - 3) >> SH, c1 = (x + 3) >> SH;
            const r0 = ((y - 2) >> SH) * cw, r1 = ((ty + 2) >> SH) * cw;
            nxt[r0 + c0] = 1; nxt[r0 + c1] = 1; nxt[r1 + c0] = 1; nxt[r1 + c1] = 1;
            active++;
            if (nm > 1 && this.rand() < KNOCK) {
              const j = t + (tx & 1 ? 1 : -1) + (this.rand() < 0.5 ? 0 : -W);
              if (g[j] !== EMPTY && g[j] !== WALL && m[j] === 0) m[j] = 2;
            }
          } else if (mv > 0) {
            m[i] = nm;
            nxt[rowBase + ccx] = 1;
            active++;
          }
        }
      }
    }
    if (active) this.specks = null;
    this.active = active;
    return active;
  }

  /** Add a stream grain at (x, y) in cells with velocity (vx, vy) in cells per frame. */
  emit(v, x, y, vx, vy) {
    if (this.pn >= this.pcap) return false;
    const k = this.pn++;
    this.pxs[k] = x; this.pys[k] = y; this.pvx[k] = vx; this.pvy[k] = vy; this.pv[k] = v; this.pw[k] = 0;
    return true;
  }

  /** Move the stream one frame (f = frames elapsed), land grains, draw the streaks. */
  flow(f) {
    const W = this.W, H = this.H, g = this.g, px = this.px, lut = this.lut, sh = this.shade, tr = this.trail;
    // undo last frame's streaks
    for (let k = 0; k < this.trailN; k++) {
      const i = tr[k];
      px[i] = lut[(g[i] << 3) | sh[i]];
    }
    if (this.trailN) { const b = this.trailBox; this.mark(b[0], b[1]); this.mark(b[2], b[3]); }
    this.trailN = 0;
    const box = (this.trailBox = [W, H, -1, -1]);
    if (!this.pn) return 0;
    const th = (this.tilt * Math.PI) / 180;
    const gx = Math.sin(th) * G * f, gy = Math.cos(th) * G * f;
    const mouthRow = this.mouth;
    let n = this.pn;
    for (let k = n - 1; k >= 0; k--) {
      const x = this.pxs[k], y = this.pys[k];
      let vx = this.pvx[k] + gx, vy = this.pvy[k] + gy;
      const sp = Math.hypot(vx, vy);
      if (sp > VMAX) { vx *= VMAX / sp; vy *= VMAX / sp; }
      let nx = x + vx * f, ny = y + vy * f;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(nx - x), Math.abs(ny - y))));
      const v = this.pv[k];
      let prev = -1, state = 0;           // 0 flying, 1 landed or lost, 2 waiting above the pile
      for (let q = 1; q <= steps; q++) {
        const ix = (x + ((nx - x) * q) / steps) | 0, iy = (y + ((ny - y) * q) / steps) | 0;
        if (ix < 1 || ix >= W - 1 || iy >= H - 1) { state = 1; this.spilled++; break; }
        if (iy < mouthRow) { prev = -2; continue; }        // air above the bottle
        const i = iy * W + ix;
        const c = g[i];
        if (c === EMPTY) { prev = i; continue; }
        // hit sand or glass
        let at = prev;
        if (at === -1 && y >= mouthRow) at = (y | 0) * W + (x | 0);
        if (at >= 0 && this.place(at, v, 4)) {
          state = 1;
          if (c !== WALL && this.m[i] === 0 && this.rand() < 0.35) this.m[i] = 2;   // the impact jostles the pile
        } else if (at >= 0 && this.pw[k] < 30) {
          // the spot is crowded: wait there a frame while the pile spreads
          state = 2;
          this.pw[k]++;
          nx = (at % W) + 0.5; ny = ((at / W) | 0) + 0.5; vx = 0; vy = 0;
        } else { state = 1; this.spilled++; }   // hit the rim, or the neck is full to the top
        break;
      }
      if (state === 1) {
        n--;
        this.pxs[k] = this.pxs[n]; this.pys[k] = this.pys[n]; this.pvx[k] = this.pvx[n]; this.pvy[k] = this.pvy[n];
        this.pv[k] = this.pv[n]; this.pw[k] = this.pw[n];
        continue;
      }
      this.pxs[k] = nx; this.pys[k] = ny; this.pvx[k] = vx; this.pvy[k] = vy;
      // the streak: where the grain was over the last 1/80 s, like a camera shutter; drawn as every
      // other cell so a thick stream keeps its grain instead of becoming a solid bar
      const len = Math.max(1, Math.ceil(0.75 * Math.max(Math.abs(vx), Math.abs(vy))));
      for (let q = k & 1; q < len && this.trailN < tr.length; q += 2) {
        const ix = (nx - (vx * q) / len) | 0, iy = (ny - (vy * q) / len) | 0;
        if (iy < 0 || ix < 0 || ix >= W) continue;
        const i = iy * W + ix;
        if (iy >= mouthRow && g[i] !== EMPTY) break;
        tr[this.trailN++] = i;
        px[i] = lut[(v << 3) | (iy >= mouthRow ? sh[i] : 0)];
        if (ix < box[0]) box[0] = ix;
        if (ix > box[2]) box[2] = ix;
        if (iy < box[1]) box[1] = iy;
        if (iy > box[3]) box[3] = iy;
      }
    }
    this.pn = n;
    if (this.trailN) { this.mark(box[0], box[1]); this.mark(box[2], box[3]); }
    return n;
  }

  /**
   * The bottle turned by `deg` while grains were in the air: they keep their place and speed in
   * the world, so in the bottle's frame they turn the other way about the pivot (px, py).
   */
  turnStream(deg, px, py) {
    if (!this.pn || !deg) return;
    const a = (-deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (let k = 0; k < this.pn; k++) {
      const x = this.pxs[k] - px, y = this.pys[k] - py;
      this.pxs[k] = px + x * c - y * s;
      this.pys[k] = py + x * s + y * c;
      const vx = this.pvx[k], vy = this.pvy[k];
      this.pvx[k] = vx * c - vy * s;
      this.pvy[k] = vx * s + vy * c;
    }
  }

  /** Drop every stream grain where it is (used when the pour has to stop at once). */
  dropStream() {
    this.pn = 0;
    this.flow(0);
  }

  /** Where a grain dropped straight down (along gravity) from (x, y) would land. */
  landing(x, y) {
    const W = this.W, g = this.g;
    const th = (this.tilt * Math.PI) / 180;
    const sx = Math.sin(th), sy = Math.cos(th);
    let prev = -1;
    for (let q = 0; q < 900; q++) {
      const ix = (x + sx * q) | 0, iy = (y + sy * q) | 0;
      const i = iy * W + ix;
      if (g[i] !== EMPTY) return prev;
      prev = i;
    }
    return prev;
  }

  /**
   * Pour `amount` grains at once: each runs down the pile to rest by the automaton's rules, so
   * nothing has to be stepped or drawn in between. `settle` runs the automaton to rest afterwards.
   */
  pourInstant(colour, amount, jitter, settle = true) {
    let poured = 0;
    for (let n = 0; n < amount; n++) {
      const i = this.landing(this.cx - 0.5 + jitter(), this.mouth);
      if (i < 0 || !this.place(i, colour * 32 + this.shadeFor(), 4, 600)) break;
      poured++;
    }
    if (settle) this.settle();
    return poured;
  }

  /** Run until nothing can move (bounded). */
  settle(maxSteps = 6000) {
    this.wakeAll();
    for (let n = 0; n < maxSteps; n++) if (this.step() === 0) return n;
    return maxSteps;
  }

  /** Highest sand row per column (H when the column is empty). */
  surface() {
    const top = new Int16Array(this.W).fill(this.H);
    const g = this.g, W = this.W;
    for (let x = 0; x < W; x++) {
      for (let y = this.mouth; y < this.bottom; y++) {
        const v = g[y * W + x];
        if (v !== EMPTY && v !== WALL) { top[x] = y; break; }
      }
    }
    return top;
  }

  /** Mix the top band: grains swap places at random; with `hop`, some jump up and fall back. */
  shake(depth = 34, hop = true) {
    const g = this.g, m = this.m, W = this.W;
    const top = this.surface();
    const cells = [];
    for (let x = 0; x < W; x++) {
      if (top[x] >= this.H) continue;
      for (let y = top[x]; y < Math.min(this.bottom, top[x] + depth); y++) {
        const i = y * W + x;
        if (g[i] !== EMPTY && g[i] !== WALL) cells.push(i);
      }
    }
    for (let n = cells.length - 1; n > 0; n--) {
      const k = (this.rand() * (n + 1)) | 0;
      const a = cells[n], b = cells[k];
      const t = g[a]; g[a] = g[b]; g[b] = t;
    }
    for (const i of cells) m[i] = 2;              // the shaken band slumps to a gentler surface
    if (hop) {
      for (const i of cells) {
        const y = (i / W) | 0, x = i % W;
        if (y > top[x] + 6 || this.rand() > 0.3) continue;
        const up = 1 + ((this.rand() * 6) | 0);
        const j = (y - up) * W + x;
        if (y - up >= this.mouth && g[j] === EMPTY) { g[j] = g[i]; g[i] = EMPTY; }
      }
    }
    this.repaint();
    this.wakeAll();
    return cells.length;
  }

  clear() {
    for (let i = 0; i < this.g.length; i++) if (this.g[i] !== WALL) { this.g[i] = EMPTY; this.m[i] = 0; }
    this.count = 0;
    this.active = 0;
    this.pn = 0;
    this.flow(0);
    this.repaint();
  }

  /** Fill the bottle from colour runs (see design/works/sand/scripts/prefill_build.mjs). */
  loadRuns(text) {
    const g = this.g, W = this.W;
    let y = this.mouth, x = this.rowMin[y], count = 0;
    const re = /([A-F])([0-9a-z]+)/g;
    let mt;
    while ((mt = re.exec(text)) && y < this.bottom) {
      const c = mt[1].charCodeAt(0) - 65;
      let n = parseInt(mt[2], 36);
      while (n-- > 0 && y < this.bottom) {
        const i = y * W + x;
        g[i] = c ? c * 32 + this.shadeFor() : EMPTY;
        this.m[i] = 0;
        if (c) count++;
        if (++x > this.rowMax[y]) { y++; if (y < this.bottom) x = this.rowMin[y]; }
      }
    }
    this.count = count;
    this.repaint();
  }

  snapshot() { return { g: this.g.slice(), count: this.count }; }
  restore(s) { this.g.set(s.g); this.m.fill(0); this.count = s.count; this.repaint(); this.wakeAll(); }

  /**
   * How far below the mouth the sand stands in the neck, in rows (mean over the neck's columns).
   * The pile in the neck is a little cone, so "full" is a low mean, not every top cell filled.
   */
  neckLevel() {
    const g = this.g, W = this.W;
    const x0 = this.rowMin[this.mouth], x1 = this.rowMax[this.mouth];
    const limit = this.mouth + 60;
    let sum = 0;
    for (let x = x0; x <= x1; x++) {
      let y = this.mouth;
      while (y < limit && g[y * W + x] === EMPTY) y++;
      sum += y - this.mouth;
    }
    return sum / (x1 - x0 + 1);
  }

  /** True when the neck is filled to the brim (a falling stream alone never counts). */
  mouthBlocked() { return this.neckLevel() <= 3; }

  fill() { return this.count / this.capacity; }

  /**
   * Quartz specks glint at their own angle: as the tilt sweeps, a few light up and go out again.
   * Draws into the pixel buffer; returns true if anything changed.
   */
  glint(tiltDeg, on = true) {
    const px = this.px, lut = this.lut, g = this.g, sh = this.shade, gl = this.glints;
    for (let k = 0; k < this.glintN; k++) { const i = gl[k]; px[i] = lut[(g[i] << 3) | sh[i]]; }
    const had = this.glintN > 0;
    if (had) this.markInterior();
    this.glintN = 0;
    if (!on) return had;
    if (!this.specks) {
      const list = [];
      for (let y = this.mouth; y < this.bottom; y++) {
        for (let x = this.rowMin[y]; x <= this.rowMax[y]; x++) {
          const i = y * this.W + x;
          const v = g[i];
          if (v !== EMPTY && (v & 31) >= 30) list.push(i);
        }
      }
      this.specks = Int32Array.from(list);
    }
    const sp = this.specks;
    for (let k = 0; k < sp.length && this.glintN < gl.length; k++) {
      const i = sp[k];
      let h = Math.imul(i, 2654435761) >>> 0;
      h ^= h >>> 15;
      const ang = (h % 7001) / 100 - 35;        // -35 .. +35 degrees
      if (Math.abs(ang - tiltDeg) < 0.45) {
        gl[this.glintN++] = i;
        px[i] = 0xffffffff;
      }
    }
    if (this.glintN) this.markInterior();
    return had || this.glintN > 0;
  }
}
