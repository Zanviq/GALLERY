import { SCENTS, DEFAULT_SCENT, byId, josa } from './scents.js';
import { drawPlate } from './plate.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const capture = params.has('capture') ? (params.get('capture') || 'hero') : null;
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedMQ.matches || params.has('still');
if (reduced) root.classList.add('reduced');

let current = byId(root.dataset.scent || DEFAULT_SCENT);
let hero = null;
let vessel = null;
const NIGHT = { yuwol: '#18200f', jocheong: '#231206', omi: '#240a10', meok: '#101215' };
const COLOR_WORD = { yuwol: '연둣빛', jocheong: '호박색', omi: '석류빛', meok: '먹물처럼 검은' };

/* ------------------------------------------------------------ scent selection */

function heroLabel(s) {
  return `${COLOR_WORD[s.id]} ${josa(s.name, '이/가')} 담긴 유리병이 같은 색 액체 위에 떠 있습니다. 포인터를 움직이면 표면에 물결이 입니다.`;
}

function applyScentToDom(s) {
  root.dataset.scent = s.id;
  $$(`input[name="scent-hero"], input[name="scent-notes"]`).forEach((i) => { i.checked = i.value === s.id; });
  $('[data-scent-line]').textContent = s.line;
  $('[data-gl]').setAttribute('aria-label', heroLabel(s));
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = NIGHT[s.id];
  // stills (no-WebGL, or before the first frame)
  $('[data-still-img]').src = `./img/still-${s.id}.webp`;
  $('[data-still-tall]').srcset = `./img/still-${s.id}-tall.webp`;
  // notes
  $('[data-name-eun]').textContent = josa(s.name, '은/는');
  s.notes.forEach((n, i) => {
    $(`[data-note-items="${i}"]`).textContent = n.items;
    $(`[data-note-when="${i}"]`).textContent = n.when;
    $(`[data-note-text="${i}"]`).textContent = n.text;
  });
  const css = $('.vessel__css');
  const layersEl = $('[data-layers]');
  s.liquid.layers.forEach((c, i) => {
    css.style.setProperty(`--c${i}`, c);
    $(`.layer[data-layer="${i}"]`, layersEl).style.setProperty('--c', c);
  });
  // collection
  $$('.item').forEach((el) => el.classList.toggle('is-current', el.dataset.item === s.id));
  setPreview(s.id);
  // booking: suggest the current scent until the visitor picks for themselves
  if (!bookingTouched) $$('input[name="try"]').forEach((i) => { i.checked = i.value === s.name; });
}

function selectScent(id, { source = 'hero', originUV = null, announce = true } = {}) {
  const s = byId(id);
  if (s.id === current.id) return;
  current = s;
  applyScentToDom(s);
  try { sessionStorage.setItem('damgeum-scent', s.id); } catch (e) { /* private mode */ }
  try { history.replaceState(null, '', `#scent=${s.id}`); } catch (e) { /* file:// */ }
  if (hero) hero.setScent(s.id, { originUV });
  if (vessel) vessel.setScent(s);
  setTimeout(() => plate && plate.redraw(), 950);
  if (announce) $('[data-announce]').textContent = `${josa(s.name, '을/를')} 골랐습니다. ${s.line}`;
  requestAnimationFrame(updateTheme);
}

$('[data-picker]').addEventListener('change', (e) => {
  if (e.target.name === 'scent-hero') selectScent(e.target.value, { source: 'hero' });
});
$('[data-switch]').addEventListener('change', (e) => {
  if (e.target.name === 'scent-notes') selectScent(e.target.value, { source: 'notes' });
});

/* ------------------------------------------------------------ hero (WebGL) */

function webglOk() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const ok = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return ok;
  } catch (e) { return false; }
}

function noGl() {
  root.classList.add('no-gl');
  root.classList.remove('is-gl', 'is-gl-ready');
  root.dataset.heroReady = 'still';
}

const heroSection = $('.hero');
if (!params.has('nogl') && webglOk()) {
  import('./hero.js').then(({ initHero }) => {
    hero = initHero({
      canvas: $('[data-gl]'),
      section: heroSection,
      scentId: current.id,
      reduced,
      capture,
      onReady() {
        // capture hook for stills/tests: ?capture&select=yuwol&at=600
        if (capture && params.get('select')) setTimeout(() => selectScent(params.get('select')), Number(params.get('at') || 600));
        if (capture && params.get('pour')) setTimeout(() => hero.preview(params.get('pour'), Number(params.get('pt') || 0.5)), 50);
        root.classList.add('is-gl');
        setTimeout(() => root.classList.add('is-gl-ready'), capture ? 0 : 700);
        setTimeout(() => { root.dataset.heroReady = '1'; }, capture ? 1200 : 0);
      },
      onFail: noGl,
    });
    if (!hero) noGl();
  }).catch(noGl);
} else {
  noGl();
}

const hint = $('[data-hint]');
let hintGone = false;
try { hintGone = sessionStorage.getItem('damgeum-stirred') === '1'; } catch (e) { /* */ }
if (hintGone) hint.classList.add('is-gone');
heroSection.addEventListener('stir', () => {
  setTimeout(() => hint.classList.add('is-gone'), 1800);
  try { sessionStorage.setItem('damgeum-stirred', '1'); } catch (e) { /* */ }
});

/* ------------------------------------------------------------ top bar + menu */

const bar = $('[data-bar]');
const sections = $$('main > section, .foot');
const navLinks = $$('.bar__nav a');
function updateTheme() {
  const y = 32;
  let theme = 'clear';
  let id = '';
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= y && r.bottom > y) {
      id = s.id;
      if (s.classList.contains('hero')) theme = window.scrollY > 40 && r.bottom < innerHeight * 0.35 ? 'solid' : 'clear';
      else theme = s.dataset.ground === 'paper' ? 'paper' : 'solid';
      break;
    }
  }
  if (bar.dataset.theme !== theme) bar.dataset.theme = theme;
  navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${id}` ? 'true' : 'false'));
}

const menuBtn = $('[data-menu]');
const sheet = $('[data-sheet]');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  sheet.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  // keep screen readers inside the open sheet
  [$('main'), $('.foot')].forEach((el) => { el.inert = open; });
  if (open) { bar.dataset.theme = 'solid'; $('a', sheet).focus(); } else updateTheme();
}
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet.hidden) { setMenu(false); menuBtn.focus(); }
  if (e.key === 'Tab' && !sheet.hidden) {
    const f = [menuBtn, ...$$('a', sheet)];
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});
matchMedia('(min-width: 761px)').addEventListener('change', (m) => { if (m.matches && !sheet.hidden) setMenu(false); });

/* ------------------------------------------------------------ notes (scroll) */

const notesSec = $('[data-notes]');
const layerEls = $$('.layer');
let notesP = -1;
function notesProgress() {
  if (reduced) return 3;
  const r = notesSec.getBoundingClientRect();
  const span = r.height - innerHeight;
  if (span <= 0) return 3;
  return Math.min(1, Math.max(0, -r.top / span)) * 3;
}
function updateNotes() {
  const p = notesProgress();
  if (Math.abs(p - notesP) < 0.001) return;
  notesP = p;
  const active = Math.min(2, Math.floor(p));
  layerEls.forEach((el, i) => {
    el.classList.toggle('is-active', reduced || i === active);
    el.classList.toggle('is-poured', reduced || i < active || (i === active && p - i > 0.75));
  });
  if (vessel) vessel.setProgress(p);
}

if (!reduced && !root.classList.contains('no-gl') && !params.has('nogl')) {
  import('./vessel.js').then(({ createVessel }) => {
    vessel = createVessel($('[data-vessel]'), current, { instant: !!capture });
    if (!vessel) { $('.vessel').classList.add('vessel--css'); root.classList.add('no-gl-vessel'); $('.vessel__css').style.display = 'block'; return; }
    notesP = -1;
    updateNotes();
  }).catch(() => { $('.vessel__css').style.display = 'block'; });
}

/* ------------------------------------------------------------ collection preview */

const preview = $('.preview');
const previewImg = $('[data-preview]');
let previewId = 'jocheong'; // what index.html ships with
function setPreview(id) {
  if (!previewImg || id === previewId) return;
  previewId = id;
  const s = byId(id);
  preview.classList.add('is-swapping');
  const next = `./img/bottle-${id}.webp`;
  const done = () => preview.classList.remove('is-swapping');
  const pre = new Image();
  pre.onload = () => { previewImg.src = next; $('[data-preview-no]').textContent = `No.${s.no}`; $('[data-preview-name]').textContent = s.name; requestAnimationFrame(done); };
  pre.onerror = done;
  pre.src = next;
}
const shelf = $('[data-shelf]');
shelf.addEventListener('pointerover', (e) => { const it = e.target.closest('.item'); if (it) setPreview(it.dataset.item); });
shelf.addEventListener('focusin', (e) => { const it = e.target.closest('.item'); if (it) setPreview(it.dataset.item); });
shelf.addEventListener('pointerleave', () => setPreview(current.id));
shelf.addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto-notes]');
  if (!b) return;
  selectScent(b.dataset.gotoNotes, { source: 'collection' });
  notesSec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  $('#notes-title').setAttribute('tabindex', '-1');
  $('#notes-title').focus({ preventScroll: true });
});

/* ------------------------------------------------------------ atelier plate */

let plate = null;
const plateCanvas = $('[data-plate]');
if (plateCanvas) {
  const io = new IntersectionObserver((en) => {
    if (en[0].isIntersecting) {
      io.disconnect();
      plate = drawPlate(plateCanvas);
    }
  }, { rootMargin: '400px 0px' });
  io.observe(plateCanvas);
}

/* ------------------------------------------------------------ finder */

const finder = $('[data-finder]');
const steps = $$('.q', finder);
const nextBtn = $('[data-next]', finder);
const backBtn = $('[data-back]', finder);
const result = $('[data-result]');
let stepI = 0;
function showStep(i, focus = true) {
  stepI = i;
  steps.forEach((f, k) => { f.hidden = k !== i; });
  $('[data-progress-n]').textContent = String(i + 1);
  $('.finder__progress').style.setProperty('--p', `${((i + 1) / 3) * 100}%`);
  backBtn.hidden = i === 0;
  nextBtn.textContent = i === 2 ? '추천 보기' : '다음 질문';
  nextBtn.disabled = !$('input:checked', steps[i]);
  if (focus) $('legend', steps[i]).focus();
}
finder.addEventListener('change', () => { nextBtn.disabled = !$('input:checked', steps[stepI]); });
backBtn.addEventListener('click', () => showStep(Math.max(0, stepI - 1)));
finder.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('input:checked', steps[stepI])) return;
  if (stepI < 2) { showStep(stepI + 1); return; }
  const answers = steps.map((f) => $('input:checked', f));
  const votes = {};
  answers.forEach((a) => { votes[a.value] = (votes[a.value] || 0) + 1; });
  const top = Math.max(...Object.values(votes));
  const tied = answers.map((a) => a.value).filter((v, i, arr) => votes[v] === top && arr.indexOf(v) === i);
  const winner = byId(tied[0]);
  const name = winner.name;
  $('[data-result-title]').textContent = `${josa(name, '이/가')} 맞겠습니다`;
  const why = top === 3 ? `세 답이 모두 ${name} 쪽이었습니다.`
    : top === 2 ? `세 답 가운데 둘이 ${name} 쪽이었습니다.`
    : `답이 고르게 나뉘어서, 첫 답 ‘${answers[0].nextElementSibling.textContent}’에 가장 가까운 향을 골랐습니다.`;
  $('[data-result-why]').textContent = why;
  $('[data-result-line]').textContent = winner.line;
  const go = $('[data-result-go]');
  go.textContent = `${josa(name, '으로/로')} 바꿔 보기`;
  go.dataset.scent = winner.id;
  finder.hidden = true;
  result.hidden = false;
  $('[data-result-title]').focus();
});
$('[data-result-go]').addEventListener('click', (e) => {
  const id = e.currentTarget.dataset.scent;
  selectScent(id, { source: 'finder' });
  $('#top').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  const radio = $(`input[name="scent-hero"][value="${id}"]`);
  setTimeout(() => radio.focus({ preventScroll: true }), reduced ? 0 : 500);
});
$('[data-result-reset]').addEventListener('click', () => {
  finder.reset();
  result.hidden = true;
  finder.hidden = false;
  showStep(0);
});
showStep(0, false);

/* ------------------------------------------------------------ booking */

let bookingTouched = false;
const book = $('[data-book]');
const daysEl = $('[data-days]');
const timesEl = $('[data-times]');
const errEl = $('[data-book-error]');
const done = $('[data-book-done]');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const listKo = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -2).map((x) => `${x}, `).join('')}${josa(a[a.length - 2], '과/와')} ${a[a.length - 1]}`);
const TIMES = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
function openDays(n) {
  const out = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w >= 2 && w <= 6) out.push(new Date(d));
  }
  return out;
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const days = openDays(8);
daysEl.innerHTML = days.map((d) => `<label class="chip"><input type="radio" name="day" value="${iso(d)}"><span>${d.getMonth() + 1}월 ${d.getDate()}일<small>${WD[d.getDay()]}요일</small></span></label>`).join('');
function isFull(dayIso, t) {
  let h = 0;
  for (const ch of dayIso + t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 7 === 0 || h % 11 === 0;
}
function renderTimes() {
  const day = $('input[name="day"]:checked', book);
  const keep = $('input[name="time"]:checked', book);
  const keepV = keep && keep.value;
  timesEl.innerHTML = TIMES.map((t) => {
    const full = day && isFull(day.value, t);
    const [hh] = t.split(':').map(Number);
    const label = hh < 12 ? `오전 ${hh}시` : hh === 12 ? '낮 12시' : `오후 ${hh - 12}시`;
    return `<label class="chip"><input type="radio" name="time" value="${t}" ${full ? 'disabled' : ''} ${!full && keepV === t ? 'checked' : ''}><span>${label}${full ? '<small>마감</small>' : ''}</span></label>`;
  }).join('');
}
renderTimes();
book.addEventListener('change', (e) => {
  if (e.target.name === 'day') renderTimes();
  if (e.target.name === 'try') bookingTouched = true;
  const g = e.target.closest('.book__group');
  if (g) g.classList.remove('is-missing');
  if (!$('.book__group.is-missing', book)) errEl.hidden = true;
});
book.addEventListener('submit', (e) => {
  e.preventDefault();
  const day = $('input[name="day"]:checked', book);
  const time = $('input[name="time"]:checked', book);
  $$('.book__group', book).forEach((g) => g.classList.remove('is-missing'));
  if (!day || !time) {
    const missing = [];
    if (!day) { missing.push('날짜'); $('[data-group="day"]').classList.add('is-missing'); }
    if (!time) { missing.push('시간'); $('[data-group="time"]').classList.add('is-missing'); }
    errEl.textContent = `${josa(missing.join('와 '), '을/를')} 골라 주세요.`;
    errEl.hidden = false;
    const first = !day ? $('input[name="day"]', book) : $('input[name="time"]:not(:disabled)', book);
    first && first.focus();
    return;
  }
  const d = days.find((x) => iso(x) === day.value);
  const [hh, mm] = time.value.split(':').map(Number);
  const when = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일 ${hh === 12 ? '낮 12시' : `오후 ${hh - 12}시`}${mm ? ' 30분' : ''}`;
  const people = $('input[name="people"]:checked', book).value;
  const tries = $$('input[name="try"]:checked', book).map((i) => i.value);
  $('[data-done-when]').textContent = `${when}, ${people}명`;
  const tryEl = $('[data-done-try]');
  tryEl.hidden = !tries.length;
  if (tries.length) tryEl.textContent = `${josa(listKo(tries), '을/를')} 먼저 꺼내 두겠습니다.`;
  book.hidden = true;
  done.hidden = false;
  $('[data-done-title]').focus();
});
$('[data-book-again]').addEventListener('click', () => {
  done.hidden = true;
  book.hidden = false;
  const t = $('input[name="time"]:checked', book) || $('input[name="day"]:checked', book);
  (t || $('input[name="day"]', book)).focus();
});

/* ------------------------------------------------------------ scroll + init */

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; updateTheme(); updateNotes(); });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll, { passive: true });
reducedMQ.addEventListener('change', () => location.reload());
// a shared link opened in a tab that already shows the page: follow #scent=
addEventListener('hashchange', () => {
  const m = /scent=([a-z]+)/.exec(location.hash);
  if (m && SCENTS.some((s) => s.id === m[1])) selectScent(m[1], { source: 'link' });
});

applyScentToDom(current);
updateTheme();
updateNotes();
// capture hook: ?capture&y=1200 scrolls before the shot
if (capture && params.get('y')) { root.style.scrollBehavior = 'auto'; scrollTo(0, Number(params.get('y'))); updateTheme(); updateNotes(); root.dataset.sy = String(scrollY); }
