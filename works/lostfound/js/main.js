// 갈래터미널 유실물 보관소: board (tags and strings), deduction grid, clues, hints, progress.
import { CASES } from './cases.js';
import { buildModel, effective, autoX, nextStep, wrongMarks, key, josa, hm } from './logic.js';
import { sketchSVG } from './sketches.js';

const $ = (id) => document.getElementById(id);
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqNarrow = window.matchMedia('(max-width: 719px)');
// touch screens and phones see one grid block at a time so every cell stays 44px
const mqOne = window.matchMedia('(max-width: 719px), (pointer: coarse)');
const CAT_WORD = { item: '물건', owner: '찾는 분', place: '장소', time: '시각' };
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// ---------- progress (works without storage) ----------
const STORE = 'lostfound.v1';
function readStore() {
  try {
    const raw = window.localStorage.getItem(STORE);
    const d = raw ? JSON.parse(raw) : null;
    if (d && typeof d === 'object' && d.cases && typeof d.cases === 'object') return d;
  } catch (e) { /* storage blocked or broken: start fresh */ }
  return null;
}
const data = { cur: 0, hide: false, cases: {}, ...(readStore() || {}) };
function persist() {
  try { window.localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* not saved, still playable */ }
}

// ---------- live announcements ----------
let liveTimer = 0;
function say(text) {
  const el = $('live');
  el.textContent = '';
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { el.textContent = text; }, 60);
}

// ---------- case state ----------
let ci = 0, cs, model, marks, used, solved, auto = new Set();
let cross = false, colCats = [], rowCats = [];
const history = {};
let held = null;          // item id picked up (tap or keyboard)
let drag = null;          // pointer drag in progress
let suppressClick = false;
let hintState = null;
let pickSel = '0-0';      // block shown on phones in cross cases

const L = (id) => model.ent[id].label;
const ownerOf = (item) => { for (const o of cs.owners) if (marks.get(key(model, item, o.id)) === 'O') return o.id; return null; };
const itemOf = (owner) => { for (const it of cs.items) if (marks.get(key(model, it.id, owner)) === 'O') return it.id; return null; };
const allTied = () => cs.items.every((it) => ownerOf(it.id));

function validMarks(list) {
  const out = new Map();
  if (!Array.isArray(list)) return out;
  for (const pair of list) {
    if (!Array.isArray(pair)) continue;
    const [k, v] = pair;
    const [a, b] = String(k).split('|');
    if (model.ent[a] && model.ent[b] && model.ent[a].cat !== model.ent[b].cat && (v === 'O' || v === 'X') && key(model, a, b) === k) out.set(k, v);
  }
  return out;
}

function loadCase(i, focusTitle = false) {
  ci = Math.max(0, Math.min(CASES.length - 1, Number(i) || 0));
  cs = CASES[ci];
  model = buildModel(cs);
  cross = model.cats.length > 2;
  colCats = model.cats.slice(1);
  rowCats = ['item', ...model.cats.slice(2).reverse()];
  const rec = data.cases[cs.id] || {};
  marks = validMarks(rec.m);
  used = new Set(Array.isArray(rec.u) ? rec.u.filter((u) => cs.clues.some((c) => c.id === u)) : []);
  solved = rec.s === true;
  history[cs.id] = history[cs.id] || [];
  held = null; drag = null; hintState = null; pickSel = '0-0';
  data.cur = ci;
  persist();
  renderHead();
  renderBoard();
  renderClues();
  renderGrid();
  $('hint').hidden = true;
  refresh(true);
  if (focusTitle) { $('case-title').setAttribute('tabindex', '-1'); $('case-title').focus(); }
}

function storeCase() {
  data.cases[cs.id] = { m: [...marks], u: [...used], s: solved };
  data.cur = ci;
  persist();
}

function commit(fn, msg) {
  if (solved) return;
  history[cs.id].push({ m: [...marks] });
  if (history[cs.id].length > 300) history[cs.id].shift();
  fn();
  clearHint();
  storeCase();
  refresh();
  if (msg) say(msg);
}

// O in a block: clears any other O in the same row and column of that block
function setO(a, b) {
  const ca = model.ent[a].cat, cb = model.ent[b].cat;
  for (const x of model.byCat[cb]) if (x.id !== b && marks.get(key(model, a, x.id)) === 'O') marks.delete(key(model, a, x.id));
  for (const x of model.byCat[ca]) if (x.id !== a && marks.get(key(model, x.id, b)) === 'O') marks.delete(key(model, x.id, b));
  marks.set(key(model, a, b), 'O');
}

// ---------- header ----------
function renderHead() {
  $('case-no').textContent = String(ci + 1);
  $('case-no-sr').textContent = `사건 ${ci + 1}. `;
  $('case-name').textContent = cs.title;
  $('case-story').textContent = cs.story;
  $('howto').open = false;
}

// ---------- board ----------
function tagFound(it) {
  if (!cross) return `<span class="tag-found">${it.place}, ${hm(toMin(it.time))}</span>`;
  return '<span class="tag-found tag-blank"><span class="blank-lbl">어디서</span><span class="fill" data-fill="place"></span></span>'
    + '<span class="tag-found tag-blank"><span class="blank-lbl">몇 시</span><span class="fill" data-fill="time"></span></span>';
}
function renderBoard() {
  const shelf = $('shelf'), counter = $('counter');
  shelf.innerHTML = cs.items.map((it) => `<li class="tag-li">
    <button class="tag" type="button" id="tag-${it.id}" data-item="${it.id}">
      <span class="tag-paper">
        ${sketchSVG(it.sketch)}
        <span class="tag-title"><span class="tag-no">${it.no}</span>${it.kind}</span>
        <span class="tag-desc">${it.desc.join('<br>')}</span>
        ${tagFound(it)}
      </span>
      <span class="eyelet" aria-hidden="true"></span>
    </button></li>`).join('');
  counter.innerHTML = cs.owners.map((o) => `<li class="tk-li">
    <button class="ticket" type="button" id="tk-${o.id}" data-owner="${o.id}">
      <span class="clip" aria-hidden="true"></span>
      <span class="tk-no">${o.ticket}</span>
      <span class="tk-name">${o.name} 님</span>
      <span class="tk-state" aria-hidden="true"></span>
    </button></li>`).join('');
  $('board').style.setProperty('--rows', Math.max(cs.items.length, cs.owners.length));
}

function tagLabel(it) {
  const own = ownerOf(it.id);
  let found;
  if (!cross) found = `${it.place}에서 ${hm(toMin(it.time))}에 주움`;
  else {
    const p = model.byCat.place.find((x) => marks.get(key(model, it.id, x.id)) === 'O');
    const t = model.byCat.time.find((x) => marks.get(key(model, it.id, x.id)) === 'O');
    found = `주운 곳 ${p ? p.label : '빈칸'}, 시각 ${t ? t.short : '빈칸'}`;
  }
  const state = solved ? `${L(own)}께 돌려드림` : own ? `${L(own)}께 묶음` : '묶이지 않음';
  const extra = held === it.id ? '. 집어 든 상태' : '';
  return `${it.no}번 ${it.kind}. ${it.desc.join(', ')}. ${found}. ${state}${extra}`;
}
function ticketLabel(o) {
  const it = itemOf(o.id);
  let s = `${o.ticket}번 ${o.name} 님. `;
  s += solved ? `${L(it)} 받아 감` : it ? `${josa(L(it), '이/가')} 묶여 있음` : '묶인 꼬리표 없음';
  if (held && !solved) s += ownerOf(held) === o.id ? '. 누르면 풀기' : '. 누르면 여기에 묶기';
  return s;
}

function refreshBoard() {
  const board = $('board');
  board.classList.toggle('is-holding', !!held);
  board.classList.toggle('is-solved', solved);
  for (const it of cs.items) {
    const el = $(`tag-${it.id}`);
    el.classList.toggle('is-tied', !!ownerOf(it.id));
    el.classList.toggle('is-held', held === it.id);
    el.setAttribute('aria-label', tagLabel(it));
    el.setAttribute('aria-pressed', held === it.id ? 'true' : 'false');
    if (cross) {
      const p = model.byCat.place.find((x) => marks.get(key(model, it.id, x.id)) === 'O');
      const t = model.byCat.time.find((x) => marks.get(key(model, it.id, x.id)) === 'O');
      el.querySelector('[data-fill="place"]').textContent = p ? p.label : '';
      el.querySelector('[data-fill="time"]').textContent = t ? t.short.replace(/^0/, '') : '';
    }
  }
  for (const o of cs.owners) {
    const el = $(`tk-${o.id}`);
    const it = itemOf(o.id);
    el.classList.toggle('has-tag', !!it);
    el.setAttribute('aria-label', ticketLabel(o));
    const st = el.querySelector('.tk-state');
    st.textContent = solved ? '받아 감' : held ? (ownerOf(held) === o.id ? '풀기' : '묶기') : '';
  }
  drawStrings();
}

// strings: an SVG overlay over the board
let drawQueued = false;
function drawStrings() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => { drawQueued = false; paintStrings(); });
}
function centerOf(el, base) {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2 - base.left, r.top + r.height / 2 - base.top];
}
function rope(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
  const sag = Math.min(44, d * 0.15) + 3;
  const f = (n) => n.toFixed(1);
  return `M${f(x1)} ${f(y1)} C${f(x1 + dx * 0.33)} ${f(y1 + dy * 0.33 + sag)} ${f(x1 + dx * 0.68)} ${f(y1 + dy * 0.68 + sag)} ${f(x2)} ${f(y2)}`;
}
function loop(x, y) {
  return `M${x.toFixed(1)} ${y.toFixed(1)} c5 4 9 9 7 17 c-1 5 2 9 6 11`;
}
function paintStrings() {
  const board = $('board'), svg = $('strings');
  if (!cs) return;
  const base = board.getBoundingClientRect();
  svg.setAttribute('width', String(Math.round(base.width)));
  svg.setAttribute('height', String(Math.round(base.height)));
  svg.setAttribute('viewBox', `0 0 ${Math.round(base.width)} ${Math.round(base.height)}`);
  let under = '', over = '';
  for (const it of cs.items) {
    const tag = $(`tag-${it.id}`);
    if (!tag) continue;
    const [x1, y1] = centerOf(tag.querySelector('.eyelet'), base);
    const own = ownerOf(it.id);
    let d;
    let top = false;
    if (drag && drag.active && drag.item === it.id) {
      d = rope(x1, y1, drag.x - base.left, drag.y - base.top);
      top = true;
    } else if (own) {
      const [x2, y2] = centerOf($(`tk-${own}`).querySelector('.clip'), base);
      d = rope(x1, y1, x2, y2);
    } else {
      d = loop(x1, y1);
    }
    const cls = solved ? 'str is-done' : held === it.id ? 'str is-held' : 'str';
    const g = `<path class="str-shadow" d="${d}"/><path class="${cls}" d="${d}"/>`;
    if (top || held === it.id) over += g; else under += g;
  }
  svg.innerHTML = under + over;
}

function pickUp(item, viaKeys) {
  if (solved) { say('이 사건은 다 끝났어요. 다시 풀려면 다시 풀기를 누르세요.'); return; }
  clearHint();
  held = item;
  refreshBoard();
  const own = ownerOf(item);
  say(`${L(item)} 꼬리표를 집었어요. 묶을 분을 고르세요.${own ? ' 지금 묶인 분을 고르면 풀려요.' : ''} 내려놓으려면 Esc.`);
  if (viaKeys) $(`tk-${own || cs.owners[0].id}`).focus();
}
function putDown(focusTag) {
  if (!held) return;
  const it = held;
  held = null;
  refreshBoard();
  if (focusTag) { $(`tag-${it}`).focus(); say('꼬리표를 내려놓았어요.'); }
}
function tie(item, owner, viaKeys) {
  const cur = ownerOf(item);
  held = null;
  if (cur === owner) {
    commit(() => marks.delete(key(model, item, owner)), `${L(item)} 꼬리표를 ${L(owner)}에게서 풀었어요.`);
  } else {
    const prevItem = itemOf(owner);
    commit(() => setO(item, owner), `${L(item)} 꼬리표를 ${L(owner)}께 묶었어요.${prevItem ? ` ${josa(L(prevItem), '은/는')} 다시 선반에 걸렸어요.` : ''}`);
  }
  if (viaKeys) $(`tag-${item}`).focus();
}

function ticketAt(x, y) {
  for (const o of cs.owners) {
    const r = $(`tk-${o.id}`).getBoundingClientRect();
    if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) return o.id;
  }
  return null;
}
function markOver(id) {
  for (const o of cs.owners) $(`tk-${o.id}`).classList.toggle('is-over', o.id === id);
}

function bindBoard() {
  const shelf = $('shelf'), counter = $('counter');
  shelf.addEventListener('pointerdown', (e) => {
    const tag = e.target.closest('.tag');
    if (!tag || solved || e.button > 0) return;
    const fromEye = !!e.target.closest('.eyelet');
    if (e.pointerType !== 'mouse' && !fromEye) return; // on touch, only the string end drags; the rest scrolls and taps
    drag = { item: tag.dataset.item, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, active: false, tag };
    try { tag.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (fromEye) e.preventDefault();
  });
  shelf.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.x = e.clientX; drag.y = e.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.x0, drag.y - drag.y0) > 6) {
      drag.active = true;
      held = drag.item;
      clearHint();
      refreshBoard();
    }
    if (drag.active) { markOver(ticketAt(drag.x, drag.y)); drawStrings(); }
  });
  const end = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    markOver(null);
    if (!d.active) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    const target = cancelled ? null : ticketAt(e.clientX, e.clientY);
    if (target) tie(d.item, target, false);
    else { held = null; refreshBoard(); }
  };
  shelf.addEventListener('pointerup', (e) => end(e, false));
  shelf.addEventListener('pointercancel', (e) => end(e, true));
  shelf.addEventListener('click', (e) => {
    const tag = e.target.closest('.tag');
    if (!tag) return;
    if (suppressClick) { suppressClick = false; return; }
    const it = tag.dataset.item;
    if (held === it) { putDown(e.detail === 0); return; }
    pickUp(it, e.detail === 0);
  });
  shelf.addEventListener('keydown', (e) => {
    const tag = e.target.closest('.tag');
    if (!tag) return;
    const tags = [...shelf.querySelectorAll('.tag')];
    const i = tags.indexOf(tag);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); tags[Math.min(tags.length - 1, i + 1)].focus(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); tags[Math.max(0, i - 1)].focus(); }
  });
  counter.addEventListener('click', (e) => {
    const tk = e.target.closest('.ticket');
    if (!tk) return;
    if (solved) { say(`${tk.getAttribute('aria-label')}.`); return; }
    if (!held) { say('먼저 꼬리표를 골라 주세요. 꼬리표를 누른 다음 사람을 누르면 묶여요.'); flashShelf(); return; }
    tie(held, tk.dataset.owner, e.detail === 0);
  });
  counter.addEventListener('keydown', (e) => {
    const tk = e.target.closest('.ticket');
    if (!tk) return;
    const tks = [...counter.querySelectorAll('.ticket')];
    const i = tks.indexOf(tk);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); tks[Math.min(tks.length - 1, i + 1)].focus(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); tks[Math.max(0, i - 1)].focus(); }
  });
  // a person's ticket and what they said light up together
  const link = (owner, on) => {
    for (const el of document.querySelectorAll(`.say[data-from="${owner}"]`)) el.classList.toggle('is-linked', on);
  };
  for (const ev of ['pointerover', 'focusin']) counter.addEventListener(ev, (e) => { const tk = e.target.closest('.ticket'); if (tk) link(tk.dataset.owner, true); });
  for (const ev of ['pointerout', 'focusout']) counter.addEventListener(ev, (e) => { const tk = e.target.closest('.ticket'); if (tk) link(tk.dataset.owner, false); });
  new ResizeObserver(() => drawStrings()).observe($('board'));
  window.addEventListener('resize', drawStrings);
}
function flashShelf() {
  const s = $('shelf');
  s.classList.remove('is-asking');
  void s.offsetWidth;
  s.classList.add('is-asking');
}

// ---------- clues ----------
function renderClues() {
  const says = [], notes = [];
  const order = new Map(cs.owners.map((o, i) => [o.id, i]));
  const own = cs.clues.filter((c) => c.from !== 'staff').sort((a, b) => order.get(a.from) - order.get(b.from));
  for (const c of own) {
    const o = model.ent[c.from];
    says.push(`<li class="say" id="clue-${c.id}" data-clue="${c.id}" data-from="${c.from}" tabindex="-1">
      <span class="say-no" aria-hidden="true">${o.ticket}</span>
      <div class="say-body"><p class="say-name"><span class="sr-only">${o.ticket}번 </span>${o.name} 님</p><p class="say-text">${c.text}</p></div>
      <button class="used" type="button" aria-pressed="false" aria-label="${o.name} 님의 말, 다 쓴 단서로 표시">다 씀</button></li>`);
  }
  for (const c of cs.clues.filter((x) => x.from === 'staff')) {
    notes.push(`<li class="note" id="clue-${c.id}" data-clue="${c.id}" tabindex="-1">
      <p class="note-head">${c.head || '메모'}</p><p class="note-text">${c.text}</p>
      <button class="used" type="button" aria-pressed="false" aria-label="${c.head || '메모'}, 다 쓴 단서로 표시">다 씀</button></li>`);
  }
  $('says').innerHTML = says.join('');
  $('notes').innerHTML = notes.join('');
  $('notes-head').hidden = !notes.length;
  $('notes').hidden = !notes.length;
  refreshClues();
}
function refreshClues() {
  for (const el of document.querySelectorAll('.say, .note')) {
    const u = used.has(el.dataset.clue);
    el.classList.toggle('is-used', u);
    el.querySelector('.used').setAttribute('aria-pressed', u ? 'true' : 'false');
  }
}
function bindClues() {
  $('clues').addEventListener('click', (e) => {
    const b = e.target.closest('.used');
    if (!b) return;
    const id = b.closest('[data-clue]').dataset.clue;
    if (used.has(id)) used.delete(id); else used.add(id);
    storeCase();
    refreshClues();
    say(used.has(id) ? '다 쓴 단서로 표시했어요.' : '다 쓴 표시를 지웠어요.');
  });
  const link = (owner, on) => { const tk = $(`tk-${owner}`); if (tk) tk.classList.toggle('is-linked', on); };
  $('says').addEventListener('pointerover', (e) => { const s = e.target.closest('.say'); if (s) link(s.dataset.from, true); });
  $('says').addEventListener('pointerout', (e) => { const s = e.target.closest('.say'); if (s) link(s.dataset.from, false); });
}

// ---------- grid ----------
function headLabel(e, axis) {
  if (e.cat === 'item') return `<span class="h-no">${e.no}</span><span class="h-nm">${e.kind}</span>`;
  if (e.cat === 'time') return `<span class="h-time">${e.short.replace(/^0/, '')}</span>`;
  if (e.cat === 'owner') return `<span class="h-nm">${e.name}</span>`;
  return `<span class="h-nm">${e.label}</span>`;
}
function renderGrid() {
  const grid = $('grid');
  const k = colCats.length, n = model.n;
  grid.className = `grid${cross ? ' is-cross' : ''}`;
  grid.style.setProperty('--n', n);
  grid.style.setProperty('--k', k);
  grid.style.setProperty('--rws', rowCats.length);
  let html = '<div class="g-corner" aria-hidden="true"></div>';
  colCats.forEach((cc, j) => {
    html += `<div class="g-ch" data-j="${j}" data-cat="${cc}" style="--gc:${j + 2};--gr:1" aria-hidden="true">${model.byCat[cc].map((e) => `<span class="g-h">${headLabel(e, 'col')}</span>`).join('')}</div>`;
  });
  rowCats.forEach((rc, i) => {
    html += `<div class="g-rh" data-i="${i}" data-cat="${rc}" style="--gr:${i + 2};--gc:1" aria-hidden="true">${model.byCat[rc].map((e) => `<span class="g-h">${headLabel(e, 'row')}</span>`).join('')}</div>`;
  });
  rowCats.forEach((rc, i) => {
    colCats.forEach((cc, j) => {
      if (i + j >= k) return;
      html += `<div class="g-blk" role="grid" data-i="${i}" data-j="${j}" style="--gr:${i + 2};--gc:${j + 2}" aria-label="${CAT_WORD[rc]} × ${CAT_WORD[cc]}">`;
      model.byCat[rc].forEach((re, r) => {
        html += '<div class="g-row" role="row">';
        model.byCat[cc].forEach((ce, c) => {
          html += `<div class="g-cell" role="gridcell" tabindex="-1" id="c-${re.id}-${ce.id}" data-a="${re.id}" data-b="${ce.id}" data-i="${i}" data-j="${j}" data-r="${r}" data-c="${c}"></div>`;
        });
        html += '</div>';
      });
      html += '</div>';
    });
  });
  grid.innerHTML = html;
  const first = grid.querySelector('.g-cell');
  if (first) first.tabIndex = 0;
  // block picker for phones (cross cases)
  const picker = $('picker');
  if (cross) {
    let p = '';
    rowCats.forEach((rc, i) => colCats.forEach((cc, j) => {
      if (i + j < k) p += `<button class="pick" type="button" data-sel="${i}-${j}" aria-pressed="false">${CAT_WORD[rc]} × ${CAT_WORD[cc]}</button>`;
    }));
    picker.innerHTML = p;
    picker.hidden = false;
  } else { picker.innerHTML = ''; picker.hidden = true; }
  applyPick();
  sizeGrid();
}
function applyPick() {
  const grid = $('grid');
  const [si, sj] = pickSel.split('-').map(Number);
  for (const el of grid.querySelectorAll('.g-ch')) el.classList.toggle('is-shown', Number(el.dataset.j) === sj);
  for (const el of grid.querySelectorAll('.g-rh')) el.classList.toggle('is-shown', Number(el.dataset.i) === si);
  for (const el of grid.querySelectorAll('.g-blk')) el.classList.toggle('is-shown', el.dataset.i === String(si) && el.dataset.j === String(sj));
  for (const b of $('picker').querySelectorAll('.pick')) b.setAttribute('aria-pressed', b.dataset.sel === pickSel ? 'true' : 'false');
}
function sizeGrid() {
  // fit the sheet into its column: 44px cells on touch screens and phones; the mouse
  // staircase of a cross case may go down to 30px
  const grid = $('grid'), body = $('grid-body');
  if (!model || body.hidden) return;
  const cs2 = getComputedStyle(body);
  const W = body.clientWidth - parseFloat(cs2.paddingLeft) - parseFloat(cs2.paddingRight);
  const touch = mqOne.matches;
  const one = !cross || touch;
  const cols = one ? model.n : colCats.length * model.n;
  const gaps = one ? 6 : colCats.length * 6;
  const minCell = touch ? 44 : 30;
  let rh = 120;
  let cell = Math.min(44, Math.floor((W - rh - gaps) / cols));
  if (cell < minCell) { cell = minCell; rh = Math.max(40, W - gaps - cols * cell); }
  grid.style.setProperty('--cell', `${cell}px`);
  grid.style.setProperty('--rhw', `${rh}px`);
  grid.classList.toggle('is-compact', rh < 76);
}

function markSVG(kind, seed, isAuto) {
  // hand-drawn O and X; a few variants so the sheet does not look stamped
  const j = (n) => (((seed * 9301 + n * 49297) % 233280) / 233280 - 0.5);
  if (kind === 'O') {
    const a = 3 + j(1) * 3, b = 2 + j(2) * 3;
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><path class="m-o" d="M${22 + a} ${8 + j(3) * 2} C${33 + j(4) * 2} ${9 + b} ${34} ${28 + j(5) * 3} ${21} ${32 + j(6) * 2} C${9 + j(7) * 2} ${33} ${5 + j(8) * 2} ${20} ${11 + j(9) * 2} ${12} C${15} ${7 + j(10) * 2} ${23} ${6} ${27 + j(11) * 2} ${10}"/></svg>`;
  }
  const w = isAuto ? 'm-x m-auto' : 'm-x';
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><path class="${w}" d="M${11 + j(1) * 3} ${11 + j(2) * 3} Q${20 + j(3) * 3} ${20 + j(4) * 3} ${29 + j(5) * 3} ${29 + j(6) * 2} M${29 + j(7) * 3} ${10 + j(8) * 3} Q${19 + j(9) * 3} ${21 + j(10) * 3} ${11 + j(11) * 3} ${30 + j(12) * 2}"/></svg>`;
}
const cellState = (a, b) => marks.get(key(model, a, b)) || (auto.has(key(model, a, b)) ? 'x' : '');
const STATE_WORD = { O: 'O, 짝', X: 'X, 짝 아님', x: 'X, 저절로', '': '비어 있음' };
function refreshGrid() {
  const grid = $('grid');
  let seed = 1;
  for (const cell of grid.querySelectorAll('.g-cell')) {
    seed++;
    const { a, b } = cell.dataset;
    const s = cellState(a, b);
    if (cell.dataset.s !== s) {
      cell.dataset.s = s;
      cell.innerHTML = s === 'O' ? markSVG('O', seed) : s ? markSVG('X', seed, s === 'x') : '';
    }
    cell.setAttribute('aria-label', `${L(a)}, ${L(b)}: ${STATE_WORD[s]}`);
    cell.setAttribute('aria-readonly', solved ? 'true' : 'false');
  }
}

function setCell(a, b, v) {
  if (solved) { say('이 사건은 다 끝났어요.'); return; }
  const isTie = model.ent[a].cat === 'item' && model.ent[b].cat === 'owner';
  let msg = `${L(a)}, ${L(b)}: ${v === '' ? '지움' : v}`;
  if (isTie && v === 'O') msg = `${L(a)} 꼬리표를 ${L(b)}께 묶었어요.`;
  if (isTie && v !== 'O' && marks.get(key(model, a, b)) === 'O') msg += `. ${L(a)} 꼬리표를 풀었어요.`;
  commit(() => {
    const k2 = key(model, a, b);
    if (v === 'O') setO(a, b);
    else if (v === 'X') marks.set(k2, 'X');
    else marks.delete(k2);
  }, msg);
}
function cycle(a, b) {
  const s = cellState(a, b);
  setCell(a, b, s === '' ? 'X' : s === 'O' ? '' : 'O');
}
function focusCell(i, j, r, c) {
  const blk = $('grid').querySelector(`.g-blk[data-i="${i}"][data-j="${j}"]`);
  if (!blk) return;
  const cell = blk.querySelector(`.g-cell[data-r="${r}"][data-c="${c}"]`);
  if (!cell) return;
  for (const el of $('grid').querySelectorAll('.g-cell[tabindex="0"]')) el.tabIndex = -1;
  cell.tabIndex = 0;
  cell.focus();
}
function bindGrid() {
  const grid = $('grid');
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.g-cell');
    if (!cell) return;
    for (const el of grid.querySelectorAll('.g-cell[tabindex="0"]')) el.tabIndex = -1;
    cell.tabIndex = 0;
    cycle(cell.dataset.a, cell.dataset.b);
  });
  grid.addEventListener('keydown', (e) => {
    const cell = e.target.closest('.g-cell');
    if (!cell) return;
    let i = Number(cell.dataset.i), j = Number(cell.dataset.j), r = Number(cell.dataset.r), c = Number(cell.dataset.c);
    const n = model.n, k = colCats.length;
    const lock = cross && mqOne.matches;
    const { a, b } = cell.dataset;
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      if (e.key === 'ArrowRight') { if (c < n - 1) c++; else if (!lock && i + j + 1 < k) { j++; c = 0; } }
      if (e.key === 'ArrowLeft') { if (c > 0) c--; else if (!lock && j > 0) { j--; c = n - 1; } }
      if (e.key === 'ArrowDown') { if (r < n - 1) r++; else if (!lock && i + 1 + j < k) { i++; r = 0; } }
      if (e.key === 'ArrowUp') { if (r > 0) r--; else if (!lock && i > 0) { i--; r = n - 1; } }
      focusCell(i, j, r, c);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyO') { e.preventDefault(); setCell(a, b, 'O'); }
    else if (e.code === 'KeyX') { e.preventDefault(); setCell(a, b, cellState(a, b) === 'X' ? '' : 'X'); }
    else if (e.key === 'Enter') { e.preventDefault(); setCell(a, b, cellState(a, b) === 'O' ? '' : 'O'); }
    else if (e.key === ' ') { e.preventDefault(); cycle(a, b); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); setCell(a, b, ''); }
  });
  $('picker').addEventListener('click', (e) => {
    const b = e.target.closest('.pick');
    if (!b) return;
    pickSel = b.dataset.sel;
    applyPick();
    const [i, j] = pickSel.split('-');
    const first = $('grid').querySelector(`.g-blk[data-i="${i}"][data-j="${j}"] .g-cell`);
    for (const el of $('grid').querySelectorAll('.g-cell[tabindex="0"]')) el.tabIndex = -1;
    if (first) first.tabIndex = 0;
  });
  $('btn-grid').addEventListener('click', () => {
    data.hide = !data.hide;
    persist();
    applyGridHidden();
    say(data.hide ? '추리표를 숨겼어요.' : '추리표를 펼쳤어요.');
  });
  mqOne.addEventListener('change', () => { sizeGrid(); drawStrings(); });
  new ResizeObserver(() => sizeGrid()).observe($('grid-body'));
}
function applyGridHidden() {
  $('grid-body').hidden = !!data.hide;
  $('btn-grid').setAttribute('aria-expanded', data.hide ? 'false' : 'true');
  $('btn-grid').textContent = data.hide ? '표 펼치기' : '표 숨기기';
  $('gridwrap').classList.toggle('is-folded', !!data.hide);
}

// ---------- hints ----------
function clueName(c) {
  if (c.from === 'staff') return c.head || '책상 위 메모';
  const o = model.ent[c.from];
  return `${o.ticket}번 ${o.name} 님의 말`;
}
function clearHint() {
  hintState = null;
  for (const el of document.querySelectorAll('.is-hinted')) el.classList.remove('is-hinted');
  $('hint').hidden = true;
}
function showHint(h) {
  clearHint();
  hintState = h;
  $('hint-src').textContent = h.src || '';
  $('hint-src').hidden = !h.src;
  $('hint-text').textContent = h.text;
  $('hint-apply').hidden = !h.apply;
  if (h.apply) $('hint-apply').textContent = h.apply.label;
  $('hint-show').hidden = !h.clue;
  for (const [a, b] of h.cells || []) {
    const cell = $(`c-${a}-${b}`) || $(`c-${b}-${a}`);
    if (cell) cell.classList.add('is-hinted');
  }
  if (h.cells && h.cells.length && cross) {
    const cell = $(`c-${h.cells[0][0]}-${h.cells[0][1]}`) || $(`c-${h.cells[0][1]}-${h.cells[0][0]}`);
    if (cell) { pickSel = `${cell.dataset.i}-${cell.dataset.j}`; applyPick(); }
  }
  if (h.clue) $(`clue-${h.clue}`).classList.add('is-hinted');
  const box = $('hint');
  box.hidden = false;
  box.scrollIntoView({ block: 'nearest', behavior: mqReduce.matches ? 'auto' : 'smooth' });
  say(`힌트. ${h.src ? h.src + '. ' : ''}${h.text}`);
}
function hint() {
  if (solved) { say('이 사건은 다 풀었어요.'); return; }
  held = null;
  refreshBoard();
  const wrong = wrongMarks(model, marks);
  if (wrong.length) {
    const [a, b, v] = wrong[0];
    showHint({
      src: '표를 다시 보세요',
      text: `${josa(L(a), '과/와')} ${josa(L(b), '이/가')} 만나는 칸의 ${v} 표시가 단서와 맞지 않아요. 이 칸을 지우고 다시 생각해 보세요.`,
      cells: [[a, b]],
      apply: { label: '그 칸 지우기', run: () => setCell(a, b, '') },
    });
    return;
  }
  if (allTied()) {
    showHint({ src: '', text: '꼬리표를 다 묶었어요. 돌려드리기를 눌러 확인해 보세요.' });
    return;
  }
  const step = nextStep(model, effective(model, marks));
  if (!step) { showHint({ src: '', text: '표가 다 찼어요. 표의 O대로 꼬리표를 묶어 보세요.' }); return; }
  const clue = step.clue ? cs.clues.find((c) => c.id === step.clue) : null;
  showHint({
    src: clue ? clueName(clue) : '단서 없이 표만 보면 돼요',
    clue: clue ? clue.id : null,
    text: step.why,
    cells: step.marks.map(([a, b]) => [a, b]),
    apply: {
      label: '표시 넣기',
      run: () => commit(() => { for (const [a, b, v] of step.marks) { if (v === 'O') setO(a, b); else marks.set(key(model, a, b), 'X'); } }, '힌트대로 표시했어요.'),
    },
  });
}
function bindHints() {
  $('btn-hint').addEventListener('click', hint);
  $('hint-close').addEventListener('click', () => { clearHint(); $('btn-hint').focus(); });
  $('hint-apply').addEventListener('click', () => { if (hintState && hintState.apply) { const h = hintState; h.apply.run(); $('btn-hint').focus(); } });
  $('hint-show').addEventListener('click', () => {
    if (!hintState || !hintState.clue) return;
    const el = $(`clue-${hintState.clue}`);
    el.scrollIntoView({ block: 'center', behavior: mqReduce.matches ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  });
}

// ---------- check, solved ----------
function check() {
  if (solved) return;
  held = null;
  if (!allTied()) {
    const left = cs.items.filter((it) => !ownerOf(it.id)).length;
    refresh();
    showHint({ src: '돌려드리기', text: `아직 묶지 않은 꼬리표가 ${left}개 있어요. 모두 묶은 다음 눌러 주세요.` });
    return;
  }
  const ok = cs.items.every((it) => model.answer[ownerOf(it.id)] === it.id);
  if (!ok) {
    showHint({ src: '돌려드리기', text: '아직 맞지 않는 짝이 있어요. 힌트를 누르면 어디부터 다시 볼지 짚어 드려요.', apply: { label: '힌트 보기', run: hint } });
    return;
  }
  solved = true;
  history[cs.id] = [];
  storeCase();
  clearHint();
  refresh();
  const tags = cs.items.map((it) => $(`tag-${it.id}`));
  const tks = cs.items.map((it) => $(`tk-${ownerOf(it.id)}`));
  if (!mqReduce.matches) {
    $('board').classList.add('is-flipping');
    tags.forEach((t, i) => { t.style.setProperty('--d', `${i * 140}ms`); tks[i].style.setProperty('--d', `${i * 140 + 80}ms`); });
    setTimeout(() => $('board').classList.remove('is-flipping'), cs.items.length * 140 + 600);
  }
  say(`모두 주인을 찾았어요. ${cs.end}`);
  setTimeout(() => $('btn-next').focus({ preventScroll: true }), mqReduce.matches ? 0 : cs.items.length * 140 + 300);
}
function refreshDone() {
  const box = $('done');
  box.hidden = !solved;
  if (!solved) return;
  const last = ci === CASES.length - 1;
  const remaining = CASES.filter((c) => !(data.cases[c.id] && data.cases[c.id].s)).length;
  $('done-text').textContent = cs.end + (last && remaining === 0 ? ' 사건 열 개를 모두 풀었어요.' : '');
  $('btn-next').textContent = last ? '사건철 보기' : '다음 사건';
}

// ---------- drawer ----------
function renderDrawer() {
  $('case-list').innerHTML = CASES.map((c, i) => {
    const rec = data.cases[c.id];
    const st = rec && rec.s ? '풀었어요' : rec && rec.m && rec.m.length ? '푸는 중' : '';
    const size = `물건 ${c.items.length}개${c.cats.length > 1 ? ', 장소와 시각까지' : ''}`;
    return `<li><button class="case-btn${rec && rec.s ? ' is-solved' : ''}${i === ci ? ' is-current' : ''}" type="button" data-i="${i}"${i === ci ? ' aria-current="true"' : ''}>
      <span class="locker-no" aria-hidden="true">${i + 1}</span>
      <span class="case-btn-body"><span class="case-btn-title"><span class="sr-only">사건 ${i + 1}. </span>${c.title}</span><span class="case-btn-meta">${size}</span></span>
      <span class="case-btn-state">${st}</span></button></li>`;
  }).join('');
}
function bindDrawer() {
  const dlg = $('drawer');
  $('btn-cases').addEventListener('click', () => { renderDrawer(); dlg.showModal(); const cur = dlg.querySelector('.is-current'); if (cur) cur.focus(); });
  $('drawer-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) { dlg.close(); return; }
    const b = e.target.closest('.case-btn');
    if (!b) return;
    dlg.close();
    loadCase(Number(b.dataset.i), true);
    say(`사건 ${ci + 1}, ${cs.title}을 열었어요.`.replace(`${cs.title}을`, josa(cs.title, '을/를')));
  });
  dlg.addEventListener('close', () => $('btn-cases').focus({ preventScroll: true }));
}

// ---------- refresh everything ----------
function refresh(first) {
  auto = autoX(model, marks);
  refreshBoard();
  refreshGrid();
  refreshDone();
  const solvedCount = CASES.filter((c) => data.cases[c.id] && data.cases[c.id].s).length;
  $('case-count').textContent = `${solvedCount}/${CASES.length}`;
  $('btn-cases').setAttribute('aria-label', `사건철, ${CASES.length}개 중 ${solvedCount}개 풂`);
  $('btn-undo').disabled = solved || !history[cs.id].length;
  $('btn-reset').disabled = solved || marks.size === 0;
  $('btn-check').disabled = solved;
  $('btn-hint').disabled = solved;
  if (first) applyGridHidden();
}

function bindActions() {
  $('btn-undo').addEventListener('click', undo);
  $('btn-reset').addEventListener('click', () => {
    if (!marks.size) return;
    commit(() => marks.clear(), '처음부터 다시 해요. 되돌리기를 누르면 방금 상태로 돌아가요.');
  });
  $('btn-check').addEventListener('click', check);
  $('btn-next').addEventListener('click', () => {
    if (ci === CASES.length - 1) { $('btn-cases').click(); return; }
    loadCase(ci + 1, true);
    say(`사건 ${ci + 1}, ${josa(cs.title, '을/를')} 열었어요.`);
  });
  $('btn-again').addEventListener('click', () => {
    solved = false;
    marks.clear();
    history[cs.id] = [];
    storeCase();
    refresh();
    say('같은 사건을 처음부터 다시 풀어요.');
    $('tag-' + cs.items[0].id).focus();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
      if ($('drawer').open) return;
      e.preventDefault();
      undo();
    }
    if (e.key === 'Escape' && held && !$('drawer').open) { e.preventDefault(); putDown(true); }
  });
}
function undo() {
  const h = history[cs.id];
  if (solved || !h || !h.length) { say('되돌릴 게 없어요.'); return; }
  const s = h.pop();
  marks = new Map(s.m);
  held = null;
  clearHint();
  storeCase();
  refresh();
  say('한 단계 되돌렸어요.');
}

// ---------- start ----------
bindBoard();
bindClues();
bindGrid();
bindHints();
bindDrawer();
bindActions();
loadCase(data.cur);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawStrings());
