// The rotating planisphere (회전 성도판), drawn on Canvas 2D in red ink only.
//
// Geometry follows a paper planisphere for 37.5 deg N, held overhead facing south (east on the
// left). The star disc is an equidistant polar projection: the north celestial pole at the
// centre, dec -60 at the chart edge. A disc point at right ascension a sits at screen angle
// psi = LST - a, measured from straight down (south) towards the right (west). The holder plate
// with the horizon window and the hour ring does not move; the disc, its stars and its date
// ring turn underneath it.

import { STARS, DESIG, NAMES, FIGURES } from './sky-data.js';
import { OBJECTS } from './objects.js';
import * as A from './astro.js';

export const INK = { night: '#000000', lamp: '#FF4436', filter: '#A3141B', ember: '#3D0709' };
const SERIF = '"Bueongjae Serif", serif';
const MONO = '"Bueongjae Mono", monospace';
const DEC_EDGE = -60;
const SPAN = 90 - DEC_EDGE;
const SID = 360.98564736629;          // degrees of sidereal rotation per solar day
const DAY_SHIFT = SID - 360;          // 0.9856 deg per day at the same clock time
const RAD = Math.PI / 180;
const N = STARS.length / 3;

// ---- static data in normalised polar form (radius 1 = chart edge) -------------------------
const sRa = new Float32Array(N);
const sR = new Float32Array(N);
const sMag = new Float32Array(N);
const sDec = new Float32Array(N);
for (let i = 0; i < N; i++) {
  sRa[i] = STARS[i * 3] / 100;
  sDec[i] = STARS[i * 3 + 1] / 100;
  sR[i] = (90 - sDec[i]) / SPAN;
  sMag[i] = STARS[i * 3 + 2] / 100;
}
const objR = OBJECTS.map((o) => (90 - o.dec) / SPAN);

// horizon window outline, fixed on screen: list of [x, y] in chart-radius units
const WINDOW = [];
for (let az = 0; az <= 360; az += 1) {
  const { dec, ha } = A.horizonToEq(0, az);
  const r = (90 - dec) / SPAN;
  WINDOW.push([r * Math.sin(ha * RAD), r * Math.cos(ha * RAD)]);
}

const WIN_HALF_W = Math.max(...WINDOW.map(([x]) => Math.abs(x)));

// ecliptic and Milky Way stipple in disc-frame polar form [r, ra]
const ECLIPTIC = [];
for (let l = 0; l <= 360; l += 2) {
  const p = A.eclipticPoint(l);
  ECLIPTIC.push([(90 - p.dec) / SPAN, p.ra]);
}
const MILKY = (() => {
  let seed = 0x5eed1e;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pts = [];
  while (pts.length < 7000 * 3) {
    const l = rnd() * 360;
    const c = Math.cos((l / 2) * RAD) ** 2;           // 1 toward the galactic centre
    if (rnd() > 0.3 + 0.7 * c) continue;
    const w = 3.2 + 6.5 * c;
    const g = Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    const b = g * w * 0.75 + (l < 60 || l > 330 ? 1.2 : 0);
    if (l > 12 && l < 75 && b > 0.2 && b < 4 && rnd() < 0.75) continue;  // the Great Rift
    const p = A.galToEq(l, b);
    if (p.dec < DEC_EDGE - 2) continue;
    pts.push((90 - p.dec) / SPAN, p.ra, 0);
  }
  return pts;
})();

// constellation label anchors: mean of the unique stars, in disc-frame cartesian units
const FIG = FIGURES.map((f) => {
  const ids = [...new Set(f.lines.flat())];
  const segs = [];
  for (const line of f.lines) for (let k = 0; k < line.length - 1; k++) segs.push([line[k], line[k + 1]]);
  // anchor from the first polyline (Serpens keeps its head)
  const anchorIds = [...new Set(f.lines[0])];
  return { ...f, ids, segs, anchorIds };
});

function starRadius(mag, k) {
  return Math.max(0.65, (0.5 + (4.8 - mag) * 0.52) * k);
}

const norm180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

export function createPlanisphere({ canvas, wrap, reduced, onChange, onSelect }) {
  const ctx = canvas.getContext('2d');
  let ms = Date.now();
  let shown = ms;            // the instant actually drawn (differs from ms during a tween)
  let S = 600;
  let dpr = 1;
  let geo = null;
  let sel = null;
  let targets = new Set();
  let showNames = true;
  let zoom = false;
  let visible = true;
  let dirty = true;
  let raf = 0;
  let tween = null;
  let playing = null;
  let drag = null;
  const listeners = { change: onChange, select: onSelect };

  // disc-frame cartesian caches (rebuilt on resize)
  let sx; let sy; let mwx; let mwy; let ox; let oy; let ecx; let ecy;

  function layout() {
    const w = Math.floor(wrap.clientWidth);
    const nextS = Math.max(240, Math.min(w, 760));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (geo && nextS === S && nextDpr === dpr && !layout.force) return;   // height-only changes
    layout.force = false;
    S = nextS;
    dpr = nextDpr;
    canvas.style.width = S + 'px';
    canvas.style.height = S + 'px';
    canvas.width = Math.round(S * dpr);
    canvas.height = Math.round(S * dpr);
    const k = Math.max(0.62, Math.min(1.15, S / 640));
    const margin = Math.round(10 * k + 4);
    const Rd = S / 2 - margin;
    const band = Math.max(16, Math.min(26, S * 0.04));
    const Rp = Rd - band;
    if (zoom) {
      // magnify until the horizon window fills the square, centred on the zenith
      const R = Math.min((S / 2 - 8) / WIN_HALF_W, (S - 16) / 1.2);
      const z = R / (Rp - band);
      geo = { cx: S / 2, cy: S / 2 - 0.35 * R, Rd: Rd * z, Rp: Rp * z, R, k, band: band * z };
    } else {
      const R = Rp - band;
      geo = { cx: S / 2, cy: S / 2, Rd, Rp, R, k, band };
    }
    const { R } = geo;
    sx = new Float32Array(N); sy = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      sx[i] = sR[i] * R * Math.sin(-sRa[i] * RAD);
      sy[i] = sR[i] * R * Math.cos(-sRa[i] * RAD);
    }
    const m = MILKY.length / 3;
    mwx = new Float32Array(m); mwy = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      mwx[i] = MILKY[i * 3] * R * Math.sin(-MILKY[i * 3 + 1] * RAD);
      mwy[i] = MILKY[i * 3] * R * Math.cos(-MILKY[i * 3 + 1] * RAD);
    }
    ox = OBJECTS.map((o, i) => objR[i] * R * Math.sin(-o.ra * RAD));
    oy = OBJECTS.map((o, i) => objR[i] * R * Math.cos(-o.ra * RAD));
    ecx = ECLIPTIC.map(([r, ra]) => r * R * Math.sin(-ra * RAD));
    ecy = ECLIPTIC.map(([r, ra]) => r * R * Math.cos(-ra * RAD));
    dirty = true;
    request();
  }

  // ---- helpers -------------------------------------------------------------------------
  function toScreen(dx, dy, lst) {
    const c = Math.cos(-lst * RAD);
    const s = Math.sin(-lst * RAD);
    // canvas rotate(theta) maps (x, y) -> (x c - y s, x s + y c); we rotate by -lst
    return [geo.cx + dx * c - dy * s, geo.cy + dx * s + dy * c];
  }
  function altAtScreen(x, y) {
    const dx = (x - geo.cx) / geo.R;
    const dy = (y - geo.cy) / geo.R;
    const r = Math.hypot(dx, dy);
    const dec = 90 - r * SPAN;
    const ha = Math.atan2(dx, dy) / RAD;
    const p = A.LAT * RAD;
    const s = Math.sin(p) * Math.sin(dec * RAD) + Math.cos(p) * Math.cos(dec * RAD) * Math.cos(ha * RAD);
    return Math.asin(Math.max(-1, Math.min(1, s))) / RAD;
  }
  function windowPath() {
    const { cx, cy, R } = geo;
    const p = new Path2D();
    WINDOW.forEach(([x, y], i) => (i ? p.lineTo(cx + x * R, cy + y * R) : p.moveTo(cx + x * R, cy + y * R)));
    p.closePath();
    return p;
  }
  /** Night date (KST) a planisphere would use: before noon belongs to the previous evening. */
  function nightOf(t) {
    const p = A.kstParts(t);
    return p.min < 720 ? A.kstParts(A.kstInstant(p.y, p.m, p.d, 0) - 86400000) : p;
  }
  /** Screen angle (deg) of hour-ring position for minutes after midnight. */
  function hourAngle(minutes) {
    const te = (((minutes / 60 - 12) % 24) + 24) % 24;
    return (SID / 24) * te - (SID / 24) * 12;
  }

  function textOnRing(text, psi, r, font, color, flipAllowed = true) {
    const { cx, cy } = geo;
    const x = cx + r * Math.sin(psi * RAD);
    const y = cy + r * Math.cos(psi * RAD);
    let rot = -psi * RAD;
    if (flipAllowed && Math.abs(norm180(psi)) > 90) rot += Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // ---- drawing --------------------------------------------------------------------------
  function draw() {
    dirty = false;
    if (!geo) return;
    const { cx, cy, Rd, Rp, R, k, band } = geo;
    const t = shown;
    const lst = A.lstDeg(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK.night;
    ctx.fillRect(0, 0, S, S);
    ctx.lineCap = 'butt';

    // --- the disc rim with the date ring (rotates) ---
    ctx.strokeStyle = INK.filter;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, Rd, 0, Math.PI * 2); ctx.stroke();
    const night = nightOf(t);
    const base = A.kstInstant(night.y, night.m, night.d, 720);
    ctx.strokeStyle = INK.lamp;
    ctx.beginPath();
    const months = [];
    for (let dd = -183; dd <= 182; dd++) {
      const day = base + dd * 86400000;
      const psi = lst - (A.lstDeg(day) + (SID / 24) * 12);
      const p = A.kstParts(day);
      const len = p.d === 1 ? band * 0.62 : p.d % 10 === 0 ? band * 0.42 : p.d % 5 === 0 ? band * 0.3 : band * 0.18;
      const s = Math.sin(psi * RAD);
      const c = Math.cos(psi * RAD);
      ctx.moveTo(cx + Rp * s, cy + Rp * c);
      ctx.lineTo(cx + (Rp + len) * s, cy + (Rp + len) * c);
      if (p.d === 15) months.push([p.m, psi]);
    }
    ctx.lineWidth = Math.max(0.8, 0.9 * k);
    ctx.stroke();
    const monthFont = `700 ${Math.round(Math.max(10, 11.5 * k))}px ${SERIF}`;
    for (const [m, psi] of months) textOnRing(m + '월', psi, Rp + band * 0.74, monthFont, INK.lamp);

    // --- the sky seen through the window ---
    const win = windowPath();
    ctx.save();
    ctx.clip(win);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-lst * RAD);
    // Milky Way stipple
    const dot = Math.max(1.2, 1.6 * k);
    ctx.fillStyle = INK.ember;
    for (let i = 0; i < mwx.length; i++) ctx.fillRect(mwx[i], mwy[i], dot, dot);
    // ecliptic
    ctx.strokeStyle = INK.filter;
    ctx.lineWidth = 1;
    ctx.setLineDash([2 * k, 5 * k]);
    ctx.beginPath();
    ecx.forEach((x, i) => (i ? ctx.lineTo(x, ecy[i]) : ctx.moveTo(x, ecy[i])));
    ctx.stroke();
    ctx.setLineDash([]);
    // constellation lines, stopping short of the stars
    const gap = 2.6 * k;
    const selFig = sel && sel.type === 'fig' ? sel.abbr : null;
    for (const pass of [0, 1]) {
      ctx.beginPath();
      for (const f of FIG) {
        if ((f.abbr === selFig) !== (pass === 1)) continue;
        for (const [a, b] of f.segs) {
          const dx = sx[b] - sx[a];
          const dy = sy[b] - sy[a];
          const L = Math.hypot(dx, dy);
          const ra = starRadius(sMag[a], k) + gap;
          const rb = starRadius(sMag[b], k) + gap;
          if (L <= ra + rb + 1) continue;
          ctx.moveTo(sx[a] + (dx * ra) / L, sy[a] + (dy * ra) / L);
          ctx.lineTo(sx[b] - (dx * rb) / L, sy[b] - (dy * rb) / L);
        }
      }
      ctx.strokeStyle = pass ? INK.lamp : INK.filter;
      ctx.lineWidth = pass ? Math.max(1.6, 2 * k) : Math.max(0.8, 1 * k);
      ctx.stroke();
    }
    // deep-sky symbols (printed-atlas conventions)
    OBJECTS.forEach((o, i) => {
      if (o.kind === 'ds' || o.kind === 'vs') return;
      const hot = targets.has(o.id) || (sel && sel.type === 'obj' && sel.id === o.id);
      ctx.strokeStyle = hot ? INK.lamp : INK.filter;
      ctx.lineWidth = hot ? Math.max(1.2, 1.4 * k) : 1;
      const x = ox[i];
      const y = oy[i];
      const s = 4.6 * k;
      ctx.beginPath();
      if (o.kind === 'gx') {
        ctx.ellipse(x, y, s * 1.25, s * 0.55, -0.5, 0, Math.PI * 2);
      } else if (o.kind === 'gc') {
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      } else if (o.kind === 'oc') {
        ctx.setLineDash([1.6 * k, 1.8 * k]);
        ctx.arc(x, y, s * 1.15, 0, Math.PI * 2);
      } else if (o.kind === 'pn') {
        ctx.arc(x, y, s * 0.6, 0, Math.PI * 2);
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          ctx.moveTo(x + a * s * 0.6, y + b * s * 0.6); ctx.lineTo(x + a * s * 1.25, y + b * s * 1.25);
        }
      } else {
        ctx.rect(x - s, y - s, s * 2, s * 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // stars: black knock-out ring, then a flat red dot
    for (let i = N - 1; i >= 0; i--) {
      const r = starRadius(sMag[i], k);
      ctx.fillStyle = INK.night;
      ctx.beginPath(); ctx.arc(sx[i], sy[i], r + 1.1 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK.lamp;
      ctx.beginPath(); ctx.arc(sx[i], sy[i], r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); // back to screen frame, still clipped

    // sun and moon (screen frame, they move against the stars)
    const sn = A.sun(t);
    const mn = A.moon(t);
    const place = (ra, dec) => {
      const r = ((90 - dec) / SPAN) * R;
      const psi = (lst - ra) * RAD;
      return [cx + r * Math.sin(psi), cy + r * Math.cos(psi)];
    };
    const [sxp, syp] = place(sn.ra, sn.dec);
    ctx.strokeStyle = INK.lamp;
    ctx.fillStyle = INK.lamp;
    ctx.lineWidth = Math.max(1.2, 1.4 * k);
    ctx.beginPath(); ctx.arc(sxp, syp, 7 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(sxp, syp, 1.8 * k, 0, Math.PI * 2); ctx.fill();
    const [mxp, myp] = place(mn.ra, mn.dec);
    drawMoon(mxp, myp, 6.5 * k, mn.illum, Math.atan2(syp - myp, sxp - mxp));

    // labels inside the window
    const boxes = [];
    drawLabels(lst, boxes, mxp, myp, mn);
    ctx.restore(); // unclip

    // --- the holder plate (fixed) ---
    ctx.beginPath();
    ctx.arc(cx, cy, Rp, 0, Math.PI * 2);
    ctx.fillStyle = INK.ember;
    ctx.fill(addPath(new Path2D(), win), 'evenodd');
    ctx.strokeStyle = INK.lamp;
    ctx.lineWidth = Math.max(1.3, 1.6 * k);
    ctx.stroke(win);
    // hour ring printed on the plate edge
    ctx.beginPath();
    for (let m = 0; m < 1440; m += 10) {
      const psi = hourAngle(m) * RAD;
      const len = m % 60 === 0 ? band * 0.42 : m % 30 === 0 ? band * 0.28 : band * 0.16;
      ctx.moveTo(cx + Rp * Math.sin(psi), cy + Rp * Math.cos(psi));
      ctx.lineTo(cx + (Rp - len) * Math.sin(psi), cy + (Rp - len) * Math.cos(psi));
    }
    ctx.strokeStyle = INK.lamp;
    ctx.lineWidth = Math.max(0.8, 0.9 * k);
    ctx.stroke();
    const hourFont = `400 ${Math.round(Math.max(10, 11 * k))}px ${MONO}`;
    for (let h = 0; h < 24; h++) {
      textOnRing(String(h), hourAngle(h * 60), Rp - band * 0.68, hourFont, INK.lamp);
    }
    // plate print: title, compass points, zenith
    ctx.fillStyle = INK.lamp;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(Math.max(12, 15 * k))}px ${SERIF}`;
    ctx.fillText('부엉재천문대 회전 성도판', cx, cy - R * 0.66);
    ctx.font = `400 ${Math.round(Math.max(10, 11 * k))}px ${MONO}`;
    ctx.fillText('북위 37.5°', cx, cy - R * 0.66 + 19 * k);
    if (S >= 420) {
      ctx.font = `400 ${Math.round(Math.max(10, 11.5 * k))}px ${SERIF}`;
      ctx.fillText('날짜 눈금을 시각 눈금에 맞추면', cx, cy - R * 0.66 + 46 * k);
      ctx.fillText('창 안이 그 시각의 하늘입니다', cx, cy - R * 0.66 + 63 * k);
    }
    const cf = `700 ${Math.round(Math.max(11, 13 * k))}px ${SERIF}`;
    ctx.font = cf;
    ctx.fillText('북', cx, cy - 0.25 * R - 11 * k);
    ctx.fillText('동', cx - 0.6 * R - 12 * k, cy);
    ctx.fillText('서', cx + 0.6 * R + 12 * k, cy);
    ctx.fillText('남', cx, cy + 0.95 * R - 11 * k);
    const zy = cy + (52.5 / SPAN) * R;
    ctx.strokeStyle = INK.lamp;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 5 * k, zy); ctx.lineTo(cx + 5 * k, zy);
    ctx.moveTo(cx, zy - 5 * k); ctx.lineTo(cx, zy + 5 * k);
    ctx.stroke();

    // --- the reading pointer: set date on the disc meets set time on the plate ---
    const tp = A.kstParts(t);
    const psiT = hourAngle(tp.min) * RAD;
    const ux = Math.sin(psiT);
    const uy = Math.cos(psiT);
    ctx.strokeStyle = INK.lamp;
    ctx.lineWidth = Math.max(1.4, 1.6 * k);
    ctx.beginPath();
    ctx.moveTo(cx + (R + 2) * ux, cy + (R + 2) * uy);
    ctx.lineTo(cx + (Rd + 2) * ux, cy + (Rd + 2) * uy);
    ctx.stroke();
    const tip = Rd + 3;
    const back = Rd + 3 + 9 * k;
    ctx.fillStyle = INK.lamp;
    ctx.beginPath();
    ctx.moveTo(cx + tip * ux, cy + tip * uy);
    ctx.lineTo(cx + back * ux - 5 * k * uy, cy + back * uy + 5 * k * ux);
    ctx.lineTo(cx + back * ux + 5 * k * uy, cy + back * uy - 5 * k * ux);
    ctx.closePath();
    ctx.fill();
  }

  function addPath(p, win) {
    p.arc(geo.cx, geo.cy, geo.Rp, 0, Math.PI * 2);
    p.addPath(win);
    return p;
  }

  function drawMoon(x, y, r, illum, toSun) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(toSun);
    ctx.fillStyle = INK.night;
    ctx.beginPath(); ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK.lamp;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    // lit part: the half facing the sun (+x), closed by the terminator ellipse
    const e = Math.abs(1 - 2 * illum) * r;
    ctx.fillStyle = INK.lamp;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(0, 0, Math.max(0.01, e), r, 0, Math.PI / 2, -Math.PI / 2, illum < 0.5);
    ctx.fill();
    ctx.restore();
  }

  /** Draw a label with a black knock-out (or a lamp box). Greek letters are set in the
   *  coding face, because Nanum Myeongjo has no Greek. Returns false when it would collide. */
  function labelBox(text, x, y, font, boxes, opts = {}) {
    const hgt = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
    const monoFont = font.replace(SERIF, MONO);
    const parts = text.split(/(?=[α-ω])/).map((t, i) => ({ t, f: i ? monoFont : font }));
    let w = 0;
    for (const q of parts) { ctx.font = q.f; q.w = ctx.measureText(q.t).width; w += q.w; }
    const pad = opts.box ? 4 : 1;
    const left = opts.align === 'left' ? x : x - w / 2;
    const b = [left - pad, y - hgt / 2 - pad, w + pad * 2, hgt + pad * 2];
    if (!opts.force) {
      if (boxes.some((o) => b[0] < o[0] + o[2] && o[0] < b[0] + b[2] && b[1] < o[1] + o[3] && o[1] < b[1] + b[3])) return false;
      if (altAtScreen(b[0], y) < 1 || altAtScreen(b[0] + b[2], y) < 1 || altAtScreen(x, b[1]) < 1 || altAtScreen(x, b[1] + b[3]) < 1) return false;
    }
    boxes.push(b);
    if (opts.box) {
      ctx.fillStyle = INK.lamp;
      ctx.fillRect(b[0], b[1], b[2], b[3]);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let cx0 = left;
    for (const q of parts) {
      ctx.font = q.f;
      if (!opts.box) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = INK.night;
        ctx.strokeText(q.t, cx0, y + 0.5);
      }
      ctx.fillStyle = opts.box ? INK.night : INK.lamp;
      ctx.fillText(q.t, cx0, y + 0.5);
      cx0 += q.w;
    }
    return true;
  }

  function drawLabels(lst, boxes, mx, my, mn) {
    const { k } = geo;
    const small = Math.round(Math.max(10, 11 * k));
    // the selected thing first, forced, boxed
    if (sel) {
      const s = describeAt(sel, shown);
      if (s && s.alt > 0) {
        const [x, y] = s.xy;
        ctx.strokeStyle = INK.lamp;
        ctx.lineWidth = 1.4;
        if (sel.type !== 'fig') {
          ctx.beginPath(); ctx.arc(x, y, 11 * k, 0, Math.PI * 2); ctx.stroke();
        }
        const ly = sel.type === 'fig' ? y : y - 11 * k - small;
        labelBox(s.label, x, ly, `700 ${small + 1}px ${SERIF}`, boxes, { box: true, force: true });
      }
    }
    // moon label
    if (altAtScreen(mx, my) > 2) labelBox('달', mx + 12 * k, my - 10 * k, `700 ${small}px ${SERIF}`, boxes);
    // targets from the tonight list
    OBJECTS.forEach((o, i) => {
      if (!targets.has(o.id) || (sel && sel.type === 'obj' && sel.id === o.id)) return;
      const [x, y] = toScreen(ox[i], oy[i], lst);
      const named = o.kind === 'ds' || o.kind === 'vs';
      labelBox(named ? o.name : o.id, x, y + 10 * k + small / 2, `700 ${small}px ${named ? SERIF : MONO}`, boxes);
    });
    if (!showNames) return;
    // brightest stars
    for (let i = 0; i < N && sMag[i] < 1.3; i++) {
      if (!NAMES[i] || (sel && sel.type === 'star' && sel.i === i)) continue;
      const [x, y] = toScreen(sx[i], sy[i], lst);
      const name = NAMES[i].replace(/\(.*\)/, '');
      labelBox(name, x + starRadius(sMag[i], k) + 3, y, `400 ${small}px ${SERIF}`, boxes, { align: 'left' });
    }
    // constellation names
    for (const f of FIG) {
      if (selFigIs(f.abbr)) continue;
      const [x, y] = anchor(f, lst);
      labelBox(f.ko.replace(/자리$/, ''), x, y, `700 ${small}px ${SERIF}`, boxes);
    }
  }
  const selFigIs = (abbr) => sel && sel.type === 'fig' && sel.abbr === abbr;

  function anchor(f, lst) {
    let ax = 0; let ay = 0;
    for (const i of f.anchorIds) { ax += sx[i]; ay += sy[i]; }
    return toScreen(ax / f.anchorIds.length, ay / f.anchorIds.length, lst);
  }

  /** Where a selection is on screen at instant t, and what to call it. */
  function describeAt(s, t) {
    const lst = A.lstDeg(t);
    if (s.type === 'star') {
      const xy = toScreen(sx[s.i], sy[s.i], lst);
      const h = A.altAz(sRa[s.i], sDec[s.i], lst);
      return { xy, ...h, label: (NAMES[s.i] || greekName(s.i)).replace(/\(.*\)/, '') };
    }
    if (s.type === 'obj') {
      const i = OBJECTS.findIndex((o) => o.id === s.id);
      if (i < 0) return null;
      const o = OBJECTS[i];
      const xy = toScreen(ox[i], oy[i], lst);
      return { xy, ...A.altAz(o.ra, o.dec, lst), label: o.name };
    }
    if (s.type === 'fig') {
      const f = FIG.find((x) => x.abbr === s.abbr);
      const xy = anchor(f, lst);
      const dx = (xy[0] - geo.cx) / geo.R;
      const dy = (xy[1] - geo.cy) / geo.R;
      const dec = 90 - Math.hypot(dx, dy) * SPAN;
      const ha = Math.atan2(dx, dy) / RAD;
      return { xy, ...A.altAz(lst - ha, dec, lst), label: f.ko };
    }
    return null;
  }

  // ---- hit testing -----------------------------------------------------------------------
  function hit(x, y) {
    if (altAtScreen(x, y) < 0) return null;
    const lst = A.lstDeg(shown);
    const { k } = geo;
    let best = null;
    let bestD = 18 * Math.max(1, k);
    OBJECTS.forEach((o, i) => {
      if (o.kind === 'ds' || o.kind === 'vs') return;
      const [px, py] = toScreen(ox[i], oy[i], lst);
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) { bestD = d; best = { type: 'obj', id: o.id }; }
    });
    if (best) return best;
    let bestS = -1;
    let score = 1e9;
    for (let i = 0; i < N; i++) {
      const [px, py] = toScreen(sx[i], sy[i], lst);
      const d = Math.hypot(px - x, py - y);
      if (d > 16 * Math.max(1, k)) continue;
      const sc = d - (5 - sMag[i]) * 2.2;
      if (sc < score) { score = sc; bestS = i; }
    }
    if (bestS >= 0) {
      const dbl = OBJECTS.find((o) => (o.kind === 'ds' || o.kind === 'vs')
        && Math.abs(o.dec - sDec[bestS]) < 0.3 && Math.abs(norm180(o.ra - sRa[bestS])) < 0.4);
      return dbl ? { type: 'obj', id: dbl.id } : { type: 'star', i: bestS };
    }
    let fig = null;
    let fd = 14;
    for (const f of FIG) {
      for (const [a, b] of f.segs) {
        const [x1, y1] = toScreen(sx[a], sy[a], lst);
        const [x2, y2] = toScreen(sx[b], sy[b], lst);
        const vx = x2 - x1; const vy = y2 - y1;
        const u = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / (vx * vx + vy * vy || 1)));
        const d = Math.hypot(x1 + u * vx - x, y1 + u * vy - y);
        if (d < fd) { fd = d; fig = { type: 'fig', abbr: f.abbr }; }
      }
    }
    return fig;
  }

  function greekName(i) {
    const d = DESIG[i];
    if (!d) return '이름 없는 별';
    const [des, con] = [d.slice(0, -4), d.slice(-3)];
    const conName = CON_KO[con] || con;
    const m = /^([A-Z][a-z]{1,2})(\d?)$/.exec(des);
    if (m && GREEK[m[1]]) return `${conName} ${GREEK[m[1]]}${m[2] ? SUP[m[2]] : ''}`;
    return `${conName} ${des}번 별`;
  }

  // ---- loop ------------------------------------------------------------------------------
  function request() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }
  let last = 0;
  function frame(now) {
    raf = 0;
    const away = !visible || document.hidden;
    if (away && tween) { shown = tween.to; tween = null; emit('change', 'tween'); }
    if (away) {
      // off screen or tab hidden: no loop. Draw once so the canvas is never left blank;
      // a running play pauses here and resumes when the disc is back in view.
      last = 0;
      draw();
      return;
    }
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    let more = false;
    if (tween) {
      const p = Math.min(1, (now - tween.start) / tween.dur);
      const e = 1 - (1 - p) ** 3;
      shown = tween.from + (tween.to - tween.from) * e;
      if (p >= 1) { shown = tween.to; tween = null; } else more = true;
      emit('change', 'tween');
    } else if (playing) {
      ms += dt * 3600;       // one hour per second
      if (ms >= playing.until) { ms = playing.until; stopPlay(); } else more = true;
      shown = ms;
      emit('change', 'play');
    }
    draw();
    if (more) request(); else last = 0;
  }
  function emit(kind, source) {
    if (kind === 'change' && listeners.change) listeners.change(shown, source);
    if (kind === 'select' && listeners.select) listeners.select(sel);
  }

  function set(t, { animate = false, source = 'set' } = {}) {
    stopPlay();
    const from = shown;
    ms = t;
    if (animate && !reduced() && Math.abs(t - from) < 86400000 * 40) {
      tween = { from, to: t, start: performance.now(), dur: typeof animate === 'number' ? animate : 280 };
    } else {
      tween = null;
      shown = t;
      emit('change', source);
    }
    request();
  }

  function play(until) {
    if (reduced()) return;
    tween = null;
    shown = ms;
    playing = { until };
    request();
    if (listeners.play) listeners.play(true);
  }
  function stopPlay() {
    if (!playing) return;
    playing = null;
    if (listeners.play) listeners.play(false);
  }

  // ---- pointer ---------------------------------------------------------------------------
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !geo) return;
    if (drag) return;
    const [x, y] = local(e);
    const r = Math.hypot(x - geo.cx, y - geo.cy);
    if (r > geo.Rd + 14) return;
    stopPlay();
    if (tween) { ms = tween.to; shown = ms; tween = null; }
    drag = { id: e.pointerId, x, y, ang: Math.atan2(x - geo.cx, y - geo.cy) / RAD,
      mode: r > geo.Rp ? 'date' : 'time', moved: false, acc: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const [x, y] = local(e);
    if (!drag.moved && Math.hypot(x - drag.x, y - drag.y) < 6) return;
    if (!drag.moved) { drag.moved = true; wrap.classList.add('is-dragging'); if (listeners.dragstart) listeners.dragstart(); }
    if (Math.hypot(x - geo.cx, y - geo.cy) < geo.R * 0.06) return;
    const ang = Math.atan2(x - geo.cx, y - geo.cy) / RAD;
    const d = norm180(ang - drag.ang);
    drag.ang = ang;
    if (drag.mode === 'time') {
      ms += (d / SID) * 86400000;
    } else {
      drag.acc += d / DAY_SHIFT;
      const steps = Math.trunc(drag.acc);
      if (steps) { ms += steps * 86400000; drag.acc -= steps; }
    }
    shown = ms;
    emit('change', 'drag');
    request();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasTap = !drag.moved;
    const [x, y] = local(e);
    drag = null;
    wrap.classList.remove('is-dragging');
    if (e.type === 'pointerup' && wasTap) {
      sel = hit(x, y);
      emit('select');
      request();
    } else {
      // settle on a whole minute so the readout and the chart agree
      ms = Math.round(ms / 60000) * 60000;
      shown = ms;
      emit('change', 'dragend');
      request();
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // ---- observers -------------------------------------------------------------------------
  const ro = new ResizeObserver(() => layout());
  ro.observe(wrap);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && (dirty || tween || playing)) request();
    if (visible && listeners.firstview) { const f = listeners.firstview; listeners.firstview = null; f(); }
  }, { threshold: 0.05 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPlay();
    else if (dirty) request();
  });
  if (document.fonts) document.fonts.ready.then(() => { dirty = true; request(); });

  layout();

  return {
    get ms() { return ms; },
    get shown() { return shown; },
    get playing() { return !!playing; },
    set,
    play,
    stop: stopPlay,
    on(kind, fn) { listeners[kind] = fn; },
    select(s) { sel = s; emit('select'); request(); },
    get selection() { return sel; },
    setTargets(ids) { targets = new Set(ids); request(); },
    setShowNames(v) { showNames = v; request(); },
    setZoom(v) { zoom = v; layout.force = true; layout(); },
    describe: (s, t = shown) => describeAt(s, t),
    starName: (i) => NAMES[i] || greekName(i),
    starDesig: (i) => greekName(i),
    starMag: (i) => sMag[i],
    starPos: (i) => ({ ra: sRa[i], dec: sDec[i] }),
    figures: () => FIG,
    figureAlt(abbr, t = shown) {
      const f = FIG.find((x) => x.abbr === abbr);
      const [x, y] = anchor(f, A.lstDeg(t));
      return altAtScreen(x, y);
    },
    redraw() { dirty = true; request(); },
  };
}

const GREEK = { Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η', The: 'θ',
  Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ', Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ',
  Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω' };
const SUP = { 1: '¹', 2: '²', 3: '³' };
const CON_KO = { And: '안드로메다자리', Ant: '공기펌프자리', Aqr: '물병자리', Aql: '독수리자리', Ara: '제단자리',
  Ari: '양자리', Aur: '마차부자리', Boo: '목동자리', Cae: '조각칼자리', Cam: '기린자리', Cnc: '게자리',
  CVn: '사냥개자리', CMa: '큰개자리', CMi: '작은개자리', Cap: '염소자리', Car: '용골자리',
  Cas: '카시오페이아자리', Cen: '센타우루스자리', Cep: '케페우스자리', Cet: '고래자리', Col: '비둘기자리',
  Com: '머리털자리', CrA: '남쪽왕관자리', CrB: '북쪽왕관자리', Crv: '까마귀자리', Crt: '컵자리',
  Cyg: '백조자리', Del: '돌고래자리', Dor: '황새치자리', Dra: '용자리', Equ: '조랑말자리',
  Eri: '에리다누스자리', For: '화로자리', Gem: '쌍둥이자리', Gru: '두루미자리', Her: '헤르쿨레스자리',
  Hor: '시계자리', Hya: '바다뱀자리', Ind: '인디언자리', Lac: '도마뱀자리', Leo: '사자자리',
  LMi: '작은사자자리', Lep: '토끼자리', Lib: '천칭자리', Lup: '이리자리', Lyn: '살쾡이자리',
  Lyr: '거문고자리', Mic: '현미경자리', Mon: '외뿔소자리', Nor: '직각자자리', Oph: '뱀주인자리',
  Ori: '오리온자리', Pav: '공작자리', Peg: '페가수스자리', Per: '페르세우스자리', Phe: '봉황자리',
  Pic: '화가자리', Psc: '물고기자리', PsA: '남쪽물고기자리', Pup: '고물자리', Pyx: '나침반자리',
  Ret: '그물자리', Sge: '화살자리', Sgr: '궁수자리', Sco: '전갈자리', Scl: '조각가자리', Sct: '방패자리',
  Ser: '뱀자리', Sex: '육분의자리', Tau: '황소자리', Tel: '망원경자리', Tri: '삼각형자리',
  TrA: '남쪽삼각형자리', Tuc: '큰부리새자리', UMa: '큰곰자리', UMi: '작은곰자리', Vel: '돛자리',
  Vir: '처녀자리', Vol: '날치자리', Vul: '여우자리', Cir: '컴퍼스자리', Cru: '남십자자리', Hyi: '물뱀자리' };
