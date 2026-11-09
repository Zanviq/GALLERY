// Small prints: tint ramps, the first/second-drum overlap matrix and one patch per paper stock.
// Each is printed with the same ink model as the press sheet, when it comes near the screen.
import { INKS, PAPER_FEEL, printPiece, hash } from './press.js';

const TINTS = [1, 0.7, 0.4, 0.15];
// tiny registration offsets (mm) for the second drum, so overlaps show a hairline of each ink
const SECOND_OFFSET = [0.35, -0.3];

function sizeCanvas(c, aspect) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(80, Math.round(c.clientWidth * dpr));
  c.width = w;
  c.height = Math.round(w / aspect);
}

function lazy(el, fn) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      fn();
    }
  }, { rootMargin: '400px 0px' });
  io.observe(el);
}

export function initSpecimens() {
  const chart = document.getElementById('chart');
  const jobs = [];

  // tint ramps: four steps printed side by side on one strip
  for (const row of chart.querySelectorAll('.ink[data-ink]')) {
    const ink = INKS[row.dataset.ink];
    const box = row.querySelector('[data-ramp]');
    const c = document.createElement('canvas');
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', `${ink.name} 농도 견본: ${TINTS.map((t) => Math.round(t * 100) + '%').join(', ')}`);
    const labels = document.createElement('div');
    labels.className = 'ramp__labels';
    labels.setAttribute('aria-hidden', 'true');
    for (const t of TINTS) {
      const s = document.createElement('span');
      s.textContent = Math.round(t * 100) + '%';
      labels.appendChild(s);
    }
    box.append(c, labels);
    jobs.push(() => {
      sizeCanvas(c, 84 / 16);
      printPiece({
        canvas: c, wmm: 84, hmm: 16, seed: hash(ink.id, 41),
        layers: [{
          ink, density: 3, mode: 'screen',
          draw(ctx) {
            TINTS.forEach((t, i) => {
              ctx.fillStyle = `rgba(0,0,0,${t})`;
              ctx.fillRect(1.5 + i * 20.25, 1.5, 20.25, 13);
            });
          },
        }],
      });
    });
  }

  // first drum (row) x second drum (column)
  for (const td of chart.querySelectorAll('#matrix td[data-second]')) {
    const first = td.parentElement.dataset.first;
    const second = td.dataset.second;
    const c = document.createElement('canvas');
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', first === second
      ? `${INKS[first].name} 한 색`
      : `${INKS[first].name} 먼저, ${INKS[second].name} 나중`);
    td.appendChild(c);
    jobs.push(() => {
      sizeCanvas(c, 3 / 2);
      const rect = (ctx) => ctx.fillRect(1.6, 1.6, 26.8, 16.8);
      const layers = [{ ink: INKS[first], density: 3, draw: rect }];
      if (first !== second) layers.push({ ink: INKS[second], density: 3, offset: SECOND_OFFSET, draw: rect });
      printPiece({ canvas: c, wmm: 30, hmm: 20, seed: hash(first + second, 90), layers });
    });
  }

  lazy(chart, () => jobs.forEach((j) => j()));

  // paper stocks: the same two-ink patch on each, so the difference is the paper
  const table = document.getElementById('swatches');
  const stockJobs = [];
  table.querySelectorAll('tbody tr').forEach((tr, i) => {
    const c = tr.querySelector('canvas');
    const feel = PAPER_FEEL[tr.dataset.feel] || PAPER_FEEL.plain;
    stockJobs.push(() => {
      sizeCanvas(c, 9 / 5);
      printPiece({
        canvas: c, wmm: 54, hmm: 30, seed: 300 + i, feel,
        layers: [
          {
            ink: INKS.blue, density: 3,
            draw(ctx) {
              ctx.beginPath();
              ctx.arc(17, 15, 11.5, 0, Math.PI * 2);
              ctx.fill();
            },
          },
          {
            ink: INKS.pink, density: 3, offset: [0.3, -0.2],
            draw(ctx) {
              ctx.fillRect(21, 7, 30, 16);
            },
          },
        ],
      });
    });
  });
  lazy(table, () => stockJobs.forEach((j) => j()));
}
