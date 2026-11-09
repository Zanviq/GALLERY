import { initTrailer } from './trailer.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The poster: on first view the lit window goes dark, then blinks on twice, the way the mother
// signalled every night. Once only, only near the top, never under reduced motion.
function poster() {
  const box = document.querySelector('[data-poster]');
  if (!box || reduced) return;
  const off = box.querySelector('.poster__off');
  const small = window.innerWidth * (window.devicePixelRatio || 1) < 1100;
  off.src = small ? off.dataset.offSmall : off.dataset.off;
  const t0 = performance.now();
  const ready = off.decode ? off.decode() : new Promise((r) => { off.onload = r; });
  ready.then(() => {
    if (performance.now() - t0 > 4000 || window.scrollY > box.offsetHeight / 2 || document.hidden) return;
    const steps = [[0, true], [900, false], [1160, true], [1380, false]];
    steps.forEach(([t, dark]) => setTimeout(() => box.classList.toggle('is-dark', dark), 300 + t));
  }).catch(() => {});
}

async function fonts() {
  if (!document.fonts || !document.fonts.load) return;
  const wait = Promise.all([
    document.fonts.load("400 64px 'Diphylleia'", '점멸 예고편 3안'),
    document.fonts.load("700 19px 'Jeommyeol Sans'", '12월 2일 개봉 PAN 400 SAFETY FILM 0123456789A'),
  ]);
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]);
}

async function start() {
  document.documentElement.classList.add('js');
  poster();
  await fonts();
  const trailer = document.querySelector('[data-trailer]');
  if (trailer && 'IntersectionObserver' in window && 'ResizeObserver' in window) {
    let started = false;
    const io = new IntersectionObserver((entries) => {
      if (started || !entries.some((e) => e.isIntersecting)) return;
      started = true;
      io.disconnect();
      initTrailer(trailer);
    }, { rootMargin: '600px 0px' });
    io.observe(trailer);
  }
}

start();
