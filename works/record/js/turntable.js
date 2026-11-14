// The turntable: the record spins at 33⅓ rpm; drop the needle (click the record, drag the tonearm,
// press a track, or use the keyboard on the tonearm) and the track under it plays.
// Geometry is in units of the record diameter D; the deck is 1.3 D wide (see css .deck).
import { Engine, SIDES, timeline, REV } from './music.js';

const DEG = Math.PI / 180;
const G = { cx: 0.52, cy: 0.64, px: 1.12, py: 0.28, L: 0.757 };
const R_START = 0.479; // first groove (radius / D)
const R_END = 0.215; // end of the last track
const R_RUN = 0.178; // locked run-out groove
const R_EDGE = 0.5;
const ARM_IMG = 148.5; // pivot -> stylus angle inside the arm photograph
const PHI_REST = 96 * DEG;
const PHI_IN = phiFor(R_RUN - 0.004);
const SPEED = 360 / REV; // degrees per second

function phiFor(r) {
  const dx = G.cx - G.px, dy = G.cy - G.py, P = Math.hypot(dx, dy);
  const a = Math.acos(Math.max(-1, Math.min(1, (G.L * G.L + P * P - r * r) / (2 * G.L * P))));
  return Math.atan2(dy, dx) - a;
}
function tipR(phi) {
  return Math.hypot(G.px + G.L * Math.cos(phi) - G.cx, G.py + G.L * Math.sin(phi) - G.cy);
}
const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const NB = String.fromCharCode(160); // 4분 12초 and 1:12 / 3:48 stay on one line
const sayTime = (s) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), x = s % 60;
  return m ? `${m}분${NB}${x}초` : `${x}초`;
};
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function initTurntable(root) {
  const deck = root.querySelector('.deck');
  if (!deck) return;
  const disc = deck.querySelector('.disc');
  const spin = deck.querySelector('.disc__spin');
  const rings = deck.querySelector('.disc__rings');
  const hit = deck.querySelector('.disc__hit');
  const armHit = deck.querySelector('.arm-hit');
  const labelSide = deck.querySelector('[data-label-side]');
  const lever = root.querySelector('#lever');
  const leverText = lever.querySelector('[data-lever-text]');
  const soundBtn = root.querySelector('#sound');
  const soundText = soundBtn.querySelector('[data-sound-text]');
  const status = root.querySelector('.status');
  const flips = [...root.querySelectorAll('[data-flip]')];
  const rows = [...root.querySelectorAll('.track')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const eng = new Engine();
  const st = {
    side: 'A', tl: timeline('A'),
    phi: PHI_REST, tween: null,
    down: false, pos: 0, pos0: 0, t0: 0, cur: -2, runout: false,
    soundChosen: false, flipping: false,
    visible: false, hidden: document.hidden,
    angle: Math.random() * 360, omega: 0, last: 0, raf: 0,
    shownSec: -1, hover: -1, drag: null,
  };

  if (!eng.ok) {
    soundBtn.disabled = true;
    soundText.textContent = '없음';
    soundBtn.setAttribute('aria-describedby', 'sound-why');
    const why = document.createElement('p');
    why.id = 'sound-why';
    why.className = 'status';
    why.textContent = '이 브라우저에서는 소리를 낼 수 없습니다. 바늘과 목록은 그대로 움직입니다.';
    status.after(why);
  }

  // ---------------------------------------------------------------- geometry helpers
  const D = () => deck.clientWidth / 1.3;
  const rOf = (s) => (s <= st.tl.total ? R_START - ((R_START - R_END) * s) / st.tl.total : Math.max(R_RUN, R_END - (s - st.tl.total) * 0.01));
  const sOf = (r) => (r >= R_START ? 0 : r <= R_END ? st.tl.total : ((R_START - r) / (R_START - R_END)) * st.tl.total);
  const trackAt = (s) => st.tl.items.findIndex((it) => s >= it.start && s < it.end);
  const nearestTrack = (s) => {
    let i = trackAt(s);
    if (i >= 0) return i;
    i = st.tl.items.findIndex((it) => it.start > s);
    return i < 0 ? st.tl.items.length - 1 : i;
  };
  function pointer(e) {
    const b = deck.getBoundingClientRect(), d = b.width / 1.3;
    return { x: (e.clientX - b.left) / d, y: (e.clientY - b.top) / d };
  }

  // ---------------------------------------------------------------- drawing
  function drawRings() {
    const ns = 'http://www.w3.org/2000/svg';
    rings.textContent = '';
    const u = (r) => r * 1000; // record viewBox is 1000 = D
    st.tl.items.forEach((it, i) => {
      const band = document.createElementNS(ns, 'circle');
      const ra = rOf(it.start), rb = rOf(it.end);
      band.setAttribute('cx', 500); band.setAttribute('cy', 500);
      band.setAttribute('r', u((ra + rb) / 2));
      band.setAttribute('stroke-width', u(ra - rb));
      band.setAttribute('class', 'band');
      band.dataset.i = i;
      rings.append(band);
    });
    st.tl.items.slice(1).forEach((it) => {
      const r = u(rOf(it.start - 1));
      for (const [cls, dr] of [['gap', 0], ['gap-hi', 2.2]]) {
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', 500); c.setAttribute('cy', 500); c.setAttribute('r', r + dr);
        c.setAttribute('class', cls);
        rings.append(c);
      }
    });
    for (const r of [R_START + 0.002, R_END - 0.002]) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', 500); c.setAttribute('cy', 500); c.setAttribute('r', u(r));
      c.setAttribute('class', 'gap');
      rings.append(c);
    }
  }

  function setHover(i) {
    if (i === st.hover) return;
    st.hover = i;
    rings.querySelectorAll('.band').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.i) === i));
    rows.forEach((r) => r.classList.toggle('is-hover', r.dataset.side === st.side && Number(r.dataset.i) === i));
  }

  // Only touch the style when the arm visibly moves: while tracking a groove it creeps ~0.02 deg/s.
  let phiShown = NaN;
  function setPhi(phi) {
    st.phi = phi;
    if (Math.abs(phi - phiShown) < 0.0002) return;
    phiShown = phi;
    deck.style.setProperty('--phi', `${(phi / DEG).toFixed(3)}deg`);
  }

  function updateSlider() {
    const s = st.down ? st.pos : st.phi <= PHI_REST + 0.01 * DEG ? 0 : sOf(tipR(st.phi));
    armHit.setAttribute('aria-valuemax', Math.round(st.tl.total));
    armHit.setAttribute('aria-valuenow', Math.round(s));
    const sideName = `${st.side}면`;
    let text;
    if (st.phi <= PHI_REST + 0.5 * DEG && !st.down) text = `쉬는 자리, ${sideName}`;
    else if (s >= st.tl.total) text = `${sideName} 끝, 바늘 ${st.down ? '내림' : '듦'}`;
    else {
      const i = nearestTrack(s), it = st.tl.items[i];
      const inside = s >= it.start;
      text = `${sideName} ${i + 1}번 ${it.tr.title}${inside ? `, ${sayTime(s - it.start)}` : ' 앞'}, 바늘 ${st.down ? '내림' : '듦'}`;
    }
    armHit.setAttribute('aria-valuetext', text);
  }

  function setRow(i) {
    rows.forEach((r) => {
      const on = r.dataset.side === st.side && Number(r.dataset.i) === i && st.down;
      r.setAttribute('aria-pressed', on ? 'true' : 'false');
      r.parentElement.classList.toggle('is-on', on);
      const t = r.querySelector('.track__time');
      if (!on) t.textContent = t.dataset.len;
    });
    st.shownSec = -1;
  }

  function updateElapsed() {
    if (st.cur < 0 || !st.down) return;
    const it = st.tl.items[st.cur];
    const sec = Math.floor(st.pos - it.start);
    if (sec === st.shownSec) return;
    st.shownSec = sec;
    const row = rows.find((r) => r.dataset.side === st.side && Number(r.dataset.i) === st.cur);
    if (row) row.querySelector('.track__time').textContent = `${fmt(sec)}${NB}/${NB}${fmt(it.tr.len)}`;
  }

  function say(text) {
    status.textContent = text;
  }

  // ---------------------------------------------------------------- playback
  function position() {
    return st.down ? st.pos0 + (eng.now() - st.t0) : st.pos;
  }

  function lower(s) {
    if (st.flipping) return;
    st.tween = null;
    s = Math.max(0, Math.min(s, st.tl.total + 6));
    const hadCtx = !!eng.ctx;
    eng.ensure();
    if (!st.soundChosen && eng.ok) setSound(true, false);
    if (!hadCtx && eng.ctx) eng.setMuted(!soundOn);
    st.down = true;
    st.pos = st.pos0 = s;
    st.t0 = eng.now();
    st.cur = -2;
    st.runout = false;
    deck.classList.add('is-down');
    lever.setAttribute('aria-pressed', 'true');
    leverText.textContent = '바늘 들기';
    eng.needleDown();
    setPhi(phiFor(rOf(s)));
    follow(true);
    kick();
  }

  function lift(announce = true) {
    if (!st.down) return;
    st.pos = position();
    st.down = false;
    st.cur = -2;
    deck.classList.remove('is-down');
    lever.setAttribute('aria-pressed', 'false');
    leverText.textContent = '바늘 내리기';
    eng.lift();
    setRow(-1);
    if (announce) say('바늘을 들었습니다.');
    updateSlider();
  }

  // Called every frame while the needle is down: move the arm, change tracks, run out.
  function follow(force) {
    if (!st.down) return;
    const s = (st.pos = position());
    if (!st.tween) setPhi(phiFor(rOf(s)));
    const i = trackAt(s);
    if (i !== st.cur || force) {
      st.cur = i;
      if (i >= 0) {
        const it = st.tl.items[i];
        eng.play(it.tr, s - it.start);
        say(`${st.side}면 ${i + 1}번 「${it.tr.title}」`);
      } else {
        eng.stopMusic(0.1);
        if (s >= st.tl.total) {
          if (!st.runout) {
            st.runout = true;
            eng.runout(true);
            say(st.side === 'A' ? 'A면이 끝났습니다. B면으로 뒤집어 보세요.' : 'B면이 끝났습니다. 바늘을 들거나 A면으로 뒤집어 보세요.');
          }
        } else {
          const n = nearestTrack(s);
          say(`${st.side}면 ${n + 1}번 「${st.tl.items[n].tr.title}」 앞`);
        }
      }
      setRow(i);
      updateSlider();
    }
    updateElapsed();
  }

  // Swing the arm to a radius (or rest), then call done().
  function swingTo(phi, done) {
    const from = st.phi, dist = Math.abs(phi - from) / DEG;
    const dur = Math.min(760, 260 + dist * 14);
    st.tween = { from, to: phi, t0: performance.now(), dur, done };
    kick();
  }

  function cueAndDrop(s) {
    if (st.flipping) return;
    if (st.down) lift(false);
    swingTo(phiFor(rOf(s)), () => setTimeout(() => lower(s), 120));
  }

  function toRest(done) {
    lift(false);
    swingTo(PHI_REST, done);
  }

  function flipTo(side, then) {
    if (side === st.side || st.flipping) { if (then && side === st.side) then(); return; }
    st.flipping = true;
    flips.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.flip === side)));
    toRest(() => {
      deck.classList.add('is-flipping');
      setTimeout(() => {
        st.side = side;
        st.tl = timeline(side);
        st.pos = 0;
        deck.dataset.side = side;
        labelSide.textContent = side;
        drawRings();
        setHover(-1);
        updateSlider();
      }, 260);
      setTimeout(() => {
        deck.classList.remove('is-flipping');
        st.flipping = false;
        say(`${side}면을 얹었습니다.`);
        if (then) then();
      }, 540);
    });
  }

  // ---------------------------------------------------------------- sound toggle
  let soundOn = false;
  function setSound(on, chosen = true) {
    soundOn = on;
    if (chosen) st.soundChosen = true;
    soundBtn.setAttribute('aria-pressed', String(on));
    soundText.textContent = on ? '켜짐' : '꺼짐';
    if (on) eng.ensure();
    eng.setMuted(!on);
  }
  soundBtn.addEventListener('click', () => setSound(!soundOn));

  // ---------------------------------------------------------------- the loop (only while visible)
  function frame(now) {
    st.raf = 0;
    if (!st.visible || st.hidden) return;
    const dt = Math.min(0.05, st.last ? (now - st.last) / 1000 : 0);
    st.last = now;
    st.omega += (SPEED - st.omega) * Math.min(1, dt * 2.4);
    st.angle = (st.angle + st.omega * dt) % 360;
    spin.style.transform = `rotate(${st.angle.toFixed(2)}deg)`;
    if (st.tween) {
      const tw = st.tween, k = Math.min(1, (now - tw.t0) / tw.dur);
      setPhi(tw.from + (tw.to - tw.from) * easeInOut(k));
      if (k >= 1) {
        st.tween = null;
        updateSlider();
        if (tw.done) tw.done();
      }
    }
    follow(false);
    st.raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!st.raf && st.visible && !st.hidden) {
      st.last = 0;
      st.raf = requestAnimationFrame(frame);
    }
  }
  function pauseAll() {
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
    st.omega = 0;
    eng.pause();
  }
  function resumeAll() {
    eng.resume();
    kick();
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      st.visible = e.isIntersecting;
      if (st.visible && !st.hidden) resumeAll(); else pauseAll();
    }
  }, { threshold: 0 });
  io.observe(root.querySelector('.listen__grid') || deck);
  document.addEventListener('visibilitychange', () => {
    st.hidden = document.hidden;
    if (st.hidden) pauseAll(); else if (st.visible) resumeAll();
  });

  // ---------------------------------------------------------------- pointer: the record
  hit.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || st.drag) return;
    const p = pointer(e), r = Math.hypot(p.x - G.cx, p.y - G.cy);
    setHover(r <= R_EDGE ? trackAt(sOf(r)) : -1);
  });
  hit.addEventListener('pointerleave', () => setHover(-1));
  hit.addEventListener('click', (e) => {
    const p = pointer(e), r = Math.hypot(p.x - G.cx, p.y - G.cy);
    if (r > R_EDGE) return;
    let s = sOf(r);
    if (r < R_END) s = st.tl.total; // label and run-out: drop into the run-out groove
    cueAndDrop(s);
  });

  // ---------------------------------------------------------------- pointer: the tonearm
  armHit.addEventListener('pointerdown', (e) => {
    if (st.flipping || e.button > 0) return;
    e.preventDefault();
    armHit.setPointerCapture(e.pointerId);
    st.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, wasDown: st.down };
    st.tween = null;
    deck.classList.add('is-dragging');
  });
  armHit.addEventListener('pointermove', (e) => {
    const d = st.drag;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    if (!d.moved) { d.moved = true; if (st.down) lift(false); }
    const p = pointer(e);
    let phi = Math.atan2(p.y - G.py, p.x - G.px);
    phi = Math.max(PHI_REST, Math.min(PHI_IN, phi));
    setPhi(phi);
    const r = tipR(phi);
    setHover(r <= R_START + 0.005 ? trackAt(sOf(r)) : -1);
  });
  function endDrag(e) {
    const d = st.drag;
    if (!d || d.id !== e.pointerId) return;
    st.drag = null;
    deck.classList.remove('is-dragging');
    setHover(-1);
    if (!d.moved) { // a tap on the arm works the cue lever
      leverToggle();
      return;
    }
    if (e.type === 'pointercancel') { updateSlider(); return; }
    const r = tipR(st.phi);
    if (r <= R_START + 0.012) lower(r < R_END ? st.tl.total : sOf(r));
    else if (r <= R_EDGE + 0.03) lower(0);
    else { swingTo(PHI_REST); say('바늘을 쉬는 자리에 두었습니다.'); }
  }
  armHit.addEventListener('pointerup', endDrag);
  armHit.addEventListener('pointercancel', endDrag);

  // ---------------------------------------------------------------- keyboard on the tonearm
  armHit.addEventListener('keydown', (e) => {
    if (st.flipping) return;
    const cueS = () => (st.down ? position() : st.phi <= PHI_REST + 0.5 * DEG ? -1 : sOf(tipR(st.phi)));
    const moveTo = (s) => {
      if (s < 0) { toRest(); say('바늘을 쉬는 자리에 두었습니다.'); return; }
      s = Math.max(0, Math.min(st.tl.total, s));
      if (st.down) { lower(s); return; }
      st.pos = s;
      swingTo(phiFor(rOf(s)), updateSlider);
      const i = nearestTrack(s);
      say(`바늘을 ${st.side}면 ${i + 1}번 「${st.tl.items[i].tr.title}」 ${s >= st.tl.items[i].start ? sayTime(s - st.tl.items[i].start) : '앞'}에 두었습니다.`);
    };
    const s = cueS();
    const items = st.tl.items;
    const nextStart = () => { const it = items.find((x) => x.start > s + 0.5); return it ? it.start : items[items.length - 1].start; };
    const prevStart = () => { const l = items.filter((x) => x.start < s - 3); return l.length ? l[l.length - 1].start : st.down ? 0 : -1; };
    let used = true;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': moveTo(s < 0 ? 0 : s + 15); break;
      case 'ArrowLeft': case 'ArrowUp': moveTo(s < 0 ? -1 : !st.down && s - 15 < 0 ? -1 : Math.max(0, s - 15)); break;
      case 'PageDown': moveTo(s < 0 ? items[0].start : nextStart()); break;
      case 'PageUp': moveTo(s < 0 ? -1 : prevStart()); break;
      case 'Home': moveTo(-1); break;
      case 'End': moveTo(items[items.length - 1].start); break;
      case 'Enter': case ' ': leverToggle(); break;
      default: used = false;
    }
    if (used) e.preventDefault();
  });

  // ---------------------------------------------------------------- buttons
  function leverToggle() {
    if (st.flipping) return;
    if (st.down) { lift(); return; }
    if (st.phi <= PHI_REST + 0.5 * DEG) { cueAndDrop(st.tl.items[0].start - 1.2); return; }
    const r = tipR(st.phi);
    lower(r > R_START ? 0 : r < R_END ? st.tl.total : sOf(r));
  }
  lever.addEventListener('click', leverToggle);

  flips.forEach((b) => b.addEventListener('click', () => flipTo(b.dataset.flip)));

  rows.forEach((row) => {
    row.addEventListener('click', () => {
      const side = row.dataset.side, i = Number(row.dataset.i);
      if (st.down && side === st.side && st.cur === i) { lift(); return; }
      flipTo(side, () => cueAndDrop(st.tl.items[i].start - 0.4));
    });
    row.addEventListener('pointerenter', () => { if (row.dataset.side === st.side) setHover(Number(row.dataset.i)); });
    row.addEventListener('pointerleave', () => setHover(-1));
  });

  // ---------------------------------------------------------------- start
  drawRings();
  setPhi(PHI_REST);
  updateSlider();
  spin.style.transform = `rotate(${st.angle.toFixed(2)}deg)`;
  window.__deck = { st, eng, rOf, sOf, phiFor, tipR, D }; // read by design/works/record/scripts checks
}
