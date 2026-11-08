// '마흔 날' plate: forty days of steeping for the four scents, one vial per day.
// Same composition as design/works/perfume/forty-days.png, drawn live so the type stays crisp and
// the layout can turn into a ledger on narrow screens.
import { SCENTS } from './scents.js';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const ease = (t) => 1 - Math.pow(1 - t, 2.2);
function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function squircle(ctx, cx, cy, w, h, n = 4.2, steps = 40) {
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    const x = cx + Math.sign(c) * Math.abs(c) ** (2 / n) * w / 2;
    const y = cy + Math.sign(s) * Math.abs(s) ** (2 / n) * h / 2;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function vial(ctx, cx, cy, w, h, day, scent, r, ink, final) {
  const light = hex(scent.liquid.light), body = hex(scent.liquid.body), deep = hex(scent.liquid.deep);
  const t = Math.min(day, 40) / 40;
  const col = final ? body : mix(mix(light, [250, 247, 240], 0.55), body, ease(t));
  const level = cy - h / 2 + h * 0.26;
  ctx.save();
  squircle(ctx, cx, cy, w - 1.6, h - 1.6);
  ctx.clip();
  ctx.fillStyle = rgba(col);
  ctx.fillRect(cx - w, level, w * 2, h);
  ctx.fillStyle = rgba(mix(col, [255, 255, 255], 0.45));
  ctx.fillRect(cx - w, level, w * 2, Math.max(0.75, h * 0.012));
  if (!final) {
    const settle = Math.min(1, t ** 1.35 * 1.08);
    const bottom = cy + h / 2 - Math.max(2, h * 0.06);
    ctx.fillStyle = rgba(deep, 0.6 + 0.3 * settle);
    const count = h > 40 ? 14 : h > 20 ? 8 : 5;
    for (let k = 0; k < count; k++) {
      const rx = (r() - 0.5) * 0.68 * w;
      const ry0 = 0.04 + r() * 0.94;
      const ybed = bottom - r() * Math.max(1, h * 0.04) * (0.4 + settle);
      const ysus = level + (bottom - level) * ry0;
      const y = ysus + (ybed - ysus) * settle;
      const rad = (0.45 + r() * 0.45) * Math.max(0.7, Math.min(1.3, h / 60));
      ctx.beginPath(); ctx.arc(cx + rx, y, rad, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  squircle(ctx, cx, cy, w, h);
  ctx.strokeStyle = rgba(ink, 0.42);
  ctx.lineWidth = 0.75;
  ctx.stroke();
}

export function drawPlate(canvas) {
  const ctx = canvas.getContext('2d');
  let ink = [42, 23, 8];
  let raf = 0;

  function readInk() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    const m = /^#([0-9a-f]{6})$/i.exec(v);
    if (m) ink = hex(v);
    else {
      const n = v.match(/[\d.]+/g);
      if (n && n.length >= 3) ink = n.slice(0, 3).map(Number);
    }
  }

  function draw() {
    raf = 0;
    readInk();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const r = rng(40);
    const f = (style) => { ctx.font = style; };
    ctx.fillStyle = rgba(ink);
    ctx.textBaseline = 'alphabetic';

    const ar = W / H;
    if (ar > 1.6) {
      // wide: 4 rows x 41 columns
      const labelW = Math.min(170, W * 0.13);
      const top = 64, bottom = 56;
      const gx = labelW, gw = W - gx;
      const colw = gw / 41.8;
      const rowh = (H - top - bottom) / 4;
      const vw = colw * 0.62, vh = Math.min(rowh * 0.66, vw * 3.2);
      f('italic 300 15px Newsreader, serif');
      ctx.textAlign = 'center';
      for (let day = 1; day <= 41; day++) {
        const x = gx + colw * (day - 0.5) + (day === 41 ? colw * 0.8 : 0);
        const big = [1, 10, 20, 30, 40, 41].includes(day);
        ctx.fillStyle = rgba(ink, big ? 0.55 : 0.28);
        ctx.fillRect(x - 0.4, top - (big ? 14 : 8), 0.8, big ? 10 : 5);
        if (big) { ctx.fillStyle = rgba(ink, 0.9); ctx.fillText(String(day), x, top - 22); }
      }
      ctx.fillStyle = rgba(ink, 0.22);
      ctx.fillRect(gx, top - 4, colw * 40, 0.8);
      f('400 12.5px "Plex KR", sans-serif');
      ctx.fillStyle = rgba(ink, 0.75);
      ctx.textAlign = 'left';
      ctx.fillText('담근 날', gx + colw * 0.5 - 8, top - 44);
      ctx.textAlign = 'right';
      ctx.fillText('거른 날', W, top - 44);
      SCENTS.forEach((s, i) => {
        const cy = top + rowh * (i + 0.5) + 4;
        ctx.textAlign = 'left';
        f('italic 300 14px Newsreader, serif'); ctx.fillStyle = rgba(ink, 0.7);
        ctx.fillText(`No.${s.no}`, 0, cy - 8);
        f('300 21px Hahmlet, serif'); ctx.fillStyle = rgba(ink);
        ctx.fillText(s.name, 0, cy + 18);
        for (let day = 1; day <= 41; day++) {
          const x = gx + colw * (day - 0.5) + (day === 41 ? colw * 0.8 : 0);
          vial(ctx, x, cy, vw, vh, day, s, r, ink, day === 41);
        }
      });
      // bracket with the title in its gap
      const by = H - 22;
      const x0 = gx + colw * 0.5, x1 = gx + colw * 39.5, mid = (x0 + x1) / 2;
      f('300 17px Hahmlet, serif');
      const tw = ctx.measureText('마흔 날').width / 2 + 14;
      ctx.fillStyle = rgba(ink, 0.35);
      ctx.fillRect(x0, by, mid - tw - x0, 0.8); ctx.fillRect(mid + tw, by, x1 - mid - tw, 0.8);
      ctx.fillRect(x0, by - 6, 0.8, 6); ctx.fillRect(x1, by - 6, 0.8, 6);
      ctx.fillStyle = rgba(ink, 0.9); ctx.textAlign = 'center';
      ctx.fillText('마흔 날', mid, by + 6);
    } else if (ar > 0.8) {
      // medium: two blocks of twenty days (the second ends with the filtered day)
      const labelW = 64, top = 52, gap = 54;
      const gx = labelW, gw = W - gx;
      const colw = gw / 21.8;
      const blockH = (H - top - gap) / 2;
      const rowh = blockH / 4;
      const vw = colw * 0.6, vh = Math.min(rowh * 0.7, vw * 3.0);
      [[1, 20], [21, 41]].forEach(([a, b], bi) => {
        const btop = top + bi * (blockH + gap);
        f('italic 300 14px Newsreader, serif');
        ctx.textAlign = 'center';
        for (let day = a; day <= b; day++) {
          const x = gx + colw * (day - a + 0.5) + (day === 41 ? colw * 0.8 : 0);
          const big = [1, 10, 20, 21, 30, 40, 41].includes(day);
          ctx.fillStyle = rgba(ink, big ? 0.55 : 0.28);
          ctx.fillRect(x - 0.4, btop - (big ? 12 : 7), 0.8, big ? 9 : 4);
          if (big) {
            ctx.fillStyle = rgba(ink, 0.9);
            if (day === 41) { ctx.textAlign = 'right'; ctx.fillText('41', W, btop - 18); ctx.textAlign = 'center'; }
            else ctx.fillText(String(day), x, btop - 18);
          }
        }
        SCENTS.forEach((s, i) => {
          const cy = btop + rowh * (i + 0.5) + 2;
          ctx.textAlign = 'left';
          f('300 16px Hahmlet, serif'); ctx.fillStyle = rgba(ink);
          ctx.fillText(s.name, 0, cy + 6);
          for (let day = a; day <= b; day++) {
            const x = gx + colw * (day - a + 0.5) + (day === 41 ? colw * 0.8 : 0);
            vial(ctx, x, cy, vw, vh, day, s, r, ink, day === 41);
          }
        });
      });
    } else {
      // narrow: a ledger, days run down the page, one column per scent
      const top = 46, left = 40, bottom = 8;
      const colw = (W - left) / 4;
      const rows = 41;
      const rowh = (H - top - bottom) / (rows + 0.6);
      const vh = rowh * 0.84, vw = Math.min(colw * 0.5, vh * 2.6);
      SCENTS.forEach((s, i) => {
        const cx = left + colw * (i + 0.5);
        ctx.textAlign = 'center';
        f('300 15px Hahmlet, serif'); ctx.fillStyle = rgba(ink);
        ctx.fillText(s.name, cx, top - 20);
        for (let day = 1; day <= rows; day++) {
          const cy = top + rowh * (day - 0.5) + (day === 41 ? rowh * 0.6 : 0);
          // vials lie on their side so forty of them fit down a phone
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(-Math.PI / 2);
          vial(ctx, 0, 0, vh, vw, day, s, r, ink, day === 41);
          ctx.restore();
        }
      });
      f('italic 300 12.5px Newsreader, serif');
      ctx.textAlign = 'left';
      for (const day of [1, 10, 20, 30, 40, 41]) {
        const cy = top + rowh * (day - 0.5) + (day === 41 ? rowh * 0.6 : 0);
        ctx.fillStyle = rgba(ink, 0.85);
        ctx.fillText(day === 41 ? '41' : String(day), 0, cy + 4);
        ctx.fillStyle = rgba(ink, 0.3);
        ctx.fillRect(18, cy, 10, 0.8);
      }
      f('400 11.5px "Plex KR", sans-serif');
      ctx.fillStyle = rgba(ink, 0.7);
      ctx.fillText('일째', 0, top - 20);
    }
  }

  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  new ResizeObserver(schedule).observe(canvas);
  return { redraw: schedule };
}
