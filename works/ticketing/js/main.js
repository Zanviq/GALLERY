// Page: concert picker, event details, records, sound switch. The run itself lives in game.js.
import { CONCERTS, GRADES, ADDRESS_NOTE, RANKS, tidy } from './data.js';
import { Venue, Overview } from './venue.js';
import { Game } from './game.js';
import { setSound, soundOn, unlock } from './sound.js';

const KEY = 'gwangkeul:v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode: play on without records */ }
}
const store = load();
if (!store.best || typeof store.best !== 'object') store.best = {};
setSound(store.sound !== false);

const $ = (s) => document.querySelector(s);
const won = (n) => n.toLocaleString('ko-KR') + '원';
// records come back from localStorage, so treat them as text
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const byId = (id) => CONCERTS.find((c) => c.id === id) || CONCERTS[1];
let current = byId(store.sel || 'idol');

// ---------- sound switches ----------
const toggles = document.querySelectorAll('.sound-toggle');
function paintSound() {
  toggles.forEach((b) => {
    b.setAttribute('aria-pressed', String(soundOn()));
    b.querySelector('span').textContent = soundOn() ? '소리 켬' : '소리 끔';
  });
}
toggles.forEach((b) => b.addEventListener('click', () => {
  setSound(!soundOn());
  store.sound = soundOn();
  save();
  if (soundOn()) unlock();
  paintSound();
}));
paintSound();

// ---------- concert picker and event page ----------
const heroImg = $('#hero-img');
const evImg = $('#ev-img');
function srcset(c) { return `./img/${c.img}-700.webp 700w, ./img/${c.img}-1200.webp 1200w`; }

function render(c) {
  current = c;
  document.documentElement.dataset.show = c.id;
  for (const img of [heroImg, evImg]) {
    img.src = `./img/${c.img}-1200.webp`;
    img.srcset = srcset(c);
    img.alt = c.alt;
  }
  heroImg.style.setProperty('--pos', c.pos.hero);
  heroImg.style.setProperty('--pos-band', c.pos.band);
  evImg.style.transformOrigin = c.pos.event;
  $('#ev-kind').textContent = c.kind;
  $('#ev-title').textContent = tidy(c.name);
  $('#ev-blurb').textContent = c.blurb;
  $('#ev-date').textContent = tidy(c.date);
  $('#ev-venue').textContent = c.venue;
  $('#ev-addr').textContent = c.address;
  $('#ev-run').textContent = c.runtime;
  $('#ev-age').textContent = c.age;
  $('#ev-hall').textContent = c.hall;
  $('#ev-prices').innerHTML = GRADES.map((g) => `
    <tr>
      <th scope="row"><span class="sw sw--${g}" aria-hidden="true"></span><span class="num">${g}</span>석</th>
      <td>${c.where[g]}</td>
      <td class="r num-ko">${won(c.prices[g])}</td>
      <td class="r num-ko">${Math.round(c.odds[g] * 100)}%</td>
    </tr>`).join('');
  $('#ev-seat-time').textContent = c.seatTime;
  $('#ev-pay-time').textContent = c.payTime;
  $('#ev-applicants').textContent = c.applicants.toLocaleString('ko-KR');
  drawPreview();
  paintRecords();
}

document.querySelectorAll('input[name="show"]').forEach((r) => {
  r.checked = r.value === current.id;
  r.addEventListener('change', () => {
    if (!r.checked) return;
    store.sel = r.value;
    save();
    render(byId(r.value));
  });
});

let preview = null;
function drawPreview() {
  const cv = $('#ev-map');
  preview = new Overview(cv, new Venue(current.layout), { labels: true, pad: 8 });
  preview.draw();
}
let rz = 0;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => { if (preview) { preview.fit(); preview.draw(); } }, 120);
});

// ---------- records ----------
function paintRecords() {
  const body = $('#rec-body');
  body.innerHTML = CONCERTS.map((c) => {
    const b = store.best[c.id];
    const cur = c.id === current.id ? ' aria-current="true"' : '';
    return `<tr${cur}>
      <th scope="row">${tidy(c.short)}<span class="lvl">${c.levelName}</span></th>
      <td>${b ? esc(b.title) : '아직 없음'}</td>
      <td>${b && b.seat ? esc(b.seat) : '—'}</td>
      <td class="r">${b && b.score > 0 && Number.isFinite(b.total) ? b.total.toFixed(1) + '초' : '—'}</td>
    </tr>`;
  }).join('');
}

function better(a, b) {
  if (!b) return true;
  if (a.score !== b.score) return a.score > b.score;
  return a.score > 0 && a.total < b.total;
}

// ---------- the game ----------
const page = [$('.site-bar'), $('#main'), $('.foot')];
const game = new Game({
  soundOn,
  onStart() { page.forEach((el) => el.setAttribute('inert', '')); },
  onExit(toPicker) {
    page.forEach((el) => el.removeAttribute('inert'));
    window.scrollTo(0, 0);
    const target = toPicker ? document.querySelector('input[name="show"]:checked') : $('#start');
    target && target.focus({ preventScroll: true });
  },
  onResult(c, rec) {
    const prev = store.best[c.id];
    const isBest = better(rec, prev);
    if (isBest) { store.best[c.id] = rec; save(); }
    paintRecords();
    if (isBest && prev) return '이 공연 새 최고 기록입니다.';
    if (isBest) return '이 공연 첫 기록입니다.';
    return `이 공연 최고 기록: ${prev.title}${prev.score > 0 ? `, ${prev.total.toFixed(1)}초` : ''}`;
  },
});

$('#start').addEventListener('click', () => {
  if (soundOn()) unlock();
  game.start(current);
});

if (/[?&]test\b/.test(location.search)) window.__gk = { game, CONCERTS, RANKS };

document.fonts.ready.then(() => render(current));
render(current);
document.documentElement.classList.add('js');
document.querySelectorAll('[data-address-note]').forEach((el) => { el.textContent = ADDRESS_NOTE; });
