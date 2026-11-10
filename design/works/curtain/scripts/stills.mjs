// Gallery thumbnail (1200x900 webp q82) and share image (1200x630 png), captured from the live page.
//   node design/works/curtain/scripts/stills.mjs [base url]
// The scene is played through the page's own cloth: a hand takes the right panel near the seam and
// draws it aside, so the ghost light shows through while the announcement is still on the curtain.
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const cdp = path.join(here, 'cdp.mjs');
const base = process.argv[2] || 'http://127.0.0.1:8000';

const scene = (reach, high) => `(() => {
  const C = window.__curtain, c = C.cu, L = c.L;
  C.stop();                      // freeze the frame 0.75 s into the pull, the same every time
  c.air = 0;
  c.settle(400);
  c.grab('hand', L.W / 2 + 48, L.H * ${high});
  c.move('hand', L.W * ${reach}, L.H * ${high - 0.03});
  C.run(0.75);
  // the stage as it looks once the eye has adjusted (capture mode skips the ~4 s spread)
  document.querySelector('[data-stage]').classList.add('is-lit');
})()`;

const shots = [
  ['1200x900', 'webp', path.join(root, 'thumbnails', 'curtain.webp'), scene(0.74, 0.42)],
  ['1200x630', 'shot', path.join(root, 'og', 'curtain.png'), scene(0.74, 0.44)],
];
for (const [size, kind, file, js] of shots) {
  const out = execFileSync('node', [cdp, `${base}/curtain/?capture`, size, 'wait=1800', `eval=${js}`, 'wait=300',
    'log=window.__curtain.cu.openness().toFixed(3) + " bill " + document.querySelector("[data-bill]").style.opacity',
    `${kind}=${file}`], { encoding: 'utf8', timeout: 120000 });
  console.log(path.basename(file), out.trim());
}
