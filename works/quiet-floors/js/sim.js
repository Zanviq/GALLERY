// Controller for the section drawing: state, controls, playback, meter and readout.
import { ACTS, ACT_ORDER, FIXES, FIX_ORDER, FLOORS, CLOCK, compute, unitNo } from './model.js';
import { G, room, localX, drawBuilding, drawFrame, arcPath, floorSlab } from './building.js';
import { Digits, Bar } from './meter.js';
import * as sound from './sound.js';

const TR = [1, 0.42, 0.18, 0.08, 0.035];
const TW = [1, 0.4, 0.16, 0.06];
const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (s, r = document) => r.querySelector(s);
// what the meter really reads: the sound plus the room's background
const totalPeak = (info) => Math.round(10 * Math.log10(Math.pow(10, info.meter.L / 10) + Math.pow(10, info.bg / 10)));

export function initSim() {
  const svg = $('#building');
  const stage = $('#stage');
  const refs = drawBuilding(svg);
  const state = { source: { f: 4, c: 0 }, activity: 'run', fixes: new Set(), played: false };
  const meterDigits = new Digits($('#meter-digits'));
  const meterBar = new Bar($('#meter-bar'));
  let run = null; // current playback
  let visible = false;
  let pending = null;

  // ---------- room buttons ----------
  const roomsEl = $('#rooms');
  const roomBtns = new Map();
  const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;
  for (const f of FLOORS) {
    for (const c of [0, 1]) {
      const r = room(f, c);
      const no = unitNo(f, c);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `rm rm--c${c}`;
      b.dataset.unit = no;
      b.style.left = pct(r.x0, G.W);
      b.style.top = pct(r.top, G.H);
      b.style.width = pct(r.w, G.W);
      b.style.height = pct(r.h, G.H);
      b.innerHTML = `<span class="rm__no">${no}</span><span class="rm__tag" aria-hidden="true"></span>`;
      b.addEventListener('click', () => {
        state.source = { f, c };
        setRoving(no);
        play({ announce: true });
      });
      b.addEventListener('keydown', (e) => {
        let nf = f;
        let nc = c;
        if (e.key === 'ArrowUp') nf = Math.min(5, f + 1);
        else if (e.key === 'ArrowDown') nf = Math.max(2, f - 1);
        else if (e.key === 'ArrowLeft') nc = 0;
        else if (e.key === 'ArrowRight') nc = 1;
        else if (e.key === 'Home') { nf = 5; nc = 0; } else if (e.key === 'End') { nf = 2; nc = 1; } else return;
        e.preventDefault();
        const t = roomBtns.get(unitNo(nf, nc));
        setRoving(t.dataset.unit);
        t.focus();
      });
      roomsEl.appendChild(b);
      roomBtns.set(no, b);
    }
  }
  const pil = document.createElement('span');
  pil.className = 'pilotis-label';
  pil.textContent = '1층 필로티';
  pil.setAttribute('aria-hidden', 'true');
  pil.style.left = pct(G.walls[0][1] + 12, G.W);
  pil.style.top = pct(G.slabs[4][1] + 8, G.H);
  stage.appendChild(pil);

  function setRoving(no) {
    for (const [k, b] of roomBtns) b.tabIndex = k === no ? 0 : -1;
  }
  setRoving('401');

  // ---------- chips ----------
  const actWrap = $('#activity-chips');
  for (const id of ACT_ORDER) {
    const l = document.createElement('label');
    l.className = 'chip chip--radio';
    l.innerHTML = `<input type="radio" name="activity" value="${id}"${id === state.activity ? ' checked' : ''}><span>${ACTS[id].label}</span>`;
    l.querySelector('input').addEventListener('change', (e) => {
      if (!e.target.checked) return;
      state.activity = id;
      play({ announce: true });
    });
    actWrap.appendChild(l);
  }
  const fixWrap = $('#fix-chips');
  for (const id of FIX_ORDER) {
    const l = document.createElement('label');
    l.className = 'chip chip--check';
    l.innerHTML = `<input type="checkbox" name="fix" value="${id}"><span>${FIXES[id].label}</span>`;
    l.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) state.fixes.add(id); else state.fixes.delete(id);
      play({ announce: true });
    });
    fixWrap.appendChild(l);
  }
  $('#replay').addEventListener('click', () => play({ announce: true }));
  const soundBox = $('#sound-toggle');
  soundBox.addEventListener('change', () => {
    if (soundBox.checked) {
      if (!sound.enable()) { soundBox.checked = false; soundBox.disabled = true; return; }
      play({ announce: true });
    } else sound.stopAll();
  });

  function syncControls() {
    for (const i of actWrap.querySelectorAll('input')) i.checked = i.value === state.activity;
    for (const i of fixWrap.querySelectorAll('input')) i.checked = state.fixes.has(i.value);
  }

  // ---------- scene state (who is where, what is on) ----------
  function applyScene(info) {
    const src = unitNo(state.source.f, state.source.c);
    const m = info.meter.no;
    svg.classList.toggle('is-day', info.day);
    for (const [no, u] of refs.units) {
      const isSrc = no === src;
      const isM = no === m;
      const el = u.el;
      el.classList.toggle('is-src', isSrc);
      el.classList.toggle('is-meter', isM);
      el.dataset.act = isSrc ? state.activity : '';
      for (const f of FIX_ORDER) el.classList.toggle(`fx-${f}`, isSrc && state.fixes.has(f));
    }
    for (const r of svg.querySelectorAll('.room')) {
      r.classList.toggle('is-src', r.dataset.room === src);
      r.classList.toggle('is-meter', r.dataset.room === m);
    }
    for (const [no, b] of roomBtns) {
      const tag = no === src ? '소리 나는 집' : no === m ? '소음계' : '';
      b.querySelector('.rm__tag').textContent = tag;
      b.setAttribute('aria-label', `${no}호에서 소리 내기${no === src ? ', 지금 고른 집' : ''}${no === m ? ', 소음계가 있는 집' : ''}`);
      b.setAttribute('aria-pressed', String(no === src));
      b.classList.toggle('is-src', no === src);
      b.classList.toggle('is-meter', no === m);
    }
    for (const el of document.querySelectorAll('[data-source-unit]')) el.textContent = `${src}호`;
    for (const el of document.querySelectorAll('[data-meter-unit]')) el.textContent = `${m}호`;
    $('[data-clock]').textContent = info.day ? CLOCK.day : CLOCK.night;
    $('[data-bg]').textContent = String(info.bg);
    // compare (meter readings)
    const w = (L) => `${clamp((L - 20) / 50, 0.02, 1) * 100}%`;
    $('[data-before]').textContent = String(info.before);
    $('[data-now]').textContent = String(info.now);
    $('[data-before-bar]').style.width = w(info.before);
    $('[data-now-bar]').style.width = w(info.now);
    $('#meter-compare-sr').textContent = `고치기 전 ${info.before} dB, 지금 ${info.now} dB.`;
    // table
    const rows = [...info.list].sort((a, b) => b.L - a.L).map((u) => `<tr${u.meter ? ' class="is-meter"' : ''}><th scope="row">${u.no}호${u.meter ? ' <span class="units__m">소음계</span>' : ''}</th><td>${u.rel}</td><td>${u.L} dB</td><td>${u.margin > 0 ? `+${u.margin}` : '묻힘'}</td></tr>`).join('');
    $('#units-body').innerHTML = rows;
    if (!run) idleMeter(info);
  }

  function idleMeter(info, max = null) {
    meterDigits.set(info.bg.toFixed(1));
    meterBar.set(info.bg, max, info.bg);
    $('[data-max]').textContent = max == null ? '--' : String(Math.round(max));
    setMini(info, info.bg);
  }
  function setMini(info, level) {
    const u = refs.units.get(info.meter.no);
    const lit = clamp(Math.round((level - 26) / 7), 0, 4);
    u.segs.forEach((s, i) => s.classList.toggle('on', i < lit));
  }

  function sentence(info) {
    const src = state.source;
    const m = info.meter;
    let out = `${unitNo(src.f, src.c)}호에서 ${info.day && state.activity === 'washer' ? '낮에 ' : ''}${info.act.past}. `;
    if (src.f === 2) out += `아래는 필로티라 사는 집이 없어서 옆집 ${m.no}호에 소음계를 두었어요. `;
    const total = totalPeak(info);
    out += `${src.f === 2 ? '' : '바로 아래 '}${m.no}호 소음계는 최대 ${total} dB(예시)를 가리켜요. `;
    const clock = info.day ? '낮' : '밤';
    const only = total !== m.L ? `이 소리만 따지면 ${m.L} dB라 ` : '';
    out += m.margin > 0 ? `${only}${clock} 배경 소음 ${info.bg} dB보다 ${m.margin} dB 커요.` : `${only}${clock} 배경 소음 ${info.bg} dB에 묻혀요.`;
    const rel = info.fixes.filter((f) => info.act.fix[f]);
    const other = info.fixes.filter((f) => !info.act.fix[f] && f !== 'time');
    if (rel.length) out += ` ${rel.map((f) => FIXES[f].label).join(', ')}를 했더니 고치기 전보다 ${info.red} dB 작아졌어요.`;
    if (info.day) out += ' 시간을 낮으로 바꿔서, 같은 소리도 생활 소음에 더 묻혀요.';
    if (!rel.length && other.length) out += ` ${other.map((f) => FIXES[f].label).join(', ')}는 이 소리에는 효과가 거의 없어요.`;
    if (!info.fixes.length) out += ' 무엇을 바꿔 볼지 골라 다시 들어 보세요.';
    return out;
  }

  // ---------- playback ----------
  function buildRun(info) {
    const act = info.act;
    const src = state.source;
    const r = room(src.f, src.c);
    const x0 = localX(src.c, act.spot * 236);
    const slab = floorSlab(src.f);
    const A = 9 * Math.pow(10, (act.below - info.red - 56) / 20);
    const ev = [];
    const wallEv = [];
    const spawns = [];
    if (act.hits) {
      for (const [t, a] of act.hits) {
        ev.push({ type: 'hit', slab, x0, t0: t, amp: A * a * (act.kind === 'wall' ? 0.45 : 1), f: act.freq, decay: act.decay, a });
        spawns.push([t, a]);
        if (act.kind === 'wall') {
          wallEv.push({ band: 5 - src.f, k: 1, t0: t, amp: A * 1.5 * a });
          wallEv.push({ band: 5 - src.f, k: src.c === 0 ? 0 : 2, t0: t, amp: A * 0.6 * a });
        }
      }
    } else {
      const [t0, t1] = act.span;
      ev.push({ type: 'span', slab, x0, t0, t1, amp: A * (act.kind === 'light' ? 0.8 : 1), f: act.freq, jitter: act.kind === 'light' });
      for (let t = t0; t < t1; t += 0.27) spawns.push([t, 1]);
    }
    // what each spawn draws
    const items = [];
    const airF = act.air * (info.red > 0 ? 0.55 : 1);
    const srcNo = unitNo(src.f, src.c);
    for (const [st, a] of spawns) {
      const da = 20 * Math.log10(a);
      for (const u of info.list) {
        const s = clamp((u.L + da - 24) / 32, 0, 1);
        if (s < 0.03) continue;
        const ur = room(u.f, u.c);
        const xin = clamp(x0, ur.x0 + 26, ur.x1 - 26);
        let o;
        if (u.df > 0) o = { ox: xin, oy: ur.top, dir: 'down' };
        else if (u.df < 0) o = { ox: xin, oy: ur.bot, dir: 'up' };
        else if (act.kind === 'wall') o = { ox: u.c === 1 ? G.walls[1][1] : G.walls[1][0], oy: ur.top + ur.h * 0.5, dir: u.c === 1 ? 'right' : 'left' };
        else o = { ox: u.c === 1 ? ur.x0 + 30 : ur.x1 - 30, oy: ur.bot, dir: 'up' };
        const delay = 0.03 * Math.abs(u.df);
        items.push({ kind: 'arc', t0: st + delay, life: 0.85, s, clip: u.no, ...o });
        if (s > 0.45 && act.hits) items.push({ kind: 'arc', t0: st + delay + 0.13, life: 0.85, s: s * 0.7, clip: u.no, ...o });
      }
      if (airF > 0.05) {
        items.push({ kind: 'ring', t0: st, life: 1.0, cx: x0, cy: r.top + act.spotY, rMax: 150, s: airF * Math.max(0.5, a), clip: srcNo });
        const leak = act.kind === 'wall' ? info.list.find((u) => u.df === 0) : act.kind === 'cont' ? info.list.find((u) => u.df === -1 && u.same) : null;
        if (leak) {
          const lr = room(leak.f, leak.c);
          const cx = act.kind === 'wall' ? (leak.c === 1 ? lr.x0 + 4 : lr.x1 - 4) : clamp(x0, lr.x0 + 10, lr.x1 - 10);
          const cy = act.kind === 'wall' ? lr.top + act.spotY : lr.bot;
          items.push({ kind: 'ring', t0: st + 0.05, life: 0.9, cx, cy, rMax: 70, s: airF * 0.3, clip: leak.no });
        }
      }
    }
    items.sort((p, q) => p.t0 - q.t0);
    return { info, ev, wallEv, items, active: [], next: 0, start: 0, max: info.bg, dur: act.dur + 1.0, raf: 0, x0 };
  }

  function D(rn, j, x, t) {
    let v = 0;
    for (const e of rn.ev) {
      const dist = Math.abs(j - e.slab);
      if (dist > 4) continue;
      const tau = t - e.t0 - 0.04 * dist;
      if (tau < 0) continue;
      const dx = Math.abs(x - e.x0);
      if (e.type === 'hit') {
        const env = (1 - Math.exp(-tau / 0.015)) * Math.exp(-tau / e.decay);
        if (env < 0.002) continue;
        v += e.amp * TR[dist] * env * Math.sin(2 * Math.PI * e.f * tau - dx / 16) * Math.exp(-dx / 210);
      } else {
        const len = e.t1 - e.t0;
        if (tau > len + 0.6) continue;
        let env = Math.min(1, tau / 0.4) * (tau > len ? Math.max(0, 1 - (tau - len) / 0.5) : 1);
        if (e.jitter) env *= 0.55 + 0.45 * Math.abs(Math.sin(tau * 23.7));
        v += e.amp * TR[dist] * env * Math.sin(2 * Math.PI * e.f * tau - dx / 10) * Math.exp(-dx / 240);
      }
    }
    return v;
  }
  function S(rn, band, k, t) {
    let v = 0;
    for (const e of rn.wallEv) {
      const dist = Math.abs(band - e.band);
      if (dist > 3) continue;
      const tau = t - e.t0 - 0.03 * dist;
      if (tau < 0) continue;
      const kf = e.k === k ? 1 : 0.3;
      v += e.amp * TW[dist] * kf * (1 - Math.exp(-tau / 0.01)) * Math.exp(-tau / 0.2) * Math.sin(2 * Math.PI * 9 * tau);
    }
    return v;
  }
  function meterLevel(rn, t) {
    const info = rn.info;
    const Lm = info.meter.L;
    let e = Math.pow(10, info.bg / 10);
    const base = Math.pow(10, Lm / 10);
    for (const ev of rn.ev) {
      const tau = t - ev.t0 - 0.04;
      if (tau < 0) continue;
      if (ev.type === 'hit') e += base * ev.a * ev.a * Math.exp(-tau / 0.13);
      else {
        const len = ev.t1 - ev.t0;
        if (tau > len + 0.6) continue;
        let env = Math.min(1, tau / 0.4) * (tau > len ? Math.max(0, 1 - (tau - len) / 0.5) : 1);
        if (ev.jitter) env *= 0.55 + 0.45 * Math.abs(Math.sin(tau * 23.7));
        e += base * env * env;
      }
    }
    return 10 * Math.log10(e);
  }
  function peakSoFar(rn, t) {
    const info = rn.info;
    const bgE = Math.pow(10, info.bg / 10);
    const base = Math.pow(10, info.meter.L / 10);
    let best = 0;
    for (const ev of rn.ev) {
      const tau = t - ev.t0 - 0.04;
      if (tau < 0) continue;
      const k = ev.type === 'hit' ? ev.a * ev.a : Math.pow(Math.min(1, tau / 0.4), 2);
      best = Math.max(best, 10 * Math.log10(bgE + base * k));
    }
    return best;
  }

  // pools
  const free = { arc: [...refs.arcPool], ring: [...refs.ringPool] };
  function take(kind) { return free[kind].pop() || null; }
  function release(kind, el) {
    el.style.display = 'none';
    free[kind].push(el);
  }
  function clearItems(rn) {
    if (rn) for (const it of rn.active) release(it.kind, it.el);
    for (const el of refs.arcPool) el.style.display = 'none';
    for (const el of refs.ringPool) el.style.display = 'none';
    free.arc = [...refs.arcPool];
    free.ring = [...refs.ringPool];
  }
  function paintItem(it, p) {
    const el = it.el;
    if (it.kind === 'arc') {
      el.setAttribute('d', arcPath(it.ox, it.oy, 10 + 86 * p, it.dir));
      el.style.opacity = (it.s * Math.pow(1 - p, 1.1)).toFixed(3);
      el.style.strokeWidth = (1.4 + 3.4 * it.s).toFixed(2);
    } else {
      el.setAttribute('cx', it.cx.toFixed(1));
      el.setAttribute('cy', it.cy.toFixed(1));
      el.setAttribute('r', (6 + it.rMax * p).toFixed(1));
      el.style.opacity = (0.95 * it.s * (1 - p)).toFixed(3);
    }
  }
  function showItem(it) {
    const el = take(it.kind);
    if (!el) return false;
    it.el = el;
    el.setAttribute('clip-path', `url(#clip-${it.clip})`);
    el.style.display = '';
    return true;
  }

  function tick(now) {
    const rn = run;
    if (!rn) return;
    if (!rn.start) rn.start = now;
    const t = (now - rn.start) / 1000;
    while (rn.next < rn.items.length && rn.items[rn.next].t0 <= t) {
      const it = rn.items[rn.next++];
      if (showItem(it)) rn.active.push(it);
    }
    rn.active = rn.active.filter((it) => {
      const p = (t - it.t0) / it.life;
      if (p >= 1) { release(it.kind, it.el); return false; }
      paintItem(it, Math.max(0, p));
      return true;
    });
    drawFrame(refs, (j, x) => D(rn, j, x, t), (b, k) => S(rn, b, k, t));
    const L = meterLevel(rn, t);
    // hold the true peak even when frames are sparse (slow device, busy tab)
    rn.max = Math.max(rn.max, L, peakSoFar(rn, t));
    meterDigits.set(L.toFixed(1));
    meterBar.set(L, rn.max, rn.info.bg);
    $('[data-max]').textContent = String(Math.min(Math.round(rn.max), totalPeak(rn.info)));
    setMini(rn.info, L);
    if (t >= rn.dur) finish();
    else rn.raf = requestAnimationFrame(tick);
  }

  function finish() {
    const rn = run;
    if (!rn) return;
    cancelAnimationFrame(rn.raf);
    clearItems(rn);
    run = null;
    drawFrame(refs, () => 0, () => 0);
    idleMeter(rn.info, totalPeak(rn.info));
  }

  function renderStatic(rn) {
    // the peak frame as a still diagram: no motion at all
    const info = rn.info;
    const e0 = rn.ev[0];
    const Ds = (j, x) => {
      const dist = Math.abs(j - e0.slab);
      if (dist > 4) return 0;
      const dx = x - e0.x0;
      return e0.amp * TR[dist] * Math.cos(dx / 15) * Math.exp(-Math.abs(dx) / 120);
    };
    const Ss = (band, k) => {
      let v = 0;
      for (const w of rn.wallEv.slice(0, 2)) {
        const dist = Math.abs(band - w.band);
        if (dist <= 3) v += w.amp * TW[dist] * (w.k === k ? 0.7 : 0.2);
      }
      return v;
    };
    drawFrame(refs, Ds, Ss);
    const seen = new Set();
    for (const it of rn.items) {
      const key = it.kind + it.clip + (it.kind === 'ring' ? it.rMax : '');
      if (seen.has(key)) continue;
      seen.add(key);
      const ps = it.kind === 'arc' ? [0.2, 0.5, 0.8] : [0.18, 0.42, 0.66];
      ps.forEach((p, i) => {
        const copy = { ...it };
        if (!showItem(copy)) return;
        rn.active.push(copy);
        paintItem(copy, p);
        copy.el.style.opacity = (it.kind === 'arc' ? it.s * (1 - i * 0.22) : 0.95 * it.s * (1 - i * 0.25)).toFixed(3);
      });
    }
    const peak = totalPeak(info);
    meterDigits.set(peak.toFixed(1));
    meterBar.set(peak, peak, info.bg);
    $('[data-max]').textContent = String(Math.round(peak));
    setMini(info, peak);
  }

  function stopRun() {
    if (run) {
      cancelAnimationFrame(run.raf);
      clearItems(run);
      run = null;
    } else clearItems(null);
    drawFrame(refs, () => 0, () => 0);
  }

  function play({ announce = false } = {}) {
    stopRun();
    sound.stopAll();
    const info = compute(state);
    applyScene(info);
    state.played = true;
    $('#readout-text').textContent = sentence(info);
    if (announce) $('#live').textContent = sentence(info);
    const rn = buildRun(info);
    if (soundBox.checked) sound.playScene(info.act, info.meter.L, info.bg, info.day);
    if (reducedMQ.matches) {
      renderStatic(rn);
      run = null;
      return;
    }
    run = rn;
    rn.raf = requestAnimationFrame(tick);
  }

  // off screen or hidden tab: jump to the end
  const io = new IntersectionObserver((ents) => {
    visible = ents[0].isIntersecting;
    if (!visible && run) finish();
    if (visible && pending) {
      const p = pending;
      pending = null;
      setTimeout(() => play(p), 120);
    }
  }, { threshold: 0.25 });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (run) finish(); sound.stopAll(); }
  });
  reducedMQ.addEventListener?.('change', () => { stopRun(); idleMeter(compute(state)); });

  // first paint
  const info0 = compute(state);
  applyScene(info0);
  $('#readout-text').textContent = '방을 누르거나 소리를 고르면 아래층 소음계가 반응해요. 그다음 무엇을 바꿔 보고 다시 들어 보세요.';

  // one demonstration thump, normal motion only, not announced
  if (!reducedMQ.matches) {
    const once = new IntersectionObserver((ents) => {
      if (!ents[0].isIntersecting) return;
      once.disconnect();
      const go = () => setTimeout(() => { if (!state.played && !document.hidden) play({ announce: false }); }, 700);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    }, { threshold: 0.5 });
    once.observe(stage);
  }

  // used by the other sections
  return {
    trigger({ activity, fix }) {
      if (activity) state.activity = activity;
      if (fix) state.fixes.add(fix);
      syncControls();
      const fig = $('#section-figure');
      fig.scrollIntoView({ behavior: reducedMQ.matches ? 'auto' : 'smooth', block: 'center' });
      const req = { announce: true };
      if (visible) setTimeout(() => play(req), reducedMQ.matches ? 0 : 450);
      else pending = req;
    },
  };
}
