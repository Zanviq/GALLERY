import { initExam } from './exam.js';
import { initFit } from './fit.js';
import { initBench } from './bench.js';

function initIndex() {
  const rail = document.getElementById('rail');
  const toggle = rail.querySelector('.rail__toggle');
  const nav = document.getElementById('chart-index');
  const links = [...nav.querySelectorAll('a')];
  const narrow = window.matchMedia('(max-width: 1023.98px)');

  const setOpen = (open, focusBack) => {
    toggle.setAttribute('aria-expanded', String(open));
    rail.classList.toggle('is-open', open);
    if (open) links[0].focus();
    else if (focusBack) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (ev) => { if (ev.target.closest('a') && narrow.matches) setOpen(false); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && rail.classList.contains('is-open')) setOpen(false, true);
  });
  document.addEventListener('click', (ev) => {
    if (rail.classList.contains('is-open') && !rail.contains(ev.target)) setOpen(false);
  });
  narrow.addEventListener('change', () => setOpen(false));

  // the examiner's pointer: mark the chart line being read
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const mark = (id) => {
    for (const a of links) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.intersectionRect.height : 0);
    let best = null, bestH = 0;
    for (const s of sections) {
      const h = seen.get(s.id) || 0;
      if (h > bestH) { best = s.id; bestH = h; }
    }
    if (best) mark(best);
  }, { rootMargin: '-20% 0px -45% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
  sections.forEach((s) => io.observe(s));
  mark('top');
}

initIndex();
initExam();
initFit();
initBench();
