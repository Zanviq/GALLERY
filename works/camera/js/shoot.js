// "눌러 보세요": press the shutter, the flash fires, a print comes out of the slot and develops.
// The sequence also runs under prefers-reduced-motion, only calmer (softer flash, slower and
// straight ejection, fades instead of slides). See design/works/camera/INTERACTION.md.
import * as sound from './sound.js';

const PRINTS = {
  rooftop: { cap: '옥상, 수박 식히는 중', alt: '초록 칠을 한 옥상 바닥 위 파란 대야에 물이 차 있고, 반 자른 수박이 떠 있다. 옆에 감아 둔 호스.' },
  cake: { cap: '생일, 플래시', alt: '밤 부엌 식탁 위 딸기 생크림 케이크에 초 하나가 켜져 있다. 플래시로 찍어 뒤는 어둡다.' },
  lighthouse: { cap: '방파제 끝 빨간 등대', alt: '테트라포드가 늘어선 긴 방파제 끝에 빨간 등대, 잔잔한 파란 바다.' },
  gate: { cap: '파란 대문 앞 고추 모종', alt: '하얗게 칠한 골목 담에 하늘색 철문, 그 앞 스티로폼 상자에 고추 모종.' },
  tangerine: { cap: '겨울 아침, 이불 위 귤', alt: '창가의 꽃무늬 누빔 이불 위 대바구니에 귤이 소복하다.' },
  snow: { cap: '첫눈 온 마당', alt: '회색 벽돌담 앞 눈 덮인 마당에 빨간 플라스틱 의자 하나, 그 위에 눈이 소복이 쌓였다.' },
  laundry: { cap: '빨래 마르는 날', alt: '새파란 하늘 아래 빨랫줄에 나무 집게로 널린 흰 티셔츠와 수건.' },
  ramyeon: { cap: '밤, 냄비 뚜껑에 라면', alt: '밤, 접이식 나무 탁자 위 찌그러진 양은냄비 라면과 뒤집어 접시로 쓴 뚜껑. 플래시로 찍었다.' },
};
const START_LINE = ['lighthouse', 'tangerine', 'ramyeon'];
const LINE_MAX = 6;
const PACK = 10;
const PER_SHOT = 1300;
const DEV_MS = 8000;

const $ = (s) => document.querySelector(s);
const section = $('#shoot');
if (section) init();

function init() {
  const cam = $('#cam');
  const slot = $('#slot');
  const line = $('#line');
  const shutterBtn = $('#shutter');
  const shutterLabel = shutterBtn.querySelector('.shutter__label');
  const soundBtn = $('#sound');
  const soundState = soundBtn.querySelector('.toggle__state');
  const reloadBtn = $('#reload');
  const status = $('#shoot-status');
  const left = $('#film-left');
  const spent = $('#film-spent');
  const bars = [...document.querySelectorAll('.film-count__bar li')];
  const veil = section.querySelector('.shoot__veil');
  const flashWin = cam.querySelector('.cam__flash');
  const camButton = cam.querySelector('.cam__button');

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mq.matches;
  const onMq = () => { reduced = mq.matches; };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);

  let film = PACK;
  let shots = 0;
  let busy = false;
  let lastFire = 0;
  let hanging = null;   // { el, key, start } the print still in the slot
  let soundOn = false;
  let soundSet = false; // the visitor chose on/off themselves
  let queue = [];

  // ---------- prints ----------
  function nextKey() {
    if (!queue.length) {
      const keys = Object.keys(PRINTS).filter((k) => !START_LINE.includes(k) || shots >= 5);
      for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }
      queue = keys;
    }
    return queue.shift();
  }

  function makePrint(key, { dark = false, lazy = false } = {}) {
    const fig = document.createElement('figure');
    fig.className = 'print' + (dark ? ' is-dark' : '');
    fig.dataset.key = key;
    const box = document.createElement('div');
    box.className = 'print__img';
    const img = document.createElement('img');
    img.src = `./img/print-${key}.webp`;
    img.width = 600;
    img.height = 750;
    img.alt = PRINTS[key].alt;
    img.decoding = 'async';
    if (lazy) img.loading = 'lazy';
    const chem = document.createElement('span');
    chem.className = 'print__chem';
    chem.setAttribute('aria-hidden', 'true');
    box.append(img, chem);
    fig.append(box);
    return fig;
  }

  function makeItem(fig, key) {
    const li = document.createElement('li');
    li.className = 'line__item';
    const cap = document.createElement('p');
    cap.className = 'line__cap';
    cap.textContent = PRINTS[key].cap;
    li.append(fig, cap);
    return li;
  }

  // three prints already on the line, so the section shows what comes out before any press
  for (const key of START_LINE) line.append(makeItem(makePrint(key, { lazy: true }), key));

  // warm the print images when the section comes near
  const warm = () => Object.keys(PRINTS).forEach((k) => { const i = new Image(); i.src = `./img/print-${k}.webp`; });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { warm(); io.disconnect(); }
    }, { rootMargin: '600px 0px' });
    io.observe(section);
  } else warm();

  // ---------- counter ----------
  function updateCount() {
    left.textContent = String(film);
    bars.forEach((b, i) => b.classList.toggle('is-used', i >= film));
    spent.textContent = shots
      ? `지금까지 ${shots}장, ${(shots * PER_SHOT).toLocaleString('ko-KR')}원어치 (낱팩 기준)`
      : '아직 찍지 않았습니다';
    const empty = film === 0;
    shutterLabel.textContent = empty ? '필름 없음' : '셔터 누르기';
    if (empty) shutterBtn.setAttribute('aria-disabled', 'true'); else shutterBtn.removeAttribute('aria-disabled');
    reloadBtn.hidden = !empty;
  }

  function say(text) {
    status.textContent = '';
    window.setTimeout(() => { status.textContent = text; }, 30);
  }

  // ---------- sound ----------
  function setSound(on) {
    soundOn = on;
    soundBtn.setAttribute('aria-pressed', String(on));
    soundState.textContent = on ? '켜짐' : '꺼짐';
  }
  if (!sound.available()) {
    soundBtn.disabled = true;
    soundState.textContent = '못 냄';
    soundBtn.title = '이 브라우저에서는 소리를 낼 수 없습니다';
  }
  soundBtn.addEventListener('click', () => {
    soundSet = true;
    if (!soundOn && sound.wake()) { setSound(true); sound.dry(); } else setSound(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sound.sleep();
  });

  // ---------- motion helpers ----------
  function pressLook() {
    shutterBtn.classList.add('is-down');
    cam.classList.add('is-down');
    window.setTimeout(() => { shutterBtn.classList.remove('is-down'); cam.classList.remove('is-down'); }, 150);
  }

  function flash() {
    const peak = reduced ? 0.3 : 0.88;
    const dur = reduced ? 700 : 420;
    veil.animate([{ opacity: 0 }, { opacity: peak, offset: 0.08 }, { opacity: 0 }], { duration: dur, easing: 'ease-out' });
    flashWin.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 650 : 380, easing: 'ease-out' });
  }

  function eject(el, ms) {
    el.style.transform = 'translateY(-101%)';
    slot.append(el);
    const a = el.animate(
      [{ transform: 'translateY(-101%)' }, { transform: 'translateY(-2.5%)' }],
      { duration: ms, easing: reduced ? 'linear' : 'cubic-bezier(.35,.05,.35,1)', fill: 'forwards' },
    );
    return a.finished.then(() => {
      el.style.transform = 'translateY(-2.5%)';
      a.cancel();
    }).catch(() => {});
  }

  // FLIP: measure, change the DOM, animate every item from where it was.
  function flip(change, moved) {
    const items = [...line.children];
    const before = new Map(items.map((li) => [li, li.getBoundingClientRect()]));
    const from = moved ? moved.getBoundingClientRect() : null;
    change();
    if (reduced) {
      if (moved) moved.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
      return;
    }
    for (const li of line.children) {
      const b = before.get(li);
      if (!b) continue;
      const a = li.getBoundingClientRect();
      const dx = b.left - a.left, dy = b.top - a.top;
      if (dx || dy) li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    if (moved && from) {
      const to = moved.getBoundingClientRect();
      const s = from.width / to.width;
      moved.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${s})`, transformOrigin: '0 0' },
        { transform: 'none', transformOrigin: '0 0' },
      ], { duration: 620, easing: 'cubic-bezier(.3,.6,.2,1)' });
    }
  }

  function pinHanging() {
    if (!hanging) return;
    const { el, key, start } = hanging;
    hanging = null;
    const elapsed = performance.now() - start;
    flip(() => {
      el.style.transform = '';
      if (elapsed < DEV_MS) {
        // keep developing where it was: moving the node restarts the CSS animation
        el.querySelectorAll('img, .print__chem').forEach((n) => { n.style.animationDelay = `-${elapsed}ms`; });
      } else {
        el.classList.remove('is-dev');   // already developed: no animation to restart
      }
      line.prepend(makeItem(el, key));
      while (line.children.length > LINE_MAX) line.lastElementChild.remove();
    }, el);
  }

  // ---------- the shutter ----------
  function fire() {
    const now = performance.now();
    if (busy) { say('아직 나오는 중입니다. 다 나오면 다시 누르세요.'); return; }
    if (now - lastFire < 1200) return;   // the flash is still charging: also keeps flashes far under 3 a second
    if (!soundSet && !soundOn && sound.wake()) setSound(true);
    else if (soundOn) sound.wake();
    pressLook();
    if (film === 0) {
      if (soundOn) sound.dry();
      say('10장을 다 찍었습니다. 새 필름을 넣으세요.');
      return;
    }
    busy = true;
    lastFire = now;
    pinHanging();
    flash();
    if (soundOn) sound.shutter();
    film -= 1;
    shots += 1;
    updateCount();
    const key = nextKey();
    const el = makePrint(key);
    el.style.setProperty('--dev', `${DEV_MS}ms`);
    const ejectMs = reduced ? 1700 : 1150;
    window.setTimeout(() => {
      if (soundOn) sound.motor(ejectMs / 1000);
      el.classList.add('is-dev');
      const start = performance.now();
      hanging = { el, key, start };
      say('한 장 나오는 중');
      eject(el, ejectMs).then(() => {
        busy = false;
        if (soundOn) sound.charge(0.9);
        if (film === 0) say('마지막 장입니다. 새 필름을 넣으세요.');
      });
      const img = el.querySelector('img');
      img.addEventListener('animationend', () => {
        if (hanging && hanging.el === el) say(`다 나타났습니다. ${PRINTS[key].cap}.`);
      }, { once: true });
    }, 260);
  }

  function reload() {
    if (busy) return;
    busy = true;
    pinHanging();
    if (soundOn) { sound.wake(); sound.door(); }
    const slide = document.createElement('div');
    slide.className = 'print print--slide';
    slide.setAttribute('aria-hidden', 'true');
    say('필름 문을 닫았습니다. 검은 덮개가 나옵니다.');
    window.setTimeout(() => {
      if (soundOn) sound.motor(reduced ? 1.4 : 0.95);
      eject(slide, reduced ? 1400 : 950).then(() => {
        window.setTimeout(() => {
          const out = slide.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
          out.finished.then(() => slide.remove()).catch(() => slide.remove());
          film = PACK;
          busy = false;
          updateCount();
          say('새 필름을 넣었습니다. 10장 남았습니다.');
          shutterBtn.focus();
        }, 500);
      });
    }, 320);
  }

  shutterBtn.addEventListener('click', fire);
  reloadBtn.addEventListener('click', reload);
  // the button in the photograph works too (pointer only; the labelled button is the keyboard path)
  camButton.addEventListener('pointerdown', () => cam.classList.add('is-down'));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => camButton.addEventListener(t, () => cam.classList.remove('is-down')));
  camButton.addEventListener('click', fire);

  updateCount();
}
