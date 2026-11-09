// 획 하나 차이: 화면, 입력, 효과. 규칙은 game.js, 재질은 chalk.js.
import { LESSONS, PUZZLES, GROUPS } from './puzzles.js';
import { HAVE } from './glyphs.js';
import { isVowel, decompose, chainOf, josa, jamoName, strokesBetween, ORDINAL } from './hangul.js';
import * as G from './game.js';
import { glyph, strokeDiff, chalkStroke, chalkify, loopPoints, Dust, drawHaze, smudge, rng, DPR } from './chalk.js';

const C = {
  chalk: '#F2F2EE', sky: '#9CC9F5', yellow: '#F7E26B', pink: '#F4A6C1', dim: '#B4C3BA',
  metal: '#8E9894', felt: '#3B4440', deep: '#152B22',
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const still = () => reduced.matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const COUNT = ['', '한', '두', '세', '네'];

const el = {
  play: $('#play'), haze: $('#haze'), marks: $('#marks'), blocks: $('#blocks'), tray: $('#tray'), trayEmpty: $('#tray-empty'),
  note: $('#note'), clue: $('#clue'), stageNum: $('#stage-num'), stageGroup: $('#stage-group'),
  tools: $('#tools'), chalk: $('#chalk'), eraser: $('#eraser'), chalkN: $('#chalk-n'),
  hint: $('#hint'), undo: $('#undo'), reset: $('#reset'), next: $('#next'), skip: $('#skip'),
  live: $('#live'), fx: $('#fx'), dragLayer: $('#drag-layer'),
  book: $('#book'), rules: $('#rules'), railList: $('#rail-list'), bookList: $('#book-list'),
  count: $('#count'), bookCount: $('#book-count'), date: $('#date'),
};
const dust = new Dust(el.fx);

// ---------------- progress (localStorage is optional) ----------------
const KEY = 'jamo.v1';
function readStore() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}
function writeStore() {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* no storage: this visit only */ }
}
const progress = Object.assign({ lessons: 0, marks: {}, last: null }, readStore());
if (typeof progress.marks !== 'object' || !progress.marks) progress.marks = {};

// ---------------- state ----------------
let cur = { kind: null, i: 0, def: null, g: null, step: 0 };
let held = null; // { kind: 'tile', id } | { kind: 'chalk' } | { kind: 'eraser' }
let note = null; // { text, tone } transient message
const L = { tile: 52, block: 72, grid: null, gap: 10 };
let smudges = [];
let rovTile = 0;
let rovHalf = { b: 0, half: 'top' };
let tileEls = [];
let blockEls = [];

const g = () => cur.g;
const defOf = (kind, i) => (kind === 'lesson' ? LESSONS[i] : PUZZLES[i]);

// ---------------- speech ----------------
let liveTimer = 0;
function announce(text) {
  clearTimeout(liveTimer);
  el.live.textContent = '';
  liveTimer = setTimeout(() => { el.live.textContent = text; }, 40);
}
function say(text, tone = '', spoken = text) {
  note = { text, tone };
  renderNote();
  announce(spoken);
}

// ---------------- starting a puzzle ----------------
function start(kind, i, { wipe = true, keepHints = false } = {}) {
  const prevHints = keepHints && cur.g ? cur.g.hints : 0;
  const go = () => {
    const def = defOf(kind, i);
    cur = { kind, i, def, g: G.newGame(def), step: 0 };
    cur.g.hints = prevHints;
    held = null;
    note = null;
    smudges = [];
    progress.last = { kind, i };
    writeStore();
    buildBlocks();
    buildTiles();
    renderQuestion();
    renderNote();
    layout();
    render();
    renderLists();
    const where = kind === 'lesson' ? `연습 ${i + 1}` : `${i + 1}번째 낱말, ${GROUPS[def.group].name}`;
    const step = lessonStep();
    announce(`${where}. 단서: ${def.clue} ${COUNT[[...def.answer].length]} 글자.${step ? ' ' + step.say : ''}`);
  };
  if (wipe && cur.def && !still()) wipeBoard(go);
  else go();
}

function firstUnsolved() {
  const k = PUZZLES.findIndex((p) => !progress.marks[p.id]);
  return k < 0 ? null : k;
}
function nextTarget() {
  if (cur.kind === 'lesson') {
    if (cur.i + 1 < LESSONS.length) return ['lesson', cur.i + 1];
    const u = firstUnsolved();
    return ['puzzle', u == null ? 0 : u];
  }
  for (let k = cur.i + 1; k < PUZZLES.length; k++) if (!progress.marks[PUZZLES[k].id]) return ['puzzle', k];
  const u = firstUnsolved();
  return u == null ? null : ['puzzle', u];
}

// ---------------- building DOM ----------------
function buildBlocks() {
  el.blocks.textContent = '';
  blockEls = cur.g.blocks.map((_, b) => {
    const wrap = document.createElement('div');
    wrap.className = 'block';
    wrap.innerHTML =
      '<canvas class="art" aria-hidden="true"></canvas><canvas class="content" aria-hidden="true"></canvas>' +
      `<button type="button" class="half top" data-b="${b}" data-half="top" data-drop="half" data-drag="half" tabindex="-1"></button>` +
      `<button type="button" class="half bottom" data-b="${b}" data-half="bottom" data-drop="half" data-drag="half" tabindex="-1"><span class="batchim" aria-hidden="true">받침</span></button>` +
      '<span class="hint-cho" aria-hidden="true" hidden></span>';
    el.blocks.appendChild(wrap);
    return {
      wrap, art: $('.art', wrap), content: $('.content', wrap), top: $('.half.top', wrap), bottom: $('.half.bottom', wrap),
      batchim: $('.batchim', wrap), hintCho: $('.hint-cho', wrap), key: '', had: false,
    };
  });
  rovHalf = { b: 0, half: 'top' };
  const ctx = el.marks.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, el.marks.width, el.marks.height);
}

function buildTiles() {
  for (const t of tileEls) t.el.remove();
  tileEls = cur.g.tiles.map((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.id = t.id;
    b.dataset.drag = 'tile';
    b.dataset.drop = 'tile';
    b.tabIndex = -1;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<canvas aria-hidden="true"></canvas><span class="need" aria-hidden="true" hidden></span>';
    el.tray.appendChild(b);
    return { el: b, canvas: $('canvas', b), need: $('.need', b), key: '', x: 0, y: 0, rot: 0 };
  });
  rovTile = 0;
}

// ---------------- layout ----------------
function layout() {
  if (!cur.g) return;
  const cs = getComputedStyle(el.play);
  const gutter = parseFloat(cs.paddingLeft) || 16;
  const W = el.play.clientWidth - gutter * 2;
  const H = window.innerHeight;
  const n = cur.g.blocks.length;
  L.gap = W >= 836 ? 14 : 10;
  L.block = Math.round(clamp(Math.min((W - (n - 1) * L.gap) / n, H * 0.16, 164), 60, 164));
  L.tile = Math.round(clamp(Math.min(W / 6.6, H * 0.088), 48, 90));
  document.documentElement.style.setProperty('--block', L.block + 'px');
  document.documentElement.style.setProperty('--tile', L.tile + 'px');
  // the tray height depends on the rows above it, read it after the sizes are set
  computeGrid();
  assignCells();
  for (const be of blockEls) { be.key = ''; drawFrame(be, blockEls.indexOf(be)); }
  for (const te of tileEls) te.key = '';
  sizeCanvas(el.haze, el.play.clientWidth, el.play.clientHeight);
  paintHaze();
  dust.resize(window.innerWidth, window.innerHeight);
  if (placeMarks() && cur.g.solved) drawSolveMark(false);
  drawTools();
}

function sizeCanvas(c, w, h) {
  const dpr = DPR();
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function computeGrid() {
  const w = el.tray.clientWidth, h = Math.max(60, el.tray.clientHeight);
  const n = cur.g.tiles.length;
  let T = L.tile;
  let cols = Math.max(1, Math.floor(w / (T * 1.45))), rows = Math.max(1, Math.floor(h / (T * 1.3)));
  if (cols * rows < n + 2) {
    // not roomy: pick the column count that gives the widest spacing for n + 2 cells
    let best = 0;
    for (let c = 1; c <= 14; c++) {
      const r = Math.ceil((n + 2) / c), p = Math.min(w / c, h / r);
      if (p > best) { best = p; cols = c; rows = r; }
    }
    if (best < T * 1.12) {
      T = Math.max(44, Math.floor(best / 1.12));
      L.tile = T;
      document.documentElement.style.setProperty('--tile', T + 'px');
    }
  }
  const cw = w / cols, ch = h / rows;
  const r = rng(G.hash(cur.def.id + ':cells'));
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const jx = Math.max(0, (cw - T * 1.12) / 2) * 0.8, jy = Math.max(0, (ch - T * 1.12) / 2) * 0.8;
      cells.push({ x: (x + 0.5) * cw + (r() * 2 - 1) * jx, y: (y + 0.5) * ch + (r() * 2 - 1) * jy, rot: (r() * 2 - 1) * 6 });
    }
  }
  // first placement: a loose pile in the upper-left part of the board, near the blocks,
  // in a stable shuffled order. The rest of the board stays free for the player to sort tiles.
  // on roomy boards the right edge holds the stroke chart; keep the first pile clear of it
  const chartOn = w >= 640 && h >= 300 && !(cur.kind === 'lesson' && cur.i < 2);
  const freeCols = chartOn ? Math.max(3, Math.floor((w - CHART_W - 24) / cw)) : cols;
  const rc = Math.min(freeCols, Math.max(5, n + 2));
  const rr = Math.min(rows, Math.max(2, Math.ceil((n * 1.7) / rc)));
  const order = [];
  for (let y = 0; y < rr; y++) for (let x = 0; x < rc; x++) order.push(y * cols + x);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  L.grid = { w, h, cols, rows, cw, ch, cells, order, chartOn };
  drawChart(chartOn);
}

// The 가획 table a teacher keeps at the side of the board: every family, added strokes in yellow.
const CHART_ROWS = [['ㄱ', 'ㅋ'], ['ㄴ', 'ㄷ', 'ㅌ'], ['ㅁ', 'ㅂ', 'ㅍ'], ['ㅅ', 'ㅈ', 'ㅊ'], ['ㅏ', 'ㅑ', '', 'ㅓ', 'ㅕ'], ['ㅗ', 'ㅛ', '', 'ㅜ', 'ㅠ']];
const CHART_W = 5 * 42;
let chartKey = '';
function drawChart(on) {
  const fig = $('#chart');
  fig.hidden = !on;
  if (!on) return;
  const key = String(DPR());
  if (chartKey === key) return;
  chartKey = key;
  const cell = 42, rowH = 44;
  const c = $('canvas', fig);
  const ctx = sizeCanvas(c, CHART_W, CHART_ROWS.length * rowH);
  ctx.clearRect(0, 0, CHART_W, CHART_ROWS.length * rowH);
  CHART_ROWS.forEach((row, y) => {
    row.forEach((j, x) => {
      if (!j) return;
      const root = row[x - chainOf(j).level];
      const px = x * cell, py = y * rowH;
      const seed = 50 + x + y * 7;
      ctx.globalAlpha = 0.72;
      ctx.drawImage(glyph(j, 42, 32, isVowel(j) ? C.sky : C.chalk, seed), px, py, cell, cell);
      if (root !== j) {
        const d = strokeDiff(root, j, 42, 32, C.yellow, seed);
        ctx.globalAlpha = 0.95;
        if (d) ctx.drawImage(d.canvas, px, py, cell, cell);
      }
      ctx.globalAlpha = 1;
    });
  });
}

/** Give every loose tile a cell: keep its spot if free, else the nearest free one. */
function assignCells(skip = -1) {
  const { cells, order, w, h } = L.grid;
  const used = new Set();
  const nearest = (x, y) => {
    let best = -1, bd = Infinity;
    cells.forEach((c, i) => {
      if (used.has(i)) return;
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };
  const tiles = cur.g.tiles.filter((t) => !t.where && t.id !== skip);
  // tiles that already sit somewhere keep priority; returning tiles go home or nearby
  const placedFirst = [...tiles.filter((t) => t.pos), ...tiles.filter((t) => !t.pos)];
  let fresh = 0;
  for (const t of placedFirst) {
    let idx;
    if (t.pos) idx = nearest(t.pos.fx * w, t.pos.fy * h);
    else if (t.home) idx = nearest(t.home.fx * w, t.home.fy * h);
    else {
      while (fresh < order.length && used.has(order[fresh])) fresh++;
      idx = order[fresh] ?? nearest(w / 2, h / 2);
    }
    used.add(idx);
    const c = cells[idx];
    t.pos = { fx: c.x / w, fy: c.y / h };
    if (!t.home) t.home = { ...t.pos };
    const te = tileEls[t.id];
    te.x = c.x; te.y = c.y; te.rot = c.rot;
  }
}

function placeMarks() {
  const wrap = el.marks.parentElement;
  const gutter = parseFloat(getComputedStyle(el.play).paddingLeft) || 16;
  const w = wrap.clientWidth + gutter * 2, h = wrap.clientHeight + 40;
  el.marks.style.left = -gutter + 'px';
  el.marks.style.top = '-20px';
  const dpr = DPR();
  if (el.marks.width === Math.round(w * dpr) && el.marks.height === Math.round(h * dpr)) return false;
  sizeCanvas(el.marks, w, h);
  return true;
}

// ---------------- rendering ----------------
function render() {
  if (!cur.g) return;
  renderQuestion();
  renderBlocks();
  renderTiles();
  renderLedge();
  renderNote();
}

function renderQuestion() {
  const d = cur.def;
  if (cur.kind === 'lesson') {
    el.stageNum.textContent = `연습 ${cur.i + 1} / ${LESSONS.length}`;
    el.stageGroup.textContent = '';
  } else {
    el.stageNum.textContent = `${cur.i + 1}번째 낱말`;
    el.stageGroup.textContent = GROUPS[d.group].name;
  }
  el.clue.textContent = d.clue;
}

const VERT = new Set('ㅏㅐㅑㅒㅓㅔㅕㅖㅣ');
const HORZ = new Set('ㅗㅛㅜㅠㅡ');
function pieceBoxes(bs) {
  const kind = !bs.jung ? 'none' : VERT.has(bs.jung) ? 'v' : HORZ.has(bs.jung) ? 'h' : 'm';
  const T = {
    v: [[0.04, 0.1, 0.56, 0.8], [0.46, 0.06, 0.5, 0.88]],
    h: [[0.16, 0.02, 0.68, 0.56], [0.04, 0.4, 0.92, 0.56]],
    m: [[0.04, 0.02, 0.56, 0.54], [0.02, 0.1, 0.96, 0.84]],
    none: [[0.06, 0.06, 0.54, 0.54], null],
  };
  const B = {
    v: [[0.06, 0.03, 0.5, 0.54], [0.46, 0.0, 0.48, 0.62], [0.2, 0.56, 0.6, 0.42]],
    h: [[0.2, 0.0, 0.6, 0.4], [0.06, 0.22, 0.88, 0.4], [0.2, 0.56, 0.6, 0.42]],
    m: [[0.06, 0.0, 0.5, 0.42], [0.02, 0.06, 0.94, 0.58], [0.2, 0.58, 0.6, 0.4]],
    none: [[0.06, 0.04, 0.5, 0.5], null, [0.2, 0.56, 0.6, 0.42]],
  };
  return bs.jong ? B[kind] : T[kind];
}

function renderBlocks() {
  const game = g();
  const needs = game.hints >= 1 ? G.answerParts(cur.def) : null;
  blockEls.forEach((be, b) => {
    const bs = G.blockState(game, b);
    const B = L.block, dpr = DPR();
    const key = `${bs.cho}|${bs.jung}|${bs.jong}|${B}|${dpr}`;
    if (be.key !== key) {
      be.key = key;
      const ctx = sizeCanvas(be.content, B, B);
      ctx.clearRect(0, 0, B, B);
      const seed = G.hash(cur.def.id) + b * 13;
      if (bs.syllable && HAVE.has(bs.syllable)) {
        ctx.drawImage(glyph(bs.syllable, B, Math.round(B * 0.76), C.chalk, seed), 0, 0, B, B);
      } else {
        const boxes = pieceBoxes(bs);
        [[bs.cho, C.chalk], [bs.jung, C.sky], [bs.jong, C.chalk]].forEach(([j, col], k) => {
          const bx = boxes[k];
          if (!j || !bx) return;
          const src = glyph(j, 96, 80, col, seed + k);
          const [ix0, iy0, ix1, iy1] = src.ink;
          const pad = B * 0.04;
          ctx.drawImage(src, ix0, iy0, ix1 - ix0, iy1 - iy0, bx[0] * B + pad, bx[1] * B + pad, bx[2] * B - pad * 2, bx[3] * B - pad * 2);
        });
      }
      const has = !!bs.syllable;
      if (has && !be.had && !still()) {
        be.wrap.classList.remove('snap');
        void be.wrap.offsetWidth;
        be.wrap.classList.add('snap');
      }
      be.had = has;
    }
    const blk = game.blocks[b];
    const topNames = [...blk.cho, ...blk.jung].sort((x, y) => game.tiles[x].seq - game.tiles[y].seq)
      .map((i) => jamoName(game.tiles[i].j));
    const nth = `${ORDINAL[b]} 칸`;
    be.top.setAttribute('aria-label', `${nth} 위쪽, ` + (topNames.length ? topNames.join(' ') + (bs.syllable ? `, 글자 ${bs.syllable}` : '') : '비어 있음'));
    be.bottom.setAttribute('aria-label', `${nth} 받침, ` + (bs.jong ? jamoName(bs.jong) : '비어 있음'));
    be.batchim.hidden = !!bs.jong || game.solved;
    be.top.tabIndex = rovHalf.b === b && rovHalf.half === 'top' ? 0 : -1;
    be.bottom.tabIndex = rovHalf.b === b && rovHalf.half === 'bottom' ? 0 : -1;
    be.top.disabled = be.bottom.disabled = false;
    be.top.setAttribute('aria-disabled', game.solved ? 'true' : 'false');
    be.bottom.setAttribute('aria-disabled', game.solved ? 'true' : 'false');
    if (needs) {
      be.hintCho.hidden = false;
      be.hintCho.textContent = needs[b].cho;
    } else be.hintCho.hidden = true;
  });
}

function drawFrame(be, b) {
  const B = L.block, P = 6, S = B + P * 2;
  const ctx = sizeCanvas(be.art, S, S);
  ctx.clearRect(0, 0, S, S);
  const r = rng(G.hash(cur.def.id) + b * 101);
  const j = () => (r() - 0.5) * 2.2;
  const x0 = P, y0 = P, x1 = P + B, y1 = P + B;
  const sides = [
    [[x0 - 3 + j(), y0 + j()], [x1 + 2 + j(), y0 + j()]],
    [[x1 + j(), y0 - 3 + j()], [x1 + j(), y1 + 3 + j()]],
    [[x1 + 3 + j(), y1 + j()], [x0 - 2 + j(), y1 + j()]],
    [[x0 + j(), y1 + 2 + j()], [x0 + j(), y0 - 2 + j()]],
  ];
  sides.forEach((pts, k) => chalkStroke(ctx, pts, { width: 2.6, color: C.chalk, alpha: 0.8, seed: G.hash(cur.def.id) + b * 7 + k, gaps: 0.12 }));
  const my = P + B * 0.58;
  for (let x = x0 + 5; x < x1 - 4; x += 9) {
    chalkStroke(ctx, [[x, my], [Math.min(x + 4, x1 - 4), my]], { width: 1.6, color: C.chalk, alpha: 0.42, seed: b * 31 + x, gaps: 0 });
  }
}

function renderTiles() {
  const game = g();
  const looseIds = game.tiles.filter((t) => !t.where).map((t) => t.id);
  if (!looseIds.includes(rovTile)) rovTile = looseIds[0] ?? -1;
  const needs = game.hints >= 2 ? G.strokeNeeds(game) : null;
  const step = lessonStep();
  let pointed = false;
  for (const t of game.tiles) {
    const te = tileEls[t.id];
    const out = !!t.where;
    te.el.hidden = out;
    if (out) { te.el.tabIndex = -1; te.el.classList.remove("pointed"); continue; }
    drawTile(t, te);
    te.el.style.transform = `translate(${te.x - L.tile / 2}px, ${te.y - L.tile / 2}px) rotate(${te.rot}deg)`;
    const isHeld = held?.kind === 'tile' && held.id === t.id;
    te.el.setAttribute('aria-pressed', isHeld ? 'true' : 'false');
    te.el.tabIndex = t.id === rovTile ? 0 : -1;
    const changed = t.j !== t.orig ? `, 처음엔 ${jamoName(t.orig)}` : '';
    const vowel = isVowel(t.j) ? '모음' : '자음';
    te.el.setAttribute('aria-label', `${jamoName(t.j)}, ${vowel}${changed}`);
    const nd = needs ? needs[t.id] : 0;
    te.need.hidden = !nd;
    if (nd) te.need.textContent = (nd > 0 ? '+' : '−') + Math.abs(nd);
    const point = !!step?.point && !pointed && t.j === step.point && !game.solved;
    te.el.classList.toggle('pointed', point);
    if (point) pointed = true;
  }
  el.trayEmpty.hidden = looseIds.length > 0 || game.solved;
  renderChainTag();
}

function drawTile(t, te) {
  const T = L.tile, S = T, dpr = DPR();
  const key = `${t.j}|${t.orig}|${T}|${dpr}`;
  if (te.key === key) return;
  te.key = key;
  const ctx = sizeCanvas(te.canvas, T, T);
  paintTile(ctx, t.j, t.orig, T, S, t.seed);
}

function paintTile(ctx, j, orig, T, S, seed) {
  ctx.clearRect(0, 0, T, T);
  ctx.drawImage(glyph(j, T, S, isVowel(j) ? C.sky : C.chalk, seed), 0, 0, T, T);
  const d = strokesBetween(orig, j);
  if (d > 0) {
    const o = strokeDiff(orig, j, T, S, C.yellow, seed);
    if (o) ctx.drawImage(o.canvas, 0, 0, T, T);
  } else if (d < 0) {
    const o = strokeDiff(j, orig, T, S, C.chalk, seed, 0.2);
    if (o) ctx.drawImage(o.canvas, 0, 0, T, T);
  }
}

let chainTag = null;
function renderChainTag() {
  const t = held?.kind === 'tile' ? g().tiles[held.id] : null;
  if (!t || t.where || chainOf(t.j).chain.length < 2) { chainTag?.remove(); chainTag = null; return; }
  if (!chainTag) {
    chainTag = document.createElement('div');
    chainTag.className = 'chain';
    chainTag.setAttribute('aria-hidden', 'true');
    el.tray.appendChild(chainTag);
  }
  const { chain } = chainOf(t.j);
  chainTag.innerHTML = chain.map((c) => `<span class="${c === t.j ? 'now' : ''}">${c}</span>`).join('<span class="sep">·</span>');
  const te = tileEls[t.id];
  const w = chainTag.offsetWidth || 90;
  const x = clamp(te.x - w / 2, 0, L.grid.w - w);
  const above = te.y - L.tile / 2 - 34;
  chainTag.style.transform = `translate(${x}px, ${above < 0 ? te.y + L.tile / 2 + 6 : above}px)`;
}

function renderLedge() {
  const game = g();
  const lesson = cur.kind === 'lesson';
  el.tools.hidden = lesson && cur.i < 2;
  el.chalkN.textContent = game.chalk;
  el.chalk.classList.toggle('empty', game.chalk <= 0);
  el.chalk.setAttribute('aria-label', `분필, ${game.chalk}획 남음`);
  el.eraser.setAttribute('aria-label', '지우개');
  el.chalk.setAttribute('aria-pressed', held?.kind === 'chalk' ? 'true' : 'false');
  el.eraser.setAttribute('aria-pressed', held?.kind === 'eraser' ? 'true' : 'false');
  const step = lessonStep();
  el.chalk.classList.toggle('pointed', step?.tool === 'chalk' && !game.flags.stroked && !game.solved);
  el.eraser.classList.toggle('pointed', step?.tool === 'eraser' && !game.flags.erased && !game.solved);
  el.hint.hidden = lesson;
  el.hint.textContent = game.hints === 0 ? '힌트' : game.hints === 1 ? '힌트 하나 더' : '힌트 다 봤어요';
  el.hint.disabled = game.hints >= 2 || game.solved;
  el.undo.disabled = !game.history.length || game.solved;
  el.reset.disabled = false;
  el.skip.hidden = !lesson || game.solved;
  el.next.hidden = !game.solved;
  if (game.solved) el.next.textContent = nextTarget() ? (cur.kind === 'lesson' && cur.i === LESSONS.length - 1 ? '문제 풀러 가기' : '다음 낱말') : '낱말 공책 보기';
  drawTools();
}

let toolKey = '';
function drawTools() {
  const n = g() ? g().chalk : 0;
  const key = `${n}|${DPR()}`;
  if (toolKey === key) return;
  toolKey = key;
  // chalk stick: its length is the strokes left
  const sc = $('canvas', el.chalk);
  sc.getContext('2d', { willReadFrequently: true });
  const ctx = sizeCanvas(sc, 88, 30);
  ctx.clearRect(0, 0, 88, 30);
  const seg = 13, len = n > 0 ? Math.min(84, 10 + seg * n) : 6;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(2, 10, len, 11, [2, 5, 5, 2]);
  ctx.fill();
  chalkify(ctx, sc.width, sc.height, C.yellow, 5 + n, 0.4);
  // a notch for every stroke left, so the count can be read off the stick
  ctx.globalCompositeOperation = 'destination-out';
  for (let k = 1; k < n && 10 + seg * k < len; k++) ctx.fillRect(2 + 10 + seg * k - 13 + 12, 10, 1.4, 11);
  ctx.globalCompositeOperation = 'source-over';
  if (n <= 0) {
    ctx.fillStyle = C.yellow;
    const r = rng(9);
    for (let k = 0; k < 22; k++) { ctx.globalAlpha = 0.3 + r() * 0.4; ctx.fillRect(10 + r() * 30, 17 + r() * 6, 1.3, 1.3); }
    ctx.globalAlpha = 1;
  }
  // eraser: metal back, felt face dusted with chalk
  const ec = $('canvas', el.eraser);
  if (!ec.dataset.drawn || ec.dataset.drawn !== String(DPR())) {
    const e = sizeCanvas(ec, 64, 30);
    e.clearRect(0, 0, 64, 30);
    e.fillStyle = C.metal;
    e.beginPath(); e.roundRect(3, 5, 58, 12, 3); e.fill();
    e.fillStyle = C.felt;
    e.fillRect(4, 17, 56, 9);
    const r = rng(77);
    e.fillStyle = C.chalk;
    for (let k = 0; k < 120; k++) { e.globalAlpha = 0.15 + r() * 0.45; e.fillRect(4 + r() * 55, 17 + r() * 8.5, 1, 1); }
    e.globalAlpha = 1;
    ec.dataset.drawn = String(DPR());
  }
}

function renderNote() {
  const game = g();
  let text, tone;
  const step = lessonStep();
  if (note) ({ text, tone } = note);
  else if (step) { text = step.say; tone = 'teach'; }
  else if (cur.def) { text = GROUPS[cur.def.group]?.note || ''; tone = ''; }
  el.note.textContent = text || '';
  el.note.className = 'note' + (tone ? ' ' + tone : '');
  void game;
}

// ---------------- lessons ----------------
function lessonStep() {
  if (cur.kind !== 'lesson' || !cur.def) return null;
  const steps = cur.def.steps;
  const game = g();
  const ok = (w) => w === 'start' || (w === 'syllable' ? game.blocks.some((_, b) => G.blockState(game, b).syllable) : !!game.flags[w]);
  let k = cur.step;
  while (k + 1 < steps.length && ok(steps[k + 1].when)) k++;
  if (k !== cur.step) {
    cur.step = k;
    note = null;
    setTimeout(() => announce(steps[k].say), 600);
  }
  return game.solved ? null : steps[k];
}

// ---------------- lists (rail and sheet) ----------------
function itemHTML(kind, i, def) {
  const syl = [...def.answer];
  const done = kind === 'lesson' ? i < progress.lessons : !!progress.marks[def.id];
  const mark = kind === 'lesson' ? (done ? 'circle' : '') : progress.marks[def.id] || '';
  const label = (kind === 'lesson' ? `연습 ${i + 1}` : `${i + 1}번째 낱말`) + `, ${COUNT[syl.length]} 글자, ` +
    (mark === 'flower' ? '꽃동그라미' : mark ? '동그라미' : '아직 안 풀었어요') + (done ? `, 답 ${def.answer}` : '');
  const current = cur.kind === kind && cur.i === i;
  return `<li><button type="button" class="item" data-kind="${kind}" data-i="${i}" aria-label="${label}"${current ? ' aria-current="true"' : ''}>` +
    `<span class="n" aria-hidden="true">${i + 1}</span><span class="cells" aria-hidden="true">${syl.map((s) => `<span>${done ? s : ''}</span>`).join('')}</span>` +
    `<canvas data-mark="${mark}" aria-hidden="true"></canvas></button></li>`;
}

function listHTML() {
  let h = '<section class="book-group"><h3>연습</h3><p>규칙을 하나씩 손으로 익혀요.</p><ol>' +
    LESSONS.map((d, i) => itemHTML('lesson', i, d)).join('') + '</ol></section>';
  GROUPS.forEach((gr, k) => {
    h += `<section class="book-group"><h3>${gr.name}</h3><p>${gr.note}</p><ol>` +
      PUZZLES.map((d, i) => (d.group === k ? itemHTML('puzzle', i, d) : '')).join('') + '</ol></section>';
  });
  return h;
}

function renderLists() {
  const html = listHTML();
  const solved = PUZZLES.filter((p) => progress.marks[p.id]).length;
  const flowers = PUZZLES.filter((p) => progress.marks[p.id] === 'flower').length;
  const count = `푼 낱말 ${solved} / ${PUZZLES.length}` + (flowers ? `, 꽃동그라미 ${flowers}개` : '');
  for (const [list, cnt] of [[el.railList, el.count], [el.bookList, el.bookCount]]) {
    list.innerHTML = html;
    cnt.textContent = count;
    for (const c of $$('canvas[data-mark]', list)) drawMiniMark(c, c.dataset.mark);
  }
}

function drawMiniMark(c, mark) {
  const ctx = sizeCanvas(c, 40, 36);
  if (!mark) return;
  const pts = loopPoints(20, 18, mark === 'flower' ? 9 : 11, mark === 'flower' ? 8.5 : 10, { seed: 3, flower: mark === 'flower', overshoot: 0.4, depth: 0.42, petals: 6 });
  chalkStroke(ctx, pts, { width: 2, color: C.pink, alpha: 1, seed: 4, gaps: 0.05 });
}

function renderDate() {
  const d = new Date();
  el.date.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`;
}

// ---------------- haze, smudges, marks ----------------
function paintHaze() {
  const w = el.play.clientWidth, h = el.play.clientHeight;
  const ctx = el.haze.getContext('2d');
  const solvedWords = PUZZLES.filter((p) => progress.marks[p.id]).slice(-3);
  const ghosts = solvedWords.map((p) => {
    const r = rng(G.hash(p.answer));
    // ghosts of solved words sit in the open board below the blocks, where old lessons were wiped
    const top = (el.tray.offsetTop + 40) / h, span = Math.max(0.05, (el.tray.offsetHeight - 80) / h);
    return { text: p.answer, x: 0.04 + r() * 0.5, y: top + span * (0.45 + r() * 0.55), rot: (r() - 0.5) * 0.16, size: Math.min(140, w * 0.15) * (0.7 + r() * 0.4) };
  });
  drawHaze(ctx, w, h, { seed: 11, ghosts, smudges: smudges.map((s) => ({ ...s, x: s.fx, y: s.fy })) });
}

function addSmudge(clientX, clientY, r = 18) {
  const pr = el.play.getBoundingClientRect();
  const s = { fx: (clientX - pr.left) / pr.width, fy: (clientY - pr.top) / pr.height, r, seed: Math.floor(Math.random() * 1e6) };
  smudges.push(s);
  if (smudges.length > 40) smudges.shift();
  smudge(el.haze.getContext('2d'), s.fx * pr.width, s.fy * pr.height, s.r, s.seed);
}

function solveGeometry() {
  const row = el.blocks.getBoundingClientRect(), box = el.marks.getBoundingClientRect();
  const first = blockEls[0].wrap.getBoundingClientRect(), last = blockEls[blockEls.length - 1].wrap.getBoundingClientRect();
  const left = first.left, right = last.right;
  return { cx: (left + right) / 2 - box.left, cy: row.top + row.height / 2 - box.top, w: right - left, h: row.height, bw: box.width };
}

function drawSolveMark(animated) {
  const game = g();
  const ctx = el.marks.getContext('2d');
  const dpr = DPR();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, el.marks.width, el.marks.height);
  const { cx, cy, w, h, bw } = solveGeometry();
  const flower = cur.kind === 'puzzle' && game.hints === 0;
  const k = flower ? 1.1 : 1;
  const rx = Math.min(w / 2 + 22, cx - 2, bw - cx - 2) / k;
  const ry = (h / 2 + 14) / k;
  const seed = G.hash(cur.def.id + ':mark');
  const pts = loopPoints(cx, cy, rx, ry, { seed, flower });
  const opts = { width: 3.4, color: C.pink, alpha: 0.95, seed, gaps: 0.08 };
  if (!animated || still()) { chalkStroke(ctx, pts, opts); return; }
  const t0 = performance.now(), dur = 950;
  let prev = 0;
  const pr = el.marks.getBoundingClientRect();
  dust.run((_, now) => {
    const p = Math.min(1, Math.max(0, (now - t0) / dur));
    const e = 1 - (1 - p) ** 2.2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    chalkStroke(ctx, pts, { ...opts, from: prev, to: e });
    const tip = pts[Math.min(pts.length - 1, Math.floor(e * (pts.length - 1)))];
    if (Math.random() < 0.5) dust.puff(pr.left + tip[0], pr.top + tip[1] + 2, 3, 6, C.pink);
    prev = e;
    return p < 1;
  });
}

// ---------------- effects ----------------
function rectOf(elm) { return elm.getBoundingClientRect(); }

function puffAt(elm, n = 12, color = C.chalk) {
  if (still()) return;
  const r = rectOf(elm);
  dust.puff(r.left + r.width / 2, r.top + r.height * 0.86, n, r.width * 0.7, color);
}

function animateStroke(t, from, to) {
  const te = tileEls[t.id];
  if (still()) return;
  const T = L.tile, S = T;
  const o = strokeDiff(from, to, T, S, C.yellow, t.seed);
  if (!o) return;
  const ctx = te.canvas.getContext('2d');
  const dpr = DPR();
  const [x0, y0, x1, y1] = o.box;
  const t0 = performance.now(), dur = 300;
  te.key = 'anim';
  dust.run((_, now) => {
    const p = Math.min(1, Math.max(0, (now - t0) / dur));
    if (!te.el.isConnected) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintTile(ctx, from, t.orig, T, S, t.seed);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // reveal the new stroke along its long side, the way a hand pulls the chalk
    if (o.axis === 'x') {
      const w = Math.max(1, (x1 - x0 + 4) * p);
      ctx.drawImage(o.canvas, x0 - 2, 0, w, o.canvas.height, x0 - 2, 0, w, o.canvas.height);
    } else {
      const h = Math.max(1, (y1 - y0 + 4) * p);
      ctx.drawImage(o.canvas, 0, y0 - 2, o.canvas.width, h, 0, y0 - 2, o.canvas.width, h);
    }
    if (p >= 1) {
      te.key = '';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTile(t, te);
      const r = rectOf(te.el);
      dust.puff(r.left + ((x0 + x1) / 2) / dpr * (r.width / T), r.top + (y1 / dpr) * (r.height / T), 6, 10, C.yellow);
      return false;
    }
    return true;
  });
}

function animateErase(t) {
  const te = tileEls[t.id];
  const r = rectOf(te.el);
  addSmudge(r.left + r.width / 2, r.top + r.height / 2, L.tile * 0.36);
  if (still()) return;
  const t0 = performance.now();
  const seed = Math.random() * 1e6;
  dust.run((ctx, now) => {
    const p = Math.min(1, Math.max(0, (now - t0) / 320));
    const rr = rng(seed);
    ctx.fillStyle = C.chalk;
    for (let k = 0; k < 140; k++) {
      const a = rr() * Math.PI * 2, d = rr() * r.width * 0.42;
      ctx.globalAlpha = (1 - p) * (0.05 + rr() * 0.12);
      ctx.fillRect(r.left + r.width / 2 + Math.cos(a) * d * 1.2 + Math.sin(p * 20 + k) * 4, r.top + r.height / 2 + Math.sin(a) * d * 0.7, 2, 2);
    }
    ctx.globalAlpha = 1;
    return p < 1;
  });
  dust.puff(r.left + r.width / 2, r.bottom - 6, 10, r.width * 0.6);
}

function wipeBoard(then) {
  el.play.classList.add('wiping');
  const pr = el.play.getBoundingClientRect();
  const top = el.blocks.getBoundingClientRect().top - 10, bottom = el.tray.getBoundingClientRect().bottom - 20;
  const left = pr.left + 20, right = pr.right - 40;
  const path = [[left, top], [right, top + (bottom - top) * 0.33], [left, top + (bottom - top) * 0.66], [right, bottom]];
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const at = (d) => {
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i]) { const k = d / seg[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k]; }
      d -= seg[i];
    }
    return path[path.length - 1];
  };
  const t0 = performance.now(), dur = 520;
  let swapped = false;
  let trail = [];
  dust.run((ctx, now) => {
    const p = Math.min(1, Math.max(0, (now - t0) / dur));
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    const [x, y] = at(e * total);
    trail.push([x, y]);
    if (trail.length > 10) trail = trail.slice(-10);
    // residue under the eraser
    ctx.fillStyle = C.chalk;
    trail.forEach(([tx, ty], k) => {
      ctx.globalAlpha = 0.03 * (k / trail.length);
      ctx.fillRect(tx - 48, ty - 18, 96, 36);
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.08);
    ctx.fillStyle = C.metal;
    ctx.beginPath(); ctx.roundRect(-46, -16, 92, 20, 5); ctx.fill();
    ctx.fillStyle = C.felt;
    ctx.fillRect(-44, 4, 88, 12);
    ctx.restore();
    if (!swapped && p > 0.42) { swapped = true; then(); }
    if (swapped) {
      const hz = el.haze.getContext('2d');
      const hr = el.haze.getBoundingClientRect();
      const rr = rng(Math.floor(now));
      hz.fillStyle = C.chalk;
      for (let k = 0; k < 40; k++) {
        hz.globalAlpha = 0.012 + rr() * 0.02;
        hz.fillRect(x - hr.left + (rr() - 0.5) * 100, y - hr.top + (rr() - 0.5) * 36, 2, 1.5);
      }
      hz.globalAlpha = 1;
    }
    if (p >= 1) { el.play.classList.remove('wiping'); return false; }
    return true;
  });
}

// ---------------- actions ----------------
const SLOT_WORD = { cho: '첫소리', jung: '가운뎃소리', jong: '받침' };

function afterMove() {
  const game = g();
  assignCells(drag?.id ?? -1);
  render();
  const v = G.verdict(game);
  if (v === 'solved') solve();
  else if (v === 'wrong') {
    say('칸에 쓴 낱말이 단서와 달라요. 자모를 바꿔 보세요.', 'wrong', `${G.word(game)}, 단서와 다른 낱말이에요. 자모를 바꿔 보세요.`);
    if (!still()) for (const be of blockEls) { be.wrap.classList.remove('shudder'); void be.wrap.offsetWidth; be.wrap.classList.add('shudder'); }
  }
}

function doPlace(id, b, half, { remembered = false } = {}) {
  const game = g();
  const t = game.tiles[id];
  const j = t.j;
  if (!remembered) G.remember(game);
  const res = G.place(game, id, b, half);
  held = null;
  note = null;
  const bs = G.blockState(game, b);
  let msg = `${josa(jamoName(j), '을/를')} ${ORDINAL[b]} 칸 ${SLOT_WORD[res.slot]}에 놓았어요.`;
  if (res.kind === 'stack') msg += ` 겹쳐서 ${josa(jamoName(res.value), '이/가')} 되었어요.`;
  if (res.kind === 'swap') msg += ` 있던 ${josa(res.swapped.map((i) => jamoName(game.tiles[i].j)).join(' '), '은/는')} 칠판으로 돌아갔어요.`;
  if (bs.syllable) msg += ` ${ORDINAL[b]} 칸은 ${bs.syllable}.`;
  announce(msg);
  afterMove();
  puffAt(blockEls[b].wrap, 14);
}

function doTakeOut(b, half, { toHand = false } = {}) {
  const game = g();
  if (!G.halfHas(game, b, half)) {
    say(`${ORDINAL[b]} 칸 ${half === 'top' ? '위쪽' : '받침'}은 비어 있어요. 자모를 먼저 고르세요.`);
    return -1;
  }
  G.remember(game);
  const id = G.takeOut(game, b, half);
  note = null;
  if (!toHand) {
    announce(`${josa(jamoName(game.tiles[id].j), '을/를')} 칠판으로 꺼냈어요.`);
    afterMove();
  }
  return id;
}

function doStroke(id, dir) {
  const game = g();
  if (game.solved) return false;
  if (el.tools.hidden) return false;
  const t = game.tiles[id];
  G.remember(game);
  const res = G.stroke(game, id, dir);
  if (!res.ok) {
    game.history.pop();
    const f = jamoName(res.from);
    const why = {
      inblock: '칸에 놓인 자모는 꺼낸 다음 고칠 수 있어요.',
      top: `${josa(f, '은/는')} 획을 더 더할 수 없어요.`,
      bottom: `${josa(f, '은/는')} 더 지울 획이 없어요.`,
      nochain: dir > 0 ? `${josa(f, '은/는')} 획을 더해 만드는 자모가 아니에요.` : `${josa(f, '은/는')} 지울 획이 없어요.`,
      nochalk: '분필이 다 닳았어요. 다른 자모에서 획을 하나 지워 오세요.',
    }[res.reason];
    say(why, 'wrong');
    return false;
  }
  note = null;
  const a = jamoName(res.from), b = jamoName(res.to);
  if (dir > 0) {
    say(`${a}에 획을 더해 ${josa(b, '이/가')} 되었어요.`, '', `${a}에 획을 더해 ${josa(b, '이/가')} 되었어요. 분필 ${game.chalk}획 남았어요.`);
    animateStroke(t, res.from, res.to);
  } else {
    say(`${a}에서 획 하나를 지워 ${josa(b, '이/가')} 되었어요. 분필이 한 획 돌아왔어요.`);
    animateErase(t);
  }
  render();
  return true;
}

function doMove(id, clientX, clientY) {
  const game = g();
  const t = game.tiles[id];
  const tr = el.tray.getBoundingClientRect();
  const fx = clamp((clientX - tr.left) / tr.width, 0, 1), fy = clamp((clientY - tr.top) / tr.height, 0, 1);
  G.remember(game);
  // free the cell first so the tile can land in the nearest free spot to the pointer
  t.pos = null;
  const others = game.tiles.filter((o) => !o.where && o.id !== id);
  const used = new Set();
  const { cells, w, h } = L.grid;
  for (const o of others) {
    let best = -1, bd = Infinity;
    cells.forEach((c, i) => { if (!used.has(i)) { const d = (c.x / w - o.pos.fx) ** 2 + (c.y / h - o.pos.fy) ** 2; if (d < bd) { bd = d; best = i; } } });
    used.add(best);
  }
  let best = -1, bd = Infinity;
  cells.forEach((c, i) => { if (!used.has(i)) { const d = (c.x / w - fx) ** 2 + (c.y / h - fy) ** 2; if (d < bd) { bd = d; best = i; } } });
  t.pos = { fx: cells[best].x / w, fy: cells[best].y / h };
  held = null;
  note = null;
  afterMove();
}

function release(silent = false) {
  if (!held) return;
  held = null;
  if (!silent) announce('내려놓았어요.');
  render();
}

function solve() {
  const game = g();
  game.solved = true;
  held = null;
  const flower = cur.kind === 'puzzle' && game.hints === 0;
  if (cur.kind === 'lesson') progress.lessons = Math.max(progress.lessons, cur.i + 1);
  else if (progress.marks[cur.def.id] !== 'flower') progress.marks[cur.def.id] = flower ? 'flower' : 'circle';
  writeStore();
  const fixes = game.tiles.filter((t) => t.j !== t.orig)
    .map((t) => `${josa(t.orig, '을/를')} ${josa(t.j, '으로/로')}`);
  let text = `맞았어요. ${cur.def.answer}.`;
  if (cur.kind === 'puzzle') text += flower ? ' 힌트 없이 풀어서 꽃동그라미예요.' : ' 동그라미예요.';
  if (fixes.length) text += ` 고친 자모: ${fixes.join(', ')}.`;
  if (cur.kind === 'lesson' && cur.i === LESSONS.length - 1) text += ' 연습을 마쳤어요. 이제 16문제가 기다려요.';
  if (cur.kind === 'puzzle' && firstUnsolved() == null) text += ` ${PUZZLES.length}문제를 다 풀었어요.`;
  render();
  say(text, 'done');
  drawSolveMark(true);
  renderLists();
  el.next.focus({ preventScroll: true });
}

function hint() {
  const game = g();
  if (game.hints >= 2 || game.solved) return;
  game.hints++;
  if (game.hints === 1) {
    const chos = G.answerParts(cur.def).map((d) => d.cho);
    say('칸마다 첫소리를 노란 표로 붙여 두었어요.', '', `첫소리 힌트: ${chos.map(jamoName).join(', ')}.`);
  } else {
    const needs = G.strokeNeeds(game);
    const list = game.tiles.filter((t) => needs[t.id]).map((t) => `${jamoName(t.j)} ${needs[t.id] > 0 ? '더하기' : '지우기'} ${Math.abs(needs[t.id])}`);
    say(list.length ? '획을 고칠 자모에 노란 표를 붙였어요. +는 더하기, −는 지우기예요.' : '칠판의 자모는 획을 고치지 않아도 돼요. 모으기만 하면 돼요.', '',
      list.length ? `획을 고칠 자모: ${list.join(', ')}.` : '획을 고칠 자모가 없어요.');
  }
  render();
}

// ---------------- pointer input ----------------
// A press on a tile, a 칸 half, the chalk or the eraser becomes a drag after 7px of movement and a
// tap otherwise. Taps are handled here on pointerup (touch browsers do not always follow a quick
// tap with a click); the click that may follow is swallowed. Keyboard activation still arrives as
// a click with detail 0.
let drag = null;
let swallowClickUntil = 0;

document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !cur.g || drag) return;
  const src = e.target.closest('[data-drag]') || (e.target === el.tray ? el.tray : null);
  if (!src || src.closest('dialog')) return;
  const game = g();
  const kind = src === el.tray ? 'tray' : src.dataset.drag;
  if ((kind === 'chalk' || kind === 'eraser') && el.tools.hidden) return;
  const movable = !game.solved && kind !== 'tray' && !(kind === 'half' && !G.halfHas(game, +src.dataset.b, src.dataset.half));
  drag = { kind, src, movable, x0: e.clientX, y0: e.clientY, pid: e.pointerId, started: false, id: kind === 'tile' ? +src.dataset.id : -1,
    b: +src.dataset.b, half: src.dataset.half, touch: e.pointerType === 'touch', target: null, ghost: null };
  try { src.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
});

document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.started) {
    if (!drag.movable || Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
    if (!startDrag()) { drag = null; return; }
  }
  e.preventDefault();
  moveGhost(e.clientX, e.clientY);
  hitTest(e.clientX, e.clientY);
});

document.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  swallowClickUntil = performance.now() + 600;
  if (d.started) endDrag(e.clientX, e.clientY);
  drag = null;
  if (!d.started) tap(d);
});
document.addEventListener('pointercancel', (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  if (drag.started) endDrag(NaN, NaN);
  drag = null;
});
document.addEventListener('click', (e) => {
  if (e.detail !== 0 && performance.now() < swallowClickUntil && (e.target.closest('[data-drag]') || e.target === el.tray)) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

function tap(d) {
  if (!cur.g) return;
  if (d.kind === 'tile') { if (!g().solved) onTile(d.id, false); }
  else if (d.kind === 'half') { if (!g().solved) onHalf(d.b, d.half, false); }
  else if (d.kind === 'tray') onTray(d.x0, d.y0);
  else onTool(d.kind, false);
}

function ghostCanvas(w, h, paint) {
  const box = document.createElement('div');
  box.className = 'ghost';
  box.style.width = w + 'px';
  box.style.height = h + 'px';
  const c = document.createElement('canvas');
  const ctx = sizeCanvas(c, w, h);
  paint(ctx);
  box.appendChild(c);
  el.dragLayer.appendChild(box);
  return box;
}

function startDrag() {
  const game = g();
  drag.started = true;
  held = null;
  note = null;
  const T = L.tile;
  if (drag.kind === 'half') {
    const id = doTakeOut(drag.b, drag.half, { toHand: true });
    if (id < 0) return false;
    drag.kind = 'tile';
    drag.id = id;
    drag.fromBlock = true;
    render();
  }
  if (drag.kind === 'tile') {
    const t = game.tiles[drag.id];
    const te = tileEls[drag.id];
    if (!drag.fromBlock) {
      const r = rectOf(te.el);
      addSmudge(r.left + r.width / 2, r.top + r.height / 2, T * 0.3);
    }
    te.el.classList.add('dragging');
    drag.ghost = ghostCanvas(T, T, (ctx) => paintTile(ctx, t.j, t.orig, T, T, t.seed));
    drag.gw = T; drag.gh = T;
    drag.ghost.style.transform += ' scale(1.08)';
  } else {
    const src = $('canvas', drag.src);
    const w = drag.kind === 'chalk' ? 88 : 64;
    drag.ghost = ghostCanvas(w, 30, (ctx) => ctx.drawImage(src, 0, 0, w, 30));
    drag.gw = w; drag.gh = 30;
    drag.src.setAttribute('aria-pressed', 'true');
  }
  renderChainTag();
  return true;
}

function moveGhost(x, y) {
  const lift = drag.touch ? (drag.kind === 'tile' ? drag.gh * 0.55 : 30) : 0;
  const ox = drag.kind === 'tile' ? drag.gw / 2 : 8;
  const oy = drag.gh / 2 + lift;
  drag.ghost.style.transform = `translate(${x - ox}px, ${y - oy}px)` + (drag.kind === 'tile' ? ' scale(1.08)' : ' rotate(-12deg)');
  drag.px = x; drag.py = y - lift;
}

function dropTargetAt(x, y) {
  const hit = document.elementFromPoint(x, y);
  const t = hit?.closest('[data-drop]');
  if (!t) return null;
  const kind = t.dataset.drop;
  if (drag.kind === 'tile') {
    if (kind === 'tile' && +t.dataset.id === drag.id) return el.tray;
    if (kind === 'tile') return el.tray;
    if ((kind === 'chalk' || kind === 'eraser') && el.tools.hidden) return null;
    return t;
  }
  if (kind === 'tile') return t;
  if (kind === 'half') return t;
  return null;
}

function hitTest(x, y) {
  const t = dropTargetAt(drag.px, drag.py);
  if (t === drag.target) return;
  drag.target?.classList.remove('target');
  drag.target = t;
  if (t && t !== el.tray) t.classList.add('target');
}

function endDrag(x, y) {
  const game = g();
  drag.target?.classList.remove('target');
  drag.ghost?.remove();
  const ok = Number.isFinite(x);
  const target = ok ? dropTargetAt(drag.px, drag.py) : null;
  if (drag.kind === 'tile') {
    const id = drag.id;
    tileEls[id].el.classList.remove('dragging');
    const kind = target?.dataset.drop;
    if (target && kind === 'half') {
      doPlace(id, +target.dataset.b, target.dataset.half, { remembered: !!drag.fromBlock });
    } else if (target === el.tray) {
      if (drag.fromBlock) {
        // it was taken out: keep that as the move, then put it where it was dropped
        game.tiles[id].pos = null;
        const { left, top, width, height } = el.tray.getBoundingClientRect();
        const fx = clamp((drag.px - left) / width, 0, 1), fy = clamp((drag.py - top) / height, 0, 1);
        game.tiles[id].pos = { fx, fy };
        const keep = drag; drag = null;
        announce(`${josa(jamoName(game.tiles[id].j), '을/를')} 칠판으로 꺼냈어요.`);
        afterMove();
        drag = keep;
      } else doMove(id, drag.px, drag.py);
    } else if (target && (kind === 'chalk' || kind === 'eraser')) {
      if (drag.fromBlock) { const keep = drag; drag = null; afterMove(); drag = keep; }
      doStroke(id, kind === 'chalk' ? 1 : -1);
    } else {
      if (drag.fromBlock) { const keep = drag; drag = null; announce(`${josa(jamoName(game.tiles[id].j), '을/를')} 칠판으로 꺼냈어요.`); afterMove(); drag = keep; }
      else render();
    }
    if (!(target && kind === 'half')) puffAt(tileEls[id].el, 8);
  } else {
    drag.src.setAttribute('aria-pressed', 'false');
    if (target?.dataset.drop === 'tile') doStroke(+target.dataset.id, drag.kind === 'chalk' ? 1 : -1);
    else if (target?.dataset.drop === 'half') say('칸에 놓인 자모는 꺼낸 다음 고칠 수 있어요.');
    render();
  }
}

// ---------------- clicks (mouse, touch and keyboard all arrive here) ----------------
el.tray.addEventListener('click', (e) => {
  if (!cur.g || g().solved) return;
  const tile = e.target.closest('.tile');
  if (tile) { onTile(+tile.dataset.id, e.detail === 0); return; }
  if (e.target === el.tray) onTray(e.clientX, e.clientY);
});

function onTray(x, y) {
  if (!cur.g || g().solved) return;
  if (held?.kind === 'tile') doMove(held.id, x, y);
  else if (held) release();
}

el.blocks.addEventListener('click', (e) => {
  const h = e.target.closest('.half');
  if (!h || !cur.g || g().solved) return;
  onHalf(+h.dataset.b, h.dataset.half, e.detail === 0);
});

el.chalk.addEventListener('click', (e) => onTool('chalk', e.detail === 0));
el.eraser.addEventListener('click', (e) => onTool('eraser', e.detail === 0));

function onTile(id, viaKeys) {
  const game = g();
  rovTile = id;
  if (held?.kind === 'chalk' || held?.kind === 'eraser') {
    const dir = held.kind === 'chalk' ? 1 : -1;
    held = null;
    doStroke(id, dir);
    return;
  }
  if (held?.kind === 'tile' && held.id === id) { release(); return; }
  held = { kind: 'tile', id };
  const j = game.tiles[id].j;
  const { chain } = chainOf(j);
  announce(`${josa(jamoName(j), '을/를')} 들었어요. 놓을 칸을 고르세요.` + (chain.length > 1 ? ` 획 사슬: ${chain.map(jamoName).join(', ')}.` : ''));
  render();
  if (viaKeys) focusHalf(suggestHalf(j));
}

function onHalf(b, half, viaKeys) {
  rovHalf = { b, half };
  if (held?.kind === 'tile') {
    const from = tileEls[held.id];
    const fx = from.x, fy = from.y;
    doPlace(held.id, b, half);
    if (viaKeys && !g().solved) focusTileNear(fx, fy) || focusHalf({ b, half });
    return;
  }
  if (held) { held = null; say('칸에 놓인 자모는 꺼낸 다음 고칠 수 있어요.'); render(); return; }
  doTakeOut(b, half);
  if (viaKeys) focusHalf({ b, half });
}

function onTool(kind, viaKeys) {
  if (!cur.g || g().solved) return;
  if (held?.kind === 'tile') {
    const id = held.id;
    if (doStroke(id, kind === 'chalk' ? 1 : -1)) held = { kind: 'tile', id };
    render();
    return;
  }
  if (held?.kind === kind) { release(); return; }
  held = { kind };
  announce(kind === 'chalk' ? '분필을 들었어요. 획을 더할 자모를 고르세요.' : '지우개를 들었어요. 획을 지울 자모를 고르세요.');
  render();
  if (viaKeys) focusTileNear(-1, -1);
}

function suggestHalf(j) {
  const game = g();
  const n = game.blocks.length;
  for (let b = 0; b < n; b++) {
    const bs = G.blockState(game, b);
    if (isVowel(j) ? !bs.jung : !bs.cho) return { b, half: 'top' };
  }
  if (!isVowel(j)) for (let b = 0; b < n; b++) if (!G.blockState(game, b).jong) return { b, half: 'bottom' };
  return rovHalf;
}

function focusHalf({ b, half }) {
  rovHalf = { b, half };
  renderBlocks();
  blockEls[b]?.[half]?.focus();
}

function focusTileNear(x, y) {
  const game = g();
  const ids = game.tiles.filter((t) => !t.where).map((t) => t.id);
  if (!ids.length) return false;
  let best = ids[0];
  if (x >= 0) {
    let bd = Infinity;
    for (const id of ids) { const d = (tileEls[id].x - x) ** 2 + (tileEls[id].y - y) ** 2; if (d < bd) { bd = d; best = id; } }
  }
  rovTile = best;
  renderTiles();
  tileEls[best].el.focus();
  return true;
}

// ---------------- keys ----------------
const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

el.tray.addEventListener('keydown', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile || !cur.g) return;
  const id = +tile.dataset.id;
  if (DIRS[e.key]) {
    e.preventDefault();
    const [dx, dy] = DIRS[e.key];
    const me = tileEls[id];
    let best = -1, bs = Infinity;
    for (const t of g().tiles) {
      if (t.where || t.id === id) continue;
      const o = tileEls[t.id];
      const vx = o.x - me.x, vy = o.y - me.y;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2.2;
      if (score < bs) { bs = score; best = t.id; }
    }
    if (best >= 0) { rovTile = best; renderTiles(); tileEls[best].el.focus(); }
    return;
  }
  if (e.key === '+' || e.key === '=') { e.preventDefault(); doStroke(id, 1); tileEls[id].el.focus(); }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); doStroke(id, -1); tileEls[id].el.focus(); }
});

el.blocks.addEventListener('keydown', (e) => {
  const h = e.target.closest('.half');
  if (!h || !cur.g) return;
  const b = +h.dataset.b, half = h.dataset.half, n = g().blocks.length;
  let to = null;
  if (e.key === 'ArrowLeft') to = { b: Math.max(0, b - 1), half };
  else if (e.key === 'ArrowRight') to = { b: Math.min(n - 1, b + 1), half };
  else if (e.key === 'ArrowUp') to = { b, half: 'top' };
  else if (e.key === 'ArrowDown') to = { b, half: 'bottom' };
  else if ((e.key === 'Backspace' || e.key === 'Delete') && !g().solved) { e.preventDefault(); doTakeOut(b, half); focusHalf({ b, half }); return; }
  if (to) { e.preventDefault(); focusHalf(to); }
});

document.addEventListener('keydown', (e) => {
  if (!cur.g || document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape' && held) {
    const was = held;
    release();
    if (was.kind === 'tile' && el.blocks.contains(document.activeElement)) focusTileNear(tileEls[was.id].x, tileEls[was.id].y);
  } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    doUndo();
  }
});

function doUndo() {
  const game = g();
  if (game.solved || !G.undo(game)) return;
  held = null;
  note = null;
  assignCells();
  render();
  announce('한 수 물렀어요.');
}

// ---------------- buttons, dialogs ----------------
el.undo.addEventListener('click', doUndo);
el.reset.addEventListener('click', () => {
  start(cur.kind, cur.i, { keepHints: !g().solved });
  announce('처음부터 다시 해요.');
});
el.hint.addEventListener('click', hint);
el.next.addEventListener('click', () => {
  const nt = nextTarget();
  if (nt) { start(nt[0], nt[1]); requestAnimationFrame(() => (tileEls.find((t) => t.el.tabIndex === 0)?.el || el.clue).focus({ preventScroll: true })); }
  else openBook();
});
el.skip.addEventListener('click', () => {
  progress.lessons = LESSONS.length;
  writeStore();
  const u = firstUnsolved();
  start('puzzle', u == null ? 0 : u);
});

function openBook() {
  if (getComputedStyle($('#rail')).display !== 'none') { $('.item[aria-current="true"]', el.railList)?.focus() || $('.item', el.railList)?.focus(); return; }
  el.book.showModal();
  ($('.item[aria-current="true"]', el.bookList) || $('.item', el.bookList))?.focus();
}
$('#open-book').addEventListener('click', openBook);
$('#open-rules').addEventListener('click', () => el.rules.showModal());
$('#book-rules').addEventListener('click', () => { el.book.close(); el.rules.showModal(); });
for (const d of [el.book, el.rules]) {
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
}
for (const list of [el.railList, el.bookList]) {
  list.addEventListener('click', (e) => {
    const it = e.target.closest('.item');
    if (!it) return;
    if (el.book.open) el.book.close();
    start(it.dataset.kind, +it.dataset.i);
  });
}

// ---------------- boot ----------------
let resizeRaf = 0;
function onResize() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => { layout(); render(); });
}
window.addEventListener('resize', onResize);
// the lesson pulse is the only looping motion: hold it while the board is scrolled out of view
new IntersectionObserver(([en]) => el.play.classList.toggle('away', !en.isIntersecting), { threshold: 0.05 }).observe(el.tray);
// the tray also changes size when the clue or the note wraps differently: re-grid the tiles
let trayH = 0;
new ResizeObserver(() => {
  const h = el.tray.clientHeight;
  if (!cur.g || Math.abs(h - trayH) < 3) return;
  trayH = h;
  onResize();
}).observe(el.tray);
reduced.addEventListener?.('change', () => render());

async function boot() {
  try {
    await Promise.race([document.fonts.load('48px Orbit', 'ㄱㅏ가'), new Promise((r) => setTimeout(r, 2500))]);
  } catch { /* draw with the fallback face */ }
  renderDate();
  let kind = 'lesson', i = 0;
  const last = progress.last;
  const anySolved = PUZZLES.some((p) => progress.marks[p.id]);
  if (last && defOf(last.kind, last.i)) {
    [kind, i] = [last.kind, last.i];
    const solved = kind === 'lesson' ? i < progress.lessons : !!progress.marks[PUZZLES[i].id];
    if (solved) {
      cur.kind = kind; cur.i = i;
      const nt = nextTarget();
      if (nt) [kind, i] = nt;
    }
  } else if (progress.lessons >= LESSONS.length || anySolved) {
    kind = 'puzzle';
    i = firstUnsolved() ?? 0;
  } else i = progress.lessons;
  cur = { kind: null, i: 0, def: null, g: null, step: 0 };
  start(kind, i, { wipe: false });
}
boot();
