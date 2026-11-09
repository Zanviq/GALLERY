// Seven-segment display drawn as SVG: lit bars in currentColor, unlit bars faintly behind.
// seg('12'), seg('End'), seg('05:41'). Unknown characters render blank.

const W = 12;      // cell width
const H = 22;      // cell height
const T = 2.7;     // bar thickness
const G = 0.55;    // gap between bars
const ADV = W + 3.4;
const COLON = 4.6;
const SKEW = Math.tan((7 * Math.PI) / 180);

const MAP = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  '-': 'g', E: 'adefg', n: 'ceg', d: 'bcdeg', o: 'cdeg', F: 'aefg', r: 'eg', P: 'abefg', ' ': '',
};

const h = (x0, x1, y) => {
  const a = x0 + G, b = x1 - G, t = T / 2;
  return [[a, y], [a + t, y - t], [b - t, y - t], [b, y], [b - t, y + t], [a + t, y + t]];
};
const v = (x, y0, y1) => {
  const a = y0 + G, b = y1 - G, t = T / 2;
  return [[x, a], [x + t, a + t], [x + t, b - t], [x, b], [x - t, b - t], [x - t, a + t]];
};
const L = T / 2, R = W - T / 2, M = H / 2;
const SEGS = {
  a: h(L, R, T / 2), g: h(L, R, M), d: h(L, R, H - T / 2),
  f: v(L, T / 2, M), b: v(R, T / 2, M), e: v(L, M, H - T / 2), c: v(R, M, H - T / 2),
};

const PAD = H * SKEW + 1;
const poly = (pts, dx) => 'M' + pts.map(([x, y]) => `${(x + dx + PAD - y * SKEW).toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z';

export function seg(text, { off = true } = {}) {
  let on = '', dim = '', x = 0;
  for (const ch of String(text)) {
    if (ch === ':') {
      const cx = x + COLON / 2 - 1;
      for (const cy of [H * 0.32, H * 0.7]) on += poly([[cx - 1.3, cy - 1.3], [cx + 1.3, cy - 1.3], [cx + 1.3, cy + 1.3], [cx - 1.3, cy + 1.3]], 0);
      x += COLON;
      continue;
    }
    const lit = MAP[ch] ?? '';
    for (const k of 'abcdefg') {
      if (lit.includes(k)) on += poly(SEGS[k], x);
      else if (off) dim += poly(SEGS[k], x);
    }
    x += ADV;
  }
  const width = (x - (ADV - W) + PAD + 0.5).toFixed(2);
  return `<svg class="seg" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" aria-hidden="true" focusable="false">` +
    (dim ? `<path class="seg__off" d="${dim}"/>` : '') + `<path class="seg__on" d="${on}"/></svg>`;
}

// Two-digit minutes for a tile: '--' free, 'End' done, '01'..'99' running.
export function tileText(state, msLeft) {
  if (state === 'free') return ' --';
  if (state === 'done') return 'End';
  const m = Math.max(1, Math.ceil(msLeft / 60000));
  return String(Math.min(99, m)).padStart(3, ' ');
}

export function clockText(msLeft) {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.min(99, Math.floor(s / 60));
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
