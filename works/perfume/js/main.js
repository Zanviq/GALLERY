// 담금: the visit booking (nothing is sent or stored). The rest of the page is static.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const book = $('[data-book]');
const daysEl = $('[data-days]');
const timesEl = $('[data-times]');
const errEl = $('[data-book-error]');
const done = $('[data-book-done]');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const TIMES = ['12:00', '13:30', '15:00', '16:30', '18:00'];

// next open days: Tuesday to Saturday
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
const timeLabel = (t) => {
  const [hh, mm] = t.split(':').map(Number);
  return `${hh === 12 ? '낮 12시' : `오후 ${hh - 12}시`}${mm ? ' 30분' : ''}`;
};
// a few slots look taken, the same ones on every visit for a given day
function isFull(dayIso, t) {
  let h = 0;
  for (const ch of dayIso + t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 7 === 0 || h % 11 === 0;
}

const days = openDays(5);
daysEl.innerHTML = days.map((d) => `<label class="chip"><input type="radio" name="day" value="${iso(d)}"><span>${d.getMonth() + 1}월 ${d.getDate()}일<small>${WD[d.getDay()]}요일</small></span></label>`).join('');

function renderTimes() {
  const day = $('input[name="day"]:checked', book);
  const keep = $('input[name="time"]:checked', book);
  const keepV = keep && keep.value;
  timesEl.innerHTML = TIMES.map((t) => {
    const full = day && isFull(day.value, t);
    return `<label class="chip"><input type="radio" name="time" value="${t}"${full ? ' disabled' : ''}${!full && keepV === t ? ' checked' : ''}><span>${timeLabel(t)}${full ? '<small>마감</small>' : ''}</span></label>`;
  }).join('');
}
renderTimes();

book.addEventListener('change', (e) => {
  if (e.target.name === 'day') renderTimes();
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
    if (!day) $('[data-group="day"]').classList.add('is-missing');
    if (!time) $('[data-group="time"]').classList.add('is-missing');
    errEl.textContent = !day && !time ? '날짜와 시간을 골라 주세요.' : !day ? '날짜를 골라 주세요.' : '시간을 골라 주세요.';
    errEl.hidden = false;
    const first = !day ? $('input[name="day"]', book) : $('input[name="time"]:not(:disabled)', book);
    if (first) first.focus();
    return;
  }
  const d = days.find((x) => iso(x) === day.value);
  const people = $('input[name="people"]:checked', book).value;
  $('[data-done-when]').textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일 ${timeLabel(time.value)}, ${people}명`;
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
