// Falling-sand cellular automaton in the bottle's own frame.
// One byte per cell: 0 empty, 255 glass/outside, otherwise colour * 32 + shade
// (colour 1..5, shade 0..31). A grain keeps its byte for life, so colours never blend.

export const W = 128;
export const H = 208;
export const CX = 64;          // bottle axis (between cells 63 and 64)
export const MOUTH = 10;       // first interior row (top of the neck)
export const PIVOT_Y = 120;    // where the bottle turns when it tilts on screen
export const BOTTOM = 202;     // first row under the interior
export const EMPTY = 0;
export const WALL = 255;
export const MAX_TILT = 35;

const NECK = 13;               // neck half-width in cells
const BODY = 58;               // body half-width
const SHOULDER_TOP = 34;
const SHOULDER_BOT = 74;
const CORNER = 12;             // bottom corner radius
const INJECT = [0, 1, -1, 2, -2, 3, -3];

/** Interior half-width at the middle of row y (0 when the row is outside the bottle). */
export function halfWidth(y) {
  if (y < MOUTH || y >= BOTTOM) return 0;
  if (y < SHOULDER_TOP) return NECK;
  if (y < SHOULDER_BOT) {
    // a round shoulder (quarter ellipse) with a short concave fillet where it meets the neck
    const t = (y + 0.5 - SHOULDER_TOP) / (SHOULDER_BOT - SHOULDER_TOP);
    const dome = Math.pow(Math.max(0, 1 - (1 - t) * (1 - t)), 0.62);
    const u = Math.min(1, t / 0.22);
    return NECK + (BODY - NECK) * dome * u * u * (3 - 2 * u);
  }
  const c = BOTTOM - CORNER;
  if (y + 0.5 > c) {
    const dy = y + 0.5 - c;
    return BODY - CORNER + Math.sqrt(Math.max(0, CORNER * CORNER - dy * dy));
  }
  return BODY;
}

export class Sand {
  constructor(seed = 0x9e3779b9) {
    this.g = new Uint8Array(W * H);
    this.stamp = new Uint8Array(W * H);
    this.rowMin = new Int16Array(H);
    this.rowMax = new Int16Array(H);
    this.sid = 1;
    this.rng = seed >>> 0 || 1;
    this.tilt = 0;
    this.wakeTilt = 0;
    this.slump = 0;
    this.count = 0;
    this.capacity = 0;
    this.scanBottom = H - 1;
    this.active = 0;
    this.frame = 0;
    for (let y = 0; y < H; y++) {
      const hw = halfWidth(y);
      let mn = W, mx = -1;
      for (let x = 0; x < W; x++) {
        const inside = hw > 0 && Math.abs(x + 0.5 - CX) < hw;
        this.g[y * W + x] = inside ? EMPTY : WALL;
        if (inside) { this.capacity++; if (x < mn) mn = x; if (x > mx) mx = x; }
      }
      this.rowMin[y] = mn; this.rowMax[y] = mx;
    }
  }

  rand() {                     // xorshift32, [0, 1)
    let x = this.rng;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.rng = x >>> 0;
    return this.rng / 4294967296;
  }

  /** Sensor readings jitter, so the whole grid is only rescanned after a real change of tilt. */
  setTilt(deg) {
    const t = Math.max(-MAX_TILT, Math.min(MAX_TILT, deg));
    this.tilt = t;
    if (Math.abs(t - this.wakeTilt) > 1.5 || (t === 0) !== (this.wakeTilt === 0)) {
      this.wakeTilt = t;
      this.wake();
    }
  }

  wake() { this.scanBottom = H - 1; this.active = 1; this.stamp.fill(0); }

  shadeFor() {
    const r = this.rand();
    if (r < 0.04) return 28 + (r * 1000 & 1);          // darker speck
    if (r < 0.07) return 30 + (r * 1000 & 1);          // bare quartz showing through
    return (this.rand() * 28) | 0;
  }

  /** Drop one grain of `colour` into the mouth near column x. Returns false when the mouth is blocked. */
  inject(colour, x, value = 0) {
    const g = this.g;
    const base = Math.round(x);
    const put = (i) => {
      g[i] = value || colour * 32 + this.shadeFor();
      this.count++;
      this.active = 1;
      if (this.scanBottom < MOUTH + 4) this.scanBottom = MOUTH + 4;
      return true;
    };
    for (const dy of [0, 1, 2]) {
      for (const dx of INJECT) {
        const i = (MOUTH + dy) * W + base + dx;
        if (g[i] === EMPTY) return put(i);
      }
    }
    // the pile has reached the mouth: grains run down its flanks into the rest of the neck
    for (let dx = 4; dx < NECK; dx++) {
      for (const sx of [dx, -dx]) {
        const i = MOUTH * W + base + sx;
        if (g[i] === EMPTY) return put(i);
      }
    }
    return false;
  }

  /** One automaton step. Returns the number of grains that moved or could still move. */
  step() {
    const g = this.g, st = this.stamp;
    this.sid = this.sid === 255 ? 1 : this.sid + 1;
    const sid = this.sid;
    const prev = sid === 1 ? 255 : sid - 1;
    const k = Math.abs(this.tilt) < 2 ? 0 : this.tilt / 45;
    const s = k > 0 ? 1 : k < 0 ? -1 : 0;
    const a = Math.abs(k);
    const slide = a >= 0.4;                      // strong tilt: grains can walk off steep low-side edges
    const loose = this.slump > 0;                // just shaken: the surface slumps to a lower angle
    if (loose) this.slump--;
    let active = 0, deepest = loose ? BOTTOM - 2 : 0;
    const bottom = Math.min(BOTTOM - 1, this.scanBottom);
    this.frame = (this.frame + 1) & 0xffff;
    for (let y = bottom; y >= MOUTH; y--) {
      const mn = this.rowMin[y], mx = this.rowMax[y];
      const ltr = ((y + this.frame) & 1) === 0;
      for (let n = mn; n <= mx; n++) {
        const x = ltr ? n : mn + mx - n;
        const i = y * W + x;
        const v = g[i];
        if (v === EMPTY || st[i] === sid) continue;
        let t = -1;
        const falling = st[i] === prev && this.rand() < 0.5;   // in free fall: sometimes two cells a step
        if (a > 0 && this.rand() < a) {
          // gravity points diagonally toward the low side this step
          if (g[i + W + s] === EMPTY) t = falling && g[i + 2 * W + 2 * s] === EMPTY ? i + 2 * W + 2 * s : i + W + s;
          else if (g[i + W] === EMPTY) t = i + W;
          else if (slide && g[i + s] === EMPTY && g[i + W + 2 * s] === EMPTY && this.rand() < 0.6) t = i + s;
        } else if (g[i + W] === EMPTY) {
          t = falling && g[i + 2 * W] === EMPTY ? i + 2 * W : i + W;
        } else {
          let d1 = W + 1, d2 = W - 1;
          if (s < 0 || (s === 0 && this.rand() < 0.5)) { d1 = W - 1; d2 = W + 1; }
          if (g[i + d1] === EMPTY) t = i + d1;
          // under a strong tilt grains never roll toward the high side: that face is gentler in the
          // real world, so it may stand steeper in the bottle (and slumps when the bottle is straightened)
          else if (g[i + d2] === EMPTY && (s === 0 || (!slide && this.rand() < 1 - a))) t = i + d2;
        }
        if (t < 0 && (st[i] === prev || loose) && this.rand() < 0.45) {
          // a grain that was still moving can roll one cell further, so slopes come out uneven
          const dir = s !== 0 ? (this.rand() < 0.5 + a / 2 ? s : -s) : (this.rand() < 0.5 ? 1 : -1);
          if (g[i + dir] === EMPTY && g[i + W + 2 * dir] === EMPTY) t = i + W + 2 * dir;
        }
        if (t < 0) st[i] = 0;                    // at rest: no momentum next step
        if (t >= 0) {
          g[t] = v; g[i] = EMPTY; st[t] = sid;
          active++;
          const ty = (t / W) | 0;
          if (ty > deepest) deepest = ty;
        } else if (g[i + W] === EMPTY || g[i + W + (s || 1)] === EMPTY ||
                   ((s === 0 || !slide) && g[i + W - (s || 1)] === EMPTY) ||
                   (slide && g[i + s] === EMPTY && g[i + W + 2 * s] === EMPTY)) {
          active++;
          if (y + 1 > deepest) deepest = y + 1;
        }
      }
    }
    this.scanBottom = Math.min(BOTTOM - 1, deepest + 1);
    if (loose && active === 0) active = 1;
    this.active = active;
    return active;
  }

  /** Run until nothing can move (bounded). Used by 바로 쌓기 and when the bottle is corked. */
  settle(maxSteps = 5000) {
    this.wake();
    for (let n = 0; n < maxSteps; n++) if (this.step() === 0) return n;
    return maxSteps;
  }

  /** Pour `amount` grains at once and let them come to rest without drawing. */
  pourInstant(colour, amount, jitter) {
    let poured = 0, blocked = 0;
    this.wake();
    for (let n = 0; n < 20000 && (poured < amount); n++) {
      for (let j = 0; j < 3 && poured < amount; j++) {
        if (this.inject(colour, CX - 0.5 + jitter())) { poured++; blocked = 0; } else blocked++;
      }
      this.step();
      if (blocked > 40) break;
    }
    this.settle();
    return poured;
  }

  /** Highest sand row per column (H when the column is empty). */
  surface() {
    const top = new Int16Array(W).fill(H);
    for (let x = 0; x < W; x++) {
      for (let y = MOUTH; y < BOTTOM; y++) {
        const v = this.g[y * W + x];
        if (v !== EMPTY && v !== WALL) { top[x] = y; break; }
      }
    }
    return top;
  }

  /** Mix the top band: grains swap places at random; with `hop`, some jump up and fall back. */
  shake(depth = 16, hop = true) {
    const g = this.g;
    const top = this.surface();
    const cells = [];
    for (let x = 0; x < W; x++) {
      if (top[x] >= H) continue;
      for (let y = top[x]; y < Math.min(BOTTOM, top[x] + depth); y++) {
        const i = y * W + x;
        if (g[i] !== EMPTY && g[i] !== WALL) cells.push(i);
      }
    }
    for (let n = cells.length - 1; n > 0; n--) {
      const m = (this.rand() * (n + 1)) | 0;
      const a = cells[n], b = cells[m];
      const t = g[a]; g[a] = g[b]; g[b] = t;
    }
    if (hop) {
      for (const i of cells) {
        const y = (i / W) | 0, x = i % W;
        if (y > top[x] + 4 || this.rand() > 0.35) continue;
        const up = 1 + ((this.rand() * 4) | 0);
        const j = (y - up) * W + x;
        if (y - up >= MOUTH && g[j] === EMPTY) { g[j] = g[i]; g[i] = EMPTY; }
      }
    }
    this.wake();
    this.slump = 48;
    return cells.length;
  }

  clear() {
    for (let i = 0; i < this.g.length; i++) if (this.g[i] !== WALL) this.g[i] = EMPTY;
    this.count = 0;
    this.active = 0;
  }

  snapshot() { return { g: this.g.slice(), count: this.count }; }
  restore(s) { this.g.set(s.g); this.count = s.count; this.wake(); }

  /** True when the neck is filled to the brim (a falling stream alone never counts). */
  mouthBlocked() {
    const g = this.g;
    let filled = 0, total = 0;
    for (let y = MOUTH; y <= MOUTH + 1; y++) {
      for (let x = this.rowMin[y]; x <= this.rowMax[y]; x++) {
        total++;
        if (g[y * W + x] !== EMPTY) filled++;
      }
    }
    return filled >= total * 0.92;
  }

  fill() { return this.count / this.capacity; }
}
