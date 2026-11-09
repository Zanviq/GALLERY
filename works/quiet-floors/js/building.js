// The section drawing of 나란히마을 103동 and its vibration.
// Static parts are drawn once; the slabs, walls, furniture offsets, arcs and rings are updated per frame
// only while a play is running.
import { FLOORS, unitNo } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
export const G = {
  W: 600, H: 770,
  slabs: [[92, 110], [222, 240], [352, 370], [482, 500], [612, 630]],
  slabX: [32, 568],
  walls: [[40, 56], [292, 308], [544, 560]],
  cols: [[56, 292], [308, 544]],
  ground: 730,
};

export function room(f, c) {
  const top = G.slabs[5 - f][1];
  const bot = G.slabs[6 - f][0];
  const [x0, x1] = G.cols[c];
  return { x0, x1, top, bot, w: x1 - x0, h: bot - top };
}
// local x (0..236, measured from the outer wall) to drawing x
export function localX(c, lx) {
  const r = G.cols[c];
  return c === 0 ? r[0] + lx : r[1] - lx;
}
const floorSlab = (f) => 6 - f;
const ceilSlab = (f) => 5 - f;

const f1 = (n) => Math.round(n * 10) / 10;

// ---------- static drawing ----------
function unitFurniture(f, c) {
  const r = room(f, c);
  const tf = c === 0 ? `translate(${r.x0} ${r.top})` : `translate(${r.x1} ${r.top}) scale(-1 1)`;
  return `<g class="unit" data-unit="${unitNo(f, c)}" transform="${tf}">
    <g class="u-move">
      <rect class="mat" x="112" y="107" width="76" height="5" rx="1"/>
      <g class="washer"><rect x="6" y="64" width="34" height="48" rx="2"/><path d="M6 74 H40"/><circle cx="23" cy="93" r="11"/><circle cx="23" cy="93" r="5.5"/></g>
      <g class="table"><path d="M70 76 H132 M74 78 V112 M128 78 V112"/><path class="thick" d="M68 76 H134"/></g>
      <g class="chair"><path d="M44 62 V112 M44 88 H64 M64 88 V112"/><g class="pads"><rect x="41.5" y="110" width="5" height="3"/><rect x="61.5" y="110" width="5" height="3"/></g></g>
      <g class="door"><path d="M188 22 H226 M188 22 V112 M226 22 V112"/><rect class="leaf" x="192" y="26" width="30" height="86"/><circle cx="197" cy="70" r="2"/><rect class="stop" x="221" y="36" width="5" height="8" rx="1.5"/></g>
      <g class="child" stroke-linecap="round" stroke-linejoin="round"><circle cx="160" cy="57" r="7.5"/><path d="M159 65 L155 86 M157 72 L147 80 M157 72 L168 76 M155 86 L146 99 L139 104 M155 86 L165 98 L166 110"/><g class="slip"><ellipse cx="139" cy="105" rx="5" ry="2.6"/><ellipse cx="168" cy="110" rx="5" ry="2.6"/></g></g>
      <g class="dumbbell"><path d="M128 105 H158"/><rect x="122" y="96" width="7" height="16" rx="1.5"/><rect x="157" y="96" width="7" height="16" rx="1.5"/></g>
      <g class="resident" stroke-linecap="round" stroke-linejoin="round"><circle cx="54" cy="55" r="7"/><path d="M54 63 L56 86 H70 V110 M56 72 L70 76"/></g>
      <g class="minimeter"><rect class="mm-body" x="100" y="50" width="18" height="26" rx="3"/><g class="mm-seg"><rect x="104" y="66" width="10" height="2.5"/><rect x="104" y="62" width="10" height="2.5"/><rect x="104" y="58" width="10" height="2.5"/><rect x="104" y="54" width="10" height="2.5"/></g></g>
    </g>
    <g class="lamp"><path d="M100 0 V15"/><path class="shade" d="M90 15 H110 L106 25 H94 Z"/></g>
  </g>`;
}

function concretePattern() {
  // stipple and broken aggregate, the section-drawing convention for concrete
  const dots = [[3, 4], [11, 2], [19, 6], [25, 13], [7, 12], [15, 15], [2, 21], [10, 24], [21, 22], [27, 26], [17, 9], [5, 27]];
  const tris = [[13, 6, 0], [23, 18, 1], [6, 18, 2], [18, 26, 0]];
  const triPath = tris.map(([x, y, k]) => {
    const s = 3.2;
    const pts = k === 0 ? [[x, y - s], [x + s, y + s * 0.6], [x - s, y + s * 0.4]]
      : k === 1 ? [[x - s, y - s * 0.5], [x + s, y - s * 0.2], [x, y + s]]
        : [[x - s * 0.6, y - s], [x + s, y], [x - s, y + s * 0.7]];
    return 'M' + pts.map((p) => p.join(' ')).join(' L') + ' Z';
  }).join(' ');
  return `<pattern id="concrete" patternUnits="userSpaceOnUse" width="30" height="30">
      <rect class="pt-ground" width="30" height="30"/>
      <g class="pt-dot">${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.95"/>`).join('')}</g>
      <path class="pt-tri" d="${triPath}"/>
    </pattern>
    <pattern id="earth" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
      <path class="pt-earth" d="M0 0 V12"/>
    </pattern>`;
}

export function drawBuilding(svg) {
  let clips = '';
  let fills = '';
  let units = '';
  let windows = '';
  for (const f of FLOORS) {
    for (const c of [0, 1]) {
      const r = room(f, c);
      clips += `<clipPath id="clip-${unitNo(f, c)}"><rect x="${r.x0}" y="${r.top}" width="${r.w}" height="${r.h}"/></clipPath>`;
      fills += `<rect class="room" data-room="${unitNo(f, c)}" x="${r.x0}" y="${r.top - 8}" width="${r.w}" height="${r.h + 16}"/>`;
      units += unitFurniture(f, c);
    }
    const r = room(f, 0);
    for (const [k, w] of [[0, G.walls[0]], [2, G.walls[2]]]) {
      windows += `<g class="win" data-win="${f}-${k}"><rect class="glass" x="${w[0] + 1}" y="${r.top + 22}" width="${w[1] - w[0] - 2}" height="64"/><path d="M${w[0] + 6} ${r.top + 22} V${r.top + 86} M${w[1] - 6} ${r.top + 22} V${r.top + 86}"/></g>`;
    }
  }
  let slabs = '';
  for (let j = 0; j < G.slabs.length; j++) slabs += `<path class="slab" data-slab="${j}"/>`;
  let walls = '';
  for (let band = 0; band < 4; band++) {
    for (let k = 0; k < 3; k++) walls += `<path class="wall" data-wall="${band}-${k}"/>`;
  }
  // parapets and pilotis columns are static
  const par = G.walls.filter((_, k) => k !== 1).map(([a, b]) => `<rect class="wall-s" x="${a}" y="72" width="${b - a}" height="21"/>`).join('');
  const cols = G.walls.map(([a, b]) => `<rect class="wall-s" x="${a}" y="${G.slabs[4][1] - 1}" width="${b - a}" height="${G.ground - G.slabs[4][1] + 1}"/>`).join('');

  svg.innerHTML = `<defs>${concretePattern()}${clips}</defs>
    <g class="roof-things">
      <rect class="tower" x="372" y="26" width="160" height="67"/>
      <path class="tower-band" d="M372 36 H532 V44 H372 Z"/>
      <text class="tower-no" x="452" y="91" text-anchor="middle">103</text>
      <path class="rail" d="M56 72 H200 M56 80 H200 M80 72 V92 M120 72 V92 M160 72 V92 M200 72 V92"/>
    </g>
    <g class="fills">${fills}</g>
    <g class="units">${units}</g>
    <g class="rings" id="rings"></g>
    <g class="arcs" id="arcs"></g>
    <g class="walls">${walls}${par}${cols}</g>
    <g class="wins">${windows}</g>
    <g class="slabs">${slabs}</g>
    <g class="pilotis">
      <g class="bike" transform="translate(96 700)"><circle cx="0" cy="17" r="12"/><circle cx="44" cy="17" r="12"/><path d="M0 17 L14 0 H32 L44 17 M14 0 L22 17 L32 0 M10 -6 H18 M32 0 L30 -8 H38"/></g>
      <g class="bike" transform="translate(170 700)"><circle cx="0" cy="17" r="12"/><circle cx="44" cy="17" r="12"/><path d="M0 17 L14 0 H32 L44 17 M14 0 L22 17 L32 0 M10 -6 H18 M32 0 L30 -8 H38"/></g>
      <g class="car" transform="translate(340 676)"><path d="M6 44 V26 L30 24 L50 6 H122 L150 26 L162 30 V44 Z M58 12 H90 V24 H44 Z M98 12 H120 L138 24 H98 Z"/><circle cx="40" cy="46" r="10"/><circle cx="132" cy="46" r="10"/></g>
    </g>
    <rect class="earth" x="0" y="${G.ground}" width="600" height="${G.H - G.ground}"/>
    <path class="groundline" d="M0 ${G.ground} H600"/>`;

  const q = (s) => svg.querySelector(s);
  const refs = {
    svg,
    slabs: [...svg.querySelectorAll('.slab')],
    walls: [...svg.querySelectorAll('.wall')].map((el) => {
      const [band, k] = el.dataset.wall.split('-').map(Number);
      return { el, band, k };
    }),
    wins: [...svg.querySelectorAll('.win')].map((el) => {
      const [f, k] = el.dataset.win.split('-').map(Number);
      return { el, band: 5 - f, k };
    }),
    units: new Map(),
    rings: q('#rings'),
    arcs: q('#arcs'),
  };
  for (const el of svg.querySelectorAll('.unit')) {
    const no = el.dataset.unit;
    const f = Number(no[0]);
    const c = Number(no[2]) - 1;
    refs.units.set(no, { el, f, c, move: el.querySelector('.u-move'), lamp: el.querySelector('.lamp'), segs: [...el.querySelectorAll('.mm-seg rect')] });
  }
  // pools
  refs.arcPool = [];
  for (let i = 0; i < 90; i++) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('class', 'arc');
    p.style.display = 'none';
    refs.arcs.appendChild(p);
    refs.arcPool.push(p);
  }
  refs.ringPool = [];
  for (let i = 0; i < 40; i++) {
    const p = document.createElementNS(NS, 'circle');
    p.setAttribute('class', 'ring');
    p.style.display = 'none';
    refs.rings.appendChild(p);
    refs.ringPool.push(p);
  }
  drawFrame(refs, () => 0, () => 0);
  return refs;
}

// ---------- per-frame drawing ----------
// D(j, x): vertical displacement of slab j at x. S(band, k): sideways bow of a wall.
export function drawFrame(refs, D, S) {
  const [xa, xb] = G.slabX;
  const step = 8;
  refs.slabs.forEach((el, j) => {
    const [top, bot] = G.slabs[j];
    let up = '';
    let dn = '';
    const pts = [];
    for (let x = xa; x <= xb + 0.1; x += step) pts.push([x, D(j, x)]);
    if (pts[pts.length - 1][0] < xb) pts.push([xb, D(j, xb)]);
    up = pts.map(([x, d], i) => `${i ? 'L' : 'M'}${x} ${f1(top + d)}`).join(' ');
    dn = pts.reverse().map(([x, d]) => `L${x} ${f1(bot + d)}`).join(' ');
    el.setAttribute('d', `${up} ${dn} Z`);
  });
  for (const w of refs.walls) {
    const [xl, xr] = G.walls[w.k];
    const xm = (xl + xr) / 2;
    const yT = G.slabs[w.band][1] + D(w.band, xm) - 1;
    const yB = G.slabs[w.band + 1][0] + D(w.band + 1, xm) + 1;
    const ym = (yT + yB) / 2;
    const s = S(w.band, w.k) * 2;
    w.el.setAttribute('d', `M${xl} ${f1(yT)} H${xr} Q${f1(xr + s)} ${f1(ym)} ${xr} ${f1(yB)} H${xl} Q${f1(xl + s)} ${f1(ym)} ${xl} ${f1(yT)} Z`);
  }
  for (const w of refs.wins) {
    const s = S(w.band, w.k);
    w.el.setAttribute('transform', s ? `translate(${f1(s)} 0)` : '');
  }
  for (const u of refs.units.values()) {
    const r = room(u.f, u.c);
    const xc = (r.x0 + r.x1) / 2;
    const dy = D(floorSlab(u.f), xc);
    u.move.setAttribute('transform', dy ? `translate(0 ${f1(dy)})` : '');
    const lx = localX(u.c, 100);
    const dc = D(ceilSlab(u.f), lx);
    u.lamp.setAttribute('transform', dc ? `translate(0 ${f1(dc)}) rotate(${f1(dc * 3.2)} 100 0)` : '');
  }
}

export function arcPath(ox, oy, r, dir) {
  const a = f1(r);
  const b = f1(r * 0.72);
  if (dir === 'down') return `M${f1(ox - r)} ${oy} A${a} ${b} 0 0 0 ${f1(ox + r)} ${oy}`;
  if (dir === 'up') return `M${f1(ox - r)} ${oy} A${a} ${b} 0 0 1 ${f1(ox + r)} ${oy}`;
  if (dir === 'right') return `M${ox} ${f1(oy - r)} A${b} ${a} 0 0 1 ${ox} ${f1(oy + r)}`;
  return `M${ox} ${f1(oy - r)} A${b} ${a} 0 0 0 ${ox} ${f1(oy + r)}`;
}

export { floorSlab, ceilSlab };
