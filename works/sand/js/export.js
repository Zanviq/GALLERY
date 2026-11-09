// The saved picture: drawn here in the page, handed to the browser as a file, sent nowhere.
import { drawBottle, drawCork, drawReflection, CX, MOUTH, BOTTOM } from './render.js';

const FONT = '"Black And White Picture", sans-serif';

export async function bottlePng(gridCanvas, when = new Date()) {
  const cw = 1080, ch = 1440, S = 5;
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);

  const oy = 214 - (MOUTH - 11) * S;          // cork top sits at y = 214
  ctx.setTransform(S, 0, 0, S, cw / 2 - CX * S, oy);
  drawReflection(ctx, gridCanvas, 16);
  drawBottle(ctx, gridCanvas);
  drawCork(ctx, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(72, oy + (BOTTOM + 2) * S, cw - 144, 4);   // the shelf edge

  try { await document.fonts.load(`72px ${FONT}`); } catch (e) { /* falls back to sans-serif */ }
  ctx.textBaseline = 'top';
  ctx.font = `76px ${FONT}`;
  ctx.fillText('색모래 병', 72, 64);
  ctx.font = `32px ${FONT}`;
  const date = `${when.getFullYear()}. ${when.getMonth() + 1}. ${when.getDate()}.`;
  ctx.fillText(date, 72, ch - 100);
  ctx.textAlign = 'right';
  ctx.fillText('zanviq gallery', cw - 72, ch - 100);

  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
