import { renderFrame, FW, FH } from './frames.js';
import { initTrailer } from './trailer.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 300;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round((w * FH / FW) * dpr);
}

// The hero: frame 33, the window seen from the bus stop. On first view it blinks twice.
function hero() {
  const fig = document.querySelector('[data-hero]');
  if (!fig) return;
  const canvas = fig.querySelector('canvas');
  let lit = 1;
  const draw = () => renderFrame(canvas, 33, { lit, flash: 0, grain: 0.26 });
  fit(canvas);
  if (reduced) {
    draw();
    fig.classList.add('is-lit');
  } else {
    lit = 0;
    draw();
    const steps = [[500, 1], [740, 0], [940, 1], [1180, 0], [1560, 1]];
    steps.forEach(([t, v], i) => setTimeout(() => {
      lit = v;
      draw();
      if (i === steps.length - 1) setTimeout(() => fig.classList.add('is-lit'), 200);
    }, t));
  }
  let w = canvas.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(canvas.clientWidth - w) < 2) return;
    w = canvas.clientWidth;
    fit(canvas);
    draw();
  }).observe(canvas);
}

// Stills in the press note, drawn when they come near the screen.
function stills() {
  const list = document.querySelectorAll('[data-still]');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      fit(e.target);
      renderFrame(e.target, Number(e.target.dataset.still));
    }
  }, { rootMargin: '300px 0px' });
  list.forEach((c) => io.observe(c));
}

async function fonts() {
  if (!document.fonts || !document.fonts.load) return;
  const wait = Promise.all([
    document.fonts.load("400 64px 'Diphylleia'", '점멸 예고편 3안'),
    document.fonts.load("700 19px 'Jeommyeol Sans'", '12월 2일 개봉 소리개고개 PAN 400 SAFETY FILM 0123456789A'),
    document.fonts.load("400 17px 'Jeommyeol Sans'", '컷'),
  ]);
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]);
}

async function start() {
  document.documentElement.classList.add('js');
  hero();
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
  stills();
}

start();
