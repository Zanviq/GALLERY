// Tactics board controller: SVG rendering, pointer and keyboard input, playback, move list.
import * as M from './model.js';
import { courtMarkup } from './court.js';
import { PLAYS, BLANK } from './plays.js';

const NS = 'http://www.w3.org/2000/svg';
const ALL_PLAYS = [...PLAYS, BLANK];
const HOLD = 1.1; // seconds per beat when motion is reduced
const STORE_KEY = 'futsal.board.v1';
const MSG = {
  twoPasses: "한 박자에 패스는 하나만 돼요. '앞 화살표와 같이'를 끄고 다시 그려 보세요.",
  twoRuns: "한 박자에 한 사람은 한 번만 뛰어요. '앞 화살표와 같이'를 끄고 다시 그려 보세요.",
  max: `화살표는 ${M.MAX_MOVES}개까지예요. 몇 개 빼고 다시 그려 보세요.`,
  noUndo: '되돌릴 게 없어요.',
  noMoves: '재생할 화살표가 없어요. 선수 자석에서 끌어 먼저 그려 보세요.',
  nothingToClear: '지울 화살표가 없어요.',
};

const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } },
  set(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* storage off: settings reset on reload */ } },
};

const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const f = (n) => Math.round(n * 1000) / 1000;

export function initBoard(root) {
  const svg = root.querySelector('.board__svg');
  const stage = root.querySelector('.board__stage');
  const statusEl = root.querySelector('[data-status]');
  const listEl = root.querySelector('[data-moves]');
  const setupList = root.querySelector('[data-setup]');
  const noteEl = root.querySelector('[data-note]');
  const playBtn = root.querySelector('[data-act="play"]');
  const undoBtn = root.querySelector('[data-act="undo"]');
  const clearBtn = root.querySelector('[data-act="clear"]');
  const joinBox = root.querySelector('[data-joinbox]');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- state ---------- */
  let state = M.clone({ setup: PLAYS[0].setup, moves: PLAYS[0].moves });
  let playId = PLAYS[0].id;
  let sim = M.simulate(state);
  const undoStack = [];
  const saved = store.get();
  let speed = [0.5, 1, 2].includes(saved.speed) ? saved.speed : 1;
  let mode = saved.mode === 'move' ? 'move' : 'draw';
  let selected = null;
  let drag = null;
  let kb = null; // keyboard arrow drawing { id, cursor, join }
  let keyBurst = null;
  let touched = false;
  let autoplayed = false;
  let vertical = false;
  let mpp = 0.05; // metres per CSS pixel
  const play = { status: 'setup', beat: 0, t: 0, stepOnly: false, raf: 0, last: 0, autoPaused: false, flashed: -1 };

  /* ---------- SVG skeleton ---------- */
  svg.innerHTML = '';
  const world = el('g', { class: 'world' }, svg);
  const court = el('g', { class: 'court', 'aria-hidden': 'true' }, world);
  court.innerHTML = courtMarkup();
  const lines = court.querySelector('.c-lines');
  const labels = [...court.querySelectorAll('.c-label')];
  const goals = [...court.querySelectorAll('.c-goal')];
  const arrowsG = el('g', { class: 'arrows', 'aria-hidden': 'true' }, world);
  const ghostsG = el('g', { class: 'ghosts', 'aria-hidden': 'true' }, world);
  const previewG = el('g', { class: 'preview', 'aria-hidden': 'true' }, world);
  const snapRing = el('circle', { class: 'snap', r: 1, cx: 0, cy: 0 }, previewG);
  const piecesG = el('g', { class: 'pieces' }, world);

  const pieces = {};
  for (const id of M.PIECES) {
    const isBall = id === 'ball';
    const pl = M.PLAYER[id];
    const g = el('g', {
      class: `piece ${isBall ? 'piece--ball' : 'piece--player'}${pl && pl.gk ? ' piece--gk' : ''}`,
      'data-id': id, tabindex: '0', role: 'button', 'aria-roledescription': isBall ? '공 자석' : '선수 자석',
      'aria-pressed': 'false', 'aria-describedby': 'board-keys',
    }, piecesG);
    const art = el('g', { class: 'piece__art' }, g);
    el('circle', { class: 'piece__hit', r: isBall ? 3 : 1.6 }, art); // at least 44 px across
    el('circle', { class: 'piece__focus-o', r: isBall ? 2.45 : 1.62 }, art);
    el('circle', { class: 'piece__focus', r: isBall ? 2.1 : 1.42 }, art);
    el('circle', { class: 'piece__sel', r: isBall ? 1.9 : 1.32 }, art);
    if (isBall) {
      el('circle', { class: 'ball__body', r: 1 }, art);
      el('path', { class: 'ball__patch', d: 'M0 -0.42 L0.4 -0.13 L0.25 0.34 L-0.25 0.34 L-0.4 -0.13Z M0 -1 L0 -0.42 M0.95 -0.31 L0.4 -0.13 M0.59 0.81 L0.25 0.34 M-0.59 0.81 L-0.25 0.34 M-0.95 -0.31 L-0.4 -0.13' }, art);
    } else {
      el('circle', { class: 'piece__shadow', r: 1, cy: 0.09 }, art);
      el('circle', { class: 'piece__body', r: 1 }, art);
      const t = el('text', { class: 'piece__num', x: 0, y: 0 }, art);
      t.textContent = String(pl.num);
    }
    piecesG.appendChild(g);
    pieces[id] = { g, art };
  }
  // the ball sits above the players so it can always be grabbed
  piecesG.appendChild(pieces.ball.g);

  /* ---------- geometry ---------- */
  const rMag = () => 15 * mpp;
  const rBall = () => 8 * mpp;

  function setOrientation(v) {
    vertical = v;
    root.classList.toggle('is-vertical', v);
    svg.setAttribute('viewBox', v ? '-2 -2 24 44' : '-2 -2 44 24');
    world.setAttribute('transform', v ? 'translate(0 40) rotate(-90)' : '');
  }

  function rescale() {
    const w = stage.clientWidth || 600;
    setOrientation(w < 600);
    mpp = (vertical ? 24 : 44) / w;
    lines.setAttribute('stroke-width', f(Math.max(0.08, 1.6 * mpp)));
    court.querySelectorAll('.c-net').forEach((n) => n.setAttribute('stroke-width', f(0.9 * mpp)));
    court.querySelectorAll('.c-dot').forEach((n) => n.setAttribute('r', f(Math.max(0.12, 2.2 * mpp))));
    for (const t of labels) {
      const [x, y] = t.dataset.at.split(',').map(Number);
      t.setAttribute('x', x);
      t.setAttribute('y', y);
      t.setAttribute('font-size', f(11 * mpp));
    }
    for (const id of M.PIECES) {
      const r = id === 'ball' ? rBall() : rMag();
      pieces[id].art.setAttribute('transform', `scale(${f(r)})`);
      const num = pieces[id].art.querySelector('.piece__num');
      if (num) num.setAttribute('transform', vertical ? 'rotate(90)' : '');
    }
    snapRing.setAttribute('r', f(rMag() + 6 * mpp));
    snapRing.setAttribute('stroke-width', f(2 * mpp));
    renderArrows();
    renderGhosts();
    renderPreview();
  }

  function toCourt(e) {
    const m = world.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function keyVec(key) {
    const v = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
    if (!v) return null;
    return vertical ? { x: -v[1], y: v[0] } : { x: v[0], y: v[1] };
  }

  /* ---------- drawing helpers ---------- */
  function arrowMarkup(from, to, kind, cls, beatNo, trimEnd = 0) {
    const d = M.dist(from, to);
    if (d < 0.05) return '';
    const ux = (to.x - from.x) / d;
    const uy = (to.y - from.y) / d;
    const tip = { x: to.x - ux * trimEnd, y: to.y - uy * trimEnd };
    const h = 10 * mpp;
    const hw = 5.5 * mpp;
    const base = { x: tip.x - ux * h, y: tip.y - uy * h };
    const l = { x: base.x - uy * hw, y: base.y + ux * hw };
    const r = { x: base.x + uy * hw, y: base.y - ux * hw };
    const sw = 2.2 * mpp;
    const lineEnd = kind === 'pass' ? base : { x: tip.x - ux * sw * 0.5, y: tip.y - uy * sw * 0.5 };
    let s = `<g class="arrow arrow--${kind} ${cls}">`;
    s += `<path class="arrow__halo" d="M${f(from.x)} ${f(from.y)} L${f(lineEnd.x)} ${f(lineEnd.y)}" stroke-width="${f(sw + 3 * mpp)}"/>`;
    s += `<path class="arrow__line" d="M${f(from.x)} ${f(from.y)} L${f(lineEnd.x)} ${f(lineEnd.y)}" stroke-width="${f(sw)}"${kind === 'run' ? ` stroke-dasharray="${f(6 * mpp)} ${f(4.5 * mpp)}"` : ''}/>`;
    s += kind === 'pass'
      ? `<path class="arrow__head" d="M${f(tip.x)} ${f(tip.y)} L${f(l.x)} ${f(l.y)} L${f(r.x)} ${f(r.y)}Z"/>`
      : `<path class="arrow__chev" d="M${f(l.x)} ${f(l.y)} L${f(tip.x)} ${f(tip.y)} L${f(r.x)} ${f(r.y)}" stroke-width="${f(sw)}"/>`;
    if (beatNo) {
      const mx = from.x + (tip.x - from.x) * 0.5;
      const my = from.y + (tip.y - from.y) * 0.5;
      const br = 8 * mpp;
      s += `<circle class="arrow__badge" cx="${f(mx)}" cy="${f(my)}" r="${f(br)}"/>`;
      s += `<text class="arrow__no" x="${f(mx)}" y="${f(my)}" font-size="${f(11 * mpp)}"${vertical ? ` transform="rotate(90 ${f(mx)} ${f(my)})"` : ''}>${beatNo}</text>`;
    }
    return s + '</g>';
  }

  function renderArrows() {
    let s = '';
    sim.forEach((b, bi) => {
      for (const i of b.idx) {
        const m = state.moves[i];
        let from;
        let to;
        let trim = 0;
        if (m.kind === 'run') { from = b.start[m.piece]; to = m.to; trim = rMag() - mpp; }
        else {
          from = b.tracks.ball.from;
          to = m.target ? b.end[m.target] : m.to;
          if (m.target) trim = rMag() + 2 * mpp;
        }
        s += arrowMarkup(from, to, m.kind, '', bi + 1, trim).replace('class="arrow ', `data-beat="${bi}" class="arrow `);
      }
    });
    arrowsG.innerHTML = s;
    markBeats();
  }

  function markBeats() {
    const active = play.status !== 'setup';
    for (const a of arrowsG.children) {
      const b = Number(a.dataset.beat);
      a.classList.toggle('is-done', active && b < play.beat);
      a.classList.toggle('is-now', active && b === play.beat && play.status !== 'ended');
    }
  }

  function renderGhosts() {
    const fin = M.finalPositions(state, sim);
    let s = '';
    const moved = new Set(state.moves.filter((m) => m.kind === 'run').map((m) => m.piece));
    for (const id of moved) {
      const p = fin[id];
      s += `<g class="ghost" data-id="${id}" data-ghost="1" transform="translate(${f(p.x)} ${f(p.y)})">`
        + `<circle class="ghost__hit" r="${f(22 * mpp)}"/>`
        + `<circle class="ghost__ring" r="${f(rMag() - mpp)}" stroke-width="${f(1.6 * mpp)}" stroke-dasharray="${f(3 * mpp)} ${f(2.5 * mpp)}"/>`
        + `<text class="ghost__num" font-size="${f(10 * mpp)}"${vertical ? ' transform="rotate(90)"' : ''}>${M.PLAYER[id].num}</text></g>`;
    }
    ghostsG.innerHTML = s;
  }

  function renderPreview() {
    previewG.querySelectorAll('.arrow, .cursor').forEach((n) => n.remove());
    snapRing.classList.remove('is-on');
    const live = drag && !drag.moveMode && drag.moved ? { id: drag.id, from: drag.origin, to: drag.cur, snap: drag.snap }
      : kb ? { id: kb.id, from: kb.origin, to: kb.cursor, snap: kb.snap } : null;
    if (!live) return;
    const kind = live.id === 'ball' ? 'pass' : 'run';
    const to = live.snap ? live.snapPos || drag?.snapPos || kb?.snapPos : live.to;
    const wrap = document.createElementNS(NS, 'g');
    wrap.innerHTML = arrowMarkup(live.from, to || live.to, kind, 'is-preview', 0, live.snap ? rMag() + 2 * mpp : 0);
    if (wrap.firstChild) previewG.insertBefore(wrap.firstChild, snapRing);
    if (live.snap) {
      const sp = (drag && drag.snapPos) || (kb && kb.snapPos);
      snapRing.setAttribute('cx', f(sp.x));
      snapRing.setAttribute('cy', f(sp.y));
      snapRing.classList.add('is-on');
    }
    if (kb) {
      const c = el('g', { class: 'cursor', transform: `translate(${f(kb.cursor.x)} ${f(kb.cursor.y)})` });
      const r = 9 * mpp;
      el('circle', { r: f(r), 'stroke-width': f(2 * mpp) }, c);
      el('path', { d: `M${f(-r * 1.6)} 0 L${f(-r * 0.5)} 0 M${f(r * 0.5)} 0 L${f(r * 1.6)} 0 M0 ${f(-r * 1.6)} L0 ${f(-r * 0.5)} M0 ${f(r * 0.5)} L0 ${f(r * 1.6)}`, 'stroke-width': f(2 * mpp) }, c);
      previewG.appendChild(c);
    }
  }

  function placePieces(pos) {
    for (const id of M.PIECES) {
      const p = pos[id];
      pieces[id].g.setAttribute('transform', `translate(${f(p.x)} ${f(p.y)})`);
    }
  }

  function labelPieces(pos, owner) {
    for (const id of M.PIECES) pieces[id].g.setAttribute('aria-label', M.describePiece(id, pos[id], owner));
  }

  /* ---------- list view ---------- */
  function renderList() {
    const words = M.describeMoves(state, sim);
    const beats = M.beatsOf(state.moves);
    listEl.innerHTML = '';
    if (!state.moves.length) {
      const li = document.createElement('li');
      li.className = 'moves__empty';
      li.textContent = '아직 화살표가 없어요. 선수 자석에서 끌면 뛰는 길, 공에서 끌면 패스예요.';
      listEl.appendChild(li);
    }
    state.moves.forEach((m, i) => {
      const li = document.createElement('li');
      li.className = `moves__item moves__item--${m.kind}${i > 0 && m.join ? ' is-joined' : ''}`;
      li.dataset.beat = beats[i];
      const no = document.createElement('span');
      no.className = 'moves__beat';
      no.textContent = `${beats[i] + 1}박자`;
      const tx = document.createElement('span');
      tx.className = 'moves__text';
      tx.textContent = words[i].text;
      const tools = document.createElement('span');
      tools.className = 'moves__tools';
      if (i > 0) {
        const j = document.createElement('button');
        j.type = 'button';
        j.className = 'mini';
        j.dataset.join = i;
        j.setAttribute('aria-pressed', String(!!m.join));
        j.setAttribute('aria-label', `${i + 1}번째 화살표를 앞 화살표와 같이 움직이기`);
        j.textContent = '같이';
        tools.appendChild(j);
      }
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'mini';
      x.dataset.remove = i;
      x.setAttribute('aria-label', `${i + 1}번째 화살표 빼기`);
      x.textContent = '빼기';
      tools.appendChild(x);
      li.append(no, tx, tools);
      listEl.appendChild(li);
    });
    setupList.innerHTML = '';
    const own = M.ownerOf(state.setup);
    for (const id of M.PIECES) {
      const li = document.createElement('li');
      li.textContent = M.describePiece(id, state.setup[id], own);
      setupList.appendChild(li);
    }
  }

  function markListBeat() {
    for (const li of listEl.children) {
      const b = Number(li.dataset.beat);
      li.classList.toggle('is-now', play.status !== 'setup' && play.status !== 'ended' && b === play.beat);
    }
  }

  /* ---------- state changes ---------- */
  function snapshot() { return JSON.stringify({ state, playId }); }
  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 50) undoStack.shift();
  }

  function changed() {
    sim = M.simulate(state);
    toSetup(true);
    renderArrows();
    renderGhosts();
    renderPreview();
    renderList();
    labelPieces(state.setup, M.ownerOf(state.setup));
    undoBtn.setAttribute('aria-disabled', String(!undoStack.length));
    clearBtn.setAttribute('aria-disabled', String(!state.moves.length));
    for (const b of root.querySelectorAll('[data-play]')) b.setAttribute('aria-pressed', String(b.dataset.play === playId));
    const pl = ALL_PLAYS.find((p) => p.id === playId);
    noteEl.textContent = pl ? pl.note : '직접 그린 판이에요. 재생을 누르면 그린 순서대로 움직여요.';
  }

  function edited() {
    playId = null;
    changed();
  }

  let sayTimer = 0;
  function say(text) {
    statusEl.textContent = '';
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { statusEl.textContent = text; }, 30);
  }

  function touch() {
    touched = true;
  }

  /* ---------- selection ---------- */
  function select(id) {
    selected = id;
    for (const pid of M.PIECES) pieces[pid].g.setAttribute('aria-pressed', String(pid === id));
    root.classList.toggle('has-selection', !!id);
    if (!id) return;
    const name = id === 'ball' ? '공' : M.who(id);
    if (mode === 'move') say(`${eul(name)} 골랐어요. 코트를 누르면 그 자리로 옮겨요.`);
    else if (id === 'ball') say('공을 골랐어요. 선수나 코트를 누르면 그쪽으로 패스 화살표가 생겨요.');
    else say(`${eul(name)} 골랐어요. 코트를 누르면 그쪽으로 뛰는 화살표가 생겨요.`);
  }
  const eul = M.eul;

  /* ---------- arrows ---------- */
  function originFor(id, join) {
    if (join && sim.length) return sim[sim.length - 1].start[id];
    return M.finalPositions(state, sim)[id];
  }

  function passTarget(point, join) {
    const pos = M.positionsForNew(state, join, sim);
    const t = M.snapTarget(point, pos, Math.max(M.SNAP, rMag() * 1.6));
    return t ? { id: t, pos: pos[t] } : null;
  }

  function commit(id, point, opts = {}) {
    const join = !!(opts.join ?? joinBox.checked);
    if (state.moves.length >= M.MAX_MOVES) { say(MSG.max); return false; }
    const from = originFor(id, join);
    let move;
    if (id === 'ball') {
      const t = opts.target ? { id: opts.target, pos: M.positionsForNew(state, join, sim)[opts.target] } : passTarget(point, join);
      const to = t ? { ...t.pos } : M.clampPt(point);
      if (M.dist(from, to) < 0.6) return false;
      move = { kind: 'pass', piece: 'ball', target: t ? t.id : null, to, join };
    } else {
      const to = M.clampPt(point);
      if (M.dist(from, to) < 0.6) return false;
      move = { kind: 'run', piece: id, to, join };
    }
    const next = [...state.moves, move];
    const err = M.validate(next);
    if (err) { say(MSG[err]); return false; }
    pushUndo();
    state.moves = next;
    edited();
    const w = M.describeMoves(state, sim);
    const last = w[w.length - 1];
    say(`${last.beat}박자: ${last.text}.`);
    return true;
  }

  function removeMove(i) {
    pushUndo();
    const next = M.clone(state.moves);
    if (!next[i].join && next[i + 1] && next[i + 1].join) next[i + 1].join = false;
    next.splice(i, 1);
    state.moves = next;
    edited();
    say(`${i + 1}번째 화살표를 뺐어요.`);
  }

  function toggleJoin(i) {
    const next = M.clone(state.moves);
    next[i].join = !next[i].join;
    const err = M.validate(next);
    if (err) { say(MSG[err]); return; }
    pushUndo();
    state.moves = next;
    edited();
    say(next[i].join ? `${i + 1}번째 화살표를 앞 화살표와 같이 움직여요.` : `${i + 1}번째 화살표를 따로 움직여요.`);
  }

  function moveSetup(id, p) {
    state.setup[id] = M.clampPt(p);
  }

  /* ---------- playback ---------- */
  function shownPositions() {
    if (play.status === 'setup' || !sim.length) return state.setup;
    if (play.beat >= sim.length) return sim[sim.length - 1].end;
    const b = sim[play.beat];
    if (play.t < 0) return b.start;
    return reduceMQ.matches ? b.end : M.positionsAt(b, play.t);
  }

  function toSetup(silent) {
    cancelAnimationFrame(play.raf);
    play.status = 'setup';
    play.beat = 0;
    play.t = 0;
    play.autoPaused = false;
    play.flashed = -1;
    root.dataset.run = 'setup';
    placePieces(state.setup);
    markBeats();
    markListBeat();
    setPlayLabel();
    if (!silent) labelPieces(state.setup, M.ownerOf(state.setup));
  }

  function setPlayLabel() {
    const s = play.status;
    playBtn.querySelector('span').textContent = s === 'playing' ? '멈춤' : s === 'ended' ? '다시 재생' : '재생';
    playBtn.dataset.state = s === 'playing' ? 'pause' : 'play';
  }

  function beatLength(b) { return reduceMQ.matches ? HOLD : b.T; }

  function start(fromBeginning, stepOnly) {
    if (!sim.length) { say(MSG.noMoves); return; }
    if (fromBeginning) { play.beat = 0; play.t = 0; play.flashed = -1; }
    play.status = 'playing';
    play.stepOnly = stepOnly;
    play.autoPaused = false;
    root.dataset.run = 'playing';
    setPlayLabel();
    markBeats();
    markListBeat();
    if (reduceMQ.matches && play.t <= 0) announceBeat();
    play.last = performance.now();
    cancelAnimationFrame(play.raf);
    play.raf = requestAnimationFrame(tick);
  }

  function pause(auto = false) {
    if (play.status !== 'playing') return;
    cancelAnimationFrame(play.raf);
    play.status = 'paused';
    play.autoPaused = auto;
    root.dataset.run = 'paused';
    setPlayLabel();
  }

  function announceBeat() {
    const b = sim[play.beat];
    if (!b) return;
    const words = M.describeMoves(state, sim);
    say(`${play.beat + 1}박자: ${b.idx.map((i) => words[i].text).join(', ')}.`);
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - play.last) / 1000) * speed;
    play.last = now;
    const b = sim[play.beat];
    const wasNeg = play.t < 0;
    play.t += dt;
    if (wasNeg && play.t >= 0 && reduceMQ.matches) announceBeat();
    if (b && b.shot && play.flashed !== play.beat && play.t >= (reduceMQ.matches ? 0 : b.shot.at)) {
      play.flashed = play.beat;
      goal(b.shot.by);
    }
    if (b && play.t >= beatLength(b)) {
      play.beat += 1;
      if (play.beat >= sim.length) {
        play.status = 'ended';
        root.dataset.run = 'ended';
        placePieces(sim[sim.length - 1].end);
        labelPieces(sim[sim.length - 1].end, sim[sim.length - 1].ownerEnd);
        markBeats();
        markListBeat();
        setPlayLabel();
        if (!sim[sim.length - 1].shot) say('끝까지 재생했어요. 다시 재생하거나 화살표를 더 그려 보세요.');
        return;
      }
      play.t = -M.GAP;
      markBeats();
      markListBeat();
      if (play.stepOnly) {
        play.t = 0;
        play.status = 'paused';
        root.dataset.run = 'paused';
        placePieces(sim[play.beat].start);
        labelPieces(sim[play.beat].start, sim[play.beat].ownerStart);
        setPlayLabel();
        return;
      }
    }
    placePieces(shownPositions());
    play.raf = requestAnimationFrame(tick);
  }

  function goal(by) {
    const g = goals.find((n) => n.dataset.goal === 'opp');
    g.classList.add('is-goal');
    setTimeout(() => g.classList.remove('is-goal'), 900);
    say(by ? `골! ${iga(M.PLAYER[by].name)} 넣었어요.` : '골!');
  }
  const iga = M.iga;

  function onPlay() {
    touch();
    if (play.status === 'playing') { pause(); say('멈췄어요.'); return; }
    if (play.status === 'paused') { start(false, false); return; }
    start(true, false);
  }

  function onStep() {
    touch();
    if (!sim.length) { say(MSG.noMoves); return; }
    if (play.status === 'playing') pause();
    if (play.status === 'ended') { toSetup(); say('처음 자리예요. 한 박자를 누르면 1박자부터 움직여요.'); return; }
    if (play.status === 'setup') { play.beat = 0; play.t = 0; play.flashed = -1; }
    if (reduceMQ.matches) { jumpStep(); return; }
    if (play.t <= 0) announceBeat();
    start(false, true);
  }

  // Reduced motion: one press shows the end of the next beat at once, no timer in between.
  function jumpStep() {
    const k = play.beat;
    const b = sim[k];
    if (!b) return;
    announceBeat();
    if (b.shot) { play.flashed = k; goal(b.shot.by); }
    play.beat = k + 1;
    play.t = 0;
    const last = play.beat >= sim.length;
    play.status = last ? 'ended' : 'paused';
    play.autoPaused = false;
    root.dataset.run = play.status;
    placePieces(b.end);
    labelPieces(b.end, b.ownerEnd);
    markBeats();
    markListBeat();
    setPlayLabel();
  }

  /* ---------- pointer input ---------- */
  function pieceFrom(target) {
    const n = target.closest('[data-id]');
    return n && svg.contains(n) ? n : null;
  }

  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const n = pieceFrom(e.target);
    if (!n) return;
    e.preventDefault();
    touch();
    const fromGhost = !!n.dataset.ghost;
    if (play.status !== 'setup') toSetup();
    const id = n.dataset.id;
    const p = toCourt(e);
    const moveMode = !fromGhost && (mode === 'move' || e.shiftKey);
    const join = joinBox.checked || (e.shiftKey && fromGhost);
    drag = {
      id, pointerId: e.pointerId, start: p, cur: p, moved: false, moveMode, fromGhost, join,
      grab: moveMode ? { x: state.setup[id].x - p.x, y: state.setup[id].y - p.y } : null,
      origin: moveMode ? null : originFor(id, join), snap: null, snapPos: null, undoPushed: false,
    };
    try { n.setPointerCapture(e.pointerId); } catch { /* element may be gone */ }
    if (!fromGhost) pieces[id].g.classList.add('is-lifted');
    if (!fromGhost) pieces[id].g.focus({ preventScroll: true });
  });

  svg.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = toCourt(e);
    drag.cur = p;
    if (!drag.moved && M.dist(p, drag.start) > Math.max(0.5, 6 * mpp)) drag.moved = true;
    if (!drag.moved) return;
    if (drag.moveMode) {
      if (!drag.undoPushed) { pushUndo(); drag.undoPushed = true; }
      moveSetup(drag.id, { x: p.x + drag.grab.x, y: p.y + drag.grab.y });
      sim = M.simulate(state);
      placePieces(state.setup);
      renderArrows();
      renderGhosts();
    } else {
      if (drag.id === 'ball') {
        const t = passTarget(p, drag.join);
        drag.snap = t ? t.id : null;
        drag.snapPos = t ? t.pos : null;
      }
      renderPreview();
    }
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    pieces[d.id].g.classList.remove('is-lifted');
    if (cancelled) { renderPreview(); if (d.moveMode && d.moved) edited(); return; }
    if (!d.moved) { renderPreview(); tapPiece(d.id, d.fromGhost); return; }
    if (d.moveMode) {
      edited();
      say(`${eul(d.id === 'ball' ? '공' : M.who(d.id))} 옮겼어요. ${M.zone(state.setup[d.id])}.`);
    } else {
      renderPreview();
      commit(d.id, d.cur, { join: d.join, target: d.snap });
    }
    select(null);
  }
  svg.addEventListener('pointerup', (e) => endDrag(e, false));
  svg.addEventListener('pointercancel', (e) => endDrag(e, true));
  svg.addEventListener('lostpointercapture', (e) => { if (drag && e.pointerId === drag.pointerId) endDrag(e, false); });

  function tapPiece(id, fromGhost) {
    if (selected === 'ball' && id !== 'ball' && mode === 'draw') {
      if (commit('ball', M.positionsForNew(state, joinBox.checked, sim)[id], { target: id })) select(null);
      return;
    }
    if (fromGhost) { select(id); return; }
    select(selected === id ? null : id);
  }

  svg.addEventListener('click', (e) => {
    if (pieceFrom(e.target) || !selected) return;
    touch();
    if (play.status !== 'setup') toSetup();
    const p = toCourt(e);
    const id = selected;
    if (mode === 'move') {
      pushUndo();
      moveSetup(id, p);
      edited();
      say(`${eul(id === 'ball' ? '공' : M.who(id))} 옮겼어요. ${M.zone(state.setup[id])}.`);
    } else {
      commit(id, p);
    }
    select(null);
  });

  /* ---------- keyboard ---------- */
  svg.addEventListener('keydown', (e) => {
    const n = e.target.closest && e.target.closest('.piece');
    if (!n) return;
    const id = n.dataset.id;
    const step = e.shiftKey ? 2 : 0.5;
    const v = keyVec(e.key);
    if (kb) {
      if (v) {
        e.preventDefault();
        kb.cursor = M.clampPt({ x: kb.cursor.x + v.x * step, y: kb.cursor.y + v.y * step });
        if (kb.id === 'ball') { const t = passTarget(kb.cursor, kb.join); kb.snap = t ? t.id : null; kb.snapPos = t ? t.pos : null; }
        renderPreview();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const k = kb;
        kb = null;
        renderPreview();
        if (!commit(k.id, k.cursor, { join: k.join, target: k.snap }) && M.dist(k.origin, k.cursor) < 0.6) say('화살표가 너무 짧아요. 방향키로 더 멀리 끌고 Enter를 누르세요.');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        kb = null;
        renderPreview();
        say('화살표 그리기를 그만뒀어요.');
      }
      return;
    }
    if (v) {
      e.preventDefault();
      touch();
      if (play.status !== 'setup') toSetup();
      if (!keyBurst || keyBurst.id !== id) { pushUndo(); keyBurst = { id }; }
      clearTimeout(keyBurst.timer);
      moveSetup(id, { x: state.setup[id].x + v.x * step, y: state.setup[id].y + v.y * step });
      sim = M.simulate(state);
      placePieces(state.setup);
      renderArrows();
      renderGhosts();
      keyBurst.timer = setTimeout(() => {
        keyBurst = null;
        edited();
        say(`${eul(id === 'ball' ? '공' : M.who(id))} 옮겼어요. ${M.zone(state.setup[id])}.`);
        pieces[id].g.focus({ preventScroll: true });
      }, 700);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      touch();
      if (keyBurst) { clearTimeout(keyBurst.timer); keyBurst = null; edited(); }
      if (play.status !== 'setup') toSetup();
      const join = joinBox.checked;
      const origin = originFor(id, join);
      kb = { id, origin, cursor: { ...origin }, join, snap: null, snapPos: null };
      renderPreview();
      say(id === 'ball'
        ? '패스 화살표를 그려요. 방향키로 끝을 옮기고 Enter를 누르세요. 선수 가까이 가면 그 선수에게 붙어요. 그만두려면 Esc.'
        : `${M.PLAYER[id].name}의 뛰는 화살표를 그려요. 방향키로 끝을 옮기고 Enter를 누르세요. 그만두려면 Esc.`);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      let i = -1;
      state.moves.forEach((m, j) => { if (m.piece === id) i = j; });
      if (i >= 0) removeMove(i); else say('이 자석에는 화살표가 없어요.');
    } else if (e.key === 'Escape' && selected) {
      select(null);
    }
  });

  svg.addEventListener('focusout', (e) => {
    if (kb && !svg.contains(e.relatedTarget)) { kb = null; renderPreview(); }
    else if (kb && e.relatedTarget && e.relatedTarget.closest('.piece') && e.relatedTarget.closest('.piece').dataset.id !== kb.id) { kb = null; renderPreview(); }
  });

  root.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      if (e.target.matches('input, textarea')) return;
      e.preventDefault();
      undo();
    }
  });

  /* ---------- tools ---------- */
  function undo() {
    touch();
    if (!undoStack.length) { say(MSG.noUndo); return; }
    const s = JSON.parse(undoStack.pop());
    state = s.state;
    playId = s.playId;
    kb = null;
    select(null);
    changed();
    say('되돌렸어요.');
  }

  function loadPlay(id) {
    const pl = ALL_PLAYS.find((p) => p.id === id);
    if (!pl) return;
    touch();
    pushUndo();
    state = M.clone({ setup: pl.setup, moves: pl.moves });
    playId = id;
    kb = null;
    select(null);
    changed();
    say(`${eul(pl.name)} 올렸어요.${pl.moves.length && reduceMQ.matches ? ' 재생을 누르면 한 박자씩 넘어가요.' : ''}`);
    if (pl.moves.length && !reduceMQ.matches) setTimeout(() => { if (playId === id && play.status === 'setup') start(true, false); }, 350);
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.dataset.play) { loadPlay(b.dataset.play); return; }
    if (b.dataset.join !== undefined && b.closest('[data-moves]')) { touch(); toggleJoin(Number(b.dataset.join)); return; }
    if (b.dataset.remove !== undefined) {
      touch();
      const i = Number(b.dataset.remove);
      removeMove(i);
      const rest = listEl.querySelectorAll('[data-remove]');
      (rest[Math.min(i, rest.length - 1)] || listEl.closest('[tabindex]') || listEl).focus();
      return;
    }
    if (b.dataset.speed) {
      speed = Number(b.dataset.speed);
      syncToggles();
      store.set({ speed, mode });
      say(`속도: ${b.textContent.trim()}.`);
      return;
    }
    if (b.dataset.mode) {
      mode = b.dataset.mode;
      select(null);
      syncToggles();
      store.set({ speed, mode });
      say(mode === 'move' ? '이제 자석을 끌면 자리만 옮겨요.' : '이제 자석을 끌면 화살표가 생겨요.');
      return;
    }
    switch (b.dataset.act) {
      case 'play': onPlay(); break;
      case 'step': onStep(); break;
      case 'reset': touch(); toSetup(); say('처음 자리로 돌려놨어요.'); break;
      case 'undo': undo(); break;
      case 'clear':
        touch();
        if (!state.moves.length) { say(MSG.nothingToClear); break; }
        pushUndo();
        state.moves = [];
        edited();
        say('화살표를 다 지웠어요. 되돌리기로 살릴 수 있어요.');
        break;
      default:
    }
  });

  function syncToggles() {
    for (const b of root.querySelectorAll('[data-speed]')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed));
    for (const b of root.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    root.dataset.mode = mode;
  }

  /* ---------- visibility ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const visible = en.isIntersecting && en.intersectionRatio >= 0.35;
      if (!visible && play.status === 'playing') pause(true);
      else if (visible && play.status === 'paused' && play.autoPaused && !document.hidden) start(false, play.stepOnly);
      if (visible && !touched && !autoplayed && !reduceMQ.matches) {
        autoplayed = true;
        setTimeout(() => { if (!touched && play.status === 'setup') start(true, false); }, 700);
      }
    }
  }, { threshold: [0, 0.35, 0.6] });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && play.status === 'playing') pause(true);
    else if (!document.hidden && play.status === 'paused' && play.autoPaused) {
      const r = stage.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) start(false, play.stepOnly);
    }
  });
  reduceMQ.addEventListener('change', () => { if (play.status !== 'setup') toSetup(); });

  const ro = new ResizeObserver(() => {
    if (drag) { pieces[drag.id].g.classList.remove('is-lifted'); drag = null; }
    rescale();
  });
  ro.observe(stage);

  syncToggles();
  rescale();
  changed();
  undoStack.length = 0;
  undoBtn.setAttribute('aria-disabled', 'true');
}
