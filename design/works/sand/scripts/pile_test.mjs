// Measures what the sand automaton does, without a browser (dev tool, not deployed).
//   node design/works/sand/scripts/pile_test.mjs
// Pours a stream into the empty bottle at a few tilts and prints the pile's slope angles (both
// flanks, from the surface profile), plus the time per frame for the automaton and the stream.
import { Sand } from '../../../../works/sand/js/sim.js';
import GEO from '../../../../works/sand/js/geo.js';

function run(tilt, grains, label) {
  const sim = new Sand(GEO, 12345);
  sim.setOutput(new Uint32Array(GEO.W * GEO.H), new Uint32Array(256 * 8));
  sim.setTilt(tilt);
  const th = (tilt * Math.PI) / 180;
  const sx = Math.sin(th), sy = Math.cos(th);
  let lost = 0, poured = 0, frames = 0, t0 = performance.now(), worst = 0;
  while (poured < grains || sim.pn > 0 || sim.active > 0) {
    const f0 = performance.now();
    if (poured < grains) {
      for (let k = 0; k < 48 && poured < grains; k++, poured++) {
        const j = (sim.rand() - 0.5) * 3.4;
        if (!sim.emit(1 * 32 + sim.shadeFor(), GEO.cx + j * sy - 30 * sx, GEO.mouth - 30 * sy - j * sx, 0.7 * sx, 0.7 * sy)) lost++;
      }
    }
    sim.flow(1);
    for (let s = 0; s < 3; s++) sim.step();
    sim.takeDirty();
    const dt = performance.now() - f0;
    if (dt > worst) worst = dt;
    frames++;
    if (frames > 20000) break;
  }
  const ms = (performance.now() - t0) / frames;
  // surface profile (in the bottle frame), then angles of the two flanks in the world frame
  const top = sim.surface();
  let peak = 0;
  for (let x = 0; x < GEO.W; x++) if (top[x] < top[peak]) peak = x;
  const floor = GEO.bottom;
  const h = floor - top[peak];
  const fit = (dir) => {
    // points between 25% and 75% of the pile height along this flank
    const pts = [];
    for (let x = peak; x >= 0 && x < GEO.W; x += dir) {
      if (top[x] >= GEO.H) break;
      const d = floor - top[x];
      if (d > 0.25 * h && d < 0.75 * h) pts.push([x, top[x]]);
    }
    if (pts.length < 3) return NaN;
    const n = pts.length;
    const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let num = 0, den = 0;
    for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
    const slope = num / den;                     // rows per column, bottle frame
    const bottleAng = (Math.atan(Math.abs(slope)) * 180) / Math.PI;
    // world angle: a flank falling to the right gains the tilt, one falling to the left loses it
    return dir > 0 ? bottleAng + tilt : bottleAng - tilt;
  };
  console.log(`${label} tilt ${tilt}: grains ${sim.count}, spilled ${sim.spilled}, frames ${frames}, ${ms.toFixed(2)} ms/frame avg, ${worst.toFixed(1)} max; ` +
    `lost ${lost}, pile height ${h}, left flank ${fit(-1).toFixed(1)} deg, right flank ${fit(1).toFixed(1)} deg (world)`);
}

run(0, 9000, 'upright');
run(0, 30000, 'upright big');
run(18, 9000, 'tilted');
run(-30, 9000, 'tilted');
