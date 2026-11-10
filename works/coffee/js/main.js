// Page glue: phone menu, today's mark on the roasting calendar, the grind number in the subscription.
import './grinder.js';

// phone menu: close after a jump or on Escape
const menu = document.querySelector('.nav__menu');
if (menu) {
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.open = false; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
}

// roasting calendar: mark today while the page's month (November 2026) is the real month
const cal = document.querySelector('.cal');
if (cal) {
  const now = new Date();
  if (now.getFullYear() === 2026 && now.getMonth() === 10) {
    const cell = cal.querySelector(`[data-day="${now.getDate()}"]`);
    if (cell) {
      cell.classList.add('d--today');
      const sr = document.createElement('span');
      sr.className = 'sr';
      sr.textContent = '오늘';
      cell.append(sr);
      const key = document.createElement('li');
      key.innerHTML = '<i class="k k--today" aria-hidden="true"></i>오늘';
      cal.querySelector('.cal__key').append(key);
    }
  }
  // the today dot breathes only while the calendar is on screen
  new IntersectionObserver(([en]) => cal.classList.toggle('is-live', en.isIntersecting)).observe(cal);
}

// subscription: echo the grind the visitor chose on the dial
const subsGrind = document.getElementById('subs-grind');
document.addEventListener('grind:change', (e) => {
  if (!subsGrind) return;
  const { g, name } = e.detail;
  subsGrind.innerHTML = `지금 고른 눈금은 <b class="num">${g}</b>, ${name}입니다.`;
});
