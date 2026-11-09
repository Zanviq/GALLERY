// 분필 재질: 글자 텍스처, 분필 선, 가루, 지운 자국. 전부 절차적으로 그린다.

export const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
export const FONT = 'Orbit';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---- board tooth: a 256x256 multiplier map. Chalk skips where the board is low. ----
const G = 256;
let grain = null;
function grainMap() {
  if (grain) return grain;
  const r = rng(1907);
  const white = new Float32Array(G * G);
  for (let i = 0; i < white.length; i++) white[i] = r();
  // streaks: blur along x only, so dropouts run the way a stick is dragged
  const streak = new Float32Array(G * G);
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      let s = 0;
      for (let k = -2; k <= 2; k++) s += white[y * G + ((x + k + G) & (G - 1))];
      streak[y * G + x] = s / 5;
    }
  }
  // low-frequency pressure (value noise, 32px cells)
  const C = 8, cell = G / C;
  const lat = Array.from({ length: C * C }, () => r());
  const lerp = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  grain = new Float32Array(G * G);
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const gx = x / cell, gy = y / cell;
      const x0 = Math.floor(gx) % C, y0 = Math.floor(gy) % C, x1 = (x0 + 1) % C, y1 = (y0 + 1) % C;
      const tx = gx - Math.floor(gx), ty = gy - Math.floor(gy);
      const low = lerp(lerp(lat[y0 * C + x0], lat[y0 * C + x1], tx), lerp(lat[y1 * C + x0], lat[y1 * C + x1], tx), ty);
      const v = (streak[y * G + x] - 0.5) * 2.6 + (white[y * G + x] - 0.5) * 0.9 + (low - 0.5) * 0.8 + 0.62;
      grain[y * G + x] = Math.max(0, Math.min(1, v));
    }
  }
  return grain;
}

/**
 * Turn the alpha already drawn on `ctx` into chalk of `hex`.
 * strength 0..1: how much the board's tooth shows through.
 */
export function chalkify(ctx, w, h, hex, seed = 1, strength = 1) {
  const g = grainMap();
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [R, Gc, B] = hexRGB(hex);
  const r = rng(seed * 7919 + 3);
  const ox = Math.floor(r() * G), oy = Math.floor(r() * G);
  for (let y = 0; y < h; y++) {
    const gy = ((y + oy) & (G - 1)) * G;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let a = d[i + 3] / 255;
      if (a === 0) continue;
      const m = g[gy + ((x + ox) & (G - 1))];
      if (a < 0.7) {
        // soft edge and dust halo: break it into specks
        a = r() < a * 1.1 ? Math.min(1, a * 1.25) * (0.5 + 0.5 * m) : 0;
      } else {
        a *= 1 - strength + strength * (0.18 + 0.82 * m);
      }
      d[i] = R; d[i + 1] = Gc; d[i + 2] = B; d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Orbit draws a lone jamo at about half the height of a syllable, so each kind gets its own
// scale and optical centre (in em above the baseline). Members of one stroke family share them,
// which keeps an added stroke exactly on top of the letter it extends.
const V_TALL = new Set('ㅏㅐㅑㅒㅓㅔㅕㅖㅣㅘㅙㅚㅝㅞㅟㅢ');
const V_FLAT = new Set('ㅗㅛㅜㅠㅡ');
export function metrics(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return { scale: 1, centre: 0.325 };
  if (V_TALL.has(ch)) return { scale: 0.8, centre: 0.325 };
  if (V_FLAT.has(ch)) return { scale: 0.95, centre: 0.35 };
  if (c >= 0x3131 && c <= 0x314e) return { scale: 1.22, centre: 0.315 };
  return { scale: 1, centre: 0.38 };
}

function drawText(ctx, ch, cx, cy, size, halo) {
  const { scale, centre } = metrics(ch);
  const s = size * scale;
  ctx.font = `${s}px ${FONT}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (halo) {
    ctx.shadowColor = 'rgba(255,255,255,0.55)';
    ctx.shadowBlur = s * 0.05;
  }
  ctx.fillText(ch, cx, cy + s * centre);
  // Orbit is a light face; chalk lines are fatter than a pen's, so thicken every glyph evenly
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = s * (V_TALL.has(ch) || V_FLAT.has(ch) ? 0.055 : 0.03);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.strokeText(ch, cx, cy + s * centre);
  ctx.shadowColor = 'transparent';
}

const cache = new Map();
function cached(k, make) {
  if (cache.has(k)) return cache.get(k);
  const v = make();
  if (cache.size > 600) cache.delete(cache.keys().next().value);
  cache.set(k, v);
  return v;
}

/** A square chalk glyph canvas, `box` CSS px, glyph `size` CSS px. */
export function glyph(ch, box, size, hex, seed = 1, strength = 1) {
  const dpr = DPR();
  return cached(`g|${ch}|${box}|${size}|${hex}|${seed}|${strength}|${dpr}`, () => {
    const W = Math.round(box * dpr);
    const c = makeCanvas(W, W);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    drawText(ctx, ch, W / 2, W / 2, size * dpr, true);
    chalkify(ctx, W, W, hex, seed, strength);
    c.ink = inkBox(ctx, W, W);
    return c;
  });
}

function inkBox(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 90) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? [0, 0, w, h] : [x0, y0, x1 + 1, y1 + 1];
}

function alphaOf(ch, W, size) {
  const c = makeCanvas(W, W);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  drawText(ctx, ch, W / 2, W / 2, size, false);
  const d = ctx.getImageData(0, 0, W, W).data;
  const a = new Float32Array(W * W);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
  return a;
}

function morph(mask, W, r, grow) {
  // separable square min/max filter on a 0/1 mask
  const tmp = new Uint8Array(W * W), out = new Uint8Array(W * W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      let v = grow ? 0 : 1;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        const m = xx < 0 || xx >= W ? 0 : mask[y * W + xx];
        v = grow ? v | m : v & m;
      }
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      let v = grow ? 0 : 1;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        const m = yy < 0 || yy >= W ? 0 : tmp[yy * W + x];
        v = grow ? v | m : v & m;
      }
      out[y * W + x] = v;
    }
  }
  return out;
}

/**
 * Ink that `to` has and `from` lacks, as chalk of `hex`: the strokes added between two jamo.
 * Returns { canvas, axis: 'x'|'y', box: [x0,y0,x1,y1] in canvas px } or null when nothing differs.
 */
export function strokeDiff(from, to, box, size, hex, seed = 1, alpha = 1) {
  const dpr = DPR();
  return cached(`d|${from}|${to}|${box}|${size}|${hex}|${seed}|${alpha}|${dpr}`, () => {
    const W = Math.round(box * dpr), S = size * dpr;
    const a = alphaOf(from, W, S), b = alphaOf(to, W, S);
    const raw = new Uint8Array(W * W);
    const fromInk = new Uint8Array(W * W);
    for (let i = 0; i < raw.length; i++) fromInk[i] = a[i] > 0.35 ? 1 : 0;
    const pad = Math.max(1, Math.round(S * 0.02));
    const fromGrown = morph(fromInk, W, pad, true);
    for (let i = 0; i < raw.length; i++) raw[i] = b[i] > 0.5 && !fromGrown[i] ? 1 : 0;
    const r = Math.max(1, Math.round(S * 0.025));
    const opened = morph(morph(raw, W, r, false), W, r + pad + 1, true);
    const c = makeCanvas(W, W);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(W, W);
    let x0 = W, y0 = W, x1 = -1, y1 = -1, n = 0;
    for (let i = 0; i < raw.length; i++) {
      const v = b[i] * opened[i];
      if (v <= 0) continue;
      img.data[i * 4 + 3] = Math.round(v * 255 * alpha);
      const x = i % W, y = (i / W) | 0;
      if (v > 0.5) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (n < 4) return null;
    ctx.putImageData(img, 0, 0);
    chalkify(ctx, W, W, hex, seed, 0.85);
    return { canvas: c, axis: x1 - x0 >= y1 - y0 ? 'x' : 'y', box: [x0, y0, x1, y1] };
  });
}

// ---- chalk lines ----

/** Draw a chalk stroke through `pts` ([x,y] in CSS px) onto ctx (already scaled to CSS px). */
export function chalkStroke(ctx, pts, { width = 3, color = '#F2F2EE', alpha = 0.9, seed = 1, gaps = 0.18, from = 0, to = 1 } = {}) {
  const r = rng(seed);
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
    const len = Math.hypot(dx, dy);
    segs.push({ x: pts[i - 1][0], y: pts[i - 1][1], dx, dy, len, start: total });
    total += len;
  }
  if (!total) return total;
  ctx.fillStyle = color;
  const step = 0.7;
  const a0 = from * total, a1 = to * total;
  // gaps follow a slow 1D noise so the line breaks in a few places, not everywhere
  const lat = Array.from({ length: Math.ceil(total / 18) + 2 }, () => r());
  const gapAt = (s) => {
    const p = s / 18, i = Math.floor(p) % (lat.length - 1), t = p - Math.floor(p);
    return lat[i] + (lat[i + 1] - lat[i]) * t;
  };
  const per = Math.max(2, Math.round(width * 1.3));
  let si = 0;
  for (let s = 0; s < total; s += step) {
    while (si < segs.length - 1 && s > segs[si].start + segs[si].len) si++;
    const g = segs[si];
    const t = (s - g.start) / (g.len || 1);
    const x = g.x + g.dx * t, y = g.y + g.dy * t;
    const nx = -g.dy / (g.len || 1), ny = g.dx / (g.len || 1);
    const press = 0.75 + 0.5 * gapAt(s + 400);
    const dropout = gapAt(s) < gaps ? 0.25 : 1;
    for (let k = 0; k < per; k++) {
      const off = (r() + r() - 1) * width * 0.6 * press;
      const sz = 0.5 + r() * 1.1;
      const al = alpha * dropout * (0.35 + 0.65 * r());
      if (s < a0 || s > a1) continue;
      ctx.globalAlpha = al;
      ctx.fillRect(x + nx * off + (r() - 0.5), y + ny * off + (r() - 0.5), sz, sz);
    }
  }
  ctx.globalAlpha = 1;
  return total;
}

/** Points of a hand-drawn loop round a box. flower adds the scalloped rim of a 꽃동그라미. */
export function loopPoints(cx, cy, rx, ry, { seed = 1, flower = false, overshoot = 0.32, depth = 0.13, petals: np = 0 } = {}) {
  const r = rng(seed);
  const start = -Math.PI * 0.62 + (r() - 0.5) * 0.3;
  const sweep = Math.PI * 2 + overshoot;
  const petals = np || Math.max(8, Math.round((rx + ry) / 22));
  const n = Math.max(Math.ceil((rx + ry) * 1.6), flower ? petals * 16 : 0);
  const w1 = r() * 6.28, w2 = r() * 6.28;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const th = start + sweep * t;
    // the hand drifts inward a little as it comes round
    const drift = 1 - 0.05 * t + 0.025 * Math.sin(th * 2 + w1) + 0.015 * Math.sin(th * 3 + w2);
    const k = flower ? 1 + depth * Math.abs(Math.sin((petals / 2) * th)) : 1;
    pts.push([cx + Math.cos(th) * rx * drift * k, cy + Math.sin(th) * ry * drift * k]);
  }
  return pts;
}

// ---- dust ----
export class Dust {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.p = [];
    this.raf = 0;
    this.extra = [];
    this.tick = this.tick.bind(this);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; } else this.kick();
    });
  }
  resize(w, h) {
    const dpr = DPR();
    this.w = w; this.h = h;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.c.style.width = w + 'px'; this.c.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  puff(x, y, n = 14, spread = 26, color = '#F2F2EE') {
    for (let i = 0; i < n; i++) {
      this.p.push({
        x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.3) * 4,
        vx: (Math.random() - 0.5) * 0.9, vy: -Math.random() * 0.6,
        life: 1, decay: 0.012 + Math.random() * 0.02, s: 0.8 + Math.random() * 1.6, color,
      });
    }
    this.kick();
  }
  /** Run an animation callback each frame until it returns false. */
  run(fn) { this.extra.push(fn); this.kick(); }
  kick() { if (!this.raf && !document.hidden) this.raf = requestAnimationFrame(this.tick); }
  tick(now) {
    this.raf = 0;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this.extra = this.extra.filter((fn) => fn(ctx, now) !== false);
    for (const q of this.p) {
      q.vy += 0.035; q.vx *= 0.985; q.x += q.vx; q.y += q.vy; q.life -= q.decay;
      ctx.globalAlpha = Math.max(0, q.life) * 0.75;
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.s, q.s);
    }
    ctx.globalAlpha = 1;
    this.p = this.p.filter((q) => q.life > 0 && q.y < this.h + 10);
    if (this.p.length || this.extra.length) { this.dirty = true; this.kick(); }
    else if (this.dirty) { this.dirty = false; this.kick(); } // one more frame to clear the last drawing
  }
}

/** Erased-chalk residue: broad eraser arcs at very low alpha, plus optional ghost words. */
export function drawHaze(ctx, w, h, { seed = 11, ghosts = [], smudges = [] } = {}) {
  const r = rng(seed);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#F2F2EE';
  const arcs = 5 + Math.floor(w / 420);
  for (let i = 0; i < arcs; i++) {
    const cx = r() * w, cy = r() * h, R = 120 + r() * Math.max(w, h) * 0.35;
    const a0 = r() * Math.PI * 2, sweep = 0.6 + r() * 1.2, band = 22 + r() * 40;
    const n = Math.round(R * sweep * band * 0.05);
    for (let k = 0; k < n; k++) {
      const t = a0 + sweep * r(), rr = R + (r() - 0.5) * band;
      ctx.globalAlpha = 0.012 + r() * 0.03;
      const s = 1 + r() * 2.5;
      ctx.fillRect(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, s, s * 0.6);
    }
  }
  for (const gst of ghosts) {
    ctx.save();
    ctx.globalAlpha = 0.013;
    ctx.translate(gst.x * w, gst.y * h);
    ctx.rotate(gst.rot);
    ctx.font = `${gst.size}px ${FONT}, sans-serif`;
    ctx.fillText(gst.text, 0, 0);
    ctx.restore();
  }
  for (const s of smudges) smudge(ctx, s.x * w, s.y * h, s.r, s.seed);
  ctx.globalAlpha = 1;
}

export function smudge(ctx, x, y, rad, seed = 1) {
  const r = rng(seed);
  ctx.fillStyle = '#F2F2EE';
  // a few short sideways rubs, thin at the ends, like a thumb wiping a letter off
  const rubs = 3 + Math.floor(r() * 3);
  for (let k = 0; k < rubs; k++) {
    const oy = (r() - 0.5) * rad * 1.1, len = rad * (1.2 + r() * 0.9), tilt = (r() - 0.5) * 0.5;
    const n = Math.round(len * 3);
    for (let q = 0; q < n; q++) {
      const u = r() * 2 - 1;
      const fade = 1 - u * u;
      ctx.globalAlpha = (0.012 + r() * 0.035) * fade;
      const px = x + u * len, py = y + oy + u * len * tilt + (r() - 0.5) * rad * 0.35;
      ctx.fillRect(px, py, 1 + r() * 2.5, 1 + r() * 1.2);
    }
  }
  ctx.globalAlpha = 1;
}
