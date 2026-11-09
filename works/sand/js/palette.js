// The five dyed sands and the per-grain shades they come in (see design/works/sand/DESIGN.md).

export const SANDS = [
  null,
  { id: 1, name: '진분홍', hex: '#E4007F' },
  { id: 2, name: '노랑', hex: '#FFE419' },
  { id: 3, name: '파랑', hex: '#1F4FE0' },
  { id: 4, name: '연두', hex: '#6CCB2A' },
  { id: 5, name: '하양', hex: '#F2F4F5' },
];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

function hash(n) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

/** 32 shades per sand: 28 ordinary grains, 2 darker specks, 2 bare-quartz specks. */
export function shadesFor(colour) {
  const base = rgb(SANDS[colour].hex);
  const white = colour === 5;
  const out = [];
  for (let s = 0; s < 32; s++) {
    let c;
    if (s < 28) {
      const f = 0.92 + 0.15 * hash(colour * 97 + s);               // lightness jitter
      c = base.map((v, k) => v * f + (hash(colour * 131 + s * 7 + k) - 0.5) * 12);
      if (white) c = c.map((v, k) => v - 10 * hash(colour * 17 + s) - (k === 2 ? 0 : 3));
    } else if (s < 30) {
      const f = s === 28 ? 0.78 : 0.7;
      c = white ? [200, 206, 212].map((v) => v - (s - 28) * 14) : base.map((v) => v * f);
    } else {
      const m = s === 30 ? 0.2 : 0.3;
      c = white ? [255, 255, 255] : base.map((v) => v + (255 - v) * m);
    }
    out.push(c.map(clamp));
  }
  return out;
}

/** 256-entry lookup from cell byte to an ABGR pixel (little-endian ImageData). */
export function buildLut() {
  const lut = new Uint32Array(256);
  for (let c = 1; c <= 5; c++) {
    shadesFor(c).forEach(([r, g, b], s) => {
      lut[c * 32 + s] = (255 << 24 | b << 16 | g << 8 | r) >>> 0;
    });
  }
  return lut;   // 0 (empty) and 255 (glass/outside) stay transparent
}

/** CSS colour strings for a cell byte, used for falling grains drawn one by one. */
export function buildCss() {
  const css = new Array(256).fill('');
  for (let c = 1; c <= 5; c++) {
    shadesFor(c).forEach(([r, g, b], s) => { css[c * 32 + s] = `rgb(${r},${g},${b})`; });
  }
  return css;
}
