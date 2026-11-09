import { initBoard } from './board/board.js';

const board = document.getElementById('board');
if (board) initBoard(board);

/* ---------- next training: Monday or Thursday 20:30, or Saturday league days ---------- */
const DAY = ['일', '월', '화', '수', '목', '금', '토'];
function nextSession(now = new Date()) {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 20, 30);
    if ((d.getDay() === 1 || d.getDay() === 4) && d.getTime() + 2 * 3600e3 > now.getTime()) return d;
  }
  return null;
}
const nextEl = document.querySelector('[data-next]');
const n = nextSession();
if (nextEl && n) {
  const today = new Date();
  const same = n.toDateString() === today.toDateString();
  nextEl.textContent = `${same ? '오늘, ' : ''}${n.getMonth() + 1}월 ${n.getDate()}일 ${DAY[n.getDay()]}요일 저녁 8시 반`;
}

/* ---------- kit number preview ---------- */
const TAKEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 17, 19, 20, 22, 23, 27];
const grid = document.querySelector('[data-numbers]');
const kitNum = document.querySelector('[data-kit-num]');
const kitCap = document.querySelector('[data-kit-cap]');
const takenEl = document.querySelector('[data-taken]');
if (grid && kitNum) {
  for (let i = 1; i <= 30; i++) {
    if (TAKEN.includes(i)) {
      const s = document.createElement('span');
      s.className = 'num is-taken';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = String(i);
      grid.appendChild(s);
    } else {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'num';
      b.dataset.num = i;
      b.setAttribute('aria-pressed', String(i === 12));
      b.setAttribute('aria-label', `${i}번`);
      b.textContent = String(i);
      grid.appendChild(b);
    }
  }
  takenEl.textContent = `이미 주인이 있는 번호: ${TAKEN.join(', ')}. 선이 그어진 번호예요.`;
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-num]');
    if (!b) return;
    for (const x of grid.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
    kitNum.textContent = b.dataset.num;
    kitCap.textContent = b.dataset.num;
  });
}

/* ---------- contact form: sends nothing ---------- */
const form = document.querySelector('[data-form]');
if (form) {
  const name = form.querySelector('#f-name');
  const err = form.querySelector('[data-err]');
  const done = form.querySelector('[data-done]');
  name.addEventListener('input', () => {
    if (name.value.trim()) { err.hidden = true; name.removeAttribute('aria-invalid'); }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = name.value.trim();
    if (!v) {
      err.hidden = false;
      name.setAttribute('aria-invalid', 'true');
      name.focus();
      done.textContent = '';
      return;
    }
    const day = form.querySelector('input[name="day"]:checked').value;
    const when = day === 'mon' ? '월요일' : day === 'thu' ? '목요일' : '편한 날';
    done.textContent = `남겼어요, ${v} 님. ${when} 저녁 8시 반에 2층 코트에서 봐요. 다만 늦깎이 FS는 가상 클럽이라 이 내용은 아무에게도 가지 않았어요.`;
  });
}
