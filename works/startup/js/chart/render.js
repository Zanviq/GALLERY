// Draws one frame of the live chart: static layer, overlays, debris, boats, labels, neatline.
import { W, H, TOP, ISLANDS, WATER_NAMES, BASE } from './world.js';
import { TIDE_PERIOD } from './sim.js';

const INK = '#13293d';
const MAGENTA = '168, 24, 111';
const SIGNAL = '#e2531c';
const LON0 = 19.0, LON_PER = 10.5 / W;   // minutes east of 128°
const LAT0 = 53.0, LAT_PER = 5.4 / H;    // minutes north of 34° at the top edge
const FONT = '"Mulgil Sans", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const SERIF = '"Hahmlet", "AppleMyungjo", "Batang", serif';

const KIND_LABEL = ['스티로폼', '그물·밧줄', '플라스틱', '기타'];

export function drawFrame(ctx, v, sim, world, stat, disp) {
  const { w, h, dpr, cam } = v;
  const z = cam.z;
  const ox = w / 2 - cam.x * z, oy = h / 2 - cam.y * z;
  const sx = (x) => x * z + ox, sy = (y) => y * z + oy;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#fbfcfc';
  ctx.fillRect(0, 0, w, h);

  // static chart
  const k = z / stat.scale;
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(stat.canvas, 0, TOP * stat.scale);

  // soundings stay the same size at every zoom, as on a real chart
  ctx.fillStyle = '#7f97a5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 9.5px ${FONT}`;
  const subs = [];
  for (const s of world.soundings) {
    const x = s.x * z + ox, y = s.y * z + oy;
    if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
    ctx.setTransform(dpr, 0, -0.18 * dpr, dpr, x * dpr, y * dpr);
    ctx.fillText(String(s.d), 0, 0);
    if (s.sub >= 0) subs.push(s, x, y);
  }
  ctx.font = `400 7px ${FONT}`;
  for (let q = 0; q < subs.length; q += 3) {
    const s = subs[q], x = subs[q + 1], y = subs[q + 2];
    ctx.setTransform(dpr, 0, -0.18 * dpr, dpr, x * dpr, y * dpr);
    ctx.fillText(String(s.sub), s.d >= 10 ? 9.5 : 6.5, 2.6);
  }

  // world-space overlays
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
  const px = 1 / z;                       // one CSS pixel in world units
  const vx0 = -ox / z - 20, vy0 = -oy / z - 20, vx1 = (w - ox) / z + 20, vy1 = (h - oy) / z + 20;

  // tidal stream arrows
  if (disp.arrows > 0.01) {
    ctx.strokeStyle = `rgba(63, 85, 102, ${0.75 * disp.arrows})`;
    ctx.lineWidth = 1.1 * px;
    ctx.lineCap = 'round';
    const cur = { x: 0, y: 0 };
    const G = 64;
    ctx.beginPath();
    for (let y = G / 2; y < H; y += G) {
      for (let x = G / 2; x < W; x += G) {
        if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
        if (world.h(x, y) > -0.5) continue;
        sim.current(x, y, cur);
        const sp = Math.hypot(cur.x, cur.y);
        if (sp < 0.4) continue;
        const L = Math.min(26, 6 + sp * 3) * px;
        const ux = cur.x / sp, uy = cur.y / sp;
        const x0 = x - ux * L / 2, y0 = y - uy * L / 2, x1 = x + ux * L / 2, y1 = y + uy * L / 2;
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        const a = 4.5 * px;
        ctx.moveTo(x1 - ux * a - uy * a * 0.6, y1 - uy * a + ux * a * 0.6);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 - ux * a + uy * a * 0.6, y1 - uy * a - ux * a * 0.6);
      }
    }
    ctx.stroke();
  }

  // forecast: future positions of the fronts
  if (disp.future > 0.01) {
    const steps = [2, 4, 6];
    ctx.lineWidth = 1.2 * px;
    steps.forEach((hrs, si) => {
      const tt = sim.t + (hrs / 12.4) * TIDE_PERIOD;
      const a = disp.future * (0.62 - si * 0.16);
      ctx.strokeStyle = `rgba(${MAGENTA}, ${a})`;
      ctx.setLineDash([2 * px, 3.5 * px]);
      for (const f of sim.fronts) {
        const pts = sim.frontAt(f, tt);
        strokeWater(ctx, pts, world);
      }
    });
    ctx.setLineDash([]);
  }

  // fronts now
  if (disp.fronts > 0.01) {
    ctx.strokeStyle = `rgba(${MAGENTA}, ${0.95 * disp.fronts})`;
    ctx.lineWidth = 2.1 * px;
    ctx.lineCap = 'butt';
    ctx.setLineDash([8 * px, 5 * px]);
    ctx.lineDashOffset = -sim.t * 6 * px;
    const reveal = disp.reveal === undefined ? 1 : disp.reveal;
    for (const f of sim.fronts) strokeWater(ctx, f.cur, world, reveal);
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  // debris
  const N = sim.N;
  const PX = sim.px, PY = sim.py, VX = sim.vx, VY = sim.vy, ST = sim.st;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(19, 41, 61, 0.72)';
  ctx.lineWidth = 2.1 * px;
  ctx.beginPath();
  const tail = 0.36;
  for (let i = 0; i < N; i++) {
    if (ST[i] !== 1) continue;
    const x = PX[i], y = PY[i];
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    let dx = VX[i] * tail, dy = VY[i] * tail;
    const l = Math.hypot(dx, dy);
    const minL = 2.4 * px, maxL = 5.2 * px;
    if (l < minL) { const s = l > 0 ? minL / l : 0; dx = l > 0 ? dx * s : minL; dy *= s; }
    else if (l > maxL) { dx *= maxL / l; dy *= maxL / l; }
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  // beached debris: dots on the shore
  ctx.fillStyle = 'rgba(19, 41, 61, 0.88)';
  ctx.beginPath();
  const br = 2.0 * px;
  for (let i = 0; i < N; i++) {
    if (ST[i] !== 2) continue;
    const x = PX[i], y = PY[i];
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    ctx.moveTo(x + br, y);
    ctx.arc(x, y, br, 0, Math.PI * 2);
  }
  ctx.fill();
  // being collected
  ctx.fillStyle = SIGNAL;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    if (ST[i] !== 3) continue;
    const x = PX[i], y = PY[i];
    const r = 1.6 * px;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();

  // planned routes
  if (disp.routes > 0.01) {
    ctx.strokeStyle = `rgba(19, 41, 61, ${0.7 * disp.routes})`;
    ctx.lineWidth = 1.25 * px;
    ctx.setLineDash([4 * px, 4 * px]);
    for (const b of sim.boats) {
      if (b.state !== 'toLane' && b.state !== 'home') continue;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      for (let q = b.wp; q < b.path.length; q++) ctx.lineTo(b.path[q][0], b.path[q][1]);
      ctx.stroke();
      const end = b.path[b.path.length - 1];
      if (end) {
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(end[0], end[1], 3.2 * px, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([4 * px, 4 * px]);
      }
    }
    ctx.setLineDash([]);
  }

  // tracks
  ctx.lineWidth = 1.3 * px;
  ctx.lineCap = 'round';
  for (const b of sim.boats) {
    const t = b.track;
    if (t.length < 4 || b.alpha <= 0) continue;
    const n = t.length / 2;
    for (let q = 1; q < n; q++) {
      ctx.strokeStyle = `rgba(19, 41, 61, ${(q / n) * 0.45 * b.alpha})`;
      ctx.beginPath();
      ctx.moveTo(t[(q - 1) * 2], t[(q - 1) * 2 + 1]);
      ctx.lineTo(t[q * 2], t[q * 2 + 1]);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(19, 41, 61, ${0.45 * b.alpha})`;
    ctx.beginPath();
    ctx.moveTo(t[t.length - 2], t[t.length - 1]);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // ripples from taps
  for (const rp of sim.ripples) {
    const p = rp.t / 0.8;
    ctx.strokeStyle = `rgba(19, 41, 61, ${0.7 * (1 - p)})`;
    ctx.lineWidth = 1.5 * px;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, (8 + p * 34) * px, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---------- screen space ----------
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bs = Math.max(0.9, Math.min(1.45, z / v.cover));

  // boats
  for (const b of sim.boats) {
    if (b.alpha <= 0.01) continue;
    const x = sx(b.x), y = sy(b.y);
    if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue;
    drawBoat(ctx, x, y, b.heading, 16 * bs, b.alpha);
  }

  // boat labels + load bars
  if (disp.labels > 0.01) {
    ctx.font = `600 12px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const placed = [];
    const hit = (r) => placed.some((p) => r[0] < p[0] + p[2] && r[0] + r[2] > p[0] && r[1] < p[1] + p[3] && r[1] + r[3] > p[1]);
    for (const b of sim.boats) {
      if (b.alpha <= 0.01) continue;
      const bx = sx(b.x), by = sy(b.y);
      if (bx < -60 || bx > w + 60 || by < -40 || by > h + 40) continue;
      const cands = [[bx + 13 * bs, by - 10 * bs], [bx - 13 * bs - 46, by - 10 * bs], [bx + 13 * bs, by + 10 * bs], [bx - 13 * bs - 46, by + 10 * bs]];
      let pos = null;
      for (const c of cands) { const r = [c[0] - 2, c[1] - 9, 50, 25]; if (!hit(r)) { pos = c; placed.push(r); break; } }
      if (!pos) continue;
      const x = pos[0], y = pos[1];
      const a = disp.labels * b.alpha;
      ctx.globalAlpha = a;
      halo(ctx, b.name, x, y, 'rgba(251,252,252,0.92)', 3);
      ctx.fillStyle = INK;
      ctx.fillText(b.name, x, y);
      const bw = 30, bh = 4;
      ctx.fillStyle = 'rgba(147, 167, 179, 0.9)';
      ctx.fillRect(x, y + 9, bw, bh);
      ctx.fillStyle = INK;
      ctx.fillRect(x, y + 9, bw * Math.min(1, b.load / 60), bh);
      ctx.globalAlpha = 1;
    }
  }

  // place names
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 12.5px ${FONT}`;
  for (const s of ISLANDS) {
    if (!s.name) continue;
    const x = sx(s.x + (s.lx || 0)), y = sy(s.y + (s.ly || 0));
    if (x < -60 || x > w + 60 || y < -20 || y > h + 20) continue;
    halo(ctx, s.name, x, y, 'rgba(233, 220, 175, 0.95)', 3);
    ctx.fillStyle = INK;
    ctx.fillText(s.name, x, y);
  }
  for (const n of WATER_NAMES) {
    const x = sx(n.x), y = sy(n.y);
    if (x < -120 || x > w + 120 || y < -30 || y > h + 30) continue;
    ctx.save();
    ctx.translate(x, y);
    if (n.rot) ctx.rotate(n.rot);
    ctx.font = `500 ${n.size}px ${SERIF}`;
    ctx.fillStyle = 'rgba(41, 92, 117, 0.9)';
    ctx.fillText(n.text, 0, 0);
    ctx.restore();
  }
  // base
  {
    const x = sx(BASE.x), y = sy(BASE.y);
    ctx.fillStyle = SIGNAL;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.strokeRect(x - 5, y - 5, 10, 10);
    ctx.font = `600 12.5px ${FONT}`;
    ctx.textAlign = 'left';
    halo(ctx, BASE.name, x + 11, y, 'rgba(233, 220, 175, 0.95)', 3);
    ctx.fillStyle = INK;
    ctx.fillText(BASE.name, x + 11, y);
  }

  // unload readout near the base
  if (disp.unload > 0.01) drawUnload(ctx, sx(BASE.x) + 70, sy(BASE.y) - 6, sim, disp.unload, w, h);

  drawNeatline(ctx, w, h, cam, z);
  drawScale(ctx, w, h, z);
}

function strokeWater(ctx, pts, world, reveal = 1) {
  ctx.beginPath();
  let pen = false;
  const n = Math.round(pts.length * reveal);
  for (let k = 0; k < n; k++) {
    const [x, y] = pts[k];
    if (world.h(x, y) > -0.12) { pen = false; continue; }
    if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function halo(ctx, text, x, y, color, width) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeText(text, x, y);
  ctx.restore();
}

function drawBoat(ctx, x, y, heading, L, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(heading);
  const hw = L * 0.13, off = L * 0.24;
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = INK;
  // deck between the hulls
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-L * 0.36, -off, L * 0.66, off * 2);
  ctx.strokeRect(-L * 0.36, -off, L * 0.66, off * 2);
  // hulls
  ctx.fillStyle = SIGNAL;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-L * 0.5, s * off - hw);
    ctx.lineTo(L * 0.3, s * off - hw);
    ctx.quadraticCurveTo(L * 0.52, s * off, L * 0.3, s * off + hw);
    ctx.lineTo(-L * 0.5, s * off + hw);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // mast
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-L * 0.14, 0, L * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUnload(ctx, x, y, sim, a, w, h) {
  const total = sim.unloadedKg.reduce((s, v) => s + v, 0);
  const bw = 236, bh = 112;
  if (x + bw > w - 16) x = w - 16 - bw;
  if (y + bh > h - 16) y = h - 16 - bh;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#c9d5db';
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, bw, bh);
  ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('오늘 하역', x + 12, y + 22);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(total).toLocaleString('ko-KR')} kg`, x + bw - 12, y + 22);
  const colors = [INK, '#4f7891', '#9cbccb', '#c9d5db'];
  let cx = x + 12;
  const barW = bw - 24;
  for (let q = 0; q < 4; q++) {
    const ww = total > 0 ? (sim.unloadedKg[q] / total) * barW : barW / 4;
    ctx.fillStyle = colors[q];
    ctx.fillRect(cx, y + 32, Math.max(0, ww - 1), 8);
    cx += ww;
  }
  ctx.font = `400 12px ${FONT}`;
  ctx.textAlign = 'left';
  for (let q = 0; q < 4; q++) {
    const col = q % 2, row = q >> 1;
    const lx = x + 12 + col * 112, ly = y + 62 + row * 22;
    ctx.fillStyle = colors[q];
    ctx.fillRect(lx, ly - 8, 8, 8);
    ctx.fillStyle = '#3f5566';
    const pct = total > 0 ? Math.round((sim.unloadedKg[q] / total) * 100) : 0;
    ctx.fillText(`${KIND_LABEL[q]} ${pct}%`, lx + 13, ly);
  }
  ctx.restore();
}

function drawNeatline(ctx, w, h, cam, z) {
  const m = 10, band = 5;
  const x0 = m, y0 = m, x1 = w - m, y1 = h - m;
  ctx.save();
  // frame
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
  ctx.strokeRect(x0 + band + 0.5, y0 + band + 0.5, x1 - x0 - band * 2 - 1, y1 - y0 - band * 2 - 1);
  ctx.fillStyle = INK;
  const ox = w / 2 - cam.x * z, oy = h / 2 - cam.y * z;
  // longitude minutes along top & bottom
  const minA = Math.floor(LON0 + (-ox / z) * LON_PER) - 1, minB = Math.ceil(LON0 + ((w - ox) / z) * LON_PER) + 1;
  ctx.font = `500 11px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for (let mm = minA; mm <= minB; mm++) {
    const xa = ((mm - LON0) / LON_PER) * z + ox, xb = ((mm + 1 - LON0) / LON_PER) * z + ox;
    if (mm % 2 === 0) {
      const a = Math.max(xa, x0 + band), b = Math.min(xb, x1 - band);
      if (b > a) { ctx.fillRect(a, y0, b - a, band); ctx.fillRect(a, y1 - band, b - a, band); }
    }
    if (mm % 2 === 0 && xa > x0 + 60 && xa < x1 - 60) {
      ctx.fillStyle = '#5a6e7c';
      ctx.fillText(`128°${mm}′`, xa, y0 + band + 5);
      ctx.fillStyle = INK;
    }
  }
  // latitude minutes along left & right
  const latA = Math.floor(LAT0 - ((h - oy) / z) * LAT_PER) - 1, latB = Math.ceil(LAT0 - (-oy / z) * LAT_PER) + 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let mm = latA; mm <= latB; mm++) {
    const ya = ((LAT0 - mm) / LAT_PER) * z + oy, yb = ((LAT0 - mm - 1) / LAT_PER) * z + oy;
    if (mm % 2 === 0) {
      const a = Math.max(Math.min(ya, yb), y0 + band), b = Math.min(Math.max(ya, yb), y1 - band);
      if (b > a) { ctx.fillRect(x0, a, band, b - a); ctx.fillRect(x1 - band, a, band, b - a); }
    }
    if (mm % 2 === 1 && ya > y0 + 40 && ya < y1 - 40) {
      ctx.fillStyle = '#5a6e7c';
      ctx.fillText(`34°${mm}′`, x1 - band - 6, ya);
      ctx.fillStyle = INK;
    }
  }
  ctx.restore();
}

function drawScale(ctx, w, h, z) {
  const len = 100 * z;                 // 1 km = 100 world units
  const x1 = w - 30, x0 = x1 - len, y = h - 30;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y + 0.5, len, 4);
  ctx.fillStyle = INK;
  for (let q = 0; q < 4; q += 2) ctx.fillRect(x0 + (len / 4) * q, y, len / 4, 5);
  ctx.font = `500 11px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3f5566';
  ctx.fillText('0', x0, y - 3);
  ctx.fillText('1 km', x1, y - 3);
  // north arrow
  const nx = x0 - 26, ny = y + 3;
  ctx.beginPath();
  ctx.moveTo(nx, ny - 20);
  ctx.lineTo(nx + 5, ny);
  ctx.lineTo(nx, ny - 5);
  ctx.lineTo(nx - 5, ny);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.fillText('북', nx, ny - 22);
  ctx.restore();
}
