// 쳐 보기: 사진으로 찍은 가운데 줄 키캡 아홉 개와 스페이스바. design/works/keyboard/INTERACTION.md
import { audioSupported, createAudio } from './audio.js';
import { createComposer } from './hangul.js';

const root = document.querySelector('[data-try]');
if (root) init(root);

function init(root) {
  const caps = [...root.querySelectorAll('[data-cap]')];
  const byCode = new Map(caps.map((c) => [c.dataset.code, c]));
  const line = root.querySelector('[data-line]');
  const lineDone = root.querySelector('[data-line-done]');
  const lineComp = root.querySelector('[data-line-comp]');
  const sndBtn = root.querySelector('[data-sound]');
  const sndState = root.querySelector('[data-sound-state]');
  const sndNote = root.querySelector('[data-sound-note]');
  const clearBtn = root.querySelector('[data-clear]');
  const radios = [...root.querySelectorAll('input[name="try-switch"]')];
  const pad = root.querySelector('[data-pad]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const audio = audioSupported() ? createAudio() : null;
  const comp = createComposer();
  let profile = radios.find((r) => r.checked)?.value || 'goyo';
  let sound = 'idle'; // idle: 아직 아무도 안 건드림 | on | off: 방문자가 끔
  let inView = false;
  let lastType = 0;
  let demo = { timers: [], ran: false, text: false };

  // ── 소리 ─────────────────────────────────────────
  function play(id, phase) {
    if (audio && sound === 'on') audio.key(profile, id, phase);
  }
  function setSound(on) {
    if (!audio) return;
    if (on) audio.enable(); else audio.disable();
    sound = on ? 'on' : 'off';
    sndBtn.setAttribute('aria-pressed', String(on));
    sndState.textContent = on ? '켜짐' : '꺼짐';
  }
  // 키캡을 처음 누르는 것(사용자 동작)으로 소리를 켠다. 방문자가 직접 끈 뒤에는 다시 켜지 않는다.
  function gesture() {
    if (sound === 'idle') setSound(true);
    else if (audio && sound === 'on') audio.wake();
  }
  if (!audio) {
    sndBtn.disabled = true;
    sndNote.hidden = false;
  }
  sndBtn.addEventListener('click', () => {
    setSound(sound !== 'on');
    if (sound === 'on') tap(byCode.get('KeyG'), { type: false });
  });

  // ── 누르기 ───────────────────────────────────────
  const held = new Map(); // cap -> Set(누른 출처)
  function down(cap, src, { type = true, silent = false, auto = false } = {}) {
    let s = held.get(cap);
    if (!s) held.set(cap, (s = new Set()));
    if (s.has(src)) return;
    s.add(src);
    if (s.size > 1) return;
    cap.classList.add('is-down');
    if (!silent) play(cap.dataset.key, 'down');
    if (type) typeCap(cap, auto);
  }
  function up(cap, src, { silent = false } = {}) {
    const s = held.get(cap);
    if (!s || !s.delete(src) || s.size) return;
    cap.classList.remove('is-down');
    if (!silent) play(cap.dataset.key, 'up');
  }
  function tap(cap, opts = {}, hold = 90) {
    const src = 'tap' + Math.random();
    down(cap, src, opts);
    setTimeout(() => up(cap, src, opts), hold);
  }
  function releaseAll() {
    held.forEach((s, cap) => { s.clear(); cap.classList.remove('is-down'); });
  }

  // ── 줄 ───────────────────────────────────────────
  function typeCap(cap, auto) {
    // 시연으로 친 글자는 방문자가 처음 칠 때 지운다
    if (auto) demo.text = true;
    else if (demo.text) { comp.clear(); demo.text = false; }
    if (cap.dataset.key === 'space') comp.space();
    else comp.input(cap.dataset.jamo);
    if (!auto) lastType = performance.now();
    render();
  }
  function render() {
    for (;;) {
      const { done, comp: c } = comp.parts();
      lineDone.textContent = done;
      lineComp.textContent = c;
      if (line.scrollWidth <= line.clientWidth + 1 || !comp.dropFirst()) break;
    }
    line.classList.toggle('is-empty', !lineDone.textContent && !lineComp.textContent);
  }
  clearBtn.addEventListener('click', () => { stopDemo(); comp.clear(); demo.text = false; render(); });

  // ── 포인터: 마우스는 바로, 터치는 60ms 기다려 스크롤과 구분 ──
  const pending = new Map();
  caps.forEach((cap) => {
    cap.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      stopDemo();
      const src = 'p' + e.pointerId;
      if (e.pointerType === 'touch') {
        const t = setTimeout(() => { pending.delete(e.pointerId); gesture(); down(cap, src); }, 60);
        pending.set(e.pointerId, { t, x: e.clientX, y: e.clientY, cap });
        return;
      }
      cap.setPointerCapture?.(e.pointerId);
      gesture();
      down(cap, src);
    });
    cap.addEventListener('pointermove', (e) => {
      const p = pending.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) { clearTimeout(p.t); pending.delete(e.pointerId); }
    });
    const end = (e, cancelled) => {
      const p = pending.get(e.pointerId);
      if (p) {
        clearTimeout(p.t);
        pending.delete(e.pointerId);
        if (!cancelled) { gesture(); tap(cap, {}, 80); }
        return;
      }
      if (!cancelled && audio && sound === 'on') audio.wake();
      up(cap, 'p' + e.pointerId);
    };
    cap.addEventListener('pointerup', (e) => end(e, false));
    cap.addEventListener('pointercancel', (e) => end(e, true));
    cap.addEventListener('lostpointercapture', (e) => up(cap, 'p' + e.pointerId));
    cap.addEventListener('contextmenu', (e) => e.preventDefault());

    // 키캡에 포커스가 있을 때 Enter·Space 로 누른다 (누르는 동안 내려가 있다)
    cap.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      stopDemo();
      gesture();
      down(cap, 'k' + e.key);
    });
    cap.addEventListener('keyup', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      up(cap, 'k' + e.key);
    });
    // 화면 낭독기의 가상 클릭 (키와 포인터는 위에서 이미 처리했다)
    cap.addEventListener('click', (e) => {
      if (e.detail === 0) { gesture(); tap(cap); }
    });
  });

  // ── 내 키보드: 칸이 화면에 보일 때만. 글자 입력칸에서는 끼어들지 않는다 ──
  const TEXT = 'input:not([type=radio]):not([type=checkbox]):not([type=button]):not([type=submit]), textarea, select, [contenteditable]';
  const SOUNDING = /^(Key[A-Z]|Digit\d|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote|Enter|Backspace)$/;
  const soundId = (code) => (code === 'Enter' ? 'enter' : code === 'Backspace' ? 'bksp' : code.replace(/^(Key|Digit)/, '').toLowerCase());
  function own(e) {
    if (!inView || e.ctrlKey || e.metaKey || e.altKey) return false;
    const t = e.target;
    if (t instanceof Element && t.closest(TEXT)) return false;
    if ((e.code === 'Space' || e.code === 'Enter') && t instanceof Element && t.closest('button, a, summary, input, label')) return false;
    return true;
  }
  window.addEventListener('keydown', (e) => {
    if (!own(e)) return;
    const cap = byCode.get(e.code);
    if (e.code === 'Space') {
      // 치는 중에는 스페이스가 페이지를 내리지 않게 한다. 그냥 스페이스로 스크롤하는 사람은 그대로 둔다.
      if (performance.now() - lastType < 2000) e.preventDefault();
      else return;
    }
    if (e.repeat) return;
    if (cap) {
      stopDemo();
      gesture();
      down(cap, 'kb' + e.code);
    } else if (SOUNDING.test(e.code)) {
      if (e.code === 'Backspace') { stopDemo(); comp.backspace(); render(); }
      play(soundId(e.code), 'down');
    }
  });
  window.addEventListener('keyup', (e) => {
    const cap = byCode.get(e.code);
    if (cap) { up(cap, 'kb' + e.code); return; }
    if (inView && SOUNDING.test(e.code) && !(e.target instanceof Element && e.target.closest(TEXT))) play(soundId(e.code), 'up');
  });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { releaseAll(); stopDemo(); } });

  // ── 스위치 고르기: 소리와 눌리는 느낌이 바뀐다. 고르면 J 를 한 번 친다 ──
  root.dataset.switch = profile;
  radios.forEach((r) => r.addEventListener('change', () => {
    if (!r.checked) return;
    profile = r.value;
    root.dataset.switch = profile;
    gesture();
    tap(byCode.get('KeyJ'), { type: false }, 110);
  }));

  // ── 처음 보일 때 한 번: 혼자서 '아리랑'을 친다 (소리 없이) ──
  const DEMO = ['KeyD', 'KeyK', 'KeyF', 'KeyL', 'KeyF', 'KeyK', 'KeyD'];
  function runDemo() {
    if (demo.ran) return;
    demo.ran = true;
    const step = reduce.matches ? 300 : 210;
    comp.clear();
    DEMO.forEach((code, i) => {
      const cap = byCode.get(code);
      demo.timers.push(setTimeout(() => {
        down(cap, 'demo', { silent: true, auto: true });
      }, 500 + i * step));
      demo.timers.push(setTimeout(() => up(cap, 'demo', { silent: true }), 500 + i * step + 110));
    });
  }
  function stopDemo() {
    if (!demo.timers.length) return;
    demo.timers.forEach(clearTimeout);
    demo.timers = [];
    caps.forEach((c) => up(c, 'demo', { silent: true }));
  }

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      inView = en.isIntersecting && en.intersectionRatio >= 0.35;
      root.classList.toggle('is-live', en.isIntersecting);
      if (inView && !document.hidden) runDemo();
      if (!en.isIntersecting) releaseAll();
    }
  }, { threshold: [0, 0.35, 0.6] });
  io.observe(pad);
  render();
}
