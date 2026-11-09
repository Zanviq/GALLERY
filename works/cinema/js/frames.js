// Draws the film's frames. Every picture is built from grey shapes in a 300 x 200 space, then gets
// halation (only around its light sources) and grain (only inside the frame). No photographs.
import { FRAMES } from './data.js';

export const FW = 300;
export const FH = 200;
export const DISPLAY = "'Diphylleia', serif";
export const SANS = "'Jeommyeol Sans', sans-serif";

const G = (v, a = 1) => (a >= 1 ? `rgb(${v},${v},${v})` : `rgba(${v},${v},${v},${a})`);
const lerp = (a, b, t) => a + (b - a) * t;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- shape helpers ----------

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glow(L, x, y, r, v = 255, a = 1) {
  const g = L.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, G(v, a));
  g.addColorStop(0.35, G(v, a * 0.55));
  g.addColorStop(1, G(v, 0));
  L.fillStyle = g;
  L.fillRect(x - r, y - r, r * 2, r * 2);
}

function rain(ctx, rnd, n, { x0 = 0, x1 = FW, y0 = 0, y1 = FH, len = 14, slant = -2.5, v = 200, a = 0.16, w = 0.5 } = {}) {
  ctx.strokeStyle = G(v, a);
  ctx.lineWidth = w;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, rnd());
    const y = lerp(y0, y1, rnd());
    const l = len * (0.6 + rnd() * 0.8);
    ctx.moveTo(x, y);
    ctx.lineTo(x + slant * (l / len), y + l);
  }
  ctx.stroke();
}

// rain that shows only inside a light cone (apex at x,y, spreading to half-width hw at ground gy)
function coneRain(ctx, rnd, n, x, y, hw, gy, a = 0.5) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.lineTo(x + 3, y);
  ctx.lineTo(x + hw, gy);
  ctx.lineTo(x - hw, gy);
  ctx.closePath();
  ctx.clip();
  rain(ctx, rnd, n, { x0: x - hw, x1: x + hw, y0: y, y1: gy, len: 11, v: 235, a, w: 0.55 });
  ctx.restore();
}

function cone(ctx, x, y, hw, gy, a = 0.09) {
  const g = ctx.createLinearGradient(0, y, 0, gy);
  g.addColorStop(0, G(255, a));
  g.addColorStop(1, G(255, a * 0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.lineTo(x + 3, y);
  ctx.lineTo(x + hw, gy);
  ctx.lineTo(x - hw, gy);
  ctx.closePath();
  ctx.fill();
}

// A standing figure seen from the front or back. Feet at (x, y), height h.
function person(ctx, x, y, h, { cap = false, bob = false, lean = 0 } = {}) {
  const s = h;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.915, s * 0.06, s * 0.074, 0, 0, Math.PI * 2);
  ctx.fill();
  if (bob) {
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.9, s * 0.074, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (cap) {
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.955, s * 0.066, s * 0.04, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-s * 0.09, -s * 0.952, s * 0.18, s * 0.014);
  }
  ctx.beginPath();
  ctx.moveTo(-s * 0.028, -s * 0.85);
  ctx.quadraticCurveTo(-s * 0.05, -s * 0.825, -s * 0.12, -s * 0.8);
  ctx.quadraticCurveTo(-s * 0.152, -s * 0.785, -s * 0.152, -s * 0.71);
  ctx.lineTo(-s * 0.162, -s * 0.44);
  ctx.lineTo(-s * 0.142, -s * 0.31);
  ctx.lineTo(-s * 0.062, -s * 0.31);
  ctx.lineTo(-s * 0.068, -s * 0.02);
  ctx.lineTo(-s * 0.016, 0);
  ctx.lineTo(-s * 0.006, -s * 0.27);
  ctx.lineTo(s * 0.006, -s * 0.27);
  ctx.lineTo(s * 0.016, 0);
  ctx.lineTo(s * 0.068, -s * 0.02);
  ctx.lineTo(s * 0.062, -s * 0.31);
  ctx.lineTo(s * 0.142, -s * 0.31);
  ctx.lineTo(s * 0.162, -s * 0.44);
  ctx.lineTo(s * 0.152, -s * 0.71);
  ctx.quadraticCurveTo(s * 0.152, -s * 0.785, s * 0.12, -s * 0.8);
  ctx.quadraticCurveTo(s * 0.05, -s * 0.825, s * 0.028, -s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A figure in profile facing right, from the waist up. (x, y) = waist front, h = waist to crown.
// reach: 0 arm down, 1 arm raised forward to (tx, ty).
function profile(ctx, x, y, h, reach = 0, tx = 0, ty = 0) {
  const s = h;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.36, y + 2);
  ctx.lineTo(x - s * 0.34, y - s * 0.5);
  ctx.quadraticCurveTo(x - s * 0.33, y - s * 0.66, x - s * 0.2, y - s * 0.7); // back of shoulder
  ctx.lineTo(x - s * 0.14, y - s * 0.73); // nape
  ctx.quadraticCurveTo(x - s * 0.24, y - s * 0.86, x - s * 0.16, y - s * 0.97); // back of head (hair)
  ctx.quadraticCurveTo(x - s * 0.06, y - s * 1.04, x + s * 0.04, y - s * 0.96); // crown to brow
  ctx.lineTo(x + s * 0.06, y - s * 0.9); // brow
  ctx.lineTo(x + s * 0.08, y - s * 0.86); // nose
  ctx.lineTo(x + s * 0.055, y - s * 0.84);
  ctx.lineTo(x + s * 0.06, y - s * 0.8); // lips
  ctx.lineTo(x + s * 0.035, y - s * 0.77); // chin
  ctx.lineTo(x - s * 0.02, y - s * 0.74); // throat
  ctx.quadraticCurveTo(x - s * 0.01, y - s * 0.66, x + s * 0.06, y - s * 0.6); // chest
  ctx.lineTo(x + s * 0.02, y - s * 0.3);
  ctx.lineTo(x + s * 0.0, y + 2);
  ctx.closePath();
  ctx.fill();
  // arm
  const sx = x - s * 0.17, sy = y - s * 0.62;
  ctx.lineCap = 'round';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = s * 0.085;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  if (reach <= 0) {
    ctx.quadraticCurveTo(sx - s * 0.02, y - s * 0.3, sx + s * 0.06, y - s * 0.08);
  } else {
    const ex = lerp(sx + s * 0.05, (sx + tx) / 2, reach), ey = lerp(y - s * 0.32, (sy + ty) / 2 + s * 0.08, reach);
    const hx = lerp(sx + s * 0.1, tx, reach), hy = lerp(y - s * 0.12, ty, reach);
    ctx.quadraticCurveTo(ex, ey, hx, hy);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// A hand seen from above, fingers pointing along -y before rotation. Wrist at (x, y).
function hand(ctx, x, y, s, rot, { tone = 150, point = false, mirror = false, fingers = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (mirror) ctx.scale(-1, 1);
  const g = ctx.createLinearGradient(0, s * 0.9, 0, -s * 1.9);
  g.addColorStop(0, G(Math.round(tone * 0.55)));
  g.addColorStop(0.5, G(tone));
  g.addColorStop(1, G(Math.round(tone * 0.8)));
  ctx.fillStyle = g;
  ctx.strokeStyle = G(Math.round(tone * 0.45));
  ctx.lineWidth = s * 0.025;
  // forearm, sleeve beyond
  rrect(ctx, -s * 0.36, -s * 0.1, s * 0.72, s * 1.9, s * 0.2);
  ctx.fill();
  // palm
  rrect(ctx, -s * 0.42, -s * 1.0, s * 0.84, s * 1.06, s * 0.28);
  ctx.fill();
  // fingers lie together, resting on the page
  const lens = [0.56, 0.68 * fingers, 0.64 * fingers, 0.5 * fingers];
  const xs = [-0.3, -0.1, 0.1, 0.29];
  for (let i = 0; i < 4; i++) {
    const w = s * 0.195, l = s * lens[i];
    rrect(ctx, s * xs[i] - w / 2, -s * 0.9 - l, w, l + s * 0.1, w / 2);
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = s * (xs[i] + xs[i + 1]) / 2;
    ctx.moveTo(x, -s * 0.92);
    ctx.lineTo(x, -s * (0.92 + Math.min(lens[i], lens[i + 1]) * 0.85));
  }
  ctx.stroke();
  // thumb, tucked along the side
  ctx.save();
  ctx.translate(-s * 0.38, -s * 0.34);
  ctx.rotate(-0.42);
  rrect(ctx, -s * 0.1, -s * 0.5, s * 0.2, s * 0.56, s * 0.1);
  ctx.fill();
  ctx.restore();
  // sleeve
  ctx.fillStyle = G(Math.round(tone * 0.22));
  ctx.fillRect(-s * 0.5, s * 0.55, s * 1.0, s * 1.6);
  ctx.restore();
}

// A hand pointing with the index finger. Fingertip at (x, y); `ang` points from the tip back to the wrist.
function pointer(ctx, x, y, s, ang, tone = 150) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.45);
  g.addColorStop(0, G(Math.min(255, Math.round(tone * 1.12))));
  g.addColorStop(1, G(Math.round(tone * 0.62)));
  ctx.fillStyle = g;
  ctx.strokeStyle = G(Math.round(tone * 0.45));
  ctx.lineWidth = s * 0.02;
  // index finger
  rrect(ctx, 0, -s * 0.11, s * 0.86, s * 0.22, s * 0.11);
  ctx.fill();
  // fist with curled fingers underneath
  rrect(ctx, s * 0.66, -s * 0.2, s * 0.72, s * 0.6, s * 0.2);
  ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(s * (0.74 + i * 0.16), s * 0.4);
    ctx.quadraticCurveTo(s * (0.8 + i * 0.16), s * 0.2, s * (0.86 + i * 0.16), s * 0.4);
  }
  ctx.stroke();
  // thumb along the top of the fist
  rrect(ctx, s * 0.62, -s * 0.3, s * 0.48, s * 0.17, s * 0.085);
  ctx.fill();
  ctx.stroke();
  // sleeve
  ctx.fillStyle = G(Math.round(tone * 0.2));
  rrect(ctx, s * 1.3, -s * 0.3, s * 4, s * 0.78, s * 0.08);
  ctx.fill();
  ctx.restore();
}

function sky(ctx, top, bottom, y1 = FH) {
  const g = ctx.createLinearGradient(0, 0, 0, y1);
  g.addColorStop(0, G(top));
  g.addColorStop(1, G(bottom));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FW, y1);
}

function windowPane(ctx, x, y, w, h, lit, srnd) {
  if (lit > 0) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, G(Math.round(lerp(20, 222, lit))));
    g.addColorStop(1, G(Math.round(lerp(18, 182, lit))));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = G(13);
  }
  ctx.fillRect(x, y, w, h);
  if (lit > 0.2) {
    // curtain pulled to one side
    ctx.fillStyle = G(Math.round(lerp(14, 128, lit)), 0.85);
    const side = srnd() < 0.5;
    ctx.fillRect(side ? x : x + w * 0.66, y, w * 0.34, h);
  }
  ctx.fillStyle = G(30);
  ctx.fillRect(x + w / 2 - 0.5, y, 1, h);
  ctx.fillRect(x, y + h * 0.42, w, 1);
}

// ---------- scenes ----------

const SCENES = {
  building(ctx, L, k, rnd, srnd) {
    sky(ctx, 8, 30, 150);
    // hill
    ctx.fillStyle = G(7);
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.bezierCurveTo(60, 128, 120, 140, 170, 132);
    ctx.bezierCurveTo(220, 124, 260, 136, 300, 128);
    ctx.lineTo(300, 200);
    ctx.lineTo(0, 200);
    ctx.fill();
    // block, front and side
    const bw = ctx.createLinearGradient(0, 34, 0, 176);
    bw.addColorStop(0, G(15));
    bw.addColorStop(1, G(27));
    ctx.fillStyle = bw;
    ctx.fillRect(48, 34, 196, 142);
    const bl = ctx.createRadialGradient(272, 150, 4, 272, 150, 120);
    bl.addColorStop(0, G(255, 0.1));
    bl.addColorStop(1, G(255, 0));
    ctx.fillStyle = bl;
    ctx.fillRect(48, 34, 220, 142);
    ctx.fillStyle = G(6, 0.5);
    for (let r = 0; r < 5; r++) ctx.fillRect(48, 64 + r * 26, 196, 2);
    ctx.fillStyle = G(12);
    ctx.beginPath();
    ctx.moveTo(244, 34);
    ctx.lineTo(268, 42);
    ctx.lineTo(268, 176);
    ctx.lineTo(244, 176);
    ctx.fill();
    ctx.fillStyle = G(26);
    ctx.fillRect(46, 30, 200, 5);
    // windows: 5 floors x 6
    const rows = [44, 70, 96, 122, 148];
    const litMap = [
      [0, 1, 0, 0, 2, 0],
      [1, 0, 2, 1, 0, 0],
      [0, 0, 1, 0, 0, 2],
      [2, 1, 0, 0, 1, 0],
      [0, 0, 0, 2, 0, 1],
    ];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        const x = 58 + c * 31, y = rows[r];
        let s = litMap[r][c];
        if (k === 2 && r === 3 && c === 1) s = 0;
        const lit = s === 1 ? 1 : s === 2 ? 0.45 : 0;
        windowPane(ctx, x, y, 20, 15, lit, srnd);
        if (lit) glow(L, x + 10, y + 7, 13 * lit, 255, 0.9 * lit);
        // balcony rail
        ctx.fillStyle = G(34);
        ctx.fillRect(x - 3, y + 17, 26, 1.2);
      }
    }
    // the end window on the 4th floor (row index 1, last column) stays dark: a faint sash only
    ctx.strokeStyle = G(40);
    ctx.lineWidth = 0.6;
    ctx.strokeRect(213.5, 70.5, 20, 15);
    // street lamp in front
    ctx.fillStyle = G(26);
    ctx.fillRect(281, 118, 1.6, 82);
    ctx.fillRect(272, 117, 10, 1.4);
    ctx.fillStyle = G(250);
    ctx.beginPath();
    ctx.ellipse(272, 119.5, 3, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    glow(L, 272, 120, 26, 255, 1);
    cone(ctx, 272, 120, 34, 200, 0.06);
    // road sheen
    ctx.fillStyle = G(60, 0.25);
    ctx.fillRect(250, 186, 46, 2);
    rain(ctx, rnd, 170, { a: 0.15 });
    coneRain(ctx, rnd, 50, 272, 120, 34, 200, 0.45);
  },

  stairs(ctx, L, k, rnd, srnd) {
    const on = k > 0 ? 1 : 0;
    const bx = 244, by = 30;
    ctx.fillStyle = G(on ? 58 : 12);
    ctx.fillRect(0, 0, FW, FH);
    if (on) {
      const g = ctx.createRadialGradient(bx, by, 4, bx, by, 260);
      g.addColorStop(0, G(150));
      g.addColorStop(0.4, G(70));
      g.addColorStop(1, G(22));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, FW, FH);
    }
    // stair mass: 12 steps from bottom-left to top-right
    const n = 12, x0 = 6, y0 = 196, sw = 19.5, sh = 9.8;
    ctx.fillStyle = G(on ? 30 : 8);
    ctx.beginPath();
    ctx.moveTo(x0, FH);
    for (let i = 0; i < n; i++) {
      ctx.lineTo(x0 + i * sw, y0 - (i + 1) * sh);
      ctx.lineTo(x0 + (i + 1) * sw, y0 - (i + 1) * sh);
    }
    ctx.lineTo(300, y0 - n * sh);
    ctx.lineTo(300, FH);
    ctx.closePath();
    ctx.fill();
    // tread edges
    ctx.fillStyle = G(on ? 128 : 20);
    for (let i = 0; i < n; i++) ctx.fillRect(x0 + i * sw, y0 - (i + 1) * sh - 0.6, sw, 1.2);
    // landing and door
    ctx.fillStyle = G(on ? 44 : 10);
    ctx.fillRect(258, 26, 34, y0 - n * sh - 26);
    ctx.fillStyle = G(on ? 90 : 18);
    ctx.fillRect(286, 60, 2, 3);
    // balusters and rail
    const rail = (xx) => y0 - ((xx - x0) / sw) * sh - 34;
    ctx.strokeStyle = G(on ? 16 : 6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const xx = x0 + i * sw + sw * 0.5;
      ctx.moveTo(xx, y0 - (i + 1) * sh);
      ctx.lineTo(xx, rail(xx));
    }
    ctx.stroke();
    if (on) {
      // baluster shadows thrown on the wall, away from the bulb
      ctx.strokeStyle = G(0, 0.22);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const xx = x0 + i * sw + sw * 0.5, yy = rail(xx);
        const dx = xx - bx, dy = yy - by, d = Math.hypot(dx, dy);
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + (dx / d) * 30, yy + (dy / d) * 30 - 30);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = G(on ? 170 : 26);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x0, rail(x0));
    ctx.lineTo(258, rail(258));
    ctx.stroke();
    // figure climbing (from behind)
    const step = [1, 3, 7][k];
    const fx = x0 + step * sw + sw * 0.5, fy = y0 - (step + 1) * sh;
    ctx.fillStyle = G(on ? 6 : 4);
    person(ctx, fx, fy, 66, { bob: true, lean: 0.08 });
    // bulb
    ctx.fillStyle = G(on ? 30 : 16);
    ctx.fillRect(bx - 0.6, 0, 1.2, by - 5);
    ctx.fillStyle = G(on ? 255 : 46);
    ctx.beginPath();
    ctx.ellipse(bx, by, 3.4, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (on) glow(L, bx, by, 34, 255, 1);
  },

  room(ctx, L, k, rnd, srnd) {
    ctx.fillStyle = G(24);
    ctx.fillRect(0, 0, FW, FH);
    // floor
    ctx.fillStyle = G(15);
    ctx.fillRect(0, 150, FW, 50);
    ctx.fillStyle = G(32);
    ctx.fillRect(0, 150, FW, 1);
    // window with the night outside
    const wx = 150, wy = 32, ww = 104, wh = 92;
    const og = ctx.createRadialGradient(232, 112, 2, 232, 112, 90);
    og.addColorStop(0, G(120));
    og.addColorStop(0.3, G(52));
    og.addColorStop(1, G(26));
    ctx.fillStyle = og;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    rain(ctx, rnd, 60, { x0: wx, x1: wx + ww, y0: wy, y1: wy + wh, v: 200, a: 0.3, len: 9 });
    ctx.restore();
    glow(L, 232, 112, 18, 255, 0.8);
    ctx.fillStyle = G(9);
    ctx.fillRect(wx - 4, wy - 4, ww + 8, 4);
    ctx.fillRect(wx - 4, wy + wh, ww + 8, 5);
    ctx.fillRect(wx - 4, wy, 4, wh);
    ctx.fillRect(wx + ww, wy, 4, wh);
    ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
    // window light on the floor
    ctx.fillStyle = G(255, 0.06);
    ctx.beginPath();
    ctx.moveTo(150, 150);
    ctx.lineTo(254, 150);
    ctx.lineTo(236, 200);
    ctx.lineTo(108, 200);
    ctx.fill();
    // boxes
    const box = (x, y, w, h, v) => {
      ctx.fillStyle = G(v);
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = G(v + 16);
      ctx.fillRect(x, y, w, 1.5);
      ctx.fillStyle = G(v - 12);
      ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
    };
    box(36, 120, 46, 34, 40);
    box(42, 92, 38, 28, 46);
    box(86, 128, 34, 26, 36);
    // table with a notebook
    ctx.fillStyle = G(12);
    ctx.fillRect(116, 118, 4, 34);
    ctx.fillRect(122, 112, 2, 40);
    ctx.fillStyle = G(30);
    ctx.fillRect(104, 110, 40, 3);
    ctx.fillStyle = G(120);
    ctx.fillRect(112, 106, 14, 4);
    // chair facing the window
    ctx.fillStyle = G(6);
    const cx = 196;
    ctx.fillRect(cx - 16, 112, 3, 44);
    ctx.fillRect(cx + 13, 112, 3, 44);
    ctx.fillRect(cx - 16, 112, 32, 4);
    ctx.fillRect(cx - 16, 124, 32, 2);
    ctx.fillRect(cx - 18, 136, 36, 4);
    ctx.fillRect(cx - 16, 140, 2, 18);
    ctx.fillRect(cx + 14, 140, 2, 18);
    // doorway on the left
    if (k === 1) {
      ctx.fillStyle = G(150);
      ctx.fillRect(4, 40, 26, 112);
      glow(L, 17, 96, 30, 255, 0.55);
      ctx.fillStyle = G(5);
      person(ctx, 18, 151, 104, { bob: true });
      ctx.fillStyle = G(255, 0.05);
      ctx.beginPath();
      ctx.moveTo(4, 152);
      ctx.lineTo(30, 152);
      ctx.lineTo(70, 200);
      ctx.lineTo(0, 200);
      ctx.fill();
    } else {
      ctx.fillStyle = G(34);
      ctx.fillRect(4, 40, 26, 112);
      ctx.fillStyle = G(16);
      ctx.fillRect(4, 40, 18, 112);
    }
    if (k === 2) {
      // seated, a silhouette against the window
      ctx.fillStyle = G(5);
      ctx.beginPath();
      ctx.ellipse(cx, 92, 7.2, 8.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, 94, 8.4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 4, 99);
      ctx.quadraticCurveTo(cx - 18, 103, cx - 19, 116);
      ctx.lineTo(cx - 17, 138);
      ctx.lineTo(cx + 17, 138);
      ctx.lineTo(cx + 19, 116);
      ctx.quadraticCurveTo(cx + 18, 103, cx + 4, 99);
      ctx.fill();
    }
  },

  notebook(ctx, L, k, rnd, srnd) {
    ctx.fillStyle = G(32);
    ctx.fillRect(0, 0, FW, FH);
    // wood grain
    ctx.strokeStyle = G(40, 0.8);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const y = i * 8 + srnd() * 4;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + srnd() * 6 - 3, 200, y + srnd() * 6 - 3, 300, y + srnd() * 4 - 2);
    }
    ctx.stroke();
    // lamp light from the upper left
    const lg = ctx.createRadialGradient(60, 10, 10, 60, 10, 280);
    lg.addColorStop(0, G(255, 0.22));
    lg.addColorStop(1, G(0, 0.35));
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, FW, FH);
    ctx.save();
    ctx.translate(152, 104);
    ctx.rotate(-0.06);
    if (k === 0) {
      ctx.fillStyle = G(0, 0.4);
      ctx.fillRect(-52, -36, 108, 80);
      ctx.fillStyle = G(64);
      ctx.fillRect(-55, -40, 108, 80);
      ctx.fillStyle = G(48);
      ctx.fillRect(-55, -40, 8, 80);
      ctx.fillStyle = G(104);
      ctx.fillRect(-20, -12, 44, 14);
    } else {
      ctx.fillStyle = G(0, 0.4);
      ctx.fillRect(-84, -50, 172, 108);
      const pg = ctx.createLinearGradient(-86, 0, 86, 0);
      pg.addColorStop(0, G(190));
      pg.addColorStop(0.46, G(214));
      pg.addColorStop(0.5, G(150));
      pg.addColorStop(0.54, G(214));
      pg.addColorStop(1, G(200));
      ctx.fillStyle = pg;
      ctx.fillRect(-86, -54, 172, 106);
      // ruled lines and the entries: a date, then two small circles
      ctx.strokeStyle = G(160);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const y = -42 + i * 11;
        ctx.moveTo(-80, y);
        ctx.lineTo(-6, y);
        ctx.moveTo(6, y);
        ctx.lineTo(80, y);
      }
      ctx.stroke();
      ctx.strokeStyle = G(52);
      ctx.lineWidth = 0.9;
      const er = rng(404);
      for (let p = 0; p < 2; p++) {
        for (let i = 0; i < 8; i++) {
          const x = p ? 12 : -76, y = -46 + i * 11 + 9;
          ctx.beginPath();
          // date scribble
          ctx.moveTo(x, y - 1);
          for (let j = 1; j < 7; j++) ctx.lineTo(x + j * 2.6, y - 1 - er() * 3.4);
          ctx.stroke();
          if (p === 1 && i > 5) continue; // the last entries are empty
          ctx.beginPath();
          ctx.arc(x + 32, y - 2.4, 2.4, 0, Math.PI * 2);
          ctx.moveTo(x + 41.4, y - 2.4);
          ctx.arc(x + 39, y - 2.4, 2.4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    // hands
    if (k === 0) {
      hand(ctx, 56, 156, 24, 1.2, { tone: 138 });
      hand(ctx, 250, 150, 24, -1.25, { tone: 138, mirror: true });
    } else if (k === 1) {
      hand(ctx, 30, 160, 24, 1.15, { tone: 146 });
      hand(ctx, 276, 152, 24, -1.2, { tone: 146, mirror: true });
    } else {
      hand(ctx, 30, 160, 24, 1.15, { tone: 146 });
      pointer(ctx, 199, 90, 30, 0.95, 156);
    }
  },

  glass(ctx, L, k, rnd, srnd) {
    ctx.fillStyle = G(14);
    ctx.fillRect(0, 0, FW, FH);
    const disc = (x, y, r, v, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, G(v, a));
      g.addColorStop(0.78, G(v, a * 0.85));
      g.addColorStop(1, G(v, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // out-of-focus street below
    const sg = ctx.createLinearGradient(0, 100, 0, 200);
    sg.addColorStop(0, G(14));
    sg.addColorStop(1, G(34));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 100, FW, 100);
    disc(70, 58, 18, 170, 0.5);
    disc(226, 40, 12, 140, 0.45);
    disc(262, 70, 9, 110, 0.4);
    glow(L, 70, 58, 26, 255, 0.55);
    const t = [0.25, 0.6, 1][k];
    const bx = lerp(30, 150, t), by = lerp(150, 160, t), br = lerp(6, 24, t), gap = lerp(12, 60, t);
    disc(bx - gap / 2, by, br, 235, 0.9);
    disc(bx + gap / 2, by, br, 235, 0.9);
    glow(L, bx - gap / 2, by, br * 1.8, 255, 1);
    glow(L, bx + gap / 2, by, br * 1.8, 255, 1);
    // droplets on the glass
    const dr = rng(1313);
    for (let i = 0; i < 90; i++) {
      const x = dr() * FW, y = dr() * FH, r = 0.8 + dr() * dr() * 3.6;
      ctx.fillStyle = G(6, 0.55);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = G(150, 0.7);
      ctx.beginPath();
      ctx.arc(x, y + r * 0.35, r * 0.62, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = G(245);
      ctx.fillRect(x - r * 0.45, y - r * 0.5, Math.max(0.5, r * 0.3), Math.max(0.5, r * 0.3));
    }
    // runnels growing frame by frame
    ctx.strokeStyle = G(170, 0.4);
    ctx.lineWidth = 1.1;
    const rr = rng(77);
    for (let i = 0; i < 7; i++) {
      const x = 20 + rr() * 260, y = rr() * 60, len = 40 + rr() * 50 + k * 22;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 1; j <= 8; j++) ctx.lineTo(x + Math.sin(j * 1.7 + i) * 1.6, y + (len * j) / 8);
      ctx.stroke();
      ctx.fillStyle = G(200, 0.6);
      ctx.beginPath();
      ctx.arc(x + Math.sin(8 * 1.7 + i) * 1.6, y + len, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // window frame at the left and the sill
    ctx.fillStyle = G(5);
    ctx.fillRect(0, 0, 12, FH);
    ctx.fillRect(0, 190, FW, 10);
  },

  stop(ctx, L, k, rnd, srnd) {
    sky(ctx, 6, 20, 150);
    // houses on the slope behind
    ctx.fillStyle = G(10);
    ctx.beginPath();
    ctx.moveTo(0, 96);
    ctx.lineTo(40, 84);
    ctx.lineTo(70, 92);
    ctx.lineTo(70, 80);
    ctx.lineTo(118, 70);
    ctx.lineTo(160, 82);
    ctx.lineTo(210, 66);
    ctx.lineTo(250, 76);
    ctx.lineTo(300, 64);
    ctx.lineTo(300, 150);
    ctx.lineTo(0, 150);
    ctx.fill();
    ctx.fillStyle = G(96);
    ctx.fillRect(132, 76, 4, 3);
    ctx.fillRect(268, 72, 4, 3);
    // road
    const rg = ctx.createLinearGradient(0, 150, 0, 200);
    rg.addColorStop(0, G(18));
    rg.addColorStop(1, G(26));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 150, FW, 50);
    ctx.fillStyle = G(56);
    ctx.fillRect(0, 150, FW, 1.4);
    // street lamp and its cone
    ctx.fillStyle = G(24);
    ctx.fillRect(58, 30, 1.8, 120);
    ctx.fillRect(58, 29, 18, 1.6);
    ctx.fillStyle = G(250);
    ctx.beginPath();
    ctx.ellipse(76, 32, 3.6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    glow(L, 76, 32, 30, 255, 1);
    cone(ctx, 76, 32, 46, 150, 0.08);
    // shelter
    ctx.fillStyle = G(34, 0.55);
    ctx.fillRect(124, 78, 104, 50);
    ctx.fillStyle = G(30);
    ctx.fillRect(118, 72, 116, 6);
    ctx.fillRect(122, 78, 3, 72);
    ctx.fillRect(227, 78, 3, 72);
    ctx.fillRect(132, 128, 84, 3);
    // lit map panel in the shelter
    ctx.fillStyle = G(176);
    ctx.fillRect(196, 84, 24, 38);
    ctx.fillStyle = G(120);
    for (let i = 0; i < 6; i++) ctx.fillRect(199, 89 + i * 5.5, 18, 1);
    glow(L, 208, 103, 22, 255, 0.5);
    // stop sign on a pole
    ctx.fillStyle = G(28);
    ctx.fillRect(99, 52, 1.8, 98);
    ctx.fillStyle = G(222);
    ctx.fillRect(80, 46, 40, 15);
    ctx.fillStyle = G(30);
    ctx.font = `600 7.4px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('소리개고개', 100, 54);
    glow(L, 100, 53, 16, 255, 0.35);
    // the bus coming up the hill from the left
    const t = [0, 0.45, 1][k];
    if (k === 2) {
      ctx.fillStyle = G(12);
      ctx.fillRect(-30, 92, 92, 58);
      ctx.fillStyle = G(48);
      ctx.fillRect(-30, 98, 88, 22);
      ctx.fillStyle = G(70);
      ctx.fillRect(4, 100, 30, 10);
    }
    const hx = lerp(8, 28, t), hy = lerp(140, 138, t), hr = lerp(0.9, 5.5, t), hg = lerp(5, 32, t);
    ctx.fillStyle = G(250);
    for (const x of [hx, hx + hg]) {
      ctx.beginPath();
      ctx.arc(x, hy, hr, 0, Math.PI * 2);
      ctx.fill();
      glow(L, x, hy, 8 + hr * 6, 255, 1);
      // reflection on the wet road
      const fg = ctx.createLinearGradient(0, 151, 0, 200);
      fg.addColorStop(0, G(220, 0.35 + t * 0.3));
      fg.addColorStop(1, G(220, 0));
      ctx.fillStyle = fg;
      ctx.fillRect(x - hr * 0.8, 151, hr * 1.6 + 0.6, 49);
      ctx.fillStyle = G(250);
    }
    // lamp reflection
    const lr = ctx.createLinearGradient(0, 151, 0, 200);
    lr.addColorStop(0, G(200, 0.3));
    lr.addColorStop(1, G(200, 0));
    ctx.fillStyle = lr;
    ctx.fillRect(73, 151, 6, 49);
    rain(ctx, rnd, 120, { a: 0.12 });
    coneRain(ctx, rnd, 70, 76, 32, 46, 150, 0.5);
  },

  two(ctx, L, k, rnd, srnd) {
    ctx.fillStyle = G(7);
    ctx.fillRect(0, 0, FW, FH);
    // lit shelter wall behind them
    const wg = ctx.createLinearGradient(0, 64, 0, 166);
    wg.addColorStop(0, G(150));
    wg.addColorStop(1, G(92));
    ctx.fillStyle = wg;
    ctx.fillRect(86, 64, 134, 102);
    glow(L, 153, 100, 60, 255, 0.4);
    ctx.fillStyle = G(20);
    ctx.fillRect(80, 58, 146, 6);
    ctx.fillRect(84, 64, 3, 136);
    ctx.fillRect(219, 64, 3, 136);
    ctx.fillStyle = G(60);
    ctx.fillRect(220, 166, 80, 34);
    // ground
    ctx.fillStyle = G(30);
    ctx.fillRect(0, 166, FW, 34);
    ctx.fillStyle = G(70);
    ctx.fillRect(86, 166, 134, 1.2);
    // the bus waiting at the right edge
    if (k === 2) {
      ctx.fillStyle = G(16);
      ctx.fillRect(244, 84, 70, 86);
      ctx.fillStyle = G(120);
      ctx.fillRect(250, 94, 50, 22);
      glow(L, 275, 105, 26, 255, 0.45);
    }
    // two figures, silhouettes against the lit wall
    const ax = 132, bx = [190, 184, 178][k];
    ctx.fillStyle = G(4);
    person(ctx, ax, 172, 92, { bob: true });
    person(ctx, bx, 172, 98, { cap: true, lean: k === 2 ? -0.03 : 0 });
    // umbrella over 은재
    ctx.save();
    ctx.translate(ax + 4, 92);
    ctx.rotate(-0.12 + k * 0.03);
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.quadraticCurveTo(-30, -26, 0, -28);
    ctx.quadraticCurveTo(30, -26, 34, 0);
    ctx.quadraticCurveTo(25, -4, 17, 0);
    ctx.quadraticCurveTo(8, -4, 0, 0);
    ctx.quadraticCurveTo(-8, -4, -17, 0);
    ctx.quadraticCurveTo(-25, -4, -34, 0);
    ctx.fill();
    ctx.fillRect(-0.7, -32, 1.4, 34);
    ctx.strokeStyle = G(130, 0.7);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-30, -12);
    ctx.quadraticCurveTo(-24, -26, 0, -28);
    ctx.quadraticCurveTo(24, -26, 30, -12);
    ctx.stroke();
    ctx.restore();
    // lamp overhead
    ctx.fillStyle = G(250);
    ctx.fillRect(140, 52, 26, 2.4);
    glow(L, 153, 53, 30, 255, 0.9);
    rain(ctx, rnd, 110, { a: 0.2 });
    rain(ctx, rnd, 40, { x0: 86, x1: 220, y0: 60, y1: 160, v: 30, a: 0.5 });
  },

  switch(ctx, L, k, rnd, srnd) {
    const on = k === 1 ? 1 : 0;
    const wall = ctx.createLinearGradient(300, 0, 0, 200);
    wall.addColorStop(0, G(on ? 196 : 30));
    wall.addColorStop(1, G(on ? 120 : 14));
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, FW, FH);
    // wallpaper stripes
    ctx.fillStyle = G(on ? 0 : 255, on ? 0.05 : 0.02);
    for (let x = 0; x < FW; x += 9) ctx.fillRect(x, 0, 3, FH);
    if (!on) {
      // a little light from the window at the left
      const wl = ctx.createLinearGradient(0, 0, 120, 0);
      wl.addColorStop(0, G(160, 0.12));
      wl.addColorStop(1, G(160, 0));
      ctx.fillStyle = wl;
      ctx.fillRect(0, 0, 120, FH);
    } else {
      glow(L, 300, 0, 90, 255, 0.85);
    }
    // plate
    ctx.fillStyle = G(0, on ? 0.25 : 0.4);
    rrect(ctx, 136, 66, 40, 60, 3);
    ctx.fill();
    ctx.fillStyle = G(on ? 214 : 42);
    rrect(ctx, 132, 62, 40, 60, 3);
    ctx.fill();
    ctx.fillStyle = G(on ? 150 : 26);
    ctx.beginPath();
    ctx.arc(152, 68, 1.6, 0, Math.PI * 2);
    ctx.arc(152, 116, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = G(on ? 120 : 20);
    ctx.fillRect(146, 80, 12, 24);
    // the toggle: up when on
    ctx.fillStyle = G(on ? 236 : 50);
    if (on) ctx.fillRect(147, 80, 10, 11);
    else ctx.fillRect(147, 93, 10, 11);
    // a hand reaching from the lower right
    pointer(ctx, 153, on ? 85 : 98, 40, 0.62, on ? 170 : 44);
  },

  card(ctx, L, k, rnd, srnd, opt, frame) {
    ctx.fillStyle = G(2);
    ctx.fillRect(0, 0, FW, FH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const draw = (c) => {
      if (frame.card === 'title') {
        c.font = `400 64px ${DISPLAY}`;
        c.fillText('점멸', 150, 100);
      } else {
        c.font = `700 19px ${SANS}`;
        c.fillText('12월 2일 개봉', 150, 100);
      }
    };
    ctx.fillStyle = G(232);
    draw(ctx);
    L.textAlign = 'center';
    L.textBaseline = 'middle';
    L.fillStyle = G(255, 0.7);
    draw(L);
  },

  bus(ctx, L, k, rnd, srnd) {
    ctx.fillStyle = G(8);
    ctx.fillRect(0, 0, FW, FH);
    // the road ahead through the windshield
    const vx = 168, vy = 74;
    ctx.fillStyle = G(16);
    ctx.beginPath();
    ctx.moveTo(vx - 4, vy);
    ctx.lineTo(vx + 4, vy);
    ctx.lineTo(300, 140);
    ctx.lineTo(20, 140);
    ctx.fill();
    ctx.strokeStyle = G(110, 0.6);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -k * 5;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(150, 140);
    ctx.stroke();
    ctx.setLineDash([]);
    // street lights passing on the right
    for (let j = 0; j < 5; j++) {
      const d = ((j + k * 0.34) % 5) / 5; // 0 far .. 1 near
      const p = d * d;
      const x = lerp(vx + 6, 330, p), y = lerp(vy - 6, 6, p), r = lerp(0.8, 5, p);
      ctx.fillStyle = G(240);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      glow(L, x, y, 6 + r * 6, 255, 0.9);
    }
    // droplets on the windshield
    const dr = rng(2026);
    ctx.fillStyle = G(120, 0.5);
    for (let i = 0; i < 70; i++) {
      const x = dr() * FW, y = dr() * 130;
      ctx.fillRect(x, y, 1 + dr() * 1.4, 1 + dr() * 1.4);
    }
    // wipers
    const ang = [2.5, 1.9, 1.25][k];
    ctx.strokeStyle = G(3);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const px of [92, 206]) {
      ctx.moveTo(px, 132);
      ctx.lineTo(px + Math.cos(ang) * 96, 132 - Math.sin(ang) * 96);
    }
    ctx.stroke();
    // pillars and dashboard
    ctx.fillStyle = G(4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(22, 0);
    ctx.lineTo(8, 140);
    ctx.lineTo(0, 140);
    ctx.fill();
    ctx.fillRect(282, 0, 18, 140);
    ctx.fillStyle = G(10);
    ctx.fillRect(0, 132, FW, 68);
    ctx.fillStyle = G(140);
    ctx.fillRect(196, 150, 3, 2);
    ctx.fillRect(206, 150, 3, 2);
    glow(L, 202, 151, 9, 255, 0.4);
    // steering wheel and the driver from behind
    ctx.strokeStyle = G(20);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(112, 150, 40, 14, 0, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = G(2);
    ctx.beginPath();
    ctx.ellipse(112, 102, 15, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(112, 88, 16, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(92, 87, 40, 2.5);
    ctx.beginPath();
    ctx.moveTo(100, 116);
    ctx.quadraticCurveTo(62, 122, 56, 150);
    ctx.lineTo(50, 200);
    ctx.lineTo(176, 200);
    ctx.lineTo(168, 150);
    ctx.quadraticCurveTo(162, 122, 124, 116);
    ctx.fill();
    // rim light on the cap from the street lamps
    ctx.strokeStyle = G(90, 0.7);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(112, 88, 16, 8, 0, Math.PI * 1.55, Math.PI * 1.98);
    ctx.stroke();
  },

  reach(ctx, L, k, rnd, srnd) {
    const on = k === 2 ? 1 : 0;
    ctx.fillStyle = G(on ? 70 : 20);
    ctx.fillRect(0, 0, FW, FH);
    if (on) {
      const g = ctx.createRadialGradient(60, -20, 10, 60, -20, 260);
      g.addColorStop(0, G(170));
      g.addColorStop(1, G(40));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, FW, FH);
      glow(L, 60, 0, 70, 255, 0.6);
    }
    // the window
    const wx = 150, wy = 14, ww = 136, wh = 136;
    const og = ctx.createRadialGradient(250, 150, 4, 250, 150, 140);
    og.addColorStop(0, G(130));
    og.addColorStop(0.3, G(48));
    og.addColorStop(1, G(18));
    ctx.fillStyle = og;
    ctx.fillRect(wx, wy, ww, wh);
    glow(L, 250, 148, 22, 255, 0.7);
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    rain(ctx, rnd, 80, { x0: wx, x1: wx + ww, y0: wy, y1: wy + wh, a: 0.3, len: 10 });
    ctx.restore();
    ctx.fillStyle = G(on ? 36 : 8);
    ctx.fillRect(wx - 5, wy - 5, ww + 10, 5);
    ctx.fillRect(wx - 5, wy + wh, ww + 10, 7);
    ctx.fillRect(wx - 5, wy, 5, wh);
    ctx.fillRect(wx + ww, wy, 5, wh);
    ctx.fillRect(wx + ww / 2 - 2.5, wy, 5, wh);
    // switch on the wall
    ctx.fillStyle = G(on ? 190 : 46);
    rrect(ctx, 118, 86, 14, 22, 1.5);
    ctx.fill();
    ctx.fillStyle = G(on ? 120 : 24);
    ctx.fillRect(123, on ? 90 : 97, 4, 7);
    // 은재 in profile, against the wall and window
    ctx.fillStyle = G(on ? 10 : 3);
    profile(ctx, 70, 200, 132, [0, 0.6, 1][k], 121, 95);
  },

  window(ctx, L, k, rnd, srnd, opt) {
    const lit = opt && typeof opt.lit === 'number' ? opt.lit : k === 1 ? 1 : 0;
    const flash = opt && typeof opt.flash === 'number' ? opt.flash : k === 2 ? 1 : 0;
    sky(ctx, 5, 16, 200);
    // the wall, seen from below: it leans back, windows narrow and close up toward the top
    const wg = ctx.createLinearGradient(0, 0, 0, 176);
    wg.addColorStop(0, G(11));
    wg.addColorStop(1, G(31));
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(300, 0);
    ctx.lineTo(300, 178);
    ctx.lineTo(8, 178);
    ctx.fill();
    // the stop's lamp washes the lower wall
    const lw = ctx.createRadialGradient(64, 192, 6, 64, 192, 170);
    lw.addColorStop(0, G(255, 0.16));
    lw.addColorStop(1, G(255, 0));
    ctx.fillStyle = lw;
    ctx.fillRect(0, 0, FW, 180);
    // floor slabs
    const rows = [[10, 34, 0.76], [54, 44, 0.88], [108, 54, 1]];
    ctx.fillStyle = G(6, 0.55);
    for (const [y, h, s] of rows) ctx.fillRect(0, y + h + 4 * s, FW, 3 * s);
    const cx = 170;
    for (let r = 0; r < 3; r++) {
      const [y, h, s] = rows[r];
      for (let c = 0; c < 4; c++) {
        const w = 42 * s, x = cx + (c - 1.5) * 68 * s - w / 2;
        const target = r === 0 && c === 3;
        const l = target ? lit : r === 2 && c === 0 ? 0.3 : 0;
        // recess and sill
        ctx.fillStyle = G(4);
        ctx.fillRect(x - 2 * s, y - 2 * s, w + 4 * s, h * 0.66 + 4 * s);
        windowPane(ctx, x, y, w, h * 0.66, l, srnd);
        if (target && l > 0.5) {
          // someone at the switch, behind the curtain
          ctx.fillStyle = G(Math.round(lerp(20, 92, l)), 0.9);
          const hx = x + w * 0.36, hy = y + h * 0.3;
          ctx.beginPath();
          ctx.ellipse(hx, hy, w * 0.07, w * 0.085, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(hx - w * 0.18, y + h * 0.66);
          ctx.quadraticCurveTo(hx - w * 0.17, hy + w * 0.12, hx, hy + w * 0.1);
          ctx.quadraticCurveTo(hx + w * 0.17, hy + w * 0.12, hx + w * 0.18, y + h * 0.66);
          ctx.fill();
          ctx.fillStyle = G(30);
          ctx.fillRect(x + w / 2 - 0.5, y, 1, h * 0.66);
          ctx.fillRect(x, y + h * 0.66 * 0.42, w, 1);
        }
        if (l) glow(L, x + w / 2, y + h * 0.33, 34 * l * s, 255, l);
        ctx.fillStyle = G(r === 2 ? 58 : 36);
        ctx.fillRect(x - 5 * s, y + h * 0.66 + 2 * s, w + 10 * s, 2.4 * s);
      }
    }
    rain(ctx, rnd, 160, { a: 0.15, len: 16 });
    if (lit > 0.5) {
      // rain shows against the lit window
      ctx.save();
      ctx.beginPath();
      ctx.rect(200, 0, 100, 60);
      ctx.clip();
      rain(ctx, rnd, 40, { x0: 200, x1: 300, y0: -10, y1: 60, a: 0.4 * lit, v: 230, len: 12 });
      ctx.restore();
    }
    // the shelter roof in the foreground with its tube light, and the sign pole
    ctx.fillStyle = G(2);
    ctx.beginPath();
    ctx.moveTo(0, 158);
    ctx.lineTo(156, 168);
    ctx.lineTo(156, 179);
    ctx.lineTo(0, 178);
    ctx.fill();
    ctx.fillRect(0, 176, FW, 24);
    ctx.strokeStyle = G(236);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(10, 174.4);
    ctx.lineTo(56, 175.9);
    ctx.stroke();
    glow(L, 33, 175.5, 24, 255, 0.85);
    glow(L, 20, 175, 16, 255, 0.6);
    glow(L, 50, 176, 14, 255, 0.6);
    if (flash > 0) {
      const g = ctx.createRadialGradient(300, 200, 0, 300, 200, 120);
      g.addColorStop(0, G(255, 0.85 * flash));
      g.addColorStop(1, G(255, 0));
      ctx.fillStyle = g;
      ctx.fillRect(180, 80, 120, 120);
      glow(L, 296, 196, 90, 255, flash);
    }
  },

  fogged(ctx, L, k, rnd, srnd) {
    SCENES.window(ctx, L, 0, rnd, srnd, { lit: 0, flash: 0 });
    const g = ctx.createLinearGradient(300, 0, 80, 120);
    g.addColorStop(0, G(255, 1));
    g.addColorStop(0.45, G(250, 0.85));
    g.addColorStop(1, G(250, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FW, FH);
    ctx.fillStyle = G(255, 0.18);
    ctx.fillRect(0, 0, FW, FH);
    L.fillStyle = G(255, 0.9);
    L.fillRect(200, 0, 100, 200);
  },
};

// ---------- film effects ----------

let canFilter = null;
function filterOK() {
  if (canFilter === null) {
    try {
      const c = document.createElement('canvas').getContext('2d');
      canFilter = !!c && 'filter' in c;
      if (canFilter) {
        c.filter = 'blur(2px)';
        canFilter = c.filter === 'blur(2px)';
      }
    } catch (e) {
      canFilter = false;
    }
  }
  return canFilter;
}

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

// Apply grain over a rectangle of a context (device pixels). Used for frames and the live screen.
export function grain(ctx, w, h, seed, amount = 0.3) {
  const tile = grainTile(seed);
  const pat = ctx.createPattern(tile, 'repeat');
  const r = rng(seed * 131 + 7);
  const scale = Math.max(1, w / 520);
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

const scratch = { lights: null, small: null };

// Draw frame n into the whole of `canvas`. opt: scene overrides (hero blink), grain amount.
export function renderFrame(canvas, n, opt = {}) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const f = FRAMES[n - 1];
  if (!scratch.lights) {
    scratch.lights = document.createElement('canvas');
    scratch.small = document.createElement('canvas');
  }
  const lc = scratch.lights;
  lc.width = Math.max(32, Math.round(w / 3));
  lc.height = Math.round((lc.width * FH) / FW);
  const L = lc.getContext('2d');
  L.setTransform(lc.width / FW, 0, 0, lc.height / FH, 0, 0);
  L.fillStyle = '#000';
  L.fillRect(0, 0, FW, FH);

  ctx.save();
  ctx.setTransform(w / FW, 0, 0, h / FH, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const rnd = rng(n * 9973 + 17);
  const srnd = rng(f.shot * 7919 + 3);
  SCENES[f.scene](ctx, L, f.k, rnd, srnd, opt, f);
  ctx.restore();

  // halation: the light sources, blurred, added back with screen
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  if (filterOK()) {
    ctx.filter = `blur(${Math.max(1, w * 0.008)}px)`;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(lc, 0, 0, w, h);
    ctx.filter = `blur(${Math.max(2, w * 0.028)}px)`;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(lc, 0, 0, w, h);
    ctx.filter = 'none';
  } else {
    const sc = scratch.small;
    sc.width = Math.max(8, Math.round(w / 28));
    sc.height = Math.max(6, Math.round(h / 28));
    const sx = sc.getContext('2d');
    sx.imageSmoothingEnabled = true;
    sx.drawImage(lc, 0, 0, sc.width, sc.height);
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(lc, 0, 0, w, h);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(sc, 0, 0, w, h);
  }
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.hypot(w, h) * 0.56);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  grain(ctx, w, h, n + (opt.grainSeed || 0), opt.grain ?? 0.32);
}

// Cache of rendered frames at a given pixel width, shared by the sheet and the loupe.
const cache = new Map();
const order = [];
const BUDGET = 30e6; // device pixels kept
let used = 0;

export function frameBitmap(n, w) {
  w = Math.max(24, Math.round(w / 8) * 8);
  const key = n + '@' + w;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w;
  c.height = Math.round((w * FH) / FW);
  renderFrame(c, n);
  cache.set(key, c);
  order.push(key);
  used += c.width * c.height;
  while (used > BUDGET && order.length > 40) {
    const old = order.shift();
    const oc = cache.get(old);
    if (oc) used -= oc.width * oc.height;
    cache.delete(old);
  }
  return c;
}

export function hasBitmap(n, w) {
  w = Math.max(24, Math.round(w / 8) * 8);
  return cache.has(n + '@' + w);
}

export function clearFrames() {
  cache.clear();
  order.length = 0;
  used = 0;
}
