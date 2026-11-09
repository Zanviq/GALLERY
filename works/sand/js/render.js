// Drawing: the grid as pixels, the glass as one white line, the cup, the stream, cork and shelf.
// Everything outside the sand is white on black, flat, with no blur or gradient.
import { W, H, CX, MOUTH, BOTTOM, PIVOT_Y, halfWidth } from './sim.js';

const NECK = halfWidth(MOUTH);
const BODY = halfWidth(120);
const CORNER = 12;
const INK = '#fff';
const LINE = 1.4;            // glass line width in cells

export function makeGridCanvas(doc = document) {
  const canvas = doc.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  return { canvas, ctx, img, px: new Uint32Array(img.data.buffer) };
}

export function paintGrid(gc, g, lut) {
  const px = gc.px;
  for (let i = 0; i < g.length; i++) px[i] = lut[g[i]];
  gc.ctx.putImageData(gc.img, 0, 0);
}

/** Outline of the glass in cell units (grid coordinates). */
function glassPath(ctx) {
  const off = 0.95;
  const rimTop = MOUTH - 4, rimOut = NECK + 4;
  ctx.beginPath();
  ctx.moveTo(CX + NECK - 0.2, rimTop);
  ctx.lineTo(CX + rimOut - 1, rimTop);
  ctx.quadraticCurveTo(CX + rimOut, rimTop, CX + rimOut, rimTop + 1);
  ctx.lineTo(CX + rimOut, MOUTH + 1);
  ctx.lineTo(CX + NECK + off, MOUTH + 2.5);
  const yCorner = BOTTOM - CORNER;
  for (let y = MOUTH + 3; y <= yCorner; y++) ctx.lineTo(CX + halfWidth(Math.min(y, yCorner - 1)) + off, y);
  ctx.arc(CX + BODY - CORNER, yCorner, CORNER + off, 0, Math.PI / 2);
  ctx.lineTo(CX - BODY + CORNER, BOTTOM + off);
  ctx.arc(CX - BODY + CORNER, yCorner, CORNER + off, Math.PI / 2, Math.PI);
  for (let y = yCorner; y >= MOUTH + 3; y--) ctx.lineTo(CX - halfWidth(Math.min(y, yCorner - 1)) - off, y);
  ctx.lineTo(CX - NECK - off, MOUTH + 2.5);
  ctx.lineTo(CX - rimOut, MOUTH + 1);
  ctx.lineTo(CX - rimOut, rimTop + 1);
  ctx.quadraticCurveTo(CX - rimOut, rimTop, CX - rimOut + 1, rimTop);
  ctx.lineTo(CX - NECK + 0.2, rimTop);
}

/** Bottle in grid units: sand pixels, glass line, printed highlights. ctx is already in grid space. */
export function drawBottle(ctx, gridCanvas) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(gridCanvas, 0, 0);
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.26;
  ctx.fillRect(CX - BODY + 6, 86, 3, 84);
  ctx.fillRect(CX - NECK + 3, MOUTH + 5, 2, 18);
  ctx.globalAlpha = 0.16;
  ctx.fillRect(CX - BODY + 12, 96, 1.5, 44);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  glassPath(ctx);
  ctx.stroke();
}

const CORK_DOTS = [[-8, 4], [-3, 9], [4, 3], [8, 10], [0, 14], [-9, 13], [6, 15], [-4, 1]];

/** Cork in grid units; `lift` raises it above its seat (cells). */
export function drawCork(ctx, lift = 0) {
  const top = MOUTH - 11 - lift, bot = MOUTH + 8 - lift;
  const wt = NECK + 1.6, wb = NECK - 0.6;
  ctx.beginPath();
  ctx.moveTo(CX - wt + 1, top);
  ctx.lineTo(CX + wt - 1, top);
  ctx.quadraticCurveTo(CX + wt, top, CX + wt, top + 1);
  ctx.lineTo(CX + wb, bot);
  ctx.lineTo(CX - wb, bot);
  ctx.lineTo(CX - wt, top + 1);
  ctx.quadraticCurveTo(CX - wt, top, CX - wt + 1, top);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const [x, y] of CORK_DOTS) ctx.fillRect(CX + x - 0.5, top + 2 + y - 0.5, 1.2, 1.2);
}

/** Stripes of the sand mirrored under the shelf line, in grid units (shelf at BOTTOM + 2). */
export function drawReflection(ctx, gridCanvas, rows = 22) {
  ctx.imageSmoothingEnabled = false;
  const shelf = BOTTOM + 2;
  for (let b = 0; b < rows; b += 2) {
    ctx.globalAlpha = b < 8 ? 0.34 : b < 16 ? 0.22 : 0.12;
    const src = BOTTOM - 1 - b;
    ctx.drawImage(gridCanvas, 0, src, W, 1, 0, shelf + 1 + b, W, 1);
  }
  ctx.globalAlpha = 1;
}

/** The empty cup (local units are cells). Pour corner at (0,0), body to the left and below. */
const CUP_W = 22, CUP_H = 24;
export function drawCup(ctx, angle, pattern, level) {
  ctx.save();
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-CUP_W + 1, 1); ctx.lineTo(-1, 1); ctx.lineTo(-2.5, CUP_H - 1); ctx.lineTo(-CUP_W + 2.5, CUP_H - 1);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.rotate(-angle);                       // world-aligned: the sand surface stays level
  ctx.fillStyle = pattern;
  ctx.fillRect(-60, level, 120, 80);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-CUP_W - 1, -0.5); ctx.lineTo(-CUP_W + 1.6, CUP_H); ctx.lineTo(-1.6, CUP_H); ctx.lineTo(1, -0.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** A tile of loose grains of one colour, for the cup and the jars. */
export function sandTile(colour, lut, size = 32, seed = 1, doc = document) {
  const c = doc.createElement('canvas');
  c.width = size; c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  const px = new Uint32Array(img.data.buffer);
  let r = (seed * 2654435761) >>> 0 || 1;
  const rand = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return (r >>> 0) / 4294967296; };
  for (let i = 0; i < px.length; i++) {
    const u = rand();
    const s = u < 0.04 ? 28 + (i & 1) : u < 0.07 ? 30 + (i & 1) : (rand() * 28) | 0;
    px[i] = lut[colour * 32 + s];
  }
  x.putImageData(img, 0, 0);
  return c;
}

export { PIVOT_Y, BOTTOM, MOUTH, CX, W, H, CUP_W, CUP_H };
