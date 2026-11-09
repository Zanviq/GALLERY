// The noise meter: 7-segment digits and a 20-step bar, drawn in SVG.
// Red (#E5372E) lives only here and in the meter inside the drawing.

const SEGS = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '',
};

function segPolys(x, y, w, h, t) {
  const g = 1.2;
  const hz = (x1, x2, yc) => [[x1 + g, yc], [x1 + g + t / 2, yc - t / 2], [x2 - g - t / 2, yc - t / 2], [x2 - g, yc], [x2 - g - t / 2, yc + t / 2], [x1 + g + t / 2, yc + t / 2]];
  const vt = (xc, y1, y2) => [[xc, y1 + g], [xc + t / 2, y1 + g + t / 2], [xc + t / 2, y2 - g - t / 2], [xc, y2 - g], [xc - t / 2, y2 - g - t / 2], [xc - t / 2, y1 + g + t / 2]];
  const xl = x + t / 2;
  const xr = x + w - t / 2;
  const yt = y + t / 2;
  const ym = y + h / 2;
  const yb = y + h - t / 2;
  return {
    a: hz(xl, xr, yt), b: vt(xr, yt, ym), c: vt(xr, ym, yb), d: hz(xl, xr, yb), e: vt(xl, ym, yb), f: vt(xl, yt, ym), g: hz(xl, xr, ym),
  };
}
const pts = (p) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

export class Digits {
  // n digit cells, decimal point before the last one if dp
  constructor(svg, { cells = 3, dp = true, w = 34, h = 64, t = 7, gap = 10, x = 6, y = 8 } = {}) {
    this.cells = [];
    let html = '<g transform="skewX(-6)">';
    for (let i = 0; i < cells; i++) {
      const cx = x + i * (w + gap) + (dp && i === cells - 1 ? 6 : 0);
      const P = segPolys(cx, y, w, h, t);
      html += `<g data-cell="${i}">` + 'abcdefg'.split('').map((s) => `<polygon class="seg" data-s="${s}" points="${pts(P[s])}"/>`).join('') + '</g>';
    }
    if (dp) {
      const dx = x + (cells - 1) * (w + gap) - gap / 2 + 2;
      html += `<rect class="seg dp" x="${dx.toFixed(1)}" y="${y + h - t}" width="${t}" height="${t}" rx="1"/>`;
    }
    html += '</g>';
    svg.innerHTML = html;
    this.cells = [...svg.querySelectorAll('[data-cell]')].map((g) => Object.fromEntries([...g.children].map((p) => [p.dataset.s, p])));
    this.dp = svg.querySelector('.dp');
    this.n = cells;
    this.hasDp = dp;
  }
  set(str) {
    // str like "50.3" or "--" ; right aligned into the cells
    const chars = str.replace('.', '').padStart(this.n, ' ').slice(-this.n).split('');
    chars.forEach((ch, i) => {
      const on = SEGS[ch] ?? '';
      for (const [s, el] of Object.entries(this.cells[i])) el.classList.toggle('on', on.includes(s));
    });
    if (this.dp) this.dp.classList.toggle('on', str.includes('.'));
  }
}

export class Bar {
  constructor(svg, { lo = 20, hi = 70, n = 20 } = {}) {
    this.lo = lo;
    this.hi = hi;
    this.n = n;
    const w = 300 / n;
    let html = '';
    for (let i = 0; i < n; i++) html += `<rect class="bar-seg" x="${(i * w + 1).toFixed(1)}" y="2" width="${(w - 2).toFixed(1)}" height="26" rx="1.5"/>`;
    svg.innerHTML = html;
    this.segs = [...svg.querySelectorAll('rect')];
    this.step = (hi - lo) / n;
  }
  set(level, max, bg) {
    this.segs.forEach((el, i) => {
      const lo = this.lo + i * this.step;
      el.classList.toggle('on', level >= lo + this.step * 0.5);
      el.classList.toggle('bg', lo + this.step <= bg + 0.01);
      el.classList.toggle('max', max != null && max >= lo + this.step * 0.5 && max < lo + this.step * 1.5);
    });
  }
}
