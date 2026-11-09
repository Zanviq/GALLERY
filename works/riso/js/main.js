import { INKS } from './press.js';
import {
  Table, PLATES, PIECE_NAMES, PAPER_W, PAPER_H, TRIM, defaultState, measureGlyph, bbox, drawPlateFile,
} from './sheet.js';
import { initSpecimens } from './specimens.js';
import { initSlip } from './slip.js';

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const KEY = 'gyeop-table-v1';

const store = {
  get() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  set(v) {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch (e) {
      /* storage off: the table just starts fresh next time */
    }
  },
};

function restore() {
  const s = defaultState();
  const saved = store.get();
  if (!saved || !Array.isArray(saved.pieces)) return s;
  try {
    for (const p of s.pieces) {
      const q = saved.pieces.find((x) => x && x.id === p.id);
      if (!q) continue;
      if (Number.isFinite(q.x)) p.x = Math.min(PAPER_W - 2, Math.max(2, q.x));
      if (Number.isFinite(q.y)) p.y = Math.min(PAPER_H - 2, Math.max(2, q.y));
      if (PLATES.includes(q.plate)) p.plate = q.plate;
    }
    if (Array.isArray(saved.order) && saved.order.length === 3 && PLATES.every((p) => saved.order.includes(p))) {
      s.order = saved.order.slice();
    }
    for (const p of PLATES) {
      const d = saved.density && saved.density[p];
      if (Number.isInteger(d) && d >= 1 && d <= 5) s.density[p] = d;
    }
    if (Number.isInteger(saved.pull) && saved.pull >= 1 && saved.pull < 10000) s.pull = saved.pull;
  } catch (e) {
    return defaultState();
  }
  return s;
}

const inkName = (p) => INKS[p].name;
const mm = (v) => (Math.round(v * 2) / 2).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const orderText = (order) => order.map(inkName).join(', ');
// Korean particles: pick 을/를, 과/와 from the last syllable's final consonant
const hasFinal = (w) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
const eul = (w) => w + (hasFinal(w) ? '을' : '를');
const andList = (ws) => ws.map((w, i) => (i < ws.length - 1 ? w + (hasFinal(w) ? '과' : '와') : w)).join(' ');

function say(el, text) {
  // re-announce even when the text repeats
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = text;
  });
}

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px "Black Han Sans"', '겹'),
      document.fonts.load('16px "Gowun Dodum"', '가'),
    ]);
  } catch (e) {
    /* fall back to whatever font is there */
  }
  measureGlyph();

  const canvas = $('#press-canvas');
  const sheetEl = $('#sheet');
  const handlesEl = $('#handles');
  const statusEl = $('#status');
  const slugEl = $('#slug');
  const state = restore();
  let selected = null;
  let saveTimer = 0;
  let platesTimer = 0;
  let announceTimer = 0;

  const table = new Table({ canvas, state });

  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(state), 300);
  };

  // ---- text that follows the state ----
  function describe() {
    const parts = PLATES.map((pl) => {
      const names = state.pieces.filter((p) => p.plate === pl).map((p) => PIECE_NAMES[p.id]);
      return names.length ? `${inkName(pl)} 판에 ${andList(names)}` : `${inkName(pl)} 판은 비어 있음`;
    });
    canvas.setAttribute('aria-label',
      `교정쇄 ${state.pull}번째 장. ${parts.join(', ')}. 찍은 순서는 ${orderText(state.order)}. 조각이 겹친 자리는 두 잉크가 섞인 색으로 찍혀 있습니다.`);
    slugEl.textContent = `${state.pull}번째 장, ${orderText(state.order)} 순서로 찍음`;
  }

  // ---- piece handles (keyboard path; the pointer goes through the sheet) ----
  const handleOf = new Map();
  function placeHandle(p) {
    const b = bbox(p);
    const h = handleOf.get(p.id);
    h.style.left = (b.x0 / PAPER_W) * 100 + '%';
    h.style.top = (b.y0 / PAPER_H) * 100 + '%';
    h.style.width = ((b.x1 - b.x0) / PAPER_W) * 100 + '%';
    h.style.height = ((b.y1 - b.y0) / PAPER_H) * 100 + '%';
    h.setAttribute('aria-label',
      `${PIECE_NAMES[p.id]}, ${inkName(p.plate)} 판. 재단선 왼쪽에서 ${mm(p.x - TRIM)}mm, 위에서 ${mm(p.y - TRIM)}mm`);
  }
  for (const p of state.pieces) {
    const h = document.createElement('button');
    h.type = 'button';
    h.className = 'piece';
    h.dataset.id = p.id;
    h.setAttribute('aria-describedby', 'keys-help');
    handlesEl.appendChild(h);
    handleOf.set(p.id, h);
    placeHandle(p);
    h.addEventListener('focus', () => select(p));
    h.addEventListener('keydown', (e) => {
      sheetEl.dataset.input = 'key';
      const step = e.shiftKey ? 5 : 0.5;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      table.movePiece(p, p.x + d[0], p.y + d[1]);
      placeHandle(p);
      showPicked();
      afterEdit();
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => say(statusEl, `${PIECE_NAMES[p.id]}: 왼쪽 ${mm(p.x - TRIM)}mm, 위 ${mm(p.y - TRIM)}mm`), 450);
    });
  }

  // keyboard focus on a piece always gets the strong ring, even right after a drag
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') sheetEl.dataset.input = 'key';
  });

  function select(p) {
    selected = p;
    for (const [id, h] of handleOf) h.classList.toggle('is-selected', id === (p && p.id));
    showPicked();
  }

  // ---- picked panel: move a piece to another plate ----
  const pickedNone = $('#picked-none');
  const pickedSome = $('#picked-some');
  const pickedWhat = $('#picked-what');
  const pickedMoves = $('#picked-moves');
  function showPicked() {
    if (!selected) {
      pickedNone.hidden = false;
      pickedSome.hidden = true;
      return;
    }
    pickedNone.hidden = true;
    pickedSome.hidden = false;
    pickedWhat.textContent = `고른 조각: ${PIECE_NAMES[selected.id]}, ${inkName(selected.plate)} 판 (왼쪽 ${mm(selected.x - TRIM)}mm, 위 ${mm(selected.y - TRIM)}mm)`;
    const others = PLATES.filter((pl) => pl !== selected.plate);
    const have = [...pickedMoves.children].map((b) => b.dataset.plate).join();
    if (have !== others.join()) {
      pickedMoves.textContent = '';
      for (const pl of others) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn--small';
        b.dataset.plate = pl;
        b.innerHTML = `<span class="chip chip--${pl}" aria-hidden="true"></span>${inkName(pl)} 판으로`;
        pickedMoves.appendChild(b);
      }
    }
  }
  document.querySelector('.nudge').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-nudge]');
    if (!b || !selected) return;
    const [dx, dy] = b.dataset.nudge.split(',').map(Number);
    table.movePiece(selected, selected.x + dx, selected.y + dy);
    placeHandle(selected);
    showPicked();
    afterEdit();
  });
  pickedMoves.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-plate]');
    if (!b || !selected) return;
    const p = selected;
    table.setPlate(p, b.dataset.plate);
    placeHandle(p);
    showPicked();
    say(statusEl, `${eul(PIECE_NAMES[p.id])} ${inkName(p.plate)} 판으로 옮겼습니다.`);
    const next = pickedMoves.querySelector('button');
    if (next) next.focus();
    afterEdit(true);
  });

  // ---- drums ----
  const drumsEl = $('#drums');
  const chevron = (up) => `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="${up ? 'M4 13l6-6 6 6' : 'M4 7l6 6 6-6'}"/></svg>`;
  function renderDrums(focus) {
    drumsEl.textContent = '';
    state.order.forEach((pl, k) => {
      const li = document.createElement('li');
      li.className = 'drum';
      li.innerHTML = `
        <span class="drum__no" aria-hidden="true">${k + 1}</span>
        <span class="drum__name"><span class="chip chip--${pl}" aria-hidden="true"></span>${inkName(pl)}</span>
        <span class="drum__order">
          <button type="button" class="round" data-act="up" data-plate="${pl}" aria-label="${eul(inkName(pl))} 한 순서 먼저 찍기" ${k === 0 ? 'disabled' : ''}>${chevron(true)}</button>
          <button type="button" class="round" data-act="down" data-plate="${pl}" aria-label="${eul(inkName(pl))} 한 순서 나중에 찍기" ${k === state.order.length - 1 ? 'disabled' : ''}>${chevron(false)}</button>
        </span>
        <span class="drum__density">
          <span class="drum__dlabel" id="dl-${pl}">농도</span>
          <button type="button" class="round" data-act="minus" data-plate="${pl}" aria-label="${inkName(pl)} 농도 낮추기" ${state.density[pl] <= 1 ? 'disabled' : ''}>−</button>
          <output class="drum__dval" aria-labelledby="dl-${pl}">${state.density[pl]}</output>
          <button type="button" class="round" data-act="plus" data-plate="${pl}" aria-label="${inkName(pl)} 농도 높이기" ${state.density[pl] >= 5 ? 'disabled' : ''}>+</button>
        </span>`;
      li.setAttribute('aria-label', `${k + 1}번 드럼, ${inkName(pl)}, 농도 ${state.density[pl]}`);
      drumsEl.appendChild(li);
    });
    if (focus) {
      let b = drumsEl.querySelector(`button[data-plate="${focus.plate}"][data-act="${focus.act}"]`);
      if (b && b.disabled) {
        const alt = { up: 'down', down: 'up', minus: 'plus', plus: 'minus' }[focus.act];
        b = drumsEl.querySelector(`button[data-plate="${focus.plate}"][data-act="${alt}"]`);
      }
      if (b) b.focus();
    }
  }
  drumsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const pl = b.dataset.plate;
    const act = b.dataset.act;
    if (act === 'up' || act === 'down') {
      const i = state.order.indexOf(pl);
      const j = act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= state.order.length) return;
      [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
      renderDrums({ plate: pl, act });
      table.print(!reduced.matches);
      say(statusEl, `찍는 순서를 바꿨습니다. ${orderText(state.order)} 순서입니다.`);
    } else {
      const d = state.density[pl] + (act === 'plus' ? 1 : -1);
      if (d < 1 || d > 5) return;
      state.density[pl] = d;
      renderDrums({ plate: pl, act });
      table.invalidate([pl]);
      say(statusEl, `${inkName(pl)} 농도 ${d}`);
    }
    afterEdit(true);
  });

  // ---- pointer dragging on the sheet ----
  let drag = null;
  const toMM = (cx, cy) => {
    const r = sheetEl.getBoundingClientRect();
    return [((cx - r.left) / r.width) * PAPER_W, ((cy - r.top) / r.height) * PAPER_H];
  };
  const tol = () => Math.max(1.5, (8 / sheetEl.getBoundingClientRect().width) * PAPER_W);

  sheetEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const [x, y] = toMM(t.clientX, t.clientY);
    if (table.pieceAt(x, y, tol())) e.preventDefault(); // only block scrolling when a piece is grabbed
  }, { passive: false });

  sheetEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    const [x, y] = toMM(e.clientX, e.clientY);
    const p = table.pieceAt(x, y, tol());
    if (!p) {
      if (selected) {
        const h = handleOf.get(selected.id);
        if (document.activeElement === h) h.blur();
        select(null);
      }
      return;
    }
    e.preventDefault();
    sheetEl.dataset.input = 'pointer';
    sheetEl.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, p, dx: p.x - x, dy: p.y - y, moved: false };
    handleOf.get(p.id).focus({ preventScroll: true });
    select(p);
    sheetEl.classList.add('is-dragging');
  });
  sheetEl.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const [x, y] = toMM(e.clientX, e.clientY);
      table.movePiece(drag.p, x + drag.dx, y + drag.dy);
      placeHandle(drag.p);
      drag.moved = true;
      return;
    }
    if (e.pointerType === 'mouse') {
      const [x, y] = toMM(e.clientX, e.clientY);
      sheetEl.classList.toggle('is-over', !!table.pieceAt(x, y, tol()));
    }
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    sheetEl.classList.remove('is-dragging');
    showPicked();
    if (moved) afterEdit(true);
  };
  sheetEl.addEventListener('pointerup', endDrag);
  sheetEl.addEventListener('pointercancel', endDrag);
  sheetEl.addEventListener('pointerleave', () => sheetEl.classList.remove('is-over'));

  // ---- actions ----
  $('#pull').addEventListener('click', () => {
    state.pull += 1;
    table.invalidate();
    table.print(!reduced.matches);
    say(statusEl, `${state.pull}번째 장을 찍었습니다. 잉크 결과 어긋남이 장마다 조금씩 다릅니다.`);
    afterEdit(true);
  });
  $('#reset').addEventListener('click', () => {
    const d = defaultState();
    for (const p of state.pieces) {
      const q = d.pieces.find((x) => x.id === p.id);
      p.x = q.x;
      p.y = q.y;
      p.plate = q.plate;
      placeHandle(p);
    }
    table.invalidate();
    showPicked();
    say(statusEl, '조각을 처음 자리와 처음 판으로 되돌렸습니다. 드럼 순서와 농도는 그대로입니다.');
    afterEdit(true);
  });
  $('#save').addEventListener('click', () => {
    table.finishPrint();
    const n = String(state.pull).padStart(2, '0');
    const slug = `겹 리소 인쇄실 교정쇄 ${state.pull}번째 장, 찍은 순서 ${orderText(state.order)}, 농도 ${state.order.map((p) => state.density[p]).join('/')}`;
    requestAnimationFrame(() => {
      table.toBlob(slug, (blob) => {
        if (!blob) {
          say(statusEl, '이 브라우저에서는 PNG를 만들지 못했습니다.');
          return;
        }
        download(blob, `gyeop-proof-${n}.png`);
        say(statusEl, `gyeop-proof-${n}.png 파일로 저장했습니다.`);
      });
    });
  });

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ---- separations in the file section ----
  const platesEl = $('#plates');
  function renderPlates() {
    platesEl.textContent = '';
    state.order.forEach((pl, k) => {
      const li = document.createElement('li');
      li.className = 'plate';
      const c = document.createElement('canvas');
      c.width = 594;
      c.height = 420;
      c.setAttribute('role', 'img');
      const names = state.pieces.filter((p) => p.plate === pl).map((p) => PIECE_NAMES[p.id]);
      c.setAttribute('aria-label', `${k + 1}번 판 ${inkName(pl)}: ${names.length ? names.join(', ') : '빈 판'}, 회색조`);
      drawPlateFile(c, state.pieces, pl);
      const cap = document.createElement('p');
      cap.className = 'plate__name';
      cap.innerHTML = `<span class="plate__no">${k + 1}</span><span class="chip chip--${pl}" aria-hidden="true"></span>${inkName(pl)}`;
      const file = document.createElement('p');
      file.className = 'plate__file';
      file.textContent = `포스터_${k + 1}_${inkName(pl).replace(' ', '')}.png`;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn--small';
      b.textContent = 'PNG로 받기';
      b.setAttribute('aria-label', `${k + 1}번 ${inkName(pl)} 판을 PNG로 받기`);
      b.addEventListener('click', () => {
        const big = document.createElement('canvas');
        big.width = 3508; // A4 landscape at 300 dpi
        big.height = 2480;
        drawPlateFile(big, state.pieces, pl);
        big.toBlob((blob) => {
          if (blob) download(blob, `gyeop-plate-${k + 1}-${pl}.png`);
        }, 'image/png');
      });
      li.append(c, cap, file, b);
      platesEl.appendChild(li);
    });
  }

  function afterEdit(structural) {
    describe();
    persist();
    if (structural) {
      clearTimeout(platesTimer);
      platesTimer = setTimeout(renderPlates, 120);
    } else {
      clearTimeout(platesTimer);
      platesTimer = setTimeout(renderPlates, 400);
    }
  }

  renderDrums();
  describe();
  renderPlates();
  showPicked();

  // first print: plate by plate, once the sheet is on screen and the tab is visible
  let printed = false;
  const firstPrint = () => {
    if (printed || document.hidden) return;
    printed = true;
    table.print(!reduced.matches);
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) firstPrint();
      else if (!printed) {
        printed = true; // opened further down the page: no animation, just the sheet
        table.print(false);
      } else table.finishPrint(); // never animate off screen
    }
  });
  io.observe(sheetEl);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) table.finishPrint();
    else {
      const r = sheetEl.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) firstPrint();
    }
  });
  initSpecimens();
  initSlip({
    // the plates that have something on them, in drum order
    tableInks: () => state.order.filter((pl) => state.pieces.some((p) => p.plate === pl)),
  });
}

boot();
