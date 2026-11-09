// Foot outlines and the numbers a maker reads from them. All coordinates are millimetres on a sheet
// of pattern card 210 wide and 330 tall, toes up, heel resting on a line at y = HEEL_Y.

export const SHEET_W = 210;
export const SHEET_H = 330;
export const HEEL_Y = 310;
export const AXIS_X = 105;
export const N = 160; // points in every outline

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Closed Catmull-Rom through control points, `per` samples per segment.
export function spline(pts, per = 14) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t
        + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  return out;
}

// Equal-spacing resample. closed: the result has `count` points spread over the whole loop.
export function resample(pts, count, closed = true) {
  const src = closed ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < src.length; i++) cum.push(cum[i - 1] + dist(src[i - 1], src[i]));
  const total = cum[cum.length - 1];
  const out = [];
  const steps = closed ? count : count - 1;
  let j = 1;
  for (let k = 0; k < count; k++) {
    const d = total * k / steps;
    while (j < cum.length - 1 && cum[j] < d) j++;
    const seg = cum[j] - cum[j - 1] || 1;
    const t = Math.min(1, Math.max(0, (d - cum[j - 1]) / seg));
    out.push([src[j - 1][0] + (src[j][0] - src[j - 1][0]) * t, src[j - 1][1] + (src[j][1] - src[j - 1][1]) * t]);
  }
  return out;
}

export function perimeter(pts, closed = true) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return closed ? s + dist(pts[pts.length - 1], pts[0]) : s;
}

export function area(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function smooth(pts, passes = 2) {
  let cur = pts;
  for (let p = 0; p < passes; p++) {
    const n = cur.length;
    cur = cur.map((_, i) => {
      const a = cur[(i - 2 + n) % n], b = cur[(i - 1 + n) % n], c = cur[i], d = cur[(i + 1) % n], e = cur[(i + 2) % n];
      return [(a[0] + 2 * b[0] + 3 * c[0] + 2 * d[0] + e[0]) / 9, (a[1] + 2 * b[1] + 3 * c[1] + 2 * d[1] + e[1]) / 9];
    });
  }
  return cur;
}

// ---- sample feet ---------------------------------------------------------------------------------
// A right foot seen from above, toes up. x is a fraction of the ball width (medial side negative),
// y a fraction of the length from the heel. Toe tips differ between the three samples.
const TOE_X = [-0.255, -0.06, 0.1, 0.222, 0.342];
const TOE_HW = [0.1, 0.042, 0.038, 0.034, 0.036];

function template(tips) {
  const pts = [
    [0, 0], [-0.15, 0.01], [-0.26, 0.045], [-0.32, 0.105], [-0.345, 0.18], [-0.355, 0.28], [-0.378, 0.4],
    [-0.428, 0.52], [-0.488, 0.63], [-0.522, 0.72], [-0.528, 0.79], [-0.5, 0.865], [-0.44, 0.93],
  ];
  for (let i = 0; i < 5; i++) {
    const cx = TOE_X[i], hw = TOE_HW[i], tip = tips[i];
    const lead = i === 0 ? 0.6 : 0.75;
    pts.push([cx - hw * lead, tip - (i === 0 ? 0.01 : 0.006)], [cx, tip], [cx + hw * 0.75, tip - 0.008]);
    if (i < 4) {
      const nx = (cx + hw + TOE_X[i + 1] - TOE_HW[i + 1]) / 2;
      pts.push([nx, Math.min(tip, tips[i + 1]) - 0.009]);
    }
  }
  pts.push([0.405, tips[4] - 0.04], [0.45, 0.75], [0.472, 0.68], [0.468, 0.6], [0.448, 0.5], [0.418, 0.4],
    [0.384, 0.29], [0.352, 0.19], [0.318, 0.11], [0.258, 0.045], [0.15, 0.01]);
  return pts;
}

export const SAMPLES = [
  { id: 'a', name: '엄지가 긴 발', length: 244, width: 89, tips: [1.0, 0.972, 0.938, 0.898, 0.842] },
  { id: 'b', name: '둘째 발가락이 긴 발', length: 258, width: 99, tips: [0.984, 1.0, 0.962, 0.922, 0.862] },
  { id: 'c', name: '볼이 넓은 발', length: 266, width: 112, tips: [1.0, 0.994, 0.972, 0.94, 0.884] },
];

export function sampleOutline(sample) {
  const ctrl = template(sample.tips).map(([x, y]) => [AXIS_X + x * sample.width, HEEL_Y - y * sample.length]);
  const pts = resample(smooth(resample(spline(ctrl), N * 2), 3), N);
  return fitTo(orderFromHeel(pts), sample.length, sample.width);
}

// ---- measuring -----------------------------------------------------------------------------------
// Width of the outline across a horizontal line at height y (outline is upright).
function chordAt(pts, y) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    if ((p[1] - y) * (q[1] - y) > 0 || p[1] === q[1]) continue;
    const x = p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
    lo = Math.min(lo, x); hi = Math.max(hi, x);
  }
  return hi > lo ? [lo, hi] : null;
}

export function bounds(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

export function measure(pts) {
  const b = bounds(pts);
  const length = b.h;
  let ball = { w: 0, y: b.y1 - length * 0.7, lo: b.x0, hi: b.x1 };
  for (let k = 0; k <= 40; k++) {
    const y = b.y1 - length * (0.6 + 0.2 * k / 40);
    const c = chordAt(pts, y);
    if (c && c[1] - c[0] > ball.w) ball = { w: c[1] - c[0], y, lo: c[0], hi: c[1] };
  }
  const width = ball.w;
  const instepY = b.y1 - length * 0.5;
  const instep = chordAt(pts, instepY) || [b.x0, b.x1];
  const girth = 2.05 * width + 0.16 * length;
  const lastLen = Math.ceil((length + 6) / 5) * 5;
  const r = width / length;
  const grade = r < 0.365 ? { name: '좁은 볼', code: 'D' } : r < 0.395 ? { name: '보통 볼', code: 'E' }
    : r < 0.425 ? { name: '넓은 볼', code: '2E' } : { name: '아주 넓은 볼', code: '3E' };
  return {
    length, width, girth, lastLen, grade, inRange: length >= 220 && length <= 300,
    box: b, ball, instep: { y: instepY, lo: instep[0], hi: instep[1] },
  };
}

// Scale an upright outline about its heel so it measures `length` by `width`.
export function fitTo(pts, length, width) {
  const m = measure(pts);
  const sy = length / m.length, sx = width / m.width;
  const cx = (m.ball.lo + m.ball.hi) / 2;
  return pts.map(([x, y]) => [AXIS_X + (x - cx) * sx, HEEL_Y - (m.box.y1 - y) * sy]);
}

// Start the loop at the heel and run it the same way round as the samples (medial side first, i.e.
// toward -x from the heel, which is counter-clockwise on screen with y down: positive signed area).
function orderFromHeel(pts) {
  let p = area(pts) < 0 ? [...pts].reverse() : pts;
  const b = bounds(p);
  const cx = (b.x0 + b.x1) / 2;
  let best = 0, score = Infinity;
  p.forEach(([x, y], i) => {
    const s = (b.y1 - y) * 3 + Math.abs(x - cx);
    if (s < score) { score = s; best = i; }
  });
  p = [...p.slice(best), ...p.slice(0, best)];
  return p;
}

// ---- drawn outlines ------------------------------------------------------------------------------
// Returns { pts } for an accepted stroke, or { error } with what to do instead.
export function acceptStroke(raw) {
  if (raw.length < 12) return { error: 'short' };
  const len = perimeter(raw, false);
  if (len < 300) return { error: 'short' };
  if (dist(raw[0], raw[raw.length - 1]) > 60) return { error: 'open' };
  let pts = resample(raw, N * 2, true);
  if (Math.abs(area(pts)) < 6000) return { error: 'thin' };
  pts = resample(smooth(pts, 2), N, true);

  // principal axis -> upright
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy); // long axis angle
  const rot = -Math.PI / 2 - theta; // turn the long axis to point up
  const c = Math.cos(rot), s = Math.sin(rot);
  pts = pts.map(([x, y]) => [(x - cx) * c - (y - cy) * s, (x - cx) * s + (y - cy) * c]);

  // toes are the wider end
  const b = bounds(pts);
  const wAt = (f) => { const ch = chordAt(pts, b.y0 + b.h * f); return ch ? ch[1] - ch[0] : 0; };
  const top = wAt(0.22) + wAt(0.3), bottom = wAt(0.7) + wAt(0.78);
  if (bottom > top) pts = pts.map(([x, y]) => [-x, -y]);

  const b2 = bounds(pts);
  if (b2.h > 320) return { error: 'long' };
  pts = pts.map(([x, y]) => [x - (b2.x0 + b2.x1) / 2 + AXIS_X, y - b2.y1 + HEEL_Y]);
  return { pts: orderFromHeel(pts), rotation: rot };
}

// ---- small helpers used by the renderer ----------------------------------------------------------
export const lerp = (a, b, t) => a + (b - a) * t;
export function pathOf(pts, closed = true, view = (p) => p) {
  if (!pts.length) return '';
  let d = '';
  pts.forEach((p, i) => { const [x, y] = view(p); d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); });
  return closed ? d + 'Z' : d;
}
