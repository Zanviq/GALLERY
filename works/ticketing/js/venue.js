// Seat model, the other buyers, and the overview drawing.
import { GRADE_HEAT } from './data.js';

export const FREE = 0, TAKEN = 1, MINE = 2;

export const COLORS = {
  pink: '#FF4F9A', R: '#FF97C2', S: '#FFCFE3', ash: '#E4E4E7', black: '#000000', white: '#FFFFFF',
};

export class Venue {
  constructor(layout) {
    this.layout = layout;
    let n = 0;
    this.blocks = layout.blocks.map((b, i) => {
      const blk = { ...b, index: i, start: n, count: b.cols * b.rows, free: b.cols * b.rows };
      blk.w = b.orient === 'up' ? b.cols : b.rows;
      blk.h = b.orient === 'up' ? b.rows : b.cols;
      n += blk.count;
      return blk;
    });
    this.N = n;
    this.free = n;
    this.state = new Uint8Array(n);
    this.takenAt = new Float32Array(n).fill(-9);
    this.blockOf = new Uint16Array(n);
    this.rowOf = new Uint8Array(n);
    this.colOf = new Uint8Array(n);
    this.weight = new Float32Array(n);
    this.cum = new Float64Array(n);
    let wsum = 0;
    for (const b of this.blocks) {
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          const i = b.start + r * b.cols + c;
          this.blockOf[i] = b.index;
          this.rowOf[i] = r;
          this.colOf[i] = c;
          const front = b.rows > 1 ? 1 - r / (b.rows - 1) : 1;
          const centre = 1 - Math.abs(c - (b.cols - 1) / 2) / b.cols; // aisle seats a bit less loved
          this.weight[i] = GRADE_HEAT[b.grade] * (1 + 0.7 * front) * (0.85 + 0.3 * centre);
          wsum += this.weight[i];
        }
      }
    }
    this.wRef = wsum / n;
  }

  idx(b, r, c) { return b.start + r * b.cols + c; }

  seatName(i) {
    const b = this.blocks[this.blockOf[i]];
    return `${b.id}구역 ${this.rowOf[i] + 1}열 ${this.colOf[i] + 1}번`;
  }

  grade(i) { return this.blocks[this.blockOf[i]].grade; }

  adjacent(i, j) {
    return this.blockOf[i] === this.blockOf[j] && this.rowOf[i] === this.rowOf[j] && Math.abs(this.colOf[i] - this.colOf[j]) === 1;
  }

  setState(i, s, now = 0) {
    const was = this.state[i];
    if (was === s) return;
    const b = this.blocks[this.blockOf[i]];
    if (was === FREE) { this.free--; b.free--; }
    if (s === FREE) { this.free++; b.free++; }
    this.state[i] = s;
    if (s === TAKEN) this.takenAt[i] = now;
  }

  // Sum of hazard weights over free seats (others buy proportionally to it).
  freeWeight() {
    let s = 0;
    const st = this.state, w = this.weight;
    for (let i = 0; i < this.N; i++) if (st[i] === FREE) s += w[i];
    return s;
  }

  // n purchase events by other buyers; most of them buy two seats side by side.
  buy(events, now, pairP = 0.72) {
    if (events <= 0 || this.free <= 0) return 0;
    const st = this.state, w = this.weight, cum = this.cum, N = this.N;
    let s = 0;
    for (let i = 0; i < N; i++) { if (st[i] === FREE) s += w[i]; cum[i] = s; }
    if (s <= 0) return 0;
    let got = 0;
    for (let e = 0; e < events; e++) {
      const x = Math.random() * s;
      let lo = 0, hi = N - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < x) lo = m + 1; else hi = m; }
      const i = lo;
      if (st[i] !== FREE) continue;
      this.setState(i, TAKEN, now);
      got++;
      if (Math.random() < pairP) {
        const j = this.neighbour(i);
        if (j >= 0) { this.setState(j, TAKEN, now); got++; }
      }
    }
    return got;
  }

  neighbour(i) {
    const b = this.blocks[this.blockOf[i]], c = this.colOf[i], st = this.state;
    const l = c > 0 && st[i - 1] === FREE, r = c < b.cols - 1 && st[i + 1] === FREE;
    if (l && r) return Math.random() < 0.5 ? i - 1 : i + 1;
    if (l) return i - 1;
    if (r) return i + 1;
    return -1;
  }

  // Free pairs (two free seats side by side) in a block.
  pairs(b) {
    let n = 0;
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols - 1; c++) {
        const i = b.start + r * b.cols + c;
        if (this.state[i] === FREE && this.state[i + 1] === FREE) n++;
      }
    }
    return n;
  }
}

// ---- overview drawing ----

export class Overview {
  constructor(canvas, venue, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.venue = venue;
    this.labels = opts.labels !== false;
    this.pad = opts.pad ?? 4;
    this.fit();
  }

  fit() {
    const cv = this.cv;
    const box = cv.parentElement.getBoundingClientRect();
    const L = this.venue.layout;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(10, box.width), maxH = Math.max(10, box.height);
    const u = Math.min((w - this.pad * 2) / L.W, (maxH - this.pad * 2) / L.H);
    const h = maxH;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    this.dpr = dpr;
    this.u = u;
    this.ox = (w - L.W * u) / 2;
    this.oy = (h - L.H * u) / 2;
    this.w = w;
    this.h = h;
    const v = this.venue;
    this.px = new Float32Array(v.N);
    this.py = new Float32Array(v.N);
    for (const b of v.blocks) {
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          const i = b.start + r * b.cols + c;
          let x, y;
          if (b.orient === 'up') { x = b.x + c; y = b.y + r; }
          else if (b.orient === 'left') { x = b.x + (b.rows - 1 - r); y = b.y + c; }
          else { x = b.x + r; y = b.y + c; }
          this.px[i] = this.ox + x * u;
          this.py[i] = this.oy + y * u;
        }
      }
    }
  }

  blockRect(b) {
    const u = this.u;
    return { x: this.ox + b.x * u, y: this.oy + b.y * u, w: b.w * u, h: b.h * u };
  }

  // nearest block to a point (CSS px), measured to its rectangle
  hit(x, y) {
    let best = null, bd = Infinity;
    for (const b of this.venue.blocks) {
      const r = this.blockRect(b);
      const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
      const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = b; }
    }
    return bd <= (this.u * 4) ** 2 ? best : null;
  }

  draw({ now = 0, sel = -1, pending = -1, reduced = false, fresh = 0.35 } = {}) {
    const { ctx, venue: v, u, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const L = v.layout;
    // stage
    const sx = this.ox + L.stage.x * u, sy = this.oy + L.stage.y * u, sw = L.stage.w * u, sh = L.stage.h * u;
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = COLORS.white;
    ctx.font = `600 ${Math.max(11, Math.min(18, sh * 0.5))}px "Apjul Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('무대', sx + sw / 2, sy + sh / 2 + 1);
    // tier lines
    ctx.fillStyle = COLORS.ash;
    for (const t of L.tiers) ctx.fillRect(this.ox, this.oy + t.y * u, L.W * u, Math.max(1, u * 0.12));

    const st = v.state, ta = v.takenAt;
    const s = Math.max(1, u * 0.8), off = (u - s) / 2;
    const dot = Math.max(1, u * 0.36), doff = (u - dot) / 2;
    const rim = Math.max(1, Math.min(2, u * 0.16));
    for (const b of v.blocks) {
      const g = b.grade;
      const fill = g === 'VIP' ? COLORS.pink : g === 'R' ? COLORS.R : g === 'S' ? COLORS.S : null;
      for (let i = b.start; i < b.start + b.count; i++) {
        const x = this.px[i], y = this.py[i], k = st[i];
        if (k === 0) {
          if (fill) { ctx.fillStyle = fill; ctx.fillRect(x + off, y + off, s, s); }
          else {
            ctx.fillStyle = COLORS.pink; ctx.fillRect(x + off, y + off, s, s);
            ctx.fillStyle = COLORS.white; ctx.fillRect(x + off + rim, y + off + rim, s - rim * 2, s - rim * 2);
          }
          if (i === pending) { ctx.strokeStyle = COLORS.black; ctx.lineWidth = Math.max(1.5, u * 0.18); ctx.strokeRect(x + off, y + off, s, s); }
        } else if (k === 2) {
          ctx.fillStyle = COLORS.black; ctx.fillRect(x + off - 0.5, y + off - 0.5, s + 1, s + 1);
        } else {
          const age = now - ta[i];
          if (!reduced && age >= 0 && age < fresh) {
            // a sold seat shrinks away in its own colour
            const q = 1 - age / fresh;
            const z = dot + (s - dot) * q * q;
            ctx.fillStyle = fill || COLORS.pink;
            ctx.fillRect(x + (u - z) / 2, y + (u - z) / 2, z, z);
          } else {
            ctx.fillStyle = COLORS.ash; ctx.fillRect(x + doff, y + doff, dot, dot);
          }
        }
      }
    }
    // labels and the selected block
    if (this.labels && u >= 6) {
      ctx.font = `700 ${Math.round(Math.max(10, Math.min(14, u * 1.25)))}px "Big Shoulders Display", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = COLORS.black;
      for (const b of v.blocks) {
        const r = this.blockRect(b);
        ctx.fillText(b.id, r.x, r.y - 1);
      }
    }
    if (sel >= 0) {
      const r = this.blockRect(v.blocks[sel]);
      const p = Math.max(2, u * 0.35);
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x - p, r.y - p, r.w + p * 2, r.h + p * 2);
    }
  }
}
