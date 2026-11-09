import { CABINS, TRAINS, isPeak, nights, dateKey, shortDate, dow, longDate, won, left } from './data.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const NIGHTS = nights(14);
const byKey = new Map(NIGHTS.map((d) => [dateKey(d), d]));
const state = { night: dateKey(NIGHTS[0]), dir: 'all' };

/* ---------- menu (narrow screens) ---------- */
const menuBtn = $('.top__menu');
const nav = $('#nav');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
}
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
});

/* ---------- timetable ---------- */
const unit = (cabin) => (cabin.id === 'couchette' ? '자리' : '실');
const leftText = (n, cabin) => (n === 0 ? '매진' : `${n}${unit(cabin)}`);
const durWords = (dur) => { const [h, m] = dur.split(':').map(Number); return m ? `${h}시간 ${m}분` : `${h}시간`; };

function renderDates() {
  const list = $('[data-date-list]');
  list.innerHTML = NIGHTS.slice(0, 7).map((d, i) => {
    const note = i === 0 ? `${dow(d)}, 오늘` : isPeak(d) ? `${dow(d)}, 주말 요금` : dow(d);
    return `<label class="date"><input type="radio" name="night" value="${dateKey(d)}"${i === 0 ? ' checked' : ''} aria-label="${longDate(d)} 밤${i === 0 ? ', 오늘' : ''}${isPeak(d) ? ', 주말 요금' : ''}"><span>${shortDate(d)}<small>${note}</small></span></label>`;
  }).join('');
  list.addEventListener('change', (e) => {
    if (e.target.name !== 'night') return;
    state.night = e.target.value;
    renderTable();
  });
}

function renderTable() {
  const d = byKey.get(state.night);
  const peak = isPeak(d);
  const trains = TRAINS.filter((t) => state.dir === 'all' || t.dir === state.dir);
  $('[data-tt-caption]').textContent = `${longDate(d)} 밤 출발 시각표${peak ? ', 주말 요금' : ''}`;
  $('[data-tt-body]').innerHTML = trains.map((t) => CABINS.map((c, i) => {
    const n = left(d, t, c);
    const price = won(c.price[peak ? 'peak' : 'week']);
    const route = `${t.from} → ${t.to}`;
    const first = i === 0;
    const same = (v) => `<span class="ditto" aria-hidden="true">〃</span><span class="sr-only">${v}</span>`;
    return `<tr class="${first ? 'is-first' : ''}${n === 0 ? ' is-sold' : ''}">`
      + (first
        ? `<th scope="row" class="c-train"><span class="t-no">${t.name}</span><span class="t-route">${route}</span><span class="t-times-m" aria-hidden="true">${t.dep} → ${t.arr}<small>${durWords(t.dur)}</small></span></th>`
        : `<th scope="row" class="c-train"><span class="sr-only">${t.name} ${route}</span></th>`)
      + `<td class="c-dep">${first ? t.dep : same(t.dep)}</td>`
      + `<td class="c-arr">${first ? t.arr : same(t.arr)}</td>`
      + `<td class="c-dur">${first ? `<span aria-hidden="true">${t.dur}</span><span class="sr-only">${durWords(t.dur)}</span>` : same(durWords(t.dur))}</td>`
      + `<td class="c-cabin">${c.name}</td>`
      + `<td class="c-price">${price}<span class="sr-only">원, ${c.unit}</span></td>`
      + `<td class="c-left">${leftText(n, c)}</td>`
      + `<td class="c-act">${n === 0 ? '' : `<a class="pick" href="#book" data-train="${t.id}" data-cabin="${c.id}">고르기<span class="sr-only">: ${t.name} ${c.name}</span></a>`}</td>`
      + '</tr>';
  }).join('')).join('');
}

$('[data-dir]').addEventListener('change', (e) => {
  if (e.target.name !== 'dir') return;
  state.dir = e.target.value;
  renderTable();
});

$('[data-tt-body]').addEventListener('click', (e) => {
  const a = e.target.closest('.pick');
  if (!a) return;
  setBooking({ night: state.night, train: a.dataset.train, cabin: a.dataset.cabin });
});

/* ---------- booking (demo: nothing is sent) ---------- */
const form = $('[data-book]');
const dateSel = $('[data-book-date]');
const paxOut = $('[data-pax-out]');
const status = $('[data-book-status]');
let pax = 1;

dateSel.innerHTML = NIGHTS.map((d, i) => `<option value="${dateKey(d)}">${longDate(d)} 밤${i === 0 ? ' (오늘)' : ''}${isPeak(d) ? ', 주말 요금' : ''}</option>`).join('');

const val = (name) => form.elements[name].value;
const cabinOf = (id) => CABINS.find((c) => c.id === id);
const trainOf = (id) => TRAINS.find((t) => t.id === id);

function setBooking({ night, train, cabin }) {
  if (night) dateSel.value = night;
  if (train) form.elements.train.value = train;
  if (cabin) form.elements.cabin.value = cabin;
  updateBooking();
}

function updateBooking() {
  const d = byKey.get(dateSel.value);
  const t = trainOf(val('train'));
  const c = cabinOf(val('cabin'));
  const peak = isPeak(d);
  const n = left(d, t, c);
  const max = c.id === 'couchette' ? Math.max(1, Math.min(c.max, n)) : c.max;
  pax = Math.min(Math.max(pax, 1), max);
  paxOut.textContent = `${pax}명`;
  $('[data-pax="-1"]').disabled = pax <= 1;
  $('[data-pax="1"]').disabled = pax >= max;
  $('[data-pax-help]').textContent = c.id === 'single' ? '1인실은 한 명이 씁니다.'
    : c.id === 'double' ? '2인실은 두 명까지 씁니다. 혼자 써도 값은 같습니다.'
      : '4인 침대칸은 한 사람에 한 자리씩, 네 자리까지 함께 고를 수 있습니다.';

  for (const cab of CABINS) $(`[data-cabin-price="${cab.id}"]`).textContent = `${won(cab.price[peak ? 'peak' : 'week'])}원`;

  const each = c.price[peak ? 'peak' : 'week'];
  const count = c.id === 'couchette' ? pax : 1;
  const next = new Date(d); next.setDate(d.getDate() + 1);
  $('[data-sum-date]').textContent = `${longDate(d)} 밤`;
  $('[data-sum-from]').textContent = t.from;
  $('[data-sum-dep]').textContent = t.dep;
  $('[data-sum-to]').textContent = t.to;
  $('[data-sum-arr]').textContent = t.arr;
  $('[data-sum-what]').textContent = c.id === 'couchette' ? `${c.name} ${pax}자리, ${pax}명, ${next.getMonth() + 1}월 ${next.getDate()}일 아침 도착`
    : `${c.name} 한 칸, ${pax}명, ${next.getMonth() + 1}월 ${next.getDate()}일 아침 도착`;
  $('[data-sum-total]').textContent = won(each * count);
  const sold = n === 0 || (c.id === 'couchette' && n < pax);
  $('[data-sum-left]').textContent = n === 0 ? '이 날은 매진입니다. 다른 날이나 객실을 골라 주세요.' : `이 날 남은 자리 ${leftText(n, c)} (예시)`;
  form.querySelector('[type="submit"]').disabled = sold;
  status.textContent = '';
}

form.addEventListener('change', updateBooking);
form.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pax]');
  if (!b) return;
  pax += Number(b.dataset.pax);
  updateBooking();
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = byKey.get(dateSel.value);
  const t = trainOf(val('train'));
  const c = cabinOf(val('cabin'));
  status.textContent = `데모라서 예약은 만들어지지 않았습니다. ${longDate(d)} 밤 ${t.name} ${c.name}, ${$('[data-sum-total]').textContent}원을 고르셨고, 이 내용은 어디에도 보내지 않았습니다.`;
});

renderDates();
renderTable();
updateBooking();
