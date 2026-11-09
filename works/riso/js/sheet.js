// The overprint table: an A4 landscape press sheet with six cut pieces on three plates.
import { INKS, makeCoverage, readMask, composite, hash, rng } from './press.js';

export const PAPER_W = 317; // mm: A4 landscape trim (297 x 210) + 10 mm margin for marks
export const PAPER_H = 230;
export const TRIM = 10;
export const PLATES = ['pink', 'blue', 'yellow'];
const FONT = '"Black Han Sans", sans-serif';

export const PIECE_NAMES = {
  glyph: '겹 글자', dot: '작은 원', tri: '세모', arch: '아치', disc: '큰 원', band: '띠',
};

export const DEFAULT_PIECES = [
  { id: 'glyph', kind: 'glyph', plate: 'pink', x: 98, y: 114, size: 148 },
  { id: 'dot', kind: 'circle', plate: 'pink', x: 262, y: 66, r: 14 },
  { id: 'tri', kind: 'tri', plate: 'blue', x: 58, y: 56, s: 46, rot: 9 },
  { id: 'arch', kind: 'arch', plate: 'blue', x: 238, y: 134, w: 58, h: 140 },
  { id: 'disc', kind: 'circle', plate: 'yellow', x: 192, y: 94, r: 58 },
  { id: 'band', kind: 'band', plate: 'yellow', x: 158, y: 186, w: 262, h: 19, rot: -3.5 },
];

export function defaultState() {
  return {
    pieces: DEFAULT_PIECES.map((p) => ({ ...p })),
    order: PLATES.slice(),
    density: { pink: 3, blue: 3, yellow: 3 },
    pull: 1,
  };
}

// ---- geometry (all in paper millimetres) ----------------------------------------------------

let glyphBox = null; // ink box of the 겹 glyph at size 100, relative to the draw point
export function measureGlyph() {
  const c = document.createElement('canvas').getContext('2d');
  c.font = '100px ' + FONT;
  const m = c.measureText('겹');
  glyphBox = {
    l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight,
    a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent,
  };
}

function glyphOrigin(p) {
  const k = p.size / 100;
  const g = glyphBox;
  return { x: p.x - ((g.r - g.l) / 2) * k, y: p.y + ((g.a - g.d) / 2) * k, k };
}

function rotPts(pts, cx, cy, deg) {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

function triPts(p) {
  const h = (p.s * Math.sqrt(3)) / 2;
  return rotPts([[0, (-2 * h) / 3], [p.s / 2, h / 3], [-p.s / 2, h / 3]], p.x, p.y, p.rot || 0);
}

function bandPts(p) {
  const w = p.w / 2;
  const h = p.h / 2;
  return rotPts([[-w, -h], [w, -h], [w, h], [-w, h]], p.x, p.y, p.rot || 0);
}

export function piecePath(p) {
  const path = new Path2D();
  if (p.kind === 'circle') {
    path.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  } else if (p.kind === 'tri' || p.kind === 'band') {
    const pts = p.kind === 'tri' ? triPts(p) : bandPts(p);
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    path.closePath();
  } else if (p.kind === 'arch') {
    const r = p.w / 2;
    const top = p.y - p.h / 2;
    const bot = p.y + p.h / 2;
    path.moveTo(p.x - r, bot);
    path.lineTo(p.x - r, top + r);
    path.arc(p.x, top + r, r, Math.PI, 0);
    path.lineTo(p.x + r, bot);
    path.closePath();
  }
  return path;
}

export function drawPiece(ctx, p) {
  if (p.kind === 'glyph') {
    const o = glyphOrigin(p);
    ctx.font = p.size + 'px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('겹', o.x, o.y);
  } else {
    ctx.fill(piecePath(p));
  }
}

export function bbox(p) {
  if (p.kind === 'circle') return { x0: p.x - p.r, y0: p.y - p.r, x1: p.x + p.r, y1: p.y + p.r };
  if (p.kind === 'glyph') {
    const k = p.size / 100;
    const w = (glyphBox.l + glyphBox.r) * k;
    const h = (glyphBox.a + glyphBox.d) * k;
    return { x0: p.x - w / 2, y0: p.y - h / 2, x1: p.x + w / 2, y1: p.y + h / 2 };
  }
  if (p.kind === 'arch') return { x0: p.x - p.w / 2, y0: p.y - p.h / 2, x1: p.x + p.w / 2, y1: p.y + p.h / 2 };
  const pts = p.kind === 'tri' ? triPts(p) : bandPts(p);
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function area(p) {
  if (p.kind === 'circle') return Math.PI * p.r * p.r;
  if (p.kind === 'band') return p.w * p.h;
  if (p.kind === 'tri') return (Math.sqrt(3) / 4) * p.s * p.s;
  if (p.kind === 'arch') return p.w * (p.h - p.w / 2) + (Math.PI * p.w * p.w) / 8;
  const b = bbox(p);
  return (b.x1 - b.x0) * (b.y1 - b.y0) * 0.55;
}

const hitCanvas = document.createElement('canvas');
hitCanvas.width = hitCanvas.height = 1;
const hit = hitCanvas.getContext('2d', { willReadFrequently: true });

function contains(p, x, y, tol) {
  const b = bbox(p);
  if (x < b.x0 - tol || x > b.x1 + tol || y < b.y0 - tol || y > b.y1 + tol) return false;
  if (p.kind === 'glyph') {
    const k = 2; // px per mm on the 1x1 probe
    hit.setTransform(k, 0, 0, k, -x * k, -y * k);
    hit.clearRect(x - 1, y - 1, 2, 2);
    hit.lineWidth = tol * 2;
    hit.lineJoin = 'round';
    drawPiece(hit, p);
    const o = glyphOrigin(p);
    hit.strokeText('겹', o.x, o.y);
    return hit.getImageData(0, 0, 1, 1).data[3] > 0;
  }
  hit.setTransform(1, 0, 0, 1, 0, 0);
  hit.lineWidth = tol * 2;
  const path = piecePath(p);
  return hit.isPointInPath(path, x, y) || hit.isPointInStroke(path, x, y);
}

// ---- marks printed by every plate ------------------------------------------------------------

const STRIP = [['pink'], ['blue'], ['yellow'], ['pink', 'blue'], ['pink', 'yellow'], ['blue', 'yellow'], ['pink', 'blue', 'yellow']];

function drawMarks(ctx, plate) {
  const t = TRIM;
  const R = PAPER_W - t;
  const B = PAPER_H - t;
  const lw = 0.3;
  // crop marks
  for (const [cx, cy, sx, sy] of [[t, t, -1, -1], [R, t, 1, -1], [t, B, -1, 1], [R, B, 1, 1]]) {
    ctx.fillRect(sx < 0 ? cx - 8.5 : cx + 2, cy - lw / 2, 6.5, lw);
    ctx.fillRect(cx - lw / 2, sy < 0 ? cy - 8.5 : cy + 2, lw, 6.5);
  }
  // registration targets
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#000';
  for (const [x, y] of [[PAPER_W / 2, 5], [PAPER_W / 2, PAPER_H - 5], [5, PAPER_H / 2], [PAPER_W - 5, PAPER_H / 2]]) {
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(x - 3.6, y - lw / 2, 7.2, lw);
    ctx.fillRect(x - lw / 2, y - 3.6, lw, 7.2);
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // colour control strip
  STRIP.forEach((set, i) => {
    if (set.includes(plate)) ctx.fillRect(22 + i * 8, PAPER_H - 7.6, 7, 5);
  });
}

// ---- the table -------------------------------------------------------------------------------

export class Table {
  constructor({ canvas, ppm = 4, state, onChange }) {
    this.canvas = canvas;
    this.ppm = ppm;
    this.W = Math.round(PAPER_W * ppm);
    this.H = Math.round(PAPER_H * ppm);
    canvas.width = this.W;
    canvas.height = this.H;
    this.ctx = canvas.getContext('2d');
    this.img = this.ctx.createImageData(this.W, this.H);
    this.state = state || defaultState();
    this.onChange = onChange || (() => {});
    this.cover = {};
    this.masks = {};
    this.dirty = new Set(PLATES);
    this.full = true; // false: only this.rect (px) needs redoing
    this.rect = null;
    this.raf = 0;
    this.wipe = null;
    const mc = document.createElement('canvas');
    mc.width = this.W;
    mc.height = this.H;
    this.mctx = mc.getContext('2d', { willReadFrequently: true });
  }

  seed() {
    return hash('pull', 1207 + this.state.pull * 7919);
  }

  misreg(plate) {
    const r = rng(hash(plate, this.seed()));
    // up to ~0.8 mm and ~0.25 deg; the first pull is kept modest so the default sheet reads well
    const k = this.state.pull === 1 ? 0.75 : 1;
    return { dx: (r() - 0.5) * 1.6 * k, dy: (r() - 0.5) * 1.6 * k, rot: (r() - 0.5) * 0.5 * k };
  }

  coverFor(plate) {
    const d = this.state.density[plate];
    const key = this.seed() + ':' + d;
    const c = this.cover[plate];
    if (c && c.key === key) return c;
    const made = makeCoverage(this.W, this.H, this.ppm, hash(plate, this.seed()), d);
    made.key = key;
    this.cover[plate] = made;
    return made;
  }

  buildMask(plate, rect) {
    const { mctx, W, H, ppm } = this;
    const m = this.misreg(plate);
    mctx.save();
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    if (rect) {
      mctx.clearRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
      mctx.beginPath();
      mctx.rect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
      mctx.clip();
    } else {
      mctx.clearRect(0, 0, W, H);
    }
    const cx = PAPER_W / 2;
    const cy = PAPER_H / 2;
    mctx.setTransform(ppm, 0, 0, ppm, 0, 0);
    mctx.translate(cx + m.dx, cy + m.dy);
    mctx.rotate((m.rot * Math.PI) / 180);
    mctx.translate(-cx, -cy);
    mctx.fillStyle = '#000';
    for (const p of this.state.pieces) if (p.plate === plate) drawPiece(mctx, p);
    drawMarks(mctx, plate);
    mctx.restore();
    this.masks[plate] = readMask(mctx, W, H, this.coverFor(plate).edge, this.masks[plate], 'rough', null, rect);
  }

  // pixel rectangle a piece can touch, with room for misregistration and ragged edges
  pieceRect(p) {
    const b = bbox(p);
    const pad = 3;
    const k = this.ppm;
    return [
      Math.max(0, Math.floor((b.x0 - pad) * k)), Math.max(0, Math.floor((b.y0 - pad) * k)),
      Math.min(this.W, Math.ceil((b.x1 + pad) * k)), Math.min(this.H, Math.ceil((b.y1 + pad) * k)),
    ];
  }

  invalidate(plates = PLATES, rect = null) {
    for (const p of plates) this.dirty.add(p);
    if (!rect) {
      this.full = true;
      this.rect = null;
    } else if (!this.full) {
      const r = this.rect;
      this.rect = r ? [Math.min(r[0], rect[0]), Math.min(r[1], rect[1]), Math.max(r[2], rect[2]), Math.max(r[3], rect[3])] : rect;
    }
    this.request();
  }

  request() {
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  frame(t) {
    this.raf = 0;
    const rect = this.full ? null : this.rect;
    for (const p of PLATES) if (!this.masks[p]) this.dirty.add(p);
    for (const p of this.dirty) this.buildMask(p, this.masks[p] ? rect : null);
    this.dirty.clear();
    this.full = false;
    this.rect = null;
    let rows = null;
    if (this.wipe) {
      if (this.wipe.start == null) this.wipe.start = t;
      const el = t - this.wipe.start;
      const per = this.wipe.per;
      rows = this.state.order.map((_, k) => {
        const f = Math.min(1, Math.max(0, (el - k * per * 0.85) / per));
        return Math.round((1 - Math.pow(1 - f, 2)) * this.H);
      });
      if (el >= per * 0.85 * (PLATES.length - 1) + per) {
        this.wipe = null;
        rows = null;
      }
    }
    const layers = this.state.order.map((plate, k) => ({
      mask: this.masks[plate],
      cover: this.coverFor(plate).cover,
      ink: INKS[plate],
      rows: rows ? rows[k] : null,
    }));
    if (rect && !rows) {
      composite(this.img, this.W, this.H, layers, rect);
      this.ctx.putImageData(this.img, 0, 0, rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
    } else {
      composite(this.img, this.W, this.H, layers);
      this.ctx.putImageData(this.img, 0, 0);
    }
    if (this.wipe) this.request();
  }

  // feed animation: the sheet prints plate by plate in drum order
  print(animate) {
    this.wipe = animate ? { start: null, per: 380 } : null;
    this.request();
  }

  finishPrint() {
    if (this.wipe) {
      this.wipe = null;
      this.full = true;
      this.request();
    }
  }

  pieceAt(x, y, tol) {
    let best = null;
    let bestArea = Infinity;
    for (const p of this.state.pieces) {
      if (contains(p, x, y, tol)) {
        const a = area(p);
        if (a < bestArea) {
          best = p;
          bestArea = a;
        }
      }
    }
    return best;
  }

  movePiece(p, x, y) {
    const before = this.pieceRect(p);
    p.x = Math.min(PAPER_W - 2, Math.max(2, x));
    p.y = Math.min(PAPER_H - 2, Math.max(2, y));
    this.finishPrint();
    const after = this.pieceRect(p);
    this.invalidate([p.plate], [
      Math.min(before[0], after[0]), Math.min(before[1], after[1]),
      Math.max(before[2], after[2]), Math.max(before[3], after[3]),
    ]);
  }

  setPlate(p, plate) {
    const old = p.plate;
    p.plate = plate;
    this.invalidate([old, plate]);
  }

  // the sheet as a PNG, with a slug line in the bottom margin
  toBlob(slug, cb) {
    const c = document.createElement('canvas');
    c.width = this.W;
    c.height = this.H;
    const x = c.getContext('2d');
    x.drawImage(this.canvas, 0, 0);
    x.setTransform(this.ppm, 0, 0, this.ppm, 0, 0);
    x.fillStyle = '#26262a';
    x.font = '3.1px "Gowun Dodum", sans-serif';
    x.textAlign = 'right';
    x.textBaseline = 'alphabetic';
    x.fillText(slug, PAPER_W - TRIM, PAPER_H - 3.4);
    c.toBlob(cb, 'image/png');
  }
}

// One plate as the greyscale file the shop asks for: trim area only, 85 % grey, no marks.
export function drawPlateFile(canvas, pieces, plate) {
  const ctx = canvas.getContext('2d');
  const k = canvas.width / (PAPER_W - 2 * TRIM);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(k, 0, 0, k, -TRIM * k, -TRIM * k);
  ctx.fillStyle = '#262626';
  for (const p of pieces) if (p.plate === plate) drawPiece(ctx, p);
}
