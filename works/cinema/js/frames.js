// The film's frames. Every picture frame is a crop of a black-and-white film still (img/still-*.webp);
// neighbouring frames of a shot are slightly different crops of the same still, so the camera seems to
// creep in. Only the two title cards are set here, as type on black.
import { FRAMES } from './data.js';

export const FW = 3;
export const FH = 2;
export const DISPLAY = "'Diphylleia', serif";
export const SANS = "'Jeommyeol Sans', sans-serif";

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- stills ----------

const TIERS = [400, 800, 1600];
const BASE = new URL('../img/', import.meta.url);
const stills = new Map(); // name@tier -> { img, ok }
const listeners = new Set();

export function onStill(fn) { listeners.add(fn); }

function tierFor(w) {
  return TIERS.find((t) => t >= w * 0.9) || TIERS[TIERS.length - 1];
}

function request(name, tier) {
  const key = name + '@' + tier;
  let s = stills.get(key);
  if (s) return s;
  const img = new Image();
  img.decoding = 'async';
  s = { img, ok: false };
  stills.set(key, s);
  img.onload = () => {
    s.ok = true;
    listeners.forEach((fn) => fn(name, tier));
  };
  img.onerror = () => { stills.delete(key); };
  img.src = new URL(`still-${name}-${tier}.webp`, BASE).href;
  return s;
}

// best loaded image of `name` for a target width; asks for the right tier if it is not there yet
function pick(name, w) {
  const want = tierFor(w);
  const s = request(name, want);
  if (s.ok) return { img: s.img, tier: want };
  for (let i = TIERS.indexOf(want) - 1; i >= 0; i--) {
    const lower = stills.get(name + '@' + TIERS[i]);
    if (lower && lower.ok) return { img: lower.img, tier: TIERS[i] };
  }
  return null;
}

export function prefetch(n, w) {
  const f = FRAMES[n - 1];
  if (f && f.img) request(f.img, tierFor(w));
}

// ---------- drawing ----------

function drawCard(ctx, w, h, card) {
  ctx.fillStyle = '#020202';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e8e8e8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (card === 'title') ctx.font = `400 ${Math.round(h * 0.32)}px ${DISPLAY}`;
  else ctx.font = `700 ${Math.round(h * 0.095)}px ${SANS}`;
  ctx.fillText(card === 'title' ? '점멸' : '12월 2일 개봉', w / 2, h / 2);
}

// Draw frame n over the whole of `canvas`. Returns the tier drawn (0 for a card, -1 when nothing yet).
export function renderFrame(canvas, n) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const f = FRAMES[n - 1];
  if (f.card) {
    drawCard(ctx, w, h, f.card);
    return 0;
  }
  const got = pick(f.img, w);
  if (!got) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);
    return -1;
  }
  const { img } = got;
  const [cx, cy, zoom] = f.crop;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  // largest 3:2 window at this zoom, centred on (cx, cy) and kept inside the picture
  let sw = Math.min(iw, (ih * FW) / FH) / zoom;
  let sh = (sw * FH) / FW;
  const sx = Math.max(0, Math.min(iw - sw, cx * iw - sw / 2));
  const sy = Math.max(0, Math.min(ih - sh, cy * ih - sh / 2));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return got.tier;
}

// ---------- moving grain (only on the screen, only while frames change) ----------

const grainTiles = [];
function grainTile(i) {
  if (!grainTiles.length) {
    for (let t = 0; t < 4; t++) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d');
      const img = x.createImageData(128, 128);
      const r = rng(9001 + t * 31);
      for (let p = 0; p < img.data.length; p += 4) {
        const v = 128 + ((r() + r() + r()) / 3 - 0.5) * 255 * 1.4;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = Math.max(0, Math.min(255, v));
        img.data[p + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      grainTiles.push(c);
    }
  }
  return grainTiles[i % grainTiles.length];
}

export function grain(ctx, w, h, seed, amount = 0.3) {
  const pat = ctx.createPattern(grainTile(seed), 'repeat');
  const r = rng(seed * 131 + 7);
  const scale = Math.max(1, w / 900);
  if (pat.setTransform && typeof DOMMatrix !== 'undefined') {
    pat.setTransform(new DOMMatrix([scale, 0, 0, scale, r() * 128, r() * 128]));
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------- rendered frames at a given width, shared by the sheet and the loupe ----------

const cache = new Map(); // n@w -> canvas (with .tier)
const order = [];
const BUDGET = 24e6; // device pixels kept
let used = 0;

const snap = (w) => Math.max(24, Math.round(w / 8) * 8);

// A canvas holding frame n at width w, or null while its still is loading.
export function frameBitmap(n, w) {
  w = snap(w);
  const key = n + '@' + w;
  const want = FRAMES[n - 1].card ? 0 : tierFor(w);
  let c = cache.get(key);
  if (c && c.tier >= want) return c;
  const fresh = !c;
  if (fresh) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = Math.round((w * FH) / FW);
  }
  const tier = renderFrame(c, n);
  if (tier < 0) return fresh ? null : c;
  c.tier = tier;
  if (fresh) {
    cache.set(key, c);
    order.push(key);
    used += c.width * c.height;
    while (used > BUDGET && order.length > 40) {
      const old = order.shift();
      const oc = cache.get(old);
      if (oc) used -= oc.width * oc.height;
      cache.delete(old);
    }
  }
  return c;
}
