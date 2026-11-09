// Cut-paper puppets. Units are cm, y points up, feet (or keel) on y = 0 as drawn.
// Each puppet is a list of rings; `hole: true` rings are cut-outs. After build() every outline
// winds counter-clockwise and every cut-out clockwise, and all coordinates are relative to the
// rod pivot (the point where the rod holds the sheet and around which it turns).

const quad = (a, b, w) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * w / 2, ny = (dx / l) * w / 2;
  return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
};
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const diamond = (cx, cy, r) => [[cx, cy + r], [cx + r, cy], [cx, cy - r], [cx - r, cy]];

// A pine needle fan: a slightly sagging base and a serrated dome of needle tips.
function fan(cx, cy, w, h, n = 9) {
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const u = 1 - (2 * i) / 4;
    pts.push([cx + w * u, cy - 0.55 * (1 - u * u)]);
  }
  for (let j = 1; j < 2 * n; j++) {
    const u = -1 + j / n;
    const dome = Math.sqrt(Math.max(0, 1 - u * u * 0.92));
    const tip = j % 2 === 1;
    pts.push([cx + w * u * (tip ? 1.05 : 0.97), cy + h * dome * (tip ? 1 : 0.6)]);
  }
  return pts;
}

// Crescent: the part of circle (0, cy0, r0) outside circle (dx, cy1, r1).
function crescent(cy0, r0, dx, cy1, r1, n = 22) {
  const ux = dx, uy = cy1 - cy0;
  const d = Math.hypot(ux, uy);
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(r0 * r0 - a * a);
  const ex = ux / d, ey = uy / d;
  const p1 = [a * ex - h * ey, cy0 + a * ey + h * ex];
  const p2 = [a * ex + h * ey, cy0 + a * ey - h * ex];
  const ang = (cx, cy, p) => Math.atan2(p[1] - cy, p[0] - cx);
  let o0 = ang(0, cy0, p1), o1 = ang(0, cy0, p2);
  while (o1 <= o0) o1 += Math.PI * 2;
  let i0 = ang(dx, cy1, p2), i1 = ang(dx, cy1, p1);
  while (i1 >= i0) i1 -= Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = o0 + (o1 - o0) * i / n;
    pts.push([r0 * Math.cos(t), cy0 + r0 * Math.sin(t)]);
  }
  for (let i = 1; i < n; i++) {
    const t = i0 + (i1 - i0) * i / n;
    pts.push([dx + r1 * Math.cos(t), cy1 + r1 * Math.sin(t)]);
  }
  return pts;
}

const RAW = [
  {
    id: 'fox', name: '여우', pivot: [0, 4.6],
    rings: [
      { pts: [[12.4, 8.3], [11.6, 7.7], [9.4, 7.2], [8.0, 6.3], [7.3, 5.0],
        [8.1, 2.6], [8.9, 0.5], [9.6, 0.0], [8.3, 0.0], [7.6, 2.5], [6.6, 4.3],
        [6.0, 4.2], [5.6, 2.2], [5.2, 0.4], [5.6, 0.0], [4.3, 0.0], [4.4, 2.2], [4.5, 4.0],
        [2.0, 4.3], [-1.4, 4.6],
        [-1.0, 2.6], [-0.6, 0.4], [0.0, 0.0], [-1.4, 0.0], [-2.1, 2.0], [-2.6, 3.6],
        [-3.2, 3.8], [-3.6, 2.4], [-4.9, 1.4], [-4.8, 0.3], [-4.2, 0.0], [-5.8, 0.0], [-6.4, 1.4],
        [-6.6, 2.6], [-7.0, 5.0],
        [-8.2, 6.0], [-11.0, 5.2], [-14.2, 5.4], [-16.4, 6.6],
        [-13.8, 8.8], [-10.5, 9.4], [-7.2, 8.7],
        [-3.5, 9.0], [1.0, 8.8], [4.6, 9.3],
        [6.0, 10.6], [6.1, 13.2], [7.2, 11.4], [7.8, 13.6], [8.8, 11.0], [9.8, 9.9], [11.0, 9.0]] },
      { hole: true, pts: [[9.0, 9.9], [9.9, 10.3], [9.7, 9.7]] },
      { hole: true, pts: [[-14.0, 8.3], [-13.4, 6.8], [-14.0, 5.9], [-14.4, 6.0], [-13.85, 6.8], [-14.45, 8.35]] },
      { hole: true, pts: [[-2.8, 6.8], [0.6, 6.3], [3.6, 6.9], [0.6, 6.75]] },
      { hole: true, pts: [[-5.7, 6.2], [-4.3, 5.3], [-4.05, 5.6], [-5.45, 6.5]] },
    ],
  },
  {
    id: 'bearer', name: '등불 든 사람', pivot: [0, 10],
    rings: [
      { pts: [[-4.6, 22.4], [-0.4, 26.2], [4.2, 22.6], [4.0, 22.0], [2.6, 22.1], [3.4, 20.8], [2.7, 20.6],
        [2.8, 19.8], [1.6, 19.3], [1.6, 18.6],
        [2.4, 18.4], [5.0, 17.4], [5.7, 17.0], [5.5, 16.2], [4.6, 16.2], [2.5, 16.6],
        [2.5, 15.8], [3.0, 9.0], [3.9, 3.6],
        [2.1, 3.6], [2.7, 0.7], [3.9, 0.5], [3.9, 0.0], [1.6, 0.0], [1.1, 3.6],
        [-0.4, 3.6], [-1.3, 0.0], [-3.3, 0.0], [-2.7, 0.8], [-2.0, 3.6],
        [-4.4, 3.6], [-3.5, 10.0], [-3.1, 16.0], [-2.6, 18.6], [-1.6, 19.2], [-1.8, 21.6],
        [-2.4, 22.0], [-4.4, 21.9]] },
      { hole: true, pts: [[1.9, 21.2], [2.5, 21.45], [2.4, 21.0]] },
      { hole: true, pts: [[-2.4, 23.2], [2.0, 23.35], [1.95, 23.8], [-2.35, 23.65]] },
      { hole: true, pts: [[-2.7, 11.0], [2.2, 11.0], [2.2, 11.45], [-2.7, 11.45]] },
      { hole: true, pts: diamond(1.5, 13.9, 0.5) },
      { hole: true, pts: diamond(1.85, 8.1, 0.5) },
      { pts: quad([5.3, 16.8], [12.4, 21.0], 0.5) },
      { pts: quad([12.2, 21.1], [12.2, 18.6], 0.3) },
      { pts: [[11.4, 18.9], [13.0, 18.9], [13.6, 17.8], [13.9, 15.8], [13.5, 14.0], [12.9, 13.4],
        [11.5, 13.4], [10.9, 14.0], [10.5, 15.8], [10.8, 17.8]] },
      { hole: true, pts: rect(11.2, 14.5, 11.95, 17.3) },
      { hole: true, pts: rect(12.45, 14.5, 13.2, 17.3) },
      { pts: [[11.95, 13.5], [12.45, 13.5], [12.6, 11.9], [11.8, 11.9]] },
    ],
  },
  {
    id: 'house', name: '집', pivot: [0, 5],
    rings: [
      { pts: [[-8.6, 0], [8.6, 0], [8.6, 0.9], [8.0, 0.9], [8.0, 9.8], [10.6, 9.8], [10.6, 10.5],
        [6.6, 13.78], [6.6, 18.4], [6.9, 18.4], [6.9, 19.3], [4.3, 19.3], [4.3, 18.4], [4.6, 18.4], [4.6, 15.42],
        [0, 19.2], [-10.6, 10.5], [-10.6, 9.8], [-8.0, 9.8], [-8.0, 0.9], [-8.6, 0.9]] },
      { hole: true, pts: [[1.6, 0.9], [4.6, 0.9], [4.6, 5.8], [3.1, 6.9], [1.6, 5.8]] },
      { hole: true, pts: rect(-6.4, 4.2, -4.65, 5.85) },
      { hole: true, pts: rect(-4.15, 4.2, -2.4, 5.85) },
      { hole: true, pts: rect(-6.4, 6.35, -4.65, 8.0) },
      { hole: true, pts: rect(-4.15, 6.35, -2.4, 8.0) },
      { hole: true, pts: diamond(0, 14.2, 1.3) },
    ],
  },
  {
    id: 'pine', name: '소나무', pivot: [0, 6],
    rings: [
      { pts: [[-2.4, 0], [2.4, 0], [1.6, 1.0], [1.9, 4.0], [3.0, 8.0], [3.0, 11.5], [1.6, 15.5], [1.0, 19.0],
        [1.6, 23.0], [1.1, 25.5], [-0.4, 25.5], [-0.2, 23.0], [-0.6, 19.0], [0.0, 15.5], [1.2, 11.5],
        [1.2, 8.0], [0.2, 4.0], [-0.9, 1.0]] },
      { hole: true, pts: diamond(2.1, 9.6, 0.38) },
      { pts: quad([2.2, 10.4], [-5.4, 12.4], 1.0) },
      { pts: quad([1.0, 17.0], [6.2, 18.8], 0.9) },
      { pts: quad([0.4, 21.6], [-3.8, 22.8], 0.7) },
      { pts: fan(-5.6, 12.4, 6.0, 3.2) },
      { pts: fan(5.8, 18.8, 5.4, 3.0) },
      { pts: fan(-3.6, 22.8, 4.2, 2.5, 7) },
      { pts: fan(1.0, 25.9, 3.8, 2.8, 7) },
    ],
  },
  {
    id: 'boat', name: '배', pivot: [0, 2],
    rings: [
      { pts: [[-15.0, 5.6], [-12.5, 4.0], [12.0, 4.0], [15.6, 6.6], [14.2, 3.4], [11.2, 0.7], [8.0, 0.0],
        [-9.0, 0.0], [-12.2, 1.0], [-14.2, 3.2]] },
      { hole: true, pts: [[-11.6, 2.9], [11.2, 2.9], [11.0, 3.35], [-11.4, 3.35]] },
      { hole: true, pts: diamond(-6, 1.6, 0.55) },
      { hole: true, pts: diamond(-1, 1.6, 0.55) },
      { hole: true, pts: diamond(4, 1.6, 0.55) },
      { pts: quad([-5.6, 8.0], [-16.6, -1.2], 0.6) },
      { pts: [[-16.0, -0.4], [-17.2, -1.6], [-19.6, -3.8], [-18.0, -4.4], [-16.4, -2.2]] },
      { pts: rect(12.6, 4.0, 13.1, 9.8) },
      { pts: [[13.1, 9.8], [16.4, 9.0], [13.1, 8.2]] },
    ],
  },
  {
    id: 'moon', name: '달', pivot: [0, 1.0],
    rings: [
      { pts: crescent(5.2, 5.2, 2.4, 6.4, 4.4) },
      { hole: true, pts: [[-4.3, 6.5], [-3.55, 5.95], [-2.8, 6.5], [-3.55, 6.25]] },
    ],
  },
];

const area = (pts) => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return a / 2;
};

function build(p) {
  const [px, py] = p.pivot;
  const rings = p.rings.map((r) => {
    let pts = r.pts.map(([x, y]) => [x - px, y - py]);
    const a = area(pts);
    if ((!r.hole && a < 0) || (r.hole && a > 0)) pts = pts.slice().reverse();
    return { hole: !!r.hole, pts };
  });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (const [x, y] of r.pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { id: p.id, name: p.name, rings, foot: -py, box: [x0, y0, x1, y1] };
}

export const SHAPES = RAW.map(build);
export const SHAPE = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

// SVG path (y flipped) for the parts list drawings.
export function svgPath(shape) {
  return shape.rings.map((r) => 'M' + r.pts.map(([x, y]) => `${x.toFixed(2)} ${(-y).toFixed(2)}`).join('L') + 'Z').join('');
}
