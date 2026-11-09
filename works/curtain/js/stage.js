// The set behind the curtain (wall, floor, the ghost light) and the hardware in front of it
// (rail, rings, tassels). Both are Canvas2D; light comes from one place in each.

const LAMP = '238,243,241';
const SILVER = { hi: '#F1F4F5', mid: '#C3CACD', lo: '#5E676B', dark: '#30373A' };

let boards = null;

/** Wall, floor and the bulb. `level` is the bulb's brightness (it flickers once, as a bow). */
export function drawStage(ctx, S, level) {
  const { W, H, dpr } = S;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const lx = S.lampX, hy = S.lampHeadY, by = S.lampBaseY;
  const lv = Math.max(0, level);

  // back wall: a faint wash around the bulb
  let g = ctx.createRadialGradient(lx, hy, 0, lx, hy, S.wallR);
  g.addColorStop(0, `rgba(${LAMP},${0.13 * lv})`);
  g.addColorStop(0.35, `rgba(${LAMP},${0.05 * lv})`);
  g.addColorStop(1, `rgba(${LAMP},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, S.floorBackY);

  // floor boards, seen only inside the pool of light
  if (!boards || boards.width !== Math.round(W * dpr) || boards.height !== Math.round(H * dpr)) {
    boards = document.createElement('canvas');
    boards.width = Math.round(W * dpr); boards.height = Math.round(H * dpr);
  }
  const b = boards.getContext('2d');
  b.setTransform(dpr, 0, 0, dpr, 0, 0);
  b.globalCompositeOperation = 'source-over';
  b.clearRect(0, 0, W, H);
  const depth = S.floorY - S.floorBackY;
  const vpY = S.floorBackY - depth * 3.2, vpX = W / 2;
  const plank = Math.max(26, W / 26);
  b.strokeStyle = `rgba(${LAMP},0.55)`;
  b.lineWidth = 1;
  b.beginPath();
  for (let xf = -W; xf <= W * 2; xf += plank) {
    // a board seam from the front edge toward the vanishing point
    const tBack = (S.floorBackY - vpY) / (S.floorY - vpY);
    b.moveTo(xf, S.floorY);
    b.lineTo(vpX + (xf - vpX) * tBack, S.floorBackY);
  }
  // butt joints, staggered
  for (let r = 1; r < 7; r++) {
    const t = r / 7;
    const yy = S.floorBackY + depth * t * t;
    const sc = (yy - vpY) / (S.floorY - vpY);
    for (let xf = -W, n = 0; xf <= W * 2; xf += plank, n++) {
      if ((n + r * 3) % 5 !== 0) continue;
      const x0 = vpX + (xf - vpX) * sc, x1 = vpX + (xf + plank - vpX) * sc;
      b.moveTo(x0, yy); b.lineTo(x1, yy);
    }
  }
  b.stroke();
  b.fillStyle = `rgba(${LAMP},0.5)`;
  b.fillRect(0, S.floorBackY, W, 1);
  b.globalCompositeOperation = 'destination-in';
  b.save();
  b.translate(lx, by);
  b.scale(1, S.poolRy / S.poolRx);
  g = b.createRadialGradient(0, 0, 0, 0, 0, S.poolRx * 1.15);
  g.addColorStop(0, `rgba(0,0,0,${0.5 * lv})`);
  g.addColorStop(0.5, `rgba(0,0,0,${0.18 * lv})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = g;
  b.fillRect(-S.poolRx * 1.2, -S.poolRx * 1.2 * (S.poolRx / S.poolRy), S.poolRx * 2.4, S.poolRx * 2.4 * (S.poolRx / S.poolRy));
  b.restore();

  // the pool itself
  ctx.save();
  ctx.translate(lx, by);
  ctx.scale(1, S.poolRy / S.poolRx);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, S.poolRx);
  g.addColorStop(0, `rgba(${LAMP},${0.3 * lv})`);
  g.addColorStop(0.4, `rgba(${LAMP},${0.11 * lv})`);
  g.addColorStop(1, `rgba(${LAMP},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, S.poolRx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(boards, 0, 0, W, H);

  // the light that reaches the front edge: what you see under the hem when the curtain is shut
  g = ctx.createLinearGradient(0, S.floorY - 12, 0, S.floorY);
  g.addColorStop(0, `rgba(${LAMP},0)`);
  g.addColorStop(1, `rgba(${LAMP},${0.62 * lv})`);
  ctx.fillStyle = g;
  const spill = ctx.createLinearGradient(0, 0, W, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, S.floorY - 12, W, 12);
  ctx.clip();
  ctx.fillRect(0, S.floorY - 12, W, 12);
  ctx.globalCompositeOperation = 'destination-in';
  const f = Math.max(0.0001, lx / W);
  spill.addColorStop(0, 'rgba(0,0,0,0.25)');
  spill.addColorStop(Math.min(0.999, f), 'rgba(0,0,0,1)');
  spill.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = spill;
  ctx.fillRect(0, S.floorY - 12, W, 12);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';

  drawSpike(ctx, lx, by, S.lampScale);
  drawLamp(ctx, S, lv);
}

function drawSpike(ctx, x, y, s) {
  // white tape cross where the performer stands
  ctx.save();
  ctx.translate(x, y + 3 * s);
  ctx.scale(1, 0.32);
  ctx.strokeStyle = 'rgba(241,244,245,0.55)';
  ctx.lineWidth = 3.2 * s;
  ctx.lineCap = 'butt';
  const r = 13 * s;
  ctx.beginPath();
  ctx.moveTo(-r, -r); ctx.lineTo(r, r);
  ctx.moveTo(r, -r); ctx.lineTo(-r, r);
  ctx.stroke();
  ctx.restore();
}

function drawLamp(ctx, S, lv) {
  const s = S.lampScale;
  const x = S.lampX, top = S.lampHeadY, base = S.lampBaseY;
  // tripod
  ctx.lineCap = 'round';
  ctx.strokeStyle = SILVER.lo;
  ctx.lineWidth = 2 * s;
  const foot = 26 * s, hub = base - 34 * s;
  ctx.beginPath();
  ctx.moveTo(x, hub); ctx.lineTo(x - foot, base + 2 * s);
  ctx.moveTo(x, hub); ctx.lineTo(x + foot * 0.9, base + 1 * s);
  ctx.moveTo(x, hub); ctx.lineTo(x + foot * 0.15, base + 7 * s);
  ctx.stroke();
  // pole, lit on the side facing the bulb above (it isn't), so mostly by the floor bounce
  const pole = ctx.createLinearGradient(x - 2.5 * s, 0, x + 2.5 * s, 0);
  pole.addColorStop(0, SILVER.dark);
  pole.addColorStop(0.45, SILVER.mid);
  pole.addColorStop(1, SILVER.dark);
  ctx.fillStyle = pole;
  ctx.fillRect(x - 2.2 * s, top + 26 * s, 4.4 * s, hub - top - 26 * s);
  ctx.fillStyle = SILVER.lo;
  ctx.fillRect(x - 4 * s, hub - 4 * s, 8 * s, 6 * s);
  // socket
  ctx.fillStyle = SILVER.dark;
  ctx.fillRect(x - 6 * s, top + 16 * s, 12 * s, 11 * s);
  ctx.fillStyle = SILVER.mid;
  ctx.fillRect(x - 6 * s, top + 16 * s, 12 * s, 1.6 * s);

  // glow
  const r = 70 * s;
  let g = ctx.createRadialGradient(x, top, 0, x, top, r);
  g.addColorStop(0, `rgba(${LAMP},${0.55 * lv})`);
  g.addColorStop(0.18, `rgba(${LAMP},${0.18 * lv})`);
  g.addColorStop(1, `rgba(${LAMP},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, top - r, r * 2, r * 2);
  // bulb glass
  ctx.beginPath();
  ctx.moveTo(x - 4.2 * s, top + 16 * s);
  ctx.bezierCurveTo(x - 5 * s, top + 8 * s, x - 11 * s, top + 4 * s, x - 11 * s, top - 4 * s);
  ctx.arc(x, top - 4 * s, 11 * s, Math.PI, 0);
  ctx.bezierCurveTo(x + 11 * s, top + 4 * s, x + 5 * s, top + 8 * s, x + 4.2 * s, top + 16 * s);
  ctx.closePath();
  g = ctx.createRadialGradient(x, top - 3 * s, 0, x, top - 3 * s, 13 * s);
  g.addColorStop(0, `rgba(255,255,255,${0.35 + 0.65 * lv})`);
  g.addColorStop(0.5, `rgba(${LAMP},${0.25 + 0.6 * lv})`);
  g.addColorStop(1, `rgba(${LAMP},${0.12 + 0.3 * lv})`);
  ctx.fillStyle = g;
  ctx.fill();
  // filament
  ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.6 * lv})`;
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 3.5 * s, top - 2 * s);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x - 3.5 * s + i * 7 * s / 6, top - 2 * s + (i % 2 ? -2.2 : 0) * s);
  ctx.stroke();
  // wire cage
  ctx.strokeStyle = SILVER.mid;
  ctx.lineWidth = 0.9 * s;
  ctx.beginPath();
  const cw = 15 * s, ch0 = top - 18 * s, ch1 = top + 15 * s;
  for (const k of [-1, -0.45, 0.45, 1]) {
    ctx.moveTo(x + k * cw * 0.55, ch1);
    ctx.bezierCurveTo(x + k * cw * 1.05, ch1 - 8 * s, x + k * cw * 1.05, ch0 + 6 * s, x, ch0);
  }
  ctx.moveTo(x - cw * 0.95, top - 2 * s);
  ctx.lineTo(x + cw * 0.95, top - 2 * s);
  ctx.stroke();
  ctx.fillStyle = SILVER.mid;
  ctx.beginPath();
  ctx.arc(x, ch0 - 1.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Rail, rings and tassels, redrawn every frame while the cloth moves. */
export function drawRig(ctx, cu, S) {
  const { W, H, dpr } = S;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const t = S.railT, ry = S.railY;
  const x0 = S.railEnd, x1 = W - S.railEnd;

  // rod
  const g = ctx.createLinearGradient(0, ry - t, 0, ry + t);
  g.addColorStop(0, SILVER.lo);
  g.addColorStop(0.18, SILVER.hi);
  g.addColorStop(0.4, SILVER.mid);
  g.addColorStop(0.8, SILVER.lo);
  g.addColorStop(1, SILVER.dark);
  ctx.fillStyle = g;
  ctx.fillRect(x0, ry - t, x1 - x0, t * 2);
  for (const fx of [x0, x1]) {
    const fg = ctx.createRadialGradient(fx - t * 0.5, ry - t * 0.6, 0, fx, ry, t * 1.8);
    fg.addColorStop(0, SILVER.hi);
    fg.addColorStop(0.5, SILVER.mid);
    fg.addColorStop(1, SILVER.lo);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, ry, t * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // rings: each an oval round the rod, with a short hook down into the heading
  const lo = S.leg, hi = W - S.leg;
  ctx.lineWidth = Math.max(1.3, t * 0.3);
  for (let p = 0; p < 2; p++) {
    for (const k of cu.rings[p]) {
      const rx = cu.x[k];
      if (rx < lo || rx > hi) continue;
      ctx.strokeStyle = SILVER.lo;
      ctx.beginPath();
      ctx.moveTo(rx, ry + t * 1.25);
      ctx.lineTo(rx, cu.y[k] + 1);
      ctx.stroke();
      ctx.strokeStyle = SILVER.mid;
      ctx.beginPath();
      ctx.ellipse(rx, ry, t * 0.62, t * 1.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = SILVER.hi;
      ctx.beginPath();
      ctx.ellipse(rx, ry, t * 0.62, t * 1.3, 0, Math.PI * 1.15, Math.PI * 1.55);
      ctx.stroke();
    }
  }

  for (const chain of cu.tassels) drawTassel(ctx, cu, chain, S);
}

function drawTassel(ctx, cu, chain, S) {
  const X = (i) => cu.x[chain[i]], Y = (i) => cu.y[chain[i]];
  const s = S.tasselScale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // cord, twisted: a mid line and a highlight
  ctx.strokeStyle = SILVER.lo;
  ctx.lineWidth = 2.6 * s;
  ctx.beginPath();
  ctx.moveTo(X(0), Y(0) + 2);
  for (let i = 1; i <= 3; i++) ctx.lineTo(X(i), Y(i));
  ctx.stroke();
  ctx.strokeStyle = SILVER.mid;
  ctx.lineWidth = 1.1 * s;
  ctx.setLineDash([2.2 * s, 2.2 * s]);
  ctx.stroke();
  ctx.setLineDash([]);

  // head: a knob and a bell between chain[3] and chain[4]
  const hx = X(3), hy = Y(3), ex = X(4), ey = Y(4);
  const len = Math.hypot(ex - hx, ey - hy) || 1;
  const ang = Math.atan2(ey - hy, ex - hx) - Math.PI / 2;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  const w = 6 * s;
  let g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, SILVER.lo);
  g.addColorStop(0.35, SILVER.hi);
  g.addColorStop(0.7, SILVER.mid);
  g.addColorStop(1, SILVER.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 1.5 * s, 3.4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2.4 * s, 4 * s);
  ctx.bezierCurveTo(-w * 0.9, len * 0.45, -w, len * 0.8, -w, len);
  ctx.lineTo(w, len);
  ctx.bezierCurveTo(w, len * 0.8, w * 0.9, len * 0.45, 2.4 * s, 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SILVER.lo;
  ctx.fillRect(-w, len - 1.6 * s, w * 2, 1.6 * s);
  ctx.restore();

  // skirt: loose threads from chain[4] to chain[5], swinging a little behind the head
  const sx = X(5), sy = Y(5);
  const sl = Math.hypot(sx - ex, sy - ey) || 1;
  const sang = Math.atan2(sy - ey, sx - ex) - Math.PI / 2;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(sang);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1) - 0.5;
    ctx.strokeStyle = i % 3 === 1 ? SILVER.hi : i % 3 === 0 ? SILVER.mid : SILVER.lo;
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.moveTo(f * w * 1.9, 0);
    ctx.quadraticCurveTo(f * w * 2.1, sl * 0.5, f * w * 2.5, sl * (0.92 + 0.08 * Math.cos(i * 2.3)));
    ctx.stroke();
  }
  ctx.restore();
}
