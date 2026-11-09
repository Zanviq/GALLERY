import { initBench } from './bench/bench.js';

const bench = document.querySelector('[data-bench]');
const api = bench ? initBench(bench) : null;

// The step menu on narrow screens closes after a choice.
const more = document.querySelector('.nav__more');
if (more) {
  more.addEventListener('click', (ev) => { if (ev.target.closest('a')) more.open = false; });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && more.open) { more.open = false; more.querySelector('summary').focus(); }
  });
  document.addEventListener('click', (ev) => { if (more.open && !more.contains(ev.target)) more.open = false; });
}

// First-visit request. It only writes a slip on this page; nothing is sent anywhere.
const form = document.querySelector('[data-visit]');
if (form) {
  const slip = document.querySelector('[data-slip]');
  const body = document.querySelector('[data-slip-body]');
  const errors = {
    day: '요일을 골라 주십시오.',
    time: '시간을 골라 주십시오.',
  };
  const setError = (name, msg) => {
    const box = form.querySelector(`[data-error="${name}"]`);
    box.textContent = msg || '';
    form.querySelectorAll(`input[name="${name}"]`).forEach((i) => {
      if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
    });
  };
  form.addEventListener('change', (ev) => { if (ev.target.name in errors) setError(ev.target.name, ''); });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = new FormData(form);
    let first = null;
    for (const name of Object.keys(errors)) {
      if (!data.get(name)) { setError(name, errors[name]); first = first || form.querySelector(`input[name="${name}"]`); } else setError(name, '');
    }
    if (first) { first.focus(); return; }
    const what = data.get('what');
    const lines = [`${data.get('day')} ${data.get('time')}, ${what === '수선' ? '수선 상담' : `${what} 첫 방문`}`];
    const m = api && api.state.meas;
    if (data.get('card') && m && what !== '수선') {
      lines.push(`치수 카드: 발 길이 ${Math.round(m.length)}\u00a0mm, 볼 너비 ${Math.round(m.width)}\u00a0mm, 발등 둘레 약 ${Math.round(m.girth)}\u00a0mm`);
      if (m.inRange) lines.push(`추천 골 ${m.lastLen}\u00a0mm, ${m.grade.name} (${m.grade.code})`);
    } else if (data.get('card') && !m && what !== '수선') {
      lines.push('치수 카드: 종이가 비어 있어 적을 숫자가 없습니다.');
    }
    body.textContent = lines.join('\n');
    slip.hidden = false;
    slip.focus();
  });
}
