// The finish: the visitor's corked bottle standing on a sunlit windowsill.
// The windowsill photograph was taken with this bottle full of one colour-key sand
// (design/works/sand/scripts/build_scene.py). Here every pixel of that sand is replaced by the
// visitor's own grain at the matching place in their bottle, multiplied by the light the photo
// recorded there (sun on the left, shade under the shoulder), and the glass reflections go back on
// top. The shadow, the cork and the glass are the photograph's own.
import SCENE from './scene.js';
import { shadesFor } from './palette.js';

let assets = null;
const load = (src) => new Promise((resolve, reject) => {
  const im = new Image();
  im.decoding = 'async';
  im.onload = () => resolve(im);
  im.onerror = () => reject(new Error('image ' + src));
  im.src = src;
});

/** Start loading the windowsill early (after the first pour), so corking is instant. */
export function preloadFinish() {
  if (!assets) {
    assets = Promise.all([load('./img/sill.webp'), load('./img/sill-sand.webp'), load('./img/sill-glint.webp')]);
    assets.catch(() => { assets = null; });
  }
  return assets;
}

/**
 * Draw the scene into `canvas` (1080 wide). `sim` is the settled, corked bottle; `topRow` is the
 * first grid row visible under the cork.
 */
export async function renderFinish(sim, canvas, topRow) {
  const [scene, sandMap, glint] = await preloadFinish();
  const [OW, OH] = SCENE.size;
  canvas.width = OW;
  canvas.height = OH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(scene, 0, 0, OW, OH);
  const [bx, by, bw, bh] = SCENE.box;
  const tmp = document.createElement('canvas');
  tmp.width = bw;
  tmp.height = bh;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.drawImage(sandMap, 0, 0);
  const map = tctx.getImageData(0, 0, bw, bh).data;
  const img = ctx.getImageData(bx, by, bw, bh);
  const out = img.data;

  const rgb = new Float32Array(256 * 3);
  for (let c = 1; c <= 5; c++) {
    shadesFor(c).forEach(([r, g, b], s) => { const v = (c * 32 + s) * 3; rgb[v] = r; rgb[v + 1] = g; rgb[v + 2] = b; });
  }

  // anchors: under the cork, the shoulder (first full-width row), the floor
  const { W, g, hw, cx } = sim;
  let maxHw = 0;
  for (let y = sim.mouth; y < sim.bottom; y++) maxHw = Math.max(maxHw, hw[y]);
  let gShoulder = sim.mouth;
  while (gShoulder < sim.bottom && hw[gShoulder] < 0.97 * maxHw) gShoulder++;
  const gTop = topRow, gBot = sim.bottom - 1;
  const rows = SCENE.rows;
  const half = (y) => {
    const r = rows[Math.max(0, Math.min(rows.length - 1, y - SCENE.top))];
    return r ? (r[1] - r[0]) / 2 : 0;
  };
  const sag = SCENE.sag;
  const eTop = SCENE.top - sag * half(SCENE.top);
  const eSh = SCENE.shoulder - sag * half(SCENE.shoulder);
  const eBot = SCENE.bottom - sag * half(SCENE.bottom - 4);
  const mapRow = (ye) => {
    if (ye <= eSh) return gTop + ((ye - eTop) / (eSh - eTop)) * (gShoulder - gTop);
    return gShoulder + ((ye - eSh) / (eBot - eSh)) * (gBot - gShoulder);
  };

  let last = null;
  for (let yy = 0; yy < bh; yy++) {
    const y = by + yy;
    const r = rows[y - SCENE.top] || last;
    if (!r) continue;
    last = r;
    const mid = (r[0] + r[1]) / 2, hh = Math.max(1, (r[1] - r[0]) / 2);
    for (let xx = 0; xx < bw; xx++) {
      const o = (yy * bw + xx) * 4;
      const a = map[o + 3] / 255;
      if (a <= 0.01) continue;
      const x = bx + xx;
      let u = (x + 0.5 - mid) / hh;
      if (u < -1) u = -1; else if (u > 1) u = 1;
      // each ring of sand meets the glass in an ellipse seen from a little above: lower in the middle
      const ye = y - sag * hh * Math.sqrt(1 - u * u);
      let gr = Math.round(mapRow(ye));
      if (gr < gTop) gr = gTop; else if (gr > gBot) gr = gBot;
      const gx = Math.floor(cx + u * (hw[gr] - 0.6));
      let v = g[gr * W + gx];
      // the photo's sand reaches a touch further into the corners than the grid: look inward a little
      for (let n = 1; n < 6 && (v === 0 || v === 255); n++) {
        v = g[Math.min(gBot, gr + (n >> 1)) * W + gx + (u < 0 ? n : -n)];
      }
      if (v === 0 || v === 255) continue;        // a real gap in the visitor's sand: the photo's glass shows
      const L = Math.pow((map[o] / 255) * 2, 1.35);   // the sun on the left, the shade on the right
      const k = v * 3;
      out[o] = out[o] * (1 - a) + Math.min(255, rgb[k] * L) * a;
      out[o + 1] = out[o + 1] * (1 - a) + Math.min(255, rgb[k + 1] * L) * a;
      out[o + 2] = out[o + 2] * (1 - a) + Math.min(255, rgb[k + 2] * L) * a;
    }
  }
  ctx.putImageData(img, bx, by);
  ctx.drawImage(glint, bx, by);
  return canvas;
}

export function finishBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
  });
}
