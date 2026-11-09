// The contact sheet: six strips of 35mm film printed on one sheet of paper, measured in millimetres.
// Used three ways: the whole sheet (desktop), the loupe's magnified view, and loose strips (phones).
import { SELECTS, REJECTS } from './data.js';
import { DISPLAY, SANS, rng } from './frames.js';

export const STRIP = { len: 234, h: 35, pitch: 38, fw: 36, fh: 24, lead: 4, fy: 5.5 };
const BORDER = 7;
const PAD_X = 6;
const TOP = 15;
const GAP = 4;
const BOTTOM = 7;
export const SHEET_W = BORDER * 2 + PAD_X * 2 + STRIP.len;
export const SHEET_H = BORDER * 2 + TOP + 6 * STRIP.h + 5 * GAP + BOTTOM;
const STRIP_DX = [0.6, -0.5, 0.9, 0, -0.7, 0.3]; // strips are laid by hand, never quite square
export const LOOSE_GAP = 3; // gap between strips laid end to end

const REBATE = '#1b1b1b';
const EDGE = '#a9a9a9';
const WAX = 'rgba(255,255,255,0.93)';

export function stripOrigin(s) {
  return [BORDER + PAD_X + STRIP_DX[s], BORDER + TOP + s * (STRIP.h + GAP)];
}

// frame n (1..36) centre on the sheet, in mm
export function frameCenter(n) {
  const s = Math.floor((n - 1) / 6), j = (n - 1) % 6;
  const [ox, oy] = stripOrigin(s);
  return [ox + STRIP.lead + j * STRIP.pitch + STRIP.fw / 2, oy + STRIP.fy + STRIP.fh / 2];
}

// frame n centre along the loose strips, in mm from the start of strip 1
export function looseCenter(n) {
  const s = Math.floor((n - 1) / 6), j = (n - 1) % 6;
  return s * (STRIP.len + LOOSE_GAP) + STRIP.lead + j * STRIP.pitch + STRIP.fw / 2;
}
export const LOOSE_LEN = 6 * STRIP.len + 5 * LOOSE_GAP;

export function nearestOnSheet(x, y) {
  let best = 1, bd = Infinity;
  for (let n = 1; n <= 36; n++) {
    const [cx, cy] = frameCenter(n);
    const d = (cx - x) ** 2 + ((cy - y) * 1.3) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function nearestLoose(x) {
  let best = 1, bd = Infinity;
  for (let n = 1; n <= 36; n++) {
    const d = Math.abs(looseCenter(n) - x);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tri(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s / 2);
  ctx.lineTo(x + s * 0.9, y);
  ctx.lineTo(x, y + s / 2);
  ctx.closePath();
  ctx.fill();
}

// Draw strip s with its top-left corner at the current origin (units: mm). `px` = device px per mm.
// `bitmap(n, widthPx)` returns a rendered frame or null if it is not ready yet.
export function drawStrip(ctx, s, px, bitmap, marks = true) {
  ctx.fillStyle = REBATE;
  ctx.fillRect(0, 0, STRIP.len, STRIP.h);
  // perforations: 8 per frame, 4.75mm pitch
  ctx.fillStyle = '#000';
  for (let x = 1.15; x < STRIP.len - 2.5; x += 4.75) {
    rr(ctx, x, 2.01, 2.794, 1.981, 0.45);
    ctx.fill();
    rr(ctx, x, 31.01, 2.794, 1.981, 0.45);
    ctx.fill();
  }
  // frames, corners slightly round like the camera gate
  for (let j = 0; j < 6; j++) {
    const n = s * 6 + j + 1;
    const x = STRIP.lead + j * STRIP.pitch;
    ctx.save();
    rr(ctx, x, STRIP.fy, STRIP.fw, STRIP.fh, 0.5);
    ctx.clip();
    const bmp = bitmap(n, STRIP.fw * px);
    if (bmp) ctx.drawImage(bmp, x, STRIP.fy, STRIP.fw, STRIP.fh);
    else {
      ctx.fillStyle = '#121212';
      ctx.fillRect(x, STRIP.fy, STRIP.fw, STRIP.fh);
    }
    ctx.restore();
  }
  // edge print: stock name along the top, frame numbers along the bottom
  ctx.fillStyle = EDGE;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 1.45px ${SANS}`;
  for (let j = 0; j < 6; j += 2) {
    const x = STRIP.lead + j * STRIP.pitch + 6;
    ctx.fillText('PAN 400', x, 1.05);
    ctx.fillText('SAFETY FILM', x + 40, 1.05);
  }
  ctx.font = `700 1.6px ${SANS}`;
  for (let j = 0; j < 6; j++) {
    const n = s * 6 + j + 1;
    const x = STRIP.lead + j * STRIP.pitch;
    ctx.textAlign = 'center';
    ctx.fillText(String(n), x + STRIP.fw / 2 - 1, 34);
    tri(ctx, x + STRIP.fw / 2 + 0.6, 34, 1.3);
    ctx.fillText(n + 'A', x + STRIP.fw + 1, 34);
  }
  if (marks) {
    for (let j = 0; j < 6; j++) {
      const n = s * 6 + j + 1;
      const cx = STRIP.lead + j * STRIP.pitch + STRIP.fw / 2, cy = STRIP.fy + STRIP.fh / 2;
      if (SELECTS.includes(n)) waxCircle(ctx, cx, cy, n);
      if (REJECTS.includes(n)) waxCross(ctx, cx, cy, n);
    }
  }
}

function waxStroke(ctx, pts, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = WAX;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = pass ? 0.34 : 0.62;
    ctx.globalAlpha = pass ? 0.7 : 1;
    ctx.setLineDash(pass ? [1.6, 0.5, 3.2, 0.7] : [6.5, 0.35, 3.5, 0.55, 9, 0.3]);
    const ox = pass ? 0.18 : 0, oy = pass ? -0.14 : 0;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = (r() - 0.5) * 0.12, jy = (r() - 0.5) * 0.12;
      if (i) ctx.lineTo(x + ox + jx, y + oy + jy);
      else ctx.moveTo(x + ox + jx, y + oy + jy);
    });
    ctx.stroke();
  }
  ctx.restore();
}

export function waxCircle(ctx, cx, cy, seed) {
  const r = rng(seed * 53 + 1);
  const a0 = -2.2 + r() * 0.8;
  const pts = [];
  const steps = 64;
  for (let i = 0; i <= steps + 7; i++) {
    const a = a0 + (i / steps) * Math.PI * 2;
    const wob = 1 + Math.sin(a * 3 + seed) * 0.025 + (i > steps ? (i - steps) * 0.012 : 0);
    pts.push([cx + Math.cos(a) * 20.5 * wob, cy + Math.sin(a) * 14.6 * wob]);
  }
  waxStroke(ctx, pts, seed * 7);
}

export function waxCross(ctx, cx, cy, seed) {
  waxStroke(ctx, [[cx - 15, cy - 9], [cx - 4, cy - 2.6], [cx + 15.5, cy + 9.6]], seed * 11);
  waxStroke(ctx, [[cx + 14, cy - 10], [cx + 2, cy - 1.5], [cx - 14.5, cy + 10.4]], seed * 13);
}

// The whole sheet at the origin (mm). `view` = [x, y, w, h] limits what is drawn (for the loupe).
export function drawSheet(ctx, px, bitmap, view = null) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);
  ctx.fillStyle = '#000';
  ctx.fillRect(BORDER, BORDER, SHEET_W - BORDER * 2, SHEET_H - BORDER * 2);
  for (let s = 0; s < 6; s++) {
    const [ox, oy] = stripOrigin(s);
    if (view && (oy > view[1] + view[3] || oy + STRIP.h < view[1])) continue;
    ctx.save();
    ctx.translate(ox, oy);
    drawStrip(ctx, s, px, bitmap);
    ctx.restore();
  }
  // the roll note in wax pencil
  ctx.save();
  ctx.translate(BORDER + PAD_X + 1.5, BORDER + 8.8);
  ctx.rotate(-0.02);
  ctx.fillStyle = WAX;
  ctx.font = `400 6.2px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('점멸 예고편 3안', 0, 0);
  ctx.restore();
}
