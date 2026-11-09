/* 늦깎이 FS: the next training date, the small-screen menu, and a contact form that sends nothing. */

/* ---------- next training: Monday or Thursday 20:30 ---------- */
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
  const same = n.toDateString() === new Date().toDateString();
  nextEl.textContent = `${same ? '오늘, ' : ''}${n.getMonth() + 1}월 ${n.getDate()}일 ${DAY[n.getDay()]}요일 저녁 8시 반`;
}

/* ---------- small-screen menu (a <details>): close on a link, on Escape, on a click outside ---------- */
const menu = document.querySelector('[data-menu]');
if (menu) {
  const close = (focus) => {
    if (!menu.open) return;
    menu.open = false;
    if (focus) menu.querySelector('summary').focus();
  };
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(true); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(false); });
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
