import { Wind, beaufortName } from './wind.js';
import { Sky } from './sky.js';
import { WindSound } from './sound.js';

// ---- menu (narrow screens)
const btn = document.querySelector('.menu-btn');
const nav = document.getElementById('nav');
if (btn && nav) {
  const close = (focus) => {
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (focus) btn.focus();
  };
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (open) nav.querySelector('a')?.focus();
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) close(true);
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('.top')) close(false);
  });
}

// ---- wind, kites, sound
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
const wind = new Wind(reduce);
const sound = new WindSound();

const nameEl = document.querySelector('[data-wind-name]');
const speedEl = document.querySelector('[data-wind-speed]');
const noteEl = document.querySelector('[data-wind-note]');
const gustBtn = document.querySelector('[data-gust]');
const soundBtn = document.querySelector('[data-sound]');
const soundState = document.querySelector('[data-sound-state]');

const hint = () => (coarse.matches ? '화면을 옆으로 쓸면 돌풍이 붑니다.' : '커서를 휘저으면 돌풍이 붑니다.');
let shown = { name: '', speed: '', note: '' };
let smooth = 3.6;
let lastText = 0;

function readout(ms, now) {
  smooth += (ms - smooth) * 0.08;
  if (now - lastText < 250) return;
  lastText = now;
  const name = beaufortName(smooth);
  const speed = smooth.toFixed(1);
  let note = hint();
  let strong = false;
  if (smooth >= 8) { note = '겨루기라면 잠시 멈출 바람입니다.'; strong = true; }
  else if (smooth >= 5.5) note = '연 날리기 가장 좋은 바람입니다.';
  if (name !== shown.name) nameEl.textContent = name;
  if (speed !== shown.speed) speedEl.textContent = speed;
  if (note !== shown.note) { noteEl.textContent = note; noteEl.classList.toggle('is-strong', strong); }
  shown = { name, speed, note };
}
noteEl.textContent = hint();

const sky = new Sky(wind, (s, running) => {
  const heroOn = s.hero?.visible;
  const anyOn = running && s.scenes.some((x) => x.visible);
  sound.setAudible(anyOn && !document.hidden);
  if (!running) return;
  const ms = heroOn && s.hero.meanSpeed ? s.hero.meanSpeed : 3.6;
  if (heroOn) readout(ms, performance.now());
  sound.update(ms, wind.active);
});

gustBtn.addEventListener('click', () => { wind.sweep(); sky.wake(); });

if (!sound.supported) {
  soundBtn.disabled = true;
  soundState.textContent = '못 냄';
  soundBtn.title = '이 브라우저에서는 소리를 낼 수 없습니다.';
} else {
  soundBtn.addEventListener('click', async () => {
    const on = await sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundState.textContent = on ? '켜짐' : '꺼짐';
    sky.wake();
  });
}

sky.start().catch(() => {
  // no canvas or no images: the page still reads; hide the controls that would do nothing
  document.querySelector('.wind__ctl')?.setAttribute('hidden', '');
});
