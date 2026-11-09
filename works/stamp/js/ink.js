// Seal impressions generated per stamp: the carved seal, minus the ink that did not reach the paper.
// Pressure leans to one side (a broken rim where the hand lifted), paper fibre leaves white flecks,
// and a fast tray drags the ink into a short smear.
import { SEAL_RIM, SEAL_GLYPHS, SEAL_CLIP_R } from './seal-data.js';

export const INJU = '#C8102E';
let RIM = null;
let GLYPHS = null;

function paths() {
  if (!RIM) { RIM = new Path2D(SEAL_RIM); GLYPHS = new Path2D(SEAL_GLYPHS); }
}

export function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// smooth value noise on a g x g lattice, sampled with u, v in 0..1
function valueNoise(rand, g) {
  const v = new Float32Array((g + 1) * (g + 1));
  for (let i = 0; i < v.length; i++) v[i] = rand();
  return (u, w) => {
    const x = u * g, y = w * g;
    const x0 = Math.max(0, Math.min(g - 1, Math.floor(x)));
    const y0 = Math.max(0, Math.min(g - 1, Math.floor(y)));
    let fx = x - x0, fy = y - y0;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = v[y0 * (g + 1) + x0], b = v[y0 * (g + 1) + x0 + 1];
    const c = v[(y0 + 1) * (g + 1) + x0], d = v[(y0 + 1) * (g + 1) + x0 + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/**
 * Draw one impression.
 * @param {object} o
 *   size   diameter of the seal face in CSS px
 *   dpr    device pixel ratio for the backing store
 *   seed   integer; same seed, same impression
 *   press  overall pressure, ~0.85 (light) .. 1.15 (firm)
 *   tilt   how much the hand leaned, 0 (flat) .. 1.4 (rim breaks on one side)
 *   tiltAngle  direction of the light side, radians
 *   smear  drag length in CSS px (paper moving under the stamp)
 *   smearAngle direction of the drag on the paper, radians
 *   rot    rotation of the seal, radians
 * @returns {{canvas: HTMLCanvasElement, pad: number}} pad = CSS px around the face on each side
 */
export function makeImpression(o) {
  paths();
  const { size, dpr = 1, seed = 1, press = 1, tilt = 0.6, tiltAngle = 0, smear = 0, smearAngle = 0, rot = 0 } = o;
  const rand = rng(seed);
  const pad = Math.ceil(size * 0.1 + smear);
  const css = size + pad * 2;
  const N = Math.max(8, Math.ceil(css * dpr));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const k = (size * dpr) / 100;
  const cx = N / 2, cy = N / 2;
  // a carved face never sits perfectly round on paper: a hair of squash along the tilt
  const squash = 1 - Math.min(0.03, tilt * 0.02);

  const drawSeal = (ox, oy, alpha) => {
    g.save();
    g.globalAlpha = alpha;
    g.translate(cx + ox, cy + oy);
    g.rotate(rot);
    g.scale(k, k * squash);
    g.translate(-50, -50);
    g.fillStyle = INJU;
    g.fill(RIM);
    g.beginPath();
    g.arc(50, 50, SEAL_CLIP_R, 0, Math.PI * 2);
    g.clip();
    g.fill(GLYPHS);
    g.restore();
  };

  if (smear > 0.6) {
    const steps = Math.min(12, Math.ceil((smear * dpr) / 1.2));
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      drawSeal(Math.cos(smearAngle) * smear * dpr * t, Math.sin(smearAngle) * smear * dpr * t, 0.05 + 0.3 * (1 - t) * (1 - t));
    }
  }
  drawSeal(0, 0, 1);

  const img = g.getImageData(0, 0, N, N);
  const d = img.data;
  const R = (size * dpr) / 2;
  const tx = Math.cos(tiltAngle), ty = Math.sin(tiltAngle);
  const coarse = valueNoise(rand, 5);
  const fine = valueNoise(rand, 16);
  const fibre = valueNoise(rand, 42);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4 + 3;
      const a = d[i];
      if (!a) continue;
      const nx = (x - cx) / R, ny = (y - cy) / R;
      const u = x / N, v = y / N;
      // pressure: lean + slow unevenness of the rubber-free wooden face + finer blotches
      const p = press - tilt * 0.5 * (nx * tx + ny * ty) + (coarse(u, v) - 0.5) * 0.55 + (fine(u, v) - 0.5) * 0.3;
      let ink = smooth(0.36, 0.66, p);
      // paper fibre: white flecks, more where the ink was thin
      const f = fibre(u, v);
      if (f > 0.62 + ink * 0.25) ink *= 0.35;
      const r = rand();
      if (r < 0.07 * (1.25 - ink)) ink *= 0.2 + r * 3;
      ink *= 0.74 + 0.26 * Math.min(1, p);
      d[i] = a * Math.max(0, Math.min(1, ink));
    }
  }
  g.putImageData(img, 0, 0);
  return { canvas, pad };
}

/** Pressure settings that follow how good the hit was and how fast the tray moved.
 *  speed is in document units (1/100 of a document width) per second; smear comes back in the same unit. */
export function hitStyle(rand, quality, speed) {
  // quality: 1 = 정확, 0.5 = 조금 비뚤, 0 = 빗나감 / 반려
  const lean = quality >= 1 ? 0.35 + rand() * 0.45 : quality > 0 ? 0.7 + rand() * 0.45 : 0.9 + rand() * 0.5;
  return {
    press: 0.93 + rand() * 0.2 - (quality < 1 ? 0.05 : 0),
    tilt: lean,
    tiltAngle: rand() * Math.PI * 2,
    rot: (rand() * 2 - 1) * (quality >= 1 ? 0.05 : 0.12),
    smear: Math.max(0, (speed - 64) * 0.07) * (0.6 + rand() * 0.6),
  };
}
