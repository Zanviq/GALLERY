// 너울 2027 — boot. One shared "day" drives the poster, the timetable, the tickets and the sound.
import { FESTIVAL } from './data.js';
import { KineticPoster } from './kinetic.js';
import { Sea } from './sea.js';
import { Band } from './audio.js';
import { Dock } from './dock.js';
import { Timetable } from './timetable.js';
import { Tickets } from './tickets.js';

const root = document.documentElement;
const body = document.body;
const params = new URLSearchParams(location.search);
const capture = params.has('capture');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (capture) root.classList.add('capture');
if (params.get('capture') === 'og') root.classList.add('capture-og');
// Reduced motion means calmer, not still (BRIEF §000): everything below keeps moving under it,
// except smooth scrolling (site.css) and the lineup's scroll-speed skew (kinetic.js).
if (reduced) root.classList.add('rm');

// ---------- small helpers ----------
const store = {
  get(key, fallback) {
    try {
      const v = window.localStorage.getItem('neoul27:' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { window.localStorage.setItem('neoul27:' + key, JSON.stringify(value)); } catch (e) { /* storage off: keep it in memory */ }
  },
};
const live = document.querySelector('[data-live]');
let liveTimer = 0;
function announce(msg) {
  clearTimeout(liveTimer);
  live.textContent = '';
  liveTimer = setTimeout(() => { live.textContent = msg; }, 60);
}
const DAYS = Object.fromEntries(FESTIVAL.days.map((d) => [d.id, d]));
const COLORS = { fri: '#EE4A26', sat: '#2741D6', sun: '#F4B71C' };

// ---------- state ----------
let day = DAYS[params.get('day')] ? params.get('day') : capture ? 'fri' : store.get('day', 'fri');
if (!DAYS[day]) day = 'fri';
const getDay = () => day;

const hero = document.querySelector('.hero');
const typeEl = document.querySelector('.poster__type');
const wipe = document.querySelector('.hero__wipe');
const markEl = document.querySelector('.mast__ko');
const band = new Band();

let heroVisible = true;
if ('IntersectionObserver' in window) {
  new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; }).observe(hero);
}

// ---------- the poster ----------
let markW = 900;
const poster = new KineticPoster(typeEl, {
  data: FESTIVAL,
  reduced,
  band,
  onMark(kick) {
    const target = band.playing ? 640 + 260 * kick : 900;
    markW += (target - markW) * 0.35;
    markEl.style.setProperty('--mark-w', markW.toFixed(0));
  },
});
const seaRegion = document.querySelector('.hero__sea');
const sea = new Sea(document.querySelector('.hero__bg'), hero, seaRegion, { band, reduced });

function paintFacts(d) {
  const info = DAYS[d];
  document.querySelector('[data-fact="gates"]').textContent = info.gates;
  document.querySelector('[data-fact="hours"]').textContent = info.hours;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLORS[d]);
}

function applyDayTokens(d) {
  root.dataset.day = d;
  paintFacts(d);
  sea.setDay(d, DAYS[d].seed);
}

// ---------- tabs (hero + timetable share the day) ----------
const tablists = [...document.querySelectorAll('[role="tablist"][data-days]')];
function syncTabs() {
  tablists.forEach((list) => {
    list.querySelectorAll('[role="tab"]').forEach((t) => {
      const on = t.dataset.day === day;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
  });
  document.getElementById('lineup-panel').setAttribute('aria-labelledby', 'tab-' + day);
}
tablists.forEach((list) => {
  list.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) setDay(t.dataset.day);
  });
  list.addEventListener('keydown', (e) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const i = tabs.findIndex((t) => t.dataset.day === day);
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + tabs.length - 1) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    if (j < 0) return;
    e.preventDefault();
    setDay(tabs[j].dataset.day);
    tabs[j].focus();
  });
});

let wipeAnim = null;
let wipeTimer = 0;
function setDay(next) {
  if (!DAYS[next] || next === day) return;
  day = next;
  store.set('day', day);
  syncTabs();
  const info = DAYS[day];
  const count = FESTIVAL.acts.filter((a) => a.day === day).length;
  announce(`${info.md.replace('.', '월 ')}일 ${info.dowLong} 라인업, ${count}팀.`);
  timetable && timetable.render();
  tickets && tickets.syncDay(day);
  dock && dock.dayChanged();

  // reduced motion keeps the wipe (a colour edge, not a moving object); only scroll-linked motion is dropped
  const animate = heroVisible && typeof wipe.animate === 'function';
  if (!animate) {
    if (wipeAnim) { wipeAnim.cancel(); wipeAnim = null; }
    applyDayTokens(day);
    poster.setDay(day, false);
    return;
  }
  if (wipeAnim) wipeAnim.cancel();
  const target = day;
  wipe.style.setProperty('--wipe', COLORS[target]);
  wipeAnim = wipe.animate(
    [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
    { duration: 460, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' },
  );
  const finish = () => {
    clearTimeout(wipeTimer);
    if (day !== target || root.dataset.day === target) return;
    applyDayTokens(target);
    if (wipeAnim) { wipeAnim.cancel(); wipeAnim = null; }
  };
  wipeAnim.onfinish = finish;
  // background tabs may not tick animations; never leave the page half-coloured
  clearTimeout(wipeTimer);
  wipeTimer = setTimeout(finish, 560);
  poster.setDay(target, true);
}

// ---------- menu (narrow screens) ----------
const menu = document.getElementById('menu');
const menuBtn = document.querySelector('.top__menu');
function openMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  body.style.overflow = open ? 'hidden' : '';
  if (open) menu.querySelector('.menu__close').focus();
  else menuBtn.focus();
}
menuBtn.addEventListener('click', () => openMenu(true));
menu.querySelector('.menu__close').addEventListener('click', () => openMenu(false));
menu.addEventListener('click', (e) => {
  if (e.target.closest('a')) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); body.style.overflow = ''; }
});
menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { openMenu(false); return; }
  if (e.key !== 'Tab') return;
  const f = [...menu.querySelectorAll('a, button')];
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// ---------- map ----------
function drawPans() {
  const g = document.querySelector('.map__pans');
  if (!g) return;
  const ns = 'http://www.w3.org/2000/svg';
  const cols = 6, rows = 3, x0 = 340, y0 = 410, w = 44, h = 30, gap = 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 2 && c > 3) continue;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x0 + c * (w + gap));
      rect.setAttribute('y', y0 + r * (h + gap));
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      g.appendChild(rect);
    }
  }
}
function routeReveal() {
  const m = document.querySelector('.map__mask-path');
  if (!m || !('IntersectionObserver' in window)) { if (m) m.style.strokeDashoffset = '0'; return; }
  m.style.strokeDashoffset = '1';
  const io = new IntersectionObserver((e) => {
    if (!e[0].isIntersecting) return;
    io.disconnect();
    m.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: reduced ? 900 : 1200, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  }, { threshold: 0.4 });
  io.observe(m.closest('svg'));
}

// ---------- boot ----------
let timetable = null, tickets = null, dock = null;

async function fontsReady() {
  if (!document.fonts || !document.fonts.load) return;
  const loads = [
    document.fonts.load('700 100px Anybody'),
    document.fonts.load('900 100px Hahmlet', '너울고무장화'),
  ];
  // Sunday's italic is only fetched when Sunday is on screen
  if (day === 'sun') loads.push(document.fonts.load('italic 540 100px Anybody'));
  await Promise.race([Promise.all(loads).catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
}

async function boot() {
  syncTabs();
  applyDayTokens(day);
  timetable = new Timetable(document.getElementById('timetable'), { data: FESTIVAL, store, getDay, announce });
  tickets = new Tickets(document.querySelector('[data-tickets]'), { store, getDay, announce });
  tickets.syncDay(day);
  dock = new Dock(document.querySelector('.dock'), { band, reduced, getDay, announce, onState: (on) => { if (on) { sea.wake(); poster.wake(); } } });
  drawPans();
  routeReveal();

  await fontsReady();
  poster.setDay(day, false);
  sea.resize();
  root.classList.add('is-ready');

  if (capture && !reduced) {
    // a held moment for the gallery thumbnail: a hand resting on the headliner
    const r = typeEl.getBoundingClientRect();
    poster.pointer.x = r.left + r.width * 0.58;
    poster.pointer.y = r.top + 40;
    poster.pointer.active = true;
    poster.wake();
  }

  let lastW = typeEl.clientWidth;
  let t = 0;
  const onResize = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const w = typeEl.clientWidth;
      if (w !== lastW) { lastW = w; poster.relayout(); }
      sea.resize();
    }, 140);
  };
  window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', () => { poster.relayout(); sea.resize(); });
  }
}

boot();
if (params.has('debug')) window.__neoul = { poster: () => poster, band, sea, setDay };
