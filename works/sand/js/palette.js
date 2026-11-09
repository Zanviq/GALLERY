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

/**
 * 32 shades per sand: 28 ordinary grains, 2 darker specks, 2 bare-quartz specks.
 * Dye coats each grain a little differently: lightness and a slight hue drift per grain.
 */
export function shadesFor(colour) {
  const base = rgb(SANDS[colour].hex);
  const white = colour === 5;
  const out = [];
  for (let s = 0; s < 32; s++) {
    let c;
    if (s < 28) {
      const f = 0.86 + 0.24 * hash(colour * 97 + s);                 // lightness, about +-12%
      c = base.map((v, k) => v * f + (hash(colour * 131 + s * 7 + k) - 0.5) * 22);
      if (white) c = c.map((v, k) => v - 14 * hash(colour * 17 + s) - (k === 2 ? 0 : 4));
    } else if (s < 30) {
      const f = s === 28 ? 0.72 : 0.62;
      c = white ? [196, 202, 208].map((v) => v - (s - 28) * 16) : base.map((v) => v * f);
    } else {
      const m = s === 30 ? 0.3 : 0.42;
      c = white ? [255, 255, 255] : base.map((v) => v + (255 - v) * m);
    }
    out.push(c.map(clamp));
  }
  return out;
}

/**
 * Lookup from (cell byte << 3 | edge shade) to an ABGR pixel (little-endian ImageData).
 * Edge shade 0..7 darkens sand seen through the curve of the glass by up to 45%.
 * Bytes 0 (empty) and 255 (glass/outside) stay transparent.
 */
export function buildLut() {
  const lut = new Uint32Array(256 * 8);
  for (let c = 1; c <= 5; c++) {
    shadesFor(c).forEach(([r, g, b], s) => {
      for (let k = 0; k < 8; k++) {
        const f = 1 - 0.45 * (k / 7);
        lut[((c * 32 + s) << 3) | k] = ((255 << 24) | (clamp(b * f) << 16) | (clamp(g * f) << 8) | clamp(r * f)) >>> 0;
      }
    });
  }
  return lut;
}
