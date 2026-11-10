// Offline check of the house air: run cloth.js in node and measure how much the cloth moves at rest.
//   node design/works/curtain/scripts/air.mjs W H [full|calm] [samples]   (dev tool, not deployed)
import { Cloth } from '../../../../works/curtain/js/cloth.js';

function layout(W, H) {
  const phone = W < 600;
  const hemGap = Math.round(Math.min(14, Math.max(8, H * 0.012)));
  return {
    W, H, phone, top: -6, hem: H - hemGap, floor: H - 2,
    side: phone ? -10 : -Math.round(Math.max(24, W * 0.035)), overlap: 10,
    pleat: Math.max(1, Math.min(1.8, 0.62 / Math.max(0.2, W / 2 / H))), nx: phone ? 19 : 31, ny: phone ? 22 : 26,
  };
}
const W = Number(process.argv[2]), H = Number(process.argv[3]), mode = process.argv[4] || 'full';
const L = layout(W, H);
const cu = new Cloth(L);
if (L.phone) cu.iters = 7;
cu.settle(200);
const M = mode === 'calm' ? { damp: 0.94, air: 0.8, airRate: 0.8 } : { damp: 0.985, air: 1, airRate: 1 };
cu.damp = M.damp; cu.air = M.air; cu.airRate = M.airRate;
const rest = Float32Array.from(cu.x);
const { nx, ny } = cu;
const hemL = cu.idx(0, nx - 1, ny - 1), hemR = cu.idx(1, nx - 1, ny - 1);
const midL = cu.idx(0, (nx / 2) | 0, ny - 1), midRow = cu.idx(0, (nx / 2) | 0, (ny / 2) | 0);
let maxGap = -1e9, maxMid = 0, maxMidRow = 0, maxSpeed = 0, openFrac = 0, steps = 0, maxSqueeze = 0;
const t0 = performance.now();
const secs = 60;
const samples = [];
for (let s = 0; s < secs * 60; s++) {
  cu.step(1 / 60);
  if (s < 120) continue;
  const gap = cu.x[hemR] - cu.x[hemL];          // > 0: the lead edges have parted at the hem
  maxGap = Math.max(maxGap, gap);
  if (gap > 0) openFrac++;
  steps++;
  maxMid = Math.max(maxMid, Math.abs(cu.x[midL] - rest[midL]));
  maxMidRow = Math.max(maxMidRow, Math.abs(cu.x[midRow] - rest[midRow]));
  maxSpeed = Math.max(maxSpeed, Math.sqrt(cu.motion) * 60);
  for (let i = 0; i < nx - 1; i++) {
    const k = cu.idx(0, i, ny - 1);
    maxSqueeze = Math.max(maxSqueeze, 1 - (cu.x[k + 1] - cu.x[k]) / cu.dx);
  }
  if (s % 30 === 0) samples.push([(s / 60).toFixed(1), gap.toFixed(1), (cu.x[midL] - rest[midL]).toFixed(1)].join(':'));
}
const ms = (performance.now() - t0) / (secs * 60);
console.log(`${W}x${H} ${mode}: seam gap max ${maxGap.toFixed(1)}px, parted ${(100 * openFrac / steps).toFixed(0)}% of the time; ` +
  `hem drift max ${maxMid.toFixed(1)}px; mid-height ${maxMidRow.toFixed(1)}px; top speed ${maxSpeed.toFixed(0)}px/s; ` +
  `max hem squeeze ${(maxSqueeze * 100).toFixed(0)}%; ${ms.toFixed(3)} ms/step`);
if (process.argv[5]) console.log(samples.join(' '));
