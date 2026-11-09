// Canvas2D fallback: the same cloth, flat-shaded per triangle with the velvet function in JS.
import { lin } from './render-gl.js';

const toSRGB = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

export function create2DRenderer(canvas, colors) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const C = { deep: lin(colors.deep), velvet: lin(colors.velvet), sheen: lin(colors.sheen), back: lin(colors.back) };
  const silver = colors.silver;
  const L = (() => { const v = [-0.22, -0.55, 0.8]; const l = Math.hypot(...v); return v.map((c) => c / l); })();
  let W = 1, H = 1, dpr = 1, order = null, keys = null;

  function shade(nx, ny, nz, cav, crush, sx, sy, scene) {
    let back = nz < 0 ? 1 : 0;
    if (back) { nx = -nx; ny = -ny; nz = -nz; }
    const ndv = Math.max(0, Math.min(1, nz));
    const ndl = nx * L[0] + ny * L[1] + nz * L[2];
    const wrap = Math.max(0, Math.min(1, (ndl + 0.3) / 1.3));
    const edge = 1 - ndv;
    const bloom = edge ** 1.6;
    const mixv = Math.max(0, Math.min(1, 0.28 + 0.72 * wrap * (0.5 + 0.9 * bloom) + crush * 0.25));
    const sheenAmt = edge ** 2.4 * (0.35 + 0.65 * Math.max(0, Math.min(1, ndl + 0.45))) * 0.85 + crush * (0.1 + 0.25 * edge);
    const ao = Math.max(0.45, Math.min(1.12, 1 + cav * 0.32));
    const dx = (sx - scene.spot[0]) / scene.spot[2], dy = (sy - scene.spot[1]) / scene.spot[3];
    let spot = 0.1 + 1.16 * Math.exp(-(dx * dx + dy * dy) * 1.8);
    const ft = Math.max(0, Math.min(1, (sy - scene.railY) / scene.railFade));
    spot *= 0.45 + 0.55 * ft * ft * (3 - 2 * ft);
    const out = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      let c;
      if (back) c = C.back[i] * (0.35 + 0.65 * wrap);
      else c = (C.deep[i] + (C.velvet[i] - C.deep[i]) * mixv) * (0.45 + 0.75 * wrap) + C.sheen[i] * sheenAmt;
      c *= ao * spot;
      c = c / (1 + c * 0.35);
      out[i] = toSRGB(c);
    }
    return `rgb(${out[0]},${out[1]},${out[2]})`;
  }

  return {
    kind: '2d',
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
    },
    restore() {},
    draw(cu, scene) {
      cu.computeShading();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const { x, y, z, nrm, cav, crush, triV, triAlive } = cu;
      // whole cells where both triangles stand (shaded by the cell's four normals, so pleats read
      // as bands rather than diamonds), single triangles along tears; painted back to front
      const cells = cu.triCount >> 1;
      if (!order || order.length !== cells) { order = new Uint32Array(cells); keys = new Float32Array(cells); }
      const cx = cu.nx - 1, cy = cu.ny - 1;
      let m = 0;
      for (let q = 0; q < cells; q++) {
        if (!triAlive[q * 2] && !triAlive[q * 2 + 1]) continue;
        order[m++] = q;
        const t = triAlive[q * 2] ? q * 2 : q * 2 + 1;
        keys[q] = z[triV[t * 3]] + z[triV[t * 3 + 1]] + z[triV[t * 3 + 2]];
      }
      const list = Array.from(order.subarray(0, m)).sort((a, b) => keys[a] - keys[b]);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.7;
      const paint = (vs, sx, sy) => {
        let nx = 0, ny = 0, nz = 0, cv = 0, cr = 0;
        for (const v of vs) { nx += nrm[v * 3]; ny += nrm[v * 3 + 1]; nz += nrm[v * 3 + 2]; cv += cav[v]; cr += crush[v]; }
        const l = Math.hypot(nx, ny, nz) || 1;
        const col = shade(nx / l, ny / l, nz / l, cv / vs.length, cr / vs.length, sx, sy, scene);
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(x[vs[0]], y[vs[0]]);
        for (let i = 1; i < vs.length; i++) ctx.lineTo(x[vs[i]], y[vs[i]]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      for (const q of list) {
        if (triAlive[q * 2] && triAlive[q * 2 + 1]) {
          const p = (q / (cx * cy)) | 0, r = q - p * cx * cy, j = (r / cx) | 0, i = r - j * cx;
          const a = cu.idx(p, i, j), b = a + 1, c = a + cu.nx, d = c + 1;
          paint([a, b, d, c], (x[a] + x[d]) / 2, (y[a] + y[d]) / 2);
        } else {
          const t = triAlive[q * 2] ? q * 2 : q * 2 + 1;
          const a = triV[t * 3], b = triV[t * 3 + 1], c = triV[t * 3 + 2];
          paint([a, b, c], (x[a] + x[b] + x[c]) / 3, (y[a] + y[b] + y[c]) / 3);
        }
      }
      // stitches and mending threads
      ctx.strokeStyle = silver;
      ctx.lineWidth = Math.max(1, Math.min(2, cu.dx * 0.07));
      ctx.beginPath();
      for (let c = 0; c < cu.linkCount; c++) {
        if (!cu.alive[c]) continue;
        const a = cu.la[c], b = cu.lb[c];
        if (cu.mendingLink[c] && cu.len(c) > cu.rest0[c] * 1.15) { ctx.moveTo(x[a], y[a]); ctx.lineTo(x[b], y[b]); continue; }
        if (!cu.stitched[c]) continue;
        const mx = (x[a] + x[b]) / 2, my = (y[a] + y[b]) / 2;
        let px = -(y[b] - y[a]), py = x[b] - x[a];
        const pl = Math.hypot(px, py) || 1;
        const h = Math.min(7, cu.dx * 0.42);
        px = (px / pl) * h; py = (py / pl) * h;
        const sx = (x[b] - x[a]) / pl * h * 0.35, sy = (y[b] - y[a]) / pl * h * 0.35;
        ctx.moveTo(mx - px - sx, my - py - sy); ctx.lineTo(mx + px + sx, my + py + sy);
      }
      ctx.stroke();
    },
  };
}
