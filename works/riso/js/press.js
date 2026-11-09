// The ink model. Every print on the page (the press sheet, the ink chart, the paper swatches)
// goes through these functions, so they all share one look.
//
// A print is a stack of plates. Each plate is a mask (where the stencil lets ink through) and a
// coverage field (how much ink actually lands: grain, voids, mottling, banding). Plates are laid
// down in drum order onto white paper:
//   colour *= 1 - cover * (1 - ink)            transparent ink multiplies
//   colour += (ink - colour) * cover * hide    and covers a little of what is under it
// so the drum printed last shows more in its overlaps. No textures are loaded: all of it is noise
// from a seeded PRNG.

export const INKS = {
  black: { id: 'black', name: '블랙', rgb: [38, 38, 40], hide: 0.42 },
  pink: { id: 'pink', name: '형광 핑크', rgb: [255, 72, 176], hide: 0.30 },
  blue: { id: 'blue', name: '블루', rgb: [0, 120, 191], hide: 0.26 },
  yellow: { id: 'yellow', name: '옐로', rgb: [255, 232, 0], hide: 0.10 },
};

// density 1..5 (the machine's print density setting)
const DENSITY = [
  { base: 0.70, voids: 0.075 },
  { base: 0.80, voids: 0.045 },
  { base: 0.88, voids: 0.026 },
  { base: 0.94, voids: 0.014 },
  { base: 0.985, voids: 0.006 },
];

// how a stock takes ink
export const PAPER_FEEL = {
  smooth: { base: 0.02, voids: 0.8, mottle: 0.85, grain: 0.9, felt: 0 },
  plain: { base: 0, voids: 1, mottle: 1, grain: 1, felt: 0 },
  rough: { base: -0.03, voids: 1.9, mottle: 1.35, grain: 1.25, felt: 0 },
  felt: { base: -0.04, voids: 1.5, mottle: 1.2, grain: 1.15, felt: 1 },
};

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str, seed = 2166136261) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Adds one octave of smooth value noise (centred on 0, peak +-amp/2) to acc.
function addNoise(acc, W, H, cx, cy, amp, rand) {
  cx = Math.max(cx, 1);
  cy = Math.max(cy, 1);
  const gw = Math.ceil(W / cx) + 2;
  const gh = Math.ceil(H / cy) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = rand() - 0.5;
  const x0 = new Int32Array(W);
  const fx = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const u = x / cx;
    const i = u | 0;
    const f = u - i;
    x0[x] = i;
    fx[x] = f * f * (3 - 2 * f);
  }
  for (let y = 0; y < H; y++) {
    const v = y / cy;
    const j = v | 0;
    let fy = v - j;
    fy = fy * fy * (3 - 2 * fy);
    const r0 = j * gw;
    const r1 = r0 + gw;
    let o = y * W;
    for (let x = 0; x < W; x++, o++) {
      const i0 = x0[x];
      const f = fx[x];
      const a0 = g[r0 + i0];
      const b0 = g[r1 + i0];
      const a = a0 + (g[r0 + i0 + 1] - a0) * f;
      const b = b0 + (g[r1 + i0 + 1] - b0) * f;
      acc[o] += (a + (b - a) * fy) * amp;
    }
  }
}

// Coverage field for one plate. Returns { cover, edge } as Uint8Arrays (W*H).
export function makeCoverage(W, H, ppm, seed, density = 3, feel = PAPER_FEEL.plain) {
  const rand = rng(seed);
  const d = DENSITY[Math.min(5, Math.max(1, density)) - 1];
  const N = W * H;
  const acc = new Float32Array(N);
  addNoise(acc, W, H, 0.7 * ppm, 0.7 * ppm, 0.26 * feel.mottle, rand); // fine mottle
  addNoise(acc, W, H, 3.2 * ppm, 3.2 * ppm, 0.2 * feel.mottle, rand); // stencil starving
  addNoise(acc, W, H, 26 * ppm, 26 * ppm, 0.12, rand); // broad patches
  addNoise(acc, W, H, 400 * ppm, 5 * ppm, 0.16, rand); // bands across the feed
  if (feel.felt) addNoise(acc, W, H, 0.45 * ppm, 3.5 * ppm, 0.38 * feel.felt, rand);
  const vf = new Float32Array(N);
  addNoise(vf, W, H, 0.42 * ppm, 0.42 * ppm, 1, rand);
  addNoise(vf, W, H, 1.6 * ppm, 1.6 * ppm, 0.7, rand);

  // void threshold as a quantile of the void field, so the speck rate is exact
  const want = Math.min(0.4, d.voids * feel.voids);
  const sample = new Float32Array(2048);
  for (let i = 0; i < sample.length; i++) sample[i] = vf[(rand() * N) | 0];
  sample.sort();
  const vth = sample[Math.floor(want * (sample.length - 1))];

  const cover = new Uint8Array(N);
  const edge = new Uint8Array(N);
  const slope = (rand() - 0.5) * 0.12;
  const base = d.base + feel.base;
  const grain = 0.2 * feel.grain;
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      let c = base + acc[i] + slope * (x / W - 0.5) + (rand() - 0.5) * grain;
      const v = vf[i];
      if (v < vth) c *= 0.08 + 0.5 * ((vth - v) < 0.04 ? 0.6 : 0.1);
      cover[i] = c <= 0 ? 0 : c >= 1 ? 255 : (c * 255) | 0;
      const e = v * 0.9 + 0.5;
      edge[i] = e <= 0 ? 0 : e >= 1 ? 255 : (e * 255) | 0;
    }
  }
  return { cover, edge };
}

// Threshold field for tints: blurred white noise, equalised so that "< t" covers exactly t.
// This is the stochastic screen a riso uses for greys (no regular halftone rosette).
export function screenField(W, H, seed) {
  const rand = rng(seed);
  const N = W * H;
  const w = new Float32Array(N);
  for (let i = 0; i < N; i++) w[i] = rand();
  const b = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const k = dx === 0 && dy === 0 ? 2 : 1;
          s += w[yy * W + xx] * k;
          n += k;
        }
      }
      b[y * W + x] = s / n;
    }
  }
  const BINS = 1024;
  const hist = new Uint32Array(BINS);
  for (let i = 0; i < N; i++) hist[Math.min(BINS - 1, (b[i] * BINS) | 0)]++;
  const cdf = new Uint8Array(BINS);
  let acc = 0;
  for (let i = 0; i < BINS; i++) {
    acc += hist[i];
    cdf[i] = Math.min(254, Math.floor((acc / N) * 255));
  }
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) out[i] = cdf[Math.min(BINS - 1, (b[i] * BINS) | 0)];
  return out;
}

// Reads the alpha of a drawn mask canvas and roughens its edges the way a stencil does.
// mode 'rough': stencil edges; 'hard': alpha > 50 %; 'screen': alpha is a tint, dithered
// against `screen` (from screenField). rect = [x0, y0, x1, y1] limits the work to a region
// (the drag path): pixels outside it keep their old values in `out`.
export function readMask(ctx, W, H, edge, out, mode = 'rough', screen = null, rect = null) {
  const [x0, y0, x1, y1] = rect || [0, 0, W, H];
  const w = x1 - x0;
  const h = y1 - y0;
  if (!out) out = new Uint8Array(W * H);
  if (w <= 0 || h <= 0) return out;
  const src = ctx.getImageData(x0, y0, w, h).data;
  if (mode === 'hard' || mode === 'screen') {
    for (let y = 0, j = 3; y < h; y++) {
      for (let x = 0, i = (y0 + y) * W + x0; x < w; x++, i++, j += 4) {
        const a = src[j];
        out[i] = mode === 'hard' ? (a > 127 ? 255 : 0) : a > 0 && (a >= 250 || screen[i] < a) ? 255 : 0;
      }
    }
    return out;
  }
  // 3x3 box blur of alpha (separable, clamped at the region edge), then threshold against the
  // edge noise so outlines come out ragged by about a pixel, like a stencil
  const n = w * h;
  const a = new Uint16Array(n);
  for (let i = 0, j = 3; i < n; i++, j += 4) a[i] = src[j];
  const hb = new Uint16Array(n);
  for (let y = 0; y < h; y++) {
    const r = y * w;
    if (w === 1) { hb[r] = a[r] * 3; continue; }
    hb[r] = a[r] * 2 + a[r + 1];
    for (let x = 1; x < w - 1; x++) hb[r + x] = a[r + x - 1] + a[r + x] + a[r + x + 1];
    hb[r + w - 1] = a[r + w - 2] + a[r + w - 1] * 2;
  }
  for (let y = 0; y < h; y++) {
    const up = y > 0 ? -w : 0;
    const dn = y < h - 1 ? w : 0;
    for (let x = 0, k = y * w, i = (y0 + y) * W + x0; x < w; x++, k++, i++) {
      const sum = hb[k + up] + hb[k] + hb[k + dn]; // 0..2295
      if (sum === 0) { out[i] = 0; continue; }
      if (sum === 2295) { out[i] = 255; continue; }
      const t = sum / 2295 + (edge[i] / 255 - 0.5) * 0.6;
      const v = (t - 0.5) * 2.6 + 0.5;
      out[i] = v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0;
    }
  }
  return out;
}

// Lays the plates down in order. layers: [{ mask, cover, ink, rows }]
// rows = how many rows of this plate have been printed so far (for the feed animation).
// rect = [x0, y0, x1, y1] recomposes only that region.
export function composite(img, W, H, layers, rect = null) {
  const out = new Uint32Array(img.data.buffer);
  const [x0, y0, x1, y1] = rect || [0, 0, W, H];
  const L = layers.length;
  const M = [];
  const C = [];
  const R = new Float32Array(L);
  const G = new Float32Array(L);
  const B = new Float32Array(L);
  const KR = new Float32Array(L);
  const KG = new Float32Array(L);
  const KB = new Float32Array(L);
  const HI = new Float32Array(L);
  const ROWS = new Int32Array(L);
  for (let k = 0; k < L; k++) {
    const ly = layers[k];
    M.push(ly.mask);
    C.push(ly.cover);
    R[k] = ly.ink.rgb[0] / 255;
    G[k] = ly.ink.rgb[1] / 255;
    B[k] = ly.ink.rgb[2] / 255;
    KR[k] = 1 - R[k];
    KG[k] = 1 - G[k];
    KB[k] = 1 - B[k];
    HI[k] = ly.ink.hide;
    ROWS[k] = ly.rows == null ? H : ly.rows;
  }
  const inv = 1 / 65025;
  const WHITE = 0xffffffff;
  for (let y = y0; y < y1; y++) {
    for (let x = x0, i = y * W + x0; x < x1; x++, i++) {
      let r = 1;
      let g = 1;
      let b = 1;
      let any = false;
      for (let k = 0; k < L; k++) {
        const m = M[k][i];
        if (m === 0 || y >= ROWS[k]) continue;
        any = true;
        const c = m * C[k][i] * inv;
        r *= 1 - c * KR[k];
        g *= 1 - c * KG[k];
        b *= 1 - c * KB[k];
        const t = c * HI[k];
        r += (R[k] - r) * t;
        g += (G[k] - g) * t;
        b += (B[k] - b) * t;
      }
      out[i] = any
        ? 0xff000000 | (((b * 255 + 0.5) | 0) << 16) | (((g * 255 + 0.5) | 0) << 8) | ((r * 255 + 0.5) | 0)
        : WHITE;
    }
  }
}

// One-shot print of a small piece (ink chart patches, paper swatches).
// spec: { canvas, wmm, hmm, seed, feel, layers: [{ ink, density, mode, offset:[dx,dy] mm, draw(ctx) }] }
// draw() works in millimetres.
export function printPiece(spec) {
  const { canvas, wmm, hmm } = spec;
  const W = canvas.width;
  const H = canvas.height;
  const ppm = W / wmm;
  const feel = spec.feel || PAPER_FEEL.plain;
  const mc = document.createElement('canvas');
  mc.width = W;
  mc.height = H;
  const mctx = mc.getContext('2d', { willReadFrequently: true });
  const layers = spec.layers.map((ly, k) => {
    const cov = makeCoverage(W, H, ppm, hash(ly.ink.id + ':' + k, spec.seed || 1), ly.density || 3, feel);
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, W, H);
    const off = ly.offset || [0, 0];
    mctx.setTransform(ppm, 0, 0, ppm, off[0] * ppm, off[1] * ppm);
    mctx.fillStyle = '#000';
    ly.draw(mctx, ppm);
    const mode = ly.mode || 'rough';
    const screen = mode === 'screen' ? screenField(W, H, hash('screen', spec.seed || 1)) : null;
    const mask = readMask(mctx, W, H, cov.edge, null, mode, screen);
    return { mask, cover: cov.cover, ink: ly.ink };
  });
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  composite(img, W, H, layers);
  ctx.putImageData(img, 0, 0);
}
