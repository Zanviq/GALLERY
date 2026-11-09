// The flat pieces of one oxford upper, built from the foot's numbers and laid on a side of leather.
// Pieces are drawn in real millimetres, then placed on the hide at half size (1:2) so that a whole
// shoe's set fits on the sheet. Coordinates on the sheet are the same canonical frame as the foot.
import { spline, resample, bounds, area } from './geometry.js';

export const SCALE = 0.5;
export const M = 72; // points per piece contour
const BASE = { length: 258, width: 99, girth: 244.2 };

// Control points in local millimetres. `lasting` is a control-point range [from, to] along which the
// lasting allowance (the edge pulled under the last) runs; `notches` are control-point indices.
const PIECES = [
  {
    id: 'vamp', name: '앞날개', grain: 0,
    pts: [[0, 0], [4, 30], [18, 58], [44, 76], [80, 84], [120, 84], [158, 80], [182, 75], [187, 68], [186, 60],
      [166, 50], [146, 38], [134, 20], [130, 0], [134, -20], [146, -38], [166, -50], [186, -60], [187, -68],
      [182, -75], [158, -80], [120, -84], [80, -84], [44, -76], [18, -58], [4, -30]],
    lasting: [19, 33], notches: [13, 5, 21], scale: (m) => [m.length / BASE.length, m.girth / BASE.girth],
  },
  {
    id: 'quarter-out', name: '뒷날개 바깥', grain: 0,
    pts: [[6, 96], [2, 72], [0, 46], [3, 22], [8, 7], [26, 4], [52, 10], [80, 17], [104, 20], [124, 13],
      [138, 9], [150, 16], [153, 34], [150, 54], [142, 70], [124, 84], [96, 94], [60, 97], [30, 97]],
    lasting: [15, 19], notches: [2, 15], eyelets: true, scale: (m) => [m.length / BASE.length, m.girth / BASE.girth],
  },
  {
    id: 'quarter-in', name: '뒷날개 안', grain: 0, mirror: true, raise: 3,
    pts: null, // same as the outside quarter, mirrored, top line raised 3 mm
    lasting: [15, 19], notches: [2, 15], eyelets: true, scale: (m) => [m.length / BASE.length, m.girth / BASE.girth],
  },
  {
    id: 'tongue', name: '혀', grain: 90,
    pts: [[10, 0], [38, 0], [46, 5], [48, 24], [45, 60], [41, 100], [38, 118], [24, 119], [10, 118], [7, 100],
      [3, 60], [0, 24], [2, 5]],
    lasting: null, notches: [7], scale: (m) => [m.width / BASE.width, m.length / BASE.length],
  },
  {
    id: 'lining', name: '안감', grain: 0,
    pts: [[0, 4], [30, 2], [64, 8], [96, 16], [114, 10], [118, 30], [114, 56], [104, 76], [80, 86], [40, 88],
      [0, 86], [-40, 88], [-80, 86], [-104, 76], [-114, 56], [-118, 30], [-114, 10], [-96, 16], [-64, 8], [-30, 2]],
    lasting: [7, 13], notches: [0, 10], scale: (m) => [m.length / BASE.length, m.girth / BASE.girth],
  },
];
PIECES[2].pts = PIECES[1].pts.map(([x, y], i) => [x, i >= 3 && i <= 10 ? y - 3 : y]);

// Where each piece sits on the hide (canonical sheet, centre of its box) and how it is turned.
// The backbone runs along the top edge, so every grain line is horizontal.
const LAYOUT = {
  vamp: { cx: 108, cy: 80, rot: 180 },
  tongue: { cx: 108, cy: 149, rot: 90 },
  'quarter-in': { cx: 55, cy: 202, rot: 0 },
  'quarter-out': { cx: 155, cy: 202, rot: 180 },
  lining: { cx: 107, cy: 270, rot: 0 },
};

// Which stretch of the foot outline (fractions of its loop, starting at the heel and running up the
// inside) turns into which piece. Order matters: it is the order of the arcs around the foot.
export const ARCS = [
  { id: 'lining', from: -0.09, to: 0.1 },
  { id: 'quarter-in', from: 0.1, to: 0.36 },
  { id: 'vamp', from: 0.36, to: 0.62 },
  { id: 'tongue', from: 0.62, to: 0.7 },
  { id: 'quarter-out', from: 0.7, to: 0.91 },
];

export const HIDE = (() => {
  const ctrl = [[8, 9], [60, 8], [120, 9], [180, 8], [203, 11], [206, 42], [201, 84], [205, 124], [208, 158],
    [204, 192], [205, 232], [196, 272], [200, 300], [187, 322], [150, 317], [110, 323], [70, 319], [34, 324],
    [10, 317], [4, 290], [8, 250], [3, 210], [7, 170], [4, 130], [8, 90], [4, 50], [6, 24]];
  return resample(spline(ctrl, 10), 220);
})();
export const BACKBONE = [[10, 15], [200, 15]];
export const FLAW = { x: 33, y: 96, r: 7 };

function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const PER = 12;

// Build every piece for the given measurements. Returns placed geometry in sheet millimetres.
export function buildPieces(meas) {
  const m = {
    length: Math.min(310, Math.max(200, meas.length)),
    width: Math.min(130, Math.max(75, meas.width)),
  };
  m.girth = 2.05 * m.width + 0.16 * m.length;
  return PIECES.map((p) => {
    const [kx, ky] = p.scale(m);
    let local = p.pts.map(([x, y]) => [x * kx, y * ky]);
    if (p.mirror) local = local.map(([x, y]) => [-x, y]);
    const b = bounds(local);
    const ox = (b.x0 + b.x1) / 2, oy = (b.y0 + b.y1) / 2;
    const L = LAYOUT[p.id];
    const a = L.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const place = ([x, y]) => {
      const u = (x - ox) * SCALE, v = (y - oy) * SCALE;
      return [L.cx + u * c - v * s, L.cy + u * s + v * c];
    };
    const dense = spline(local, PER).map(place);
    let contour = resample(dense, M);
    if (area(contour) < 0) contour = contour.reverse();
    const out = { id: p.id, name: p.name, contour, dense, real: { w: b.w, h: b.h } };

    // inward normal at a dense sample
    const n = dense.length;
    const normal = (i) => {
      const a0 = dense[(i - 1 + n) % n], a1 = dense[(i + 1) % n];
      let nx = -(a1[1] - a0[1]), ny = a1[0] - a0[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const [x, y] = dense[i];
      return inside(dense, x + nx * 1.5, y + ny * 1.5) ? [nx, ny] : [-nx, -ny];
    };
    if (p.lasting) {
      const [f, t] = p.lasting;
      const line = [];
      for (let i = f * PER + 2; i <= t * PER - 2; i++) {
        const [nx, ny] = normal(i % n), [x, y] = dense[i % n];
        line.push([x + nx * 18 * SCALE, y + ny * 18 * SCALE]);
      }
      out.lasting = line;
    }
    out.notches = (p.notches || []).map((k) => {
      const i = (k * PER) % n, [nx, ny] = normal(i), [x, y] = dense[i];
      return [[x, y], [x + nx * 3.2, y + ny * 3.2]];
    });
    if (p.eyelets) {
      out.eyelets = [[139, 22], [141, 32], [141, 42], [140, 52], [137, 62]].map(([x, y]) => {
        let q = [x * kx, y * ky];
        if (p.mirror) q = [-q[0], q[1]];
        return place(q);
      });
    }
    // grain line through the middle, along the grain direction, about half the piece long
    const g = (p.grain + L.rot) * Math.PI / 180;
    const ext = (p.grain === 90 ? b.h : b.w) * SCALE * 0.3;
    const gx = Math.cos(g), gy = Math.sin(g);
    const cx = L.cx, cy = L.cy + (p.id === 'tongue' ? 0 : 7);
    out.grain = [[cx - gx * ext, cy - gy * ext], [cx + gx * ext, cy + gy * ext]];
    out.label = p.id === 'tongue' ? { x: L.cx + b.w * SCALE / 2 + 0, y: L.cy, outside: true } : { x: L.cx, y: L.cy - 5 };
    return out;
  });
}

// Split a foot outline into the five arcs, each resampled to M + 1 points (open).
export function footArcs(outline) {
  const n = outline.length;
  return ARCS.map((a) => {
    const i0 = Math.round(a.from * n), i1 = Math.round(a.to * n);
    const seg = [];
    for (let i = i0; i <= i1; i++) seg.push(outline[((i % n) + n) % n]);
    return { id: a.id, pts: resample(seg, M + 1, false) };
  });
}

// Turn a closed piece contour into M + 1 points that start where the arc starts and run the same
// way, so the morph does not twist.
export function alignContour(contour, arc) {
  let best = null, score = Infinity;
  for (const dir of [1, -1]) {
    const c = dir === 1 ? contour : [...contour].reverse();
    for (let r = 0; r < M; r++) {
      let s = 0;
      for (let k = 0; k < M; k += 4) {
        const p = c[(r + k) % M], q = arc[k];
        s += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      }
      if (s < score) { score = s; best = { c, r }; }
    }
  }
  const out = [];
  for (let k = 0; k <= M; k++) out.push(best.c[(best.r + k) % M]);
  return out;
}
