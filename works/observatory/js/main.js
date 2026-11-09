import * as A from './astro.js';
import { createPlanisphere } from './planisphere.js';
import { OBJECTS, KIND, TELESCOPES, FIGURE_NOTES } from './objects.js';

const $ = (s) => document.querySelector(s);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const MIN = 60000;
const DAY = 86400000;
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => mq.matches;
const params = new URLSearchParams(location.search);
if (params.has('capture')) document.documentElement.classList.add('capture');

// ---------------------------------------------------------------- calendar helpers (KST)
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
const fmtDate = (p) => `${p.m}월 ${p.d}일 ${WD[p.wd]}요일`;
const spoken = (p) => {
  const h = Math.floor(p.min / 60);
  const m = p.min % 60;
  const part = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${p.m}월 ${p.d}일 ${WD[p.wd]}요일 ${part} ${h12}시${m ? ` ${m}분` : ''}`;
};
function sessionsFor(month) {
  if (month >= 11 || month <= 2) return [1110, 1170, 1230];
  if (month >= 5 && month <= 8) return [1200, 1260, 1320];
  return [1170, 1230, 1290];
}
const isClosed = (p) => p.wd === 1 || (p.m === 1 && p.d === 1);
const dayStart = (p) => A.kstInstant(p.y, p.m, p.d, 0);
const addDays = (p, n) => A.kstParts(dayStart(p) + n * DAY + 12 * 3600000);
/** The observing night an instant belongs to: before noon counts as the previous evening. */
const nightOf = (t) => {
  const p = A.kstParts(t);
  return p.min < 720 ? addDays(p, -1) : p;
};
function sunTimes(night) {
  const noon = A.kstInstant(night.y, night.m, night.d, 720);
  return {
    set: A.findCrossing(A.sunAlt, -0.833, noon, DAY, -1),
    dark: A.findCrossing(A.sunAlt, -18, noon, DAY, -1),
    rise: A.findCrossing(A.sunAlt, -0.833, noon, DAY + 6 * 3600000, 1),
  };
}
const clock = (t) => (t == null ? '--:--' : hhmm(A.kstParts(t).min));
/** 으로/로 after a Korean word (ㄹ and open syllables take 로). */
const ro = (w) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  if (c < 0 || c > 11171) return `${w}로`;
  const jong = c % 28;
  return `${w}${jong === 0 || jong === 8 ? '로' : '으로'}`;
};

// ---------------------------------------------------------------- planisphere
const disc = $('#disc');
const canvas = $('#disc-canvas');
const announce = document.createElement('p');
announce.className = 'sr';
announce.setAttribute('aria-live', 'polite');
document.body.append(announce);
const say = (text) => { announce.textContent = ''; requestAnimationFrame(() => { announce.textContent = text; }); };

let ready = false;
const ps = createPlanisphere({ canvas, wrap: disc, reduced, onChange, onSelect });

function defaultTime() {
  const at = params.get('at');
  if (at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)) {
    const [d, t] = at.split('T');
    const [y, m, dd] = d.split('-').map(Number);
    const [hh, mm] = t.split(':').map(Number);
    return A.kstInstant(y, m, dd, hh * 60 + mm);
  }
  const now = Math.floor(Date.now() / (5 * MIN)) * 5 * MIN;
  if (A.sunAlt(now) < -12) return now;
  const p = A.kstParts(now);
  return A.kstInstant(p.y, p.m, p.d, sessionsFor(p.m)[1]);
}
ps.set(defaultTime());
if (!reduced() && !params.has('capture')) {
  ps.on('firstview', () => {
    const target = ps.ms;
    ps.set(target - 2 * 3600000);
    ps.set(target, { animate: 1300 });
  });
}

// ---------------------------------------------------------------- readout and steps
const readDate = $('#readout-date');
const readTime = $('#readout-time');
const sessionBtns = $('#session-btns');
let sessionKey = '';

function onChange(t, source) {
  if (!ready) return;
  const p = A.kstParts(t);
  readDate.textContent = fmtDate(p);
  readTime.textContent = hhmm(p.min);
  disc.setAttribute('aria-valuenow', String(p.min));
  disc.setAttribute('aria-valuetext', spoken(p));
  const night = nightOf(t);
  const sess = sessionsFor(night.m);
  const key = `${night.y}-${night.m}-${night.d}`;
  if (key !== sessionKey) {
    sessionKey = key;
    sessionBtns.replaceChildren(...sess.map((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn--time';
      b.textContent = hhmm(m);
      b.setAttribute('aria-label', `${['첫', '둘째', '셋째'][i]} 회차 시각 ${hhmm(m)}에 맞추기`);
      b.dataset.min = String(m);
      return b;
    }));
  }
  for (const b of sessionBtns.children) {
    b.setAttribute('aria-pressed', String(p.min === Number(b.dataset.min)));
  }
  const live = source === 'drag' || source === 'tween' || source === 'play';
  scheduleLists(live);
}

function stepBy(min, animate = true) {
  ps.set(ps.ms + min * MIN, { animate });
}
document.querySelectorAll('[data-step]').forEach((b) => {
  b.addEventListener('click', () => stepBy(Number(b.dataset.step)));
});
sessionBtns.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const night = nightOf(ps.ms);
  ps.set(A.kstInstant(night.y, night.m, night.d, Number(b.dataset.min)), { animate: true });
  say(`관측회 시각 ${b.textContent}에 맞췄습니다.`);
});
$('#now').addEventListener('click', () => {
  const t = Math.round(Date.now() / MIN) * MIN;
  ps.set(t, { animate: true });
  say(`지금 시각인 ${spoken(A.kstParts(t))}에 맞췄습니다.`);
});
disc.addEventListener('keydown', (e) => {
  const map = { ArrowRight: 10, ArrowLeft: -10, ArrowUp: 60, ArrowDown: -60, PageUp: 60, PageDown: -60 };
  if (!(e.key in map)) return;
  e.preventDefault();
  let step = map[e.key];
  if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) step = Math.sign(step) * 1440;
  ps.stop();
  stepBy(step, false);
});

const playBtn = $('#play');
function syncPlayAvailability() { playBtn.hidden = reduced(); if (reduced()) ps.stop(); }
syncPlayAvailability();
mq.addEventListener('change', syncPlayAvailability);
ps.on('play', (on) => {
  playBtn.setAttribute('aria-pressed', String(on));
  playBtn.textContent = on ? '멈추기' : '밤새 돌려 보기';
  if (!on) scheduleLists(false);
});
playBtn.addEventListener('click', () => {
  if (ps.playing) { ps.stop(); return; }
  let start = ps.ms;
  const night = nightOf(start);
  const st = sunTimes(night);
  if (A.sunAlt(start) > -0.833 && st.set) start = Math.ceil(st.set / MIN) * MIN;
  const rise = A.findCrossing(A.sunAlt, -0.833, start, DAY, 1) || start + 12 * 3600000;
  if (start !== ps.ms) ps.set(start);
  ps.play(rise);
});
ps.on('dragstart', () => { if (ps.playing) ps.stop(); });

const zoomBtn = $('#zoom');
zoomBtn.addEventListener('click', () => {
  const on = zoomBtn.getAttribute('aria-pressed') !== 'true';
  zoomBtn.setAttribute('aria-pressed', String(on));
  ps.setZoom(on);
  say(on ? '하늘 창을 크게 보여 드립니다. 날짜 고리와 시각 고리는 화면 밖으로 나갑니다.' : '성도판 전체를 보여 드립니다.');
});

const namesBtn = $('#names');
namesBtn.addEventListener('click', () => {
  const on = namesBtn.getAttribute('aria-pressed') !== 'true';
  namesBtn.setAttribute('aria-pressed', String(on));
  ps.setShowNames(on);
});

// ---------------------------------------------------------------- selection info
const info = $('#disc-info');
const INFO_EMPTY = info.textContent;
function selectionText(sel, t) {
  if (!sel) return null;
  const d = ps.describe(sel, t);
  if (!d) return null;
  const where = d.alt > 0
    ? `지금 ${A.compass(d.az, true)}쪽 하늘, 고도 ${Math.round(d.alt)}°입니다.`
    : '이 시각에는 지평선 아래에 있습니다.';
  if (sel.type === 'star') {
    const name = ps.starName(sel.i);
    const des = ps.starDesig(sel.i);
    const mag = ps.starMag(sel.i).toFixed(1);
    if (name === des) return { strong: `${des}.`, rest: ` ${mag}등급. ${where}` };
    return { strong: `${name}.`, des: `${des}.`, rest: ` ${mag}등급. ${where}` };
  }
  if (sel.type === 'obj') {
    const o = OBJECTS.find((x) => x.id === sel.id);
    return { strong: `${o.name}.`, rest: ` ${KIND[o.kind]}, ${ro(TELESCOPES[o.tel].name)} 봅니다. ${where} ${o.note}` };
  }
  const f = ps.figures().find((x) => x.abbr === sel.abbr);
  return { strong: `${f.ko}.`, rest: ` ${FIGURE_NOTES[sel.abbr] || ''} ${where}` };
}
/** Text nodes with Greek letters wrapped in the coding face (Nanum Myeongjo has no Greek). */
function withGreek(text) {
  return text.split(/([α-ω][¹²³]?)/).filter(Boolean).map((t) => {
    if (!/^[α-ω]/.test(t)) return document.createTextNode(t);
    const g = document.createElement('span');
    g.className = 'num';
    g.textContent = t;
    return g;
  });
}
function renderInfo() {
  const s = selectionText(ps.selection, ps.shown);
  if (!s) { info.textContent = INFO_EMPTY; return null; }
  const b = document.createElement('strong');
  b.append(...withGreek(s.strong));
  const nodes = [b];
  if (s.des) nodes.push(document.createTextNode(' '), ...withGreek(s.des));
  nodes.push(document.createTextNode(s.rest));
  info.replaceChildren(...nodes);
  return s.strong + (s.des ? ` ${s.des}` : '') + s.rest;
}
function onSelect(sel) {
  if (!ready) return;
  const text = renderInfo();
  if (text) say(text);
  syncPressed();
}
const sameSel = (a, b) => a && b && a.type === b.type && a.id === b.id && a.abbr === b.abbr && a.i === b.i;
function selectFromList(sel) {
  ps.select(sameSel(ps.selection, sel) ? null : sel);
  const r = disc.getBoundingClientRect();
  if (r.bottom < 80 || r.top > window.innerHeight - 80) {
    disc.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
  }
}

// ---------------------------------------------------------------- tonight list and chips
const list = $('#tonight-list');
const whenEl = $('#tonight-when');
const skyEl = $('#tonight-sky');
const chips = $('#inview');
const chipCount = $('#inview-count');
let listTimer = 0;
let chipKey = '';

function scheduleLists(live) {
  if (live) {
    if (!listTimer) listTimer = setTimeout(() => { listTimer = 0; renderLists(); }, 140);
  } else {
    clearTimeout(listTimer);
    listTimer = 0;
    renderLists();
  }
}

function moonPhase(m) {
  const k = m.illum;
  if (k < 0.04) return '삭 무렵';
  if (k > 0.96) return '보름달';
  if (m.waxing) return k < 0.4 ? '초승달' : k < 0.6 ? '상현달' : '차오르는 달';
  return k < 0.4 ? '그믐달' : k < 0.6 ? '하현달' : '기우는 달';
}

function figurePower(f) {
  return f.ids.reduce((s, i) => s + Math.max(0, 4.6 - ps.starMag(i)), 0);
}

function renderLists() {
  const t = ps.shown;
  const lst = A.lstDeg(t);
  const p = A.kstParts(t);
  const night = nightOf(t);
  const sess = sessionsFor(night.m);
  const sunAlt = A.sunAlt(t);
  const moon = A.moonAltAz(t);
  const st = sunTimes(night);
  const sIdx = sess.indexOf(p.min);
  whenEl.textContent = sIdx >= 0
    ? `${fmtDate(p)} ${hhmm(p.min)} ${['첫', '둘째', '셋째'][sIdx]} 회차에 지평선 위 20°보다 높이 뜬 대상입니다.`
    : `${fmtDate(p)} ${hhmm(p.min)}에 지평선 위 20°보다 높이 뜬 대상입니다.`;
  if (isClosed(night)) {
    whenEl.textContent += ` ${night.m}월 ${night.d}일은 쉬는 날이라 망원경을 열지 않지만, 하늘은 이렇게 떠 있습니다.`;
  }

  const moonUp = moon.alt > 0;
  const moonBright = moonUp && moon.illum > 0.55;
  let skyLine = moon.illum < 0.04
    ? '달: 삭 무렵이라 달빛이 없습니다.'
    : `달: ${moonPhase(moon)}, 밝기 ${Math.round(moon.illum * 100)}%. ${moonUp ? `${A.compass(moon.az)}쪽 하늘 고도 ${Math.round(moon.alt)}°.` : '지평선 아래에 있습니다.'}`;
  if (moonBright) skyLine += ' 달빛이 밝아 은하와 성운은 흐리게 보입니다.';
  if (sunAlt > -18 && sunAlt <= -0.833) {
    skyLine = `아직 하늘이 조금 밝습니다. 완전히 어두워지는 시각은 ${clock(st.dark)}입니다. ` + skyLine;
  }
  skyEl.textContent = skyLine;

  const rows = { big: [], twin: [], deck: [] };
  if (sunAlt <= -0.833) {
    for (const o of OBJECTS) {
      const h = A.altAz(o.ra, o.dec, lst);
      if (h.alt < 20) continue;
      let score = h.alt * 0.5 + o.pri * 18;
      if (moonBright && /gx|nb|sn|pn/.test(o.kind)) score -= 45 * moon.illum;
      if (sunAlt > -12 && o.mag > 6) score -= 40;
      rows[o.tel].push({ o, h, score });
    }
    Object.values(rows).forEach((r) => r.sort((a, b) => b.score - a.score));
  }
  const figs = sunAlt <= -0.833 ? ps.figures()
    .map((f) => ({ f, alt: ps.figureAlt(f.abbr, t) }))
    .filter((x) => x.alt >= 30)
    .map((x) => ({ ...x, score: figurePower(x.f) * (0.6 + x.alt / 150) }))
    .sort((a, b) => b.score - a.score) : [];

  const targets = [];
  const groups = [];
  if (sunAlt > -0.833) {
    const box = document.createElement('div');
    box.className = 'empty';
    const msg = document.createElement('p');
    msg.textContent = `해가 떠 있는 시각입니다. 오늘 해 지는 시각은 ${clock(st.set)}이고, 망원경은 해가 진 뒤에 엽니다.`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    const first = A.kstParts(t).min < 720 ? sessionsFor(p.m)[0] : sess[0];
    btn.textContent = `오늘 첫 회차 ${hhmm(first)}에 맞추기`;
    btn.addEventListener('click', () => ps.set(A.kstInstant(p.y, p.m, p.d, first), { animate: true }));
    box.append(msg, btn);
    groups.push(box);
  } else {
    for (const key of ['big', 'twin', 'deck']) {
      const tel = TELESCOPES[key];
      const g = document.createElement('div');
      g.className = 'scope-group';
      const head = document.createElement('div');
      head.className = 'scope-group__head';
      head.innerHTML = '<h3 class="scope-group__name"></h3><span class="scope-group__spec"></span>';
      head.children[0].textContent = tel.name;
      head.children[1].textContent = `${tel.spec}, ${tel.room}`;
      g.append(head);
      const items = [];
      const objs = rows[key].slice(0, key === 'deck' ? 2 : 3);
      for (const { o, h } of objs) {
        targets.push(o.id);
        items.push(item({ type: 'obj', id: o.id }, o.name, `${A.compass(h.az)} ${Math.round(h.alt)}°`,
          `${KIND[o.kind]}. ${o.note}`));
      }
      if (key === 'deck') {
        for (const { f, alt } of figs.slice(0, 2)) {
          const sel = { type: 'fig', abbr: f.abbr };
          const d = ps.describe(sel, t);
          items.push(item(sel, f.ko, `${A.compass(d.az)} ${Math.round(alt)}°`, `별자리. ${FIGURE_NOTES[f.abbr] || ''}`));
        }
      }
      if (items.length) {
        const ul = document.createElement('ul');
        ul.className = 'targets';
        ul.append(...items);
        g.append(ul);
      } else {
        const n = document.createElement('p');
        n.className = 'scope-group__note';
        n.textContent = key === 'deck'
          ? '20°보다 높이 뜬 밝은 별자리가 없어 해설사가 지평선 가까운 별을 짚어 드립니다.'
          : '이 시각에는 20°보다 높이 뜬 대상이 없어 다음 대상이 뜰 때까지 돔을 돌려 둡니다.';
        g.append(n);
      }
      if (key === 'big' && moonBright) {
        const n = document.createElement('p');
        n.className = 'scope-group__note';
        n.textContent = '달이 밝은 밤에는 성단과 이중성을 먼저 봅니다.';
        g.append(n);
      }
      groups.push(g);
    }
  }
  list.replaceChildren(...groups);
  ps.setTargets(targets);

  // constellations inside the window
  const inview = ps.figures()
    .map((f) => ({ f, alt: ps.figureAlt(f.abbr, t) }))
    .filter((x) => x.alt > 6)
    .sort((a, b) => b.alt - a.alt);
  const key = inview.map((x) => x.f.abbr).sort().join();
  if (key !== chipKey) {
    chipKey = key;
    chips.replaceChildren(...inview.map(({ f }) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = f.ko;
      b.dataset.abbr = f.abbr;
      b.addEventListener('click', () => selectFromList({ type: 'fig', abbr: f.abbr }));
      li.append(b);
      return li;
    }));
    chipCount.textContent = `${inview.length}개`;
  }
  renderInfo();
  syncPressed();
}

function item(sel, name, where, note) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'target';
  b.dataset.sel = JSON.stringify(sel);
  const n = document.createElement('span');
  n.className = 'target__name';
  n.textContent = name;
  const w = document.createElement('span');
  w.className = 'target__where';
  w.textContent = where;
  const d = document.createElement('span');
  d.className = 'target__note';
  d.textContent = note;
  b.append(n, w, d);
  b.addEventListener('click', () => selectFromList(sel));
  li.append(b);
  return li;
}

function syncPressed() {
  const sel = ps.selection;
  list.querySelectorAll('.target').forEach((b) => {
    b.setAttribute('aria-pressed', String(sameSel(sel, JSON.parse(b.dataset.sel))));
  });
  chips.querySelectorAll('.chip').forEach((b) => {
    b.setAttribute('aria-pressed', String(!!sel && sel.type === 'fig' && sel.abbr === b.dataset.abbr));
  });
}

// ---------------------------------------------------------------- today line, next session, kids, season
function nextOpen(fromT) {
  let p = A.kstParts(fromT);
  for (let i = 0; i < 10; i++) {
    const sess = sessionsFor(p.m);
    const lastStart = sess[2];
    const today = i === 0;
    if (!isClosed(p) && (!today || A.kstParts(fromT).min < lastStart)) {
      const first = today ? sess.find((m) => m > A.kstParts(fromT).min) ?? sess[0] : sess[0];
      return { p, min: first, sess };
    }
    p = addDays(p, 1);
  }
  return null;
}
function renderToday() {
  const now = Date.now();
  const p = A.kstParts(now);
  const sess = sessionsFor(p.m);
  const st = sunTimes(p);
  const today = $('#today');
  const lastEnd = sess[2] + 50;
  let text;
  if (isClosed(p)) {
    const n = nextOpen(dayStart(addDays(p, 1)));
    text = `오늘 ${fmtDate(p)}은 쉬는 날입니다. 다음 관측회는 ${fmtDate(n.p)} ${hhmm(n.min)}에 시작합니다.`;
  } else if (p.min < lastEnd) {
    text = `오늘 ${fmtDate(p)} 관측회는 ${sess.map(hhmm).join(', ')}에 시작합니다. 해 지는 시각은 ${clock(st.set)}이고, 날씨에 따른 진행 여부는 오후 5시에 정합니다.`;
  } else {
    const n = nextOpen(dayStart(addDays(p, 1)));
    text = `오늘 관측회는 끝났습니다. 다음 관측회는 ${fmtDate(n.p)} ${hhmm(n.min)}에 시작합니다.`;
  }
  today.textContent = text;
  const n = nextOpen(now);
  const next = $('#next-session');
  if (n) {
    const isToday = n.p.d === p.d && n.p.m === p.m;
    next.textContent = `다음 관측회는 ${isToday ? '오늘' : fmtDate(n.p)} ${hhmm(n.min)}에 시작합니다.`;
  }
  // kids booking: on the 1st of each month at 10:00 the following month's Saturdays open
  const nm = (m) => ((m - 1) % 12) + 1;
  $('#kids-booking').textContent = p.d === 1 && p.min < 600
    ? `지금은 ${p.m}월 토요일 자리를 받고 있습니다. ${nm(p.m + 1)}월 자리는 오늘 오전 10시에 엽니다. 신청은 1층 안내 데스크에서 받습니다.`
    : `지금은 ${nm(p.m + 1)}월 토요일 자리를 받고 있습니다. ${nm(p.m + 2)}월 자리는 ${nm(p.m + 1)}월 1일 오전 10시에 엽니다. 신청은 1층 안내 데스크에서 받습니다.`;
  // season table: mark the current row
  const season = p.m >= 11 || p.m <= 2 ? 'winter' : p.m >= 5 && p.m <= 8 ? 'summer' : 'mid';
  const row = document.querySelector(`tr[data-season="${season}"]`);
  if (row) {
    row.classList.add('is-now');
    const th = row.querySelector('th');
    if (!th.querySelector('.sr')) {
      const s = document.createElement('span');
      s.className = 'sr';
      s.textContent = ' (지금)';
      th.append(s);
    }
  }
}
renderToday();

// the evening timeline: each clock stamp also says how far the sun is below the horizon then,
// for the coming Saturday (the evening the timeline follows)
function renderEvening() {
  const now = A.kstParts(Date.now());
  let add = (6 - now.wd + 7) % 7;
  if (add === 0 && now.min > 1280) add = 7;
  const sat = addDays(now, add);
  $('#sat-date').textContent = `${sat.m}월 ${sat.d}일 토요일`;
  document.querySelectorAll('.eve__clock time[data-min]').forEach((t) => {
    const alt = Math.round(A.sunAlt(A.kstInstant(sat.y, sat.m, sat.d, Number(t.dataset.min))));
    const s = t.parentElement.querySelector('.eve__sun') || document.createElement('span');
    s.className = 'eve__sun';
    s.textContent = `해 고도 ${alt > 0 ? '+' : alt < 0 ? '-' : ''}${Math.abs(alt)}°`;
    t.parentElement.append(s);
  });
}
renderEvening();

// ---------------------------------------------------------------- group form (sends nothing)
const form = $('#group-form');
const result = $('#group-result');
let tried = false;
const firstAllowed = () => {
  const p = A.kstParts(Date.now());
  let d = addDays(p, 14);
  while (d.wd < 2 || d.wd > 5) d = addDays(d, 1);
  return d;
};
const iso = (p) => `${p.y}-${pad(p.m)}-${pad(p.d)}`;
$('#date-example').textContent = iso(firstAllowed());

function parseDate(v) {
  const s = v.trim().replace(/[./\s]+/g, '-').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) return { error: `날짜를 ${iso(firstAllowed())}처럼 연-월-일로 적어 주십시오.` };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return { error: '달력에 있는 날짜를 적어 주십시오.' };
  const p = A.kstParts(A.kstInstant(y, mo, d, 720));
  const today = A.kstParts(Date.now());
  const min = firstAllowed();
  if (p.wd < 2 || p.wd > 5) return { error: `${fmtDate(p)}입니다. 단체는 화요일부터 금요일까지 받습니다.` };
  if (dayStart(p) < dayStart(min)) return { error: `2주 뒤부터 받습니다. ${iso(min)} 이후 날짜를 적어 주십시오.` };
  if (dayStart(p) > dayStart(today) + 183 * DAY) return { error: '6개월 안의 날짜만 받습니다.' };
  return { p };
}

function validate() {
  const errors = [];
  const data = new FormData(form);
  const set = (id, msg, field) => {
    const el = $(`#${id}-error`);
    el.hidden = !msg;
    el.textContent = msg || '';
    if (field) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) errors.push(field || form.querySelector(`[name="${id}"]`));
  };
  set('kind', data.get('kind') ? '' : '어떤 단체인지 하나 고르십시오.', null);
  const countEl = $('#count');
  const c = countEl.value.trim();
  const n = Number(c);
  set('count', !c ? '인원을 숫자로 적어 주십시오.'
    : !Number.isInteger(n) || n < 10 || n > 40 ? '10명에서 40명 사이로 적어 주십시오. 40명이 넘으면 두 회차로 나눠 신청하십시오.' : '', countEl);
  const dateEl = $('#date');
  const dv = dateEl.value.trim();
  const parsed = dv ? parseDate(dv) : { error: '오실 날짜를 적어 주십시오.' };
  set('date', parsed.error || '', dateEl);
  set('slot', data.get('slot') ? '' : '첫 회차와 둘째 회차 가운데 하나를 고르십시오.', null);
  return { errors, data, date: parsed.p };
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  tried = true;
  const { errors, data, date } = validate();
  if (errors.length) {
    result.hidden = true;
    errors[0].focus();
    return;
  }
  const slot = data.get('slot');
  const time = sessionsFor(date.m)[slot === '첫 회차' ? 0 : 1];
  const rows = [
    ['단체', data.get('kind')],
    ['인원', `${Number(data.get('count'))}명`],
    ['날짜', fmtDate(date)],
    ['회차', `${slot} ${hhmm(time)}`],
  ];
  const memo = String(data.get('memo') || '').trim();
  if (memo) rows.push(['부탁할 것', memo]);
  const title = document.createElement('p');
  title.className = 'result__title';
  title.textContent = '신청 내용을 확인했습니다.';
  const dl = document.createElement('dl');
  for (const [k, v] of rows) {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    div.append(dt, dd);
    dl.append(div);
  }
  const note = document.createElement('p');
  note.textContent = '가상 천문대라서 이 신청은 어디에도 보내지 않았고 접수되지도 않았습니다.';
  result.replaceChildren(title, dl, note);
  result.hidden = false;
  result.focus();
});
form.addEventListener('change', () => { if (tried) validate(); });
form.addEventListener('input', (e) => { if (tried && e.target.matches('input[type="number"]')) validate(); });

ready = true;
onChange(ps.shown, 'init');
