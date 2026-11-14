// The run: open → queue → seats → pay → result. One rAF loop, paused while the tab is hidden.
import { OPEN_AT, LEAD, FEE, RANKS, DISCOUNTS, METHODS, tidy, WJ } from './data.js';
import { Venue, Overview, FREE, TAKEN, MINE } from './venue.js';
import { sfx, unlock, suspend } from './sound.js';

const $ = (s, r = document) => r.querySelector(s);
const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const wideMQ = window.matchMedia('(min-width: 768px)');
const int = (n) => Math.round(n).toLocaleString('ko-KR');
const won = (n) => int(n) + '원';
const pad = (n) => String(n).padStart(2, '0');

export function clockStr(ms) {
  const tenth = Math.floor(ms / 100) % 10;
  let s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
  s %= 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}.${tenth}`;
}
const mmss = (sec) => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };

// Numerals in fixed cells so a running clock never jitters (the display face has no tabular figures).
export function setNum(el, str) {
  if (el._str === str) return;
  const cells = el._cells;
  if (!cells || el._str.length !== str.length || [...str].some((ch, i) => /\d/.test(ch) !== /\d/.test(el._str[i]))) {
    el.textContent = '';
    el._cells = [...str].map((ch) => {
      const c = document.createElement(/\d/.test(ch) ? 'i' : 'b');
      c.textContent = ch;
      el.appendChild(c);
      return c;
    });
  } else {
    for (let i = 0; i < str.length; i++) if (str[i] !== el._str[i]) cells[i].textContent = str[i];
  }
  el._str = str;
}

// Mouse acts on press (a click is too slow for 광클); touch and keyboard act on click so a
// scrolling finger never books a seat.
function fastPress(el, fn) {
  let handled = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button === 0) { handled = true; fn(e); }
  });
  el.addEventListener('click', (e) => {
    if (handled) { handled = false; return; }
    fn(e);
  });
}

let keyboardUser = false;
document.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ') keyboardUser = true; }, true);
document.addEventListener('pointerdown', () => { keyboardUser = false; }, true);

export class Game {
  constructor(hooks) {
    this.h = hooks;
    this.el = $('#stage');
    this.running = false;
    this.paused = false;
    this.frame = this.frame.bind(this);
    const q = (id) => document.getElementById(id);
    this.d = {
      show: q('st-show'), srv: q('srv'), srLive: q('sr-live'), toast: q('toast'), toastBig: q('toast-big'), toastSmall: q('toast-small'),
      openClock: q('open-clock'), openLeft: q('open-left'), openSr: q('open-sr'), book: q('book'), bookLbl: q('book-lbl'),
      qNum: q('q-num'), qFill: q('q-fill'), qBehind: q('q-behind'), qLeft: q('q-left'), qEta: q('q-eta'),
      qStatus: q('q-status'), qRefresh: q('q-refresh'), qClicks: q('q-clicks'), qWarn: q('q-warn'),
      venueBox: q('venue'), canvas: q('venue-cv'), blockBtns: q('venue-blocks'),
      sLeft: q('s-left'), sRate: q('s-rate'), sTimer: q('s-timer'), sTimerBox: q('s-timerbox'),
      bName: q('b-name'), bOdds: q('b-odds'), bFree: q('b-free'), bPairs: q('b-pairs'), grid: q('b-grid'),
      picked: q('picked'), done: q('s-done'), legend: q('legend'), gb: q('gradebars'),
      pTimer: q('p-timer'), pTimerBox: q('p-timerbox'), pPen: q('p-pen'), pForm: q('p-form'), pErr: q('p-err'),
      pSeats: q('p-seats'), pTotal: q('p-total'), pSub: q('p-sub'), pFee: q('p-fee'), pDisc: q('p-disc'),
      pDiscounts: q('p-discounts'), pMethods: q('p-methods'), pAgree: q('p-agree'), pBusy: q('p-busy'), pShow: q('p-show'), pCancel: q('p-cancel'),
      stub: q('stub'), rBest: q('r-best'), rLab: q('r-lab'), rBig: q('r-big'), again: q('again'), other: q('other'), quit: q('quit'),
    };
    this.bind();
  }

  // ---------- wiring ----------
  bind() {
    const d = this.d;
    fastPress(d.book, () => this.onBook());
    d.qRefresh.addEventListener('click', () => this.onRefresh());
    this.el.querySelector('.ph--queue').addEventListener('pointerdown', (e) => {
      if (this.phase === 'queue' && !e.target.closest('#q-refresh')) this.onQueueClick();
    });
    d.venueBox.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'seats' || !this.ov) return;
      const r = d.canvas.getBoundingClientRect();
      const b = this.ov.hit(e.clientX - r.left, e.clientY - r.top);
      if (b) this.selectBlock(b.index, e.pointerType !== 'mouse');
    });
    d.blockBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-b]');
      if (btn && e.detail === 0) { this.selectBlock(Number(btn.dataset.b), true); this.focusGrid(); }
    });
    fastPress(d.grid, (e) => {
      const btn = e.target.closest('button[data-i]');
      if (btn) this.onSeat(Number(btn.dataset.i));
    });
    d.grid.addEventListener('keydown', (e) => this.gridKey(e));
    d.done.addEventListener('click', () => this.enterPay());
    d.pForm.addEventListener('change', (e) => this.onPayChange(e));
    d.pForm.addEventListener('submit', (e) => { e.preventDefault(); this.onPay(); });
    d.again.addEventListener('click', () => this.start(this.c));
    d.other.addEventListener('click', () => this.exit(true));
    d.quit.addEventListener('click', () => this.exit(false));
    document.addEventListener('keydown', (e) => {
      if (!this.running) return;
      const ae = document.activeElement;
      if (this.phase === 'open' && (e.key === 'Enter' || e.key === ' ') && (!ae || ae === document.body || ae === this.el || ae.closest('.ph--open'))) {
        if (ae !== this.d.book) { e.preventDefault(); this.onBook(); }
        return;
      }
      const reload = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'));
      if (!reload) return;
      e.preventDefault();
      if (this.phase === 'queue') this.onRefresh();
      else if (this.phase !== 'result') this.toast('새로고침은 대기열에서만 됩니다', '이 화면에서 새로고침하면 처음부터 다시 줄을 서야 합니다.');
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.running) return;
      if (document.hidden) { this.paused = true; suspend(); }
      else { this.paused = false; this.last = performance.now(); if (this.h.soundOn()) unlock(); requestAnimationFrame(this.frame); }
    });
    window.addEventListener('resize', () => {
      if (this.phase === 'seats' && this.ov) { this.ov.fit(); this.placeBlockButtons(); }
    });
  }

  // ---------- lifecycle ----------
  start(concert) {
    this.c = concert;
    this.venue = new Venue(concert.layout);
    this.ov = null;
    this.t = 0;
    this.r = {
      rt: null, early: 0, lockUntil: -1, refreshes: 0, qClicks: 0, lost: 0, pen: 0,
      seatsAt: null, payAt: null, doneAt: null, pos0: 0, picks: [],
    };
    this.pending = null;
    this.lostFx = new Map();
    this.sel = -1;
    this.d.show.textContent = tidy(concert.short);
    this.el.hidden = false;
    this.el.dataset.level = concert.id;
    this.running = true;
    this.paused = false;
    document.body.classList.add('is-playing');
    this.h.onStart();
    if (this.h.soundOn()) unlock();
    this.enterOpen();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
  }

  exit(toPicker) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.el.hidden = true;
    this.phase = null;
    document.body.classList.remove('is-playing');
    this.h.onExit(toPicker);
  }

  setPhase(p) {
    this.phase = p;
    this.el.dataset.phase = p;
    this.el.querySelectorAll('.steps li').forEach((li) => {
      if (li.dataset.step === p) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    this.el.scrollTop = 0;
    this.hideToast();
  }

  get server() { return OPEN_AT - LEAD * 1000 + this.t * 1000; }

  frame(now) {
    if (!this.running || this.paused) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.t += dt;
    setNum(this.d.srv, clockStr(this.server));
    if (this.phase === 'open') this.tickOpen(dt);
    else if (this.phase === 'queue') this.tickQueue(dt);
    else if (this.phase === 'seats') this.tickSeats(dt);
    else if (this.phase === 'pay') this.tickPay(dt);
    if (this.toastUntil && this.t > this.toastUntil) this.hideToast();
    if (this.running && this.phase !== 'result') this.raf = requestAnimationFrame(this.frame);
  }

  toast(big, small = '', secs = 1.6) {
    const d = this.d;
    d.toastBig.textContent = big;
    d.toastSmall.textContent = small;
    d.srLive.textContent = small ? `${big}. ${small}` : big;
    d.toast.hidden = false;
    d.toast.classList.remove('is-in');
    void d.toast.offsetWidth;
    d.toast.classList.add('is-in');
    this.toastUntil = this.t + secs;
  }
  hideToast() {
    this.toastUntil = 0;
    this.d.toast.hidden = true;
    this.d.toast.classList.remove('is-in');
  }

  shake(el) {
    // under reduced motion the CSS swaps in a smaller, slower nudge
    el.classList.remove('is-shake');
    void el.offsetWidth;
    el.classList.add('is-shake');
  }

  // ---------- 1. open ----------
  enterOpen() {
    this.setPhase('open');
    const d = this.d;
    d.book.classList.remove('is-open', 'is-locked', 'is-shake');
    d.book.classList.add('is-before');
    d.book.disabled = false;
    d.bookLbl.textContent = '오픈 전';
    this.lastSec = -1;
    this.opened = false;
    setNum(d.openClock, clockStr(this.server));
    d.openLeft.textContent = `오픈까지 ${LEAD.toFixed(1)}초`;
    d.openSr.textContent = '';
    setTimeout(() => d.book.focus({ preventScroll: true }), 30);
  }

  tickOpen() {
    const d = this.d, t = this.t;
    setNum(d.openClock, clockStr(this.server));
    if (this.r.rt !== null) return;
    if (t < LEAD) {
      d.openLeft.textContent = `오픈까지 ${(LEAD - t).toFixed(1)}초`;
      const half = Math.floor(t * 2);
      if (half !== this.lastSec) {
        this.lastSec = half;
        const left = LEAD - half / 2;
        if (half % 2 === 0) { left <= 3 ? sfx.tickHi() : sfx.tick(); if (left <= 5) d.openSr.textContent = `${left}초 전`; }
        else if (left <= 3) sfx.tick();
      }
    } else {
      if (!this.opened) {
        this.opened = true;
        d.book.classList.remove('is-before');
        d.book.classList.add('is-open');
        d.bookLbl.textContent = '지금';
        d.openSr.textContent = '오픈했습니다. 예매하기를 누르세요.';
        sfx.open();
      }
      d.openLeft.textContent = `오픈 후 ${(t - LEAD).toFixed(1)}초`;
      if (t - LEAD > 20) this.onBook(true);
    }
    if (this.r.lockUntil > 0 && t >= this.r.lockUntil) { this.r.lockUntil = -1; d.book.classList.remove('is-locked'); }
  }

  onBook(auto) {
    if (this.phase !== 'open' || this.r.rt !== null) return;
    const d = this.d, t = this.t;
    if (!auto && t < this.r.lockUntil) return; // rate-limited: the press is swallowed
    if (t < LEAD) {
      this.r.early++;
      this.r.lockUntil = t + 0.6;
      d.book.classList.add('is-locked');
      this.shake(d.book);
      sfx.refuse();
      this.toast('아직 오픈 전입니다', '먼저 누르면 0.6초 동안 다시 누를 수 없습니다.', 1.2);
      return;
    }
    sfx.press();
    this.r.rt = t - LEAD;
    d.book.classList.remove('is-open');
    d.book.disabled = true;
    d.openLeft.textContent = `반응 ${this.r.rt.toFixed(3)}초`;
    d.openSr.textContent = `반응 ${this.r.rt.toFixed(2)}초. 대기열로 들어갑니다.`;
    setTimeout(() => { if (this.running && this.phase === 'open') this.enterQueue(); }, 650);
  }

  // ---------- 2. queue ----------
  enterQueue() {
    this.setPhase('queue');
    const c = this.c, q = c.queue, r = this.r;
    const pos = (q.base + q.span * (1 - Math.exp(-r.rt / q.tau))) * (0.92 + Math.random() * 0.16);
    r.pos0 = Math.max(1, Math.round(pos));
    this.q = {
      pos0: r.pos0, p: 0, D: this.queueTime(r.pos0), speed: 1, speedAt: 0,
      freezeAt: 0.4 + Math.random() * 0.14, froze: false, frozen: 0, frozenFor: 0,
      takenBase: 0, takenTarget: this.takenFor(r.pos0),
      behind: Math.max(800, c.applicants - r.pos0) * (0.55 + Math.random() * 0.1), start: this.t,
    };
    r.posFirst = r.pos0;
    const d = this.d;
    d.qRefresh.classList.remove('is-tempting');
    d.qRefresh.textContent = '새로고침';
    d.qStatus.textContent = '접속 순서대로 좌석 선택 화면에 들어갑니다.';
    d.qClicks.textContent = '';
    this.lastQ = -1;
    this.updateQueue();
    setTimeout(() => this.el.querySelector('#q-h').focus({ preventScroll: true }), 30);
  }

  queueTime(pos) { return 3.2 + 7 * (1 - Math.exp(-pos / this.c.queue.Pf)); }
  takenFor(pos) { return Math.min(0.93, 1 - Math.exp(-pos / this.c.queue.Pf)) * this.venue.N; }

  tickQueue(dt) {
    const q = this.q, d = this.d;
    if (q.frozen > 0) {
      q.frozen -= dt;
      q.frozenFor += dt;
      if (q.frozenFor > 0.9 && !d.qRefresh.classList.contains('is-tempting')) {
        d.qRefresh.classList.add('is-tempting');
        d.qRefresh.textContent = '화면이 멈췄나요? 새로고침';
      }
      if (q.frozen <= 0) {
        q.p = Math.min(0.98, q.p + 0.12); // patience pays: the number jumps
        d.qRefresh.classList.remove('is-tempting');
        d.qRefresh.textContent = '새로고침';
        d.qStatus.textContent = '순번을 다시 받았습니다. 그대로 기다리세요.';
      }
    } else {
      if (this.t > q.speedAt) { q.speed = 0.55 + Math.random() * 1.0; q.speedAt = this.t + 0.5 + Math.random() * 0.6; }
      q.p += (dt / q.D) * q.speed;
      if (!q.froze && q.p >= q.freezeAt) {
        q.froze = true;
        q.frozen = 2.6;
        q.frozenFor = 0;
        d.qStatus.textContent = '접속이 몰려 순번 갱신이 늦어지고 있습니다.';
      }
    }
    q.p = Math.min(1, q.p);
    // others keep buying while we wait
    const want = q.takenBase + (q.takenTarget - q.takenBase) * Math.min(1, q.p * 1.05);
    const have = this.venue.N - this.venue.free;
    if (want > have) {
      const n = Math.ceil((want - have) / 1.72);
      this.venue.buy(n, this.t);
    }
    q.behind += dt * (60 + this.c.applicants / 400);
    this.updateQueue();
    if (q.p >= 1) this.enterSeats();
  }

  updateQueue() {
    const q = this.q, d = this.d;
    const pos = Math.max(1, Math.round(q.pos0 * (1 - q.p)));
    setNum(d.qNum, int(pos));
    d.qFill.style.transform = `scaleX(${q.p.toFixed(4)})`;
    const step = Math.floor(this.t * 8);
    if (step !== this.lastQ) {
      this.lastQ = step;
      d.qBehind.textContent = int(q.behind) + '명';
      d.qLeft.textContent = int(this.venue.free) + '석';
      const eta = Math.max(1, Math.ceil((1 - q.p) * q.D + Math.max(0, q.frozen)));
      d.qEta.textContent = `약 ${eta}초`;
    }
  }

  onRefresh() {
    if (this.phase !== 'queue') return;
    const q = this.q, r = this.r, d = this.d;
    const now = Math.max(1, Math.round(q.pos0 * (1 - q.p)));
    const next = Math.round(now * 1.55 + this.c.queue.add * (0.8 + Math.random() * 0.4));
    r.refreshes++;
    sfx.lose();
    q.takenBase = this.venue.N - this.venue.free;
    q.pos0 = next;
    q.p = 0;
    q.D = this.queueTime(next) * 0.8;
    q.frozen = 0;
    q.froze = true;
    q.takenTarget = Math.max(q.takenBase, this.takenFor(next + r.pos0 * 0.3));
    r.pos0 = next;
    d.qRefresh.classList.remove('is-tempting');
    d.qRefresh.textContent = '새로고침';
    d.qStatus.textContent = `새로고침해서 대기열 뒤로 갔습니다. ${int(now)}번이 ${int(next)}번이 됐습니다.`;
    this.el.classList.remove('is-blank');
    void this.el.offsetWidth; this.el.classList.add('is-blank'); // a soft fade under reduced motion (CSS)
    this.toast('대기 순번이 초기화됐습니다', `${int(now)}번 → ${int(next)}번`, 1.8);
    this.updateQueue();
  }

  onQueueClick() {
    const r = this.r;
    r.qClicks++;
    if (r.qClicks >= 6) this.d.qClicks.textContent = `기다리는 동안 ${r.qClicks}번 눌렀습니다. 눌러도 순번은 줄지 않습니다.`;
  }

  // ---------- 3. seats ----------
  enterSeats() {
    this.setPhase('seats');
    const c = this.c, v = this.venue, d = this.d;
    this.r.seatsAt = this.t;
    this.seatEnd = this.t + c.seatTime;
    this.rate = 0;
    this.rateAcc = 0;
    this.rateT = 0;
    this.lastSecS = -1;
    this.uiT = -1;
    // legend with the visible odds
    d.legend.querySelectorAll('[data-odds]').forEach((el) => { el.textContent = Math.round(c.odds[el.dataset.odds] * 100) + '%'; });
    d.venueBox.style.setProperty('--ar', ((c.layout.W + 2) / (c.layout.H + 2)).toFixed(3));
    this.ov = new Overview(d.canvas, v, { labels: true, pad: 6 });
    this.gradeTotal = {};
    for (const b of v.blocks) this.gradeTotal[b.grade] = (this.gradeTotal[b.grade] || 0) + b.count;
    d.gb.innerHTML = ['VIP', 'R', 'S', 'A'].map((g) => `<tr data-g="${g}"><th scope="row" class="num">${g}</th><td class="gb__bar"><span class="gb__fill g-${g}"></span></td><td class="r gb__n"></td><td class="r gb__p"></td></tr>`).join('');
    this.gbRows = [...d.gb.querySelectorAll('tr')];
    this.buildBlockButtons();
    // start on the front block with the most seats left
    let best = 0, bs = -1;
    for (const b of v.blocks) {
      const s = b.free * (b.grade === 'VIP' ? 3 : b.grade === 'R' ? 2 : 1);
      if (s > bs) { bs = s; best = b.index; }
    }
    this.renderPicked();
    this.selectBlock(best, false);
    this.toast('좌석 선택', `${c.seatTime}초 안에 고르세요. 두 자리 나란히가 목표입니다.`, 2);
    setTimeout(() => { if (keyboardUser) this.focusGrid(); else this.el.querySelector('#s-h').focus({ preventScroll: true }); }, 30);
  }

  buildBlockButtons() {
    const d = this.d, v = this.venue;
    d.blockBtns.textContent = '';
    for (const b of v.blocks) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vb';
      btn.dataset.b = b.index;
      d.blockBtns.appendChild(btn);
    }
    this.placeBlockButtons();
  }

  placeBlockButtons() {
    const v = this.venue, ov = this.ov;
    this.d.blockBtns.querySelectorAll('button').forEach((btn) => {
      const b = v.blocks[Number(btn.dataset.b)];
      const r = ov.blockRect(b);
      btn.style.left = r.x - 3 + 'px';
      btn.style.top = r.y - 3 + 'px';
      btn.style.width = r.w + 6 + 'px';
      btn.style.height = r.h + 6 + 'px';
    });
    this.labelBlocks();
  }

  labelBlocks() {
    const v = this.venue;
    this.d.blockBtns.querySelectorAll('button').forEach((btn) => {
      const b = v.blocks[Number(btn.dataset.b)];
      btn.setAttribute('aria-label', `${b.id}구역 ${b.grade}석, 남은 좌석 ${b.free}석`);
      if (b.index === this.sel) btn.setAttribute('aria-current', 'true'); else btn.removeAttribute('aria-current');
    });
  }

  selectBlock(index, scroll) {
    const v = this.venue, b = v.blocks[index], d = this.d, c = this.c;
    const changed = index !== this.sel;
    this.sel = index;
    if (changed) {
      d.grid.textContent = '';
      d.grid.style.setProperty('--cols', b.cols);
      d.grid.setAttribute('aria-label', `${b.id}구역 좌석. 화살표 키로 움직이고 Enter로 고릅니다.`);
      this.cells = [];
      this.cellState = [];
      let first = -1;
      for (let r = 0; r < b.rows; r++) {
        const lab = document.createElement('span');
        lab.className = 'rowlab';
        lab.setAttribute('aria-hidden', 'true');
        lab.textContent = r + 1;
        d.grid.appendChild(lab);
        for (let col = 0; col < b.cols; col++) {
          const i = v.idx(b, r, col);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'seat g-' + b.grade;
          btn.dataset.i = i;
          btn.tabIndex = -1;
          d.grid.appendChild(btn);
          this.cells.push(btn);
          this.cellState.push(-1);
          if (first < 0 && v.state[i] === FREE) first = this.cells.length - 1;
        }
      }
      this.focusCell = Math.max(0, first);
      this.cells[this.focusCell].tabIndex = 0;
      d.bName.textContent = `${b.id}구역`;
      d.bOdds.textContent = `${b.grade}석, 선택 성공률 ${Math.round(c.odds[b.grade] * 100)}%`;
      this.labelBlocks();
    }
    this.blockBase = b.start;
    this.updateGrid(true);
    if (scroll && !wideMQ.matches) {
      const blk = this.el.querySelector('.block');
      const rect = blk.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) blk.scrollIntoView({ block: 'nearest', behavior: reducedMQ.matches ? 'auto' : 'smooth' });
    }
  }

  updateGrid(force) {
    const v = this.venue, b = v.blocks[this.sel];
    if (!b || !this.cells) return;
    for (let k = 0; k < this.cells.length; k++) {
      const i = b.start + k;
      let s = v.state[i];
      if (this.pending && this.pending.i === i) s = 3;
      const lost = this.lostFx.get(i);
      if (lost && this.t < lost) s = 4;
      if (!force && s === this.cellState[k]) continue;
      this.cellState[k] = s;
      const el = this.cells[k];
      el.classList.toggle('is-taken', s === TAKEN);
      el.classList.toggle('is-mine', s === MINE);
      el.classList.toggle('is-pending', s === 3);
      el.classList.toggle('is-lost', s === 4);
      el.textContent = s === MINE ? String(this.r.picks.indexOf(i) + 1) : s === 4 ? '×' : '';
      const what = s === FREE ? '선택 가능' : s === MINE ? '내가 잡은 좌석' : s === 3 ? '확인 중' : '판매됨';
      el.setAttribute('aria-label', `${v.seatName(i)}, ${b.grade}석, ${what}`);
    }
  }

  focusGrid() {
    if (!this.cells) return;
    const b = this.venue.blocks[this.sel];
    let k = this.cells.findIndex((el, n) => this.venue.state[b.start + n] === FREE);
    if (k < 0) k = 0;
    this.cells[this.focusCell] && (this.cells[this.focusCell].tabIndex = -1);
    this.focusCell = k;
    this.cells[k].tabIndex = 0;
    this.cells[k].focus({ preventScroll: true });
  }

  gridKey(e) {
    if (e.key === 'Escape') {
      const btn = this.d.blockBtns.querySelector(`[data-b="${this.sel}"]`);
      if (btn) { e.preventDefault(); btn.focus(); }
      return;
    }
    const keys = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const k = keys[e.key];
    if (!k || !this.cells) return;
    e.preventDefault();
    const b = this.venue.blocks[this.sel];
    let r = Math.floor(this.focusCell / b.cols) + k[0], c = (this.focusCell % b.cols) + k[1];
    r = Math.max(0, Math.min(b.rows - 1, r));
    c = Math.max(0, Math.min(b.cols - 1, c));
    this.cells[this.focusCell].tabIndex = -1;
    this.focusCell = r * b.cols + c;
    const el = this.cells[this.focusCell];
    el.tabIndex = 0;
    el.focus();
  }

  onSeat(i) {
    if (this.phase !== 'seats') return;
    const v = this.venue, r = this.r;
    const k = i - this.blockBase;
    if (this.cells && this.cells[k]) {
      this.cells[this.focusCell] && (this.cells[this.focusCell].tabIndex = -1);
      this.focusCell = k;
      this.cells[k].tabIndex = 0;
    }
    if (this.pending) { this.toast('앞 좌석을 확인하고 있습니다', '잠깐만 기다리세요.', 0.9); return; }
    const s = v.state[i];
    if (s === MINE) {
      v.setState(i, FREE);
      r.picks = r.picks.filter((x) => x !== i);
      sfx.press();
      this.toast('좌석을 놓았습니다', '놓은 좌석은 바로 다른 사람이 가져갈 수 있습니다.', 1.2);
      this.renderPicked();
      this.updateGrid(true);
      return;
    }
    if (s === TAKEN) { this.toast('이미 판매된 좌석입니다', '회색 점은 팔린 좌석입니다.', 1); return; }
    if (r.picks.length >= 2) { this.toast('1인 2매까지입니다', '바꾸려면 잡은 좌석을 한 번 더 눌러 놓으세요.', 1.4); return; }
    sfx.press();
    const lat = this.c.latency * (0.75 + Math.random() * 0.5);
    this.pending = { i, at: this.t + lat };
    this.updateGrid();
  }

  resolvePending() {
    const p = this.pending, v = this.venue, r = this.r;
    this.pending = null;
    const g = v.grade(p.i);
    const stillFree = v.state[p.i] === FREE;
    if (stillFree && Math.random() < this.c.odds[g]) {
      v.setState(p.i, MINE);
      r.picks.push(p.i);
      sfx.win();
      if (r.picks.length === 2 && v.adjacent(r.picks[0], r.picks[1])) this.toast('나란히 두 자리', '좌석 선택 완료를 누르세요. 시간이 갑니다.', 1.6);
      else if (r.picks.length === 2) this.toast('두 자리를 잡았습니다', '떨어진 자리입니다. 바꾸려면 한 자리를 놓으세요.', 1.8);
      else this.toast(`${v.seatName(p.i)}`, '한 자리 더. 바로 옆이면 가장 좋습니다.', 1.3);
      this.renderPicked();
    } else {
      if (stillFree) v.setState(p.i, TAKEN, this.t);
      r.lost++;
      const gap = (0.01 + Math.random() * (stillFree ? 0.22 : 0.12)).toFixed(2);
      this.lostFx.set(p.i, this.t + 0.9);
      sfx.lose();
      this.toast('이미 선택된 좌석입니다', `${gap}초 늦었습니다. 다른 좌석을 고르세요.`, 1.5);
      this.shake(this.el.querySelector('.block'));
    }
    this.updateGrid();
  }

  renderPicked() {
    const d = this.d, v = this.venue, picks = this.r.picks;
    d.picked.textContent = '';
    for (let n = 0; n < 2; n++) {
      const li = document.createElement('li');
      const i = picks[n];
      if (i === undefined) {
        li.className = 'is-empty';
        li.textContent = n === 0 ? '내 자리' : '친구 자리';
      } else {
        li.innerHTML = `<b class="g">${v.grade(i)}</b><span>${v.seatName(i)}</span>`;
      }
      d.picked.appendChild(li);
    }
    const adj = picks.length === 2 && v.adjacent(picks[0], picks[1]);
    d.done.disabled = picks.length === 0;
    d.done.textContent = picks.length === 0 ? '좌석을 고르세요' : picks.length === 1 ? '1석으로 선택 완료' : adj ? '나란히 2석 선택 완료' : '2석 선택 완료';
    d.done.classList.toggle('is-ready', adj);
  }

  tickSeats(dt) {
    const v = this.venue, c = this.c, d = this.d;
    // other buyers
    const seatsPerSec = c.k * (v.freeWeight() / v.wRef);
    const ev = (seatsPerSec * dt) / 1.72;
    const n = Math.floor(ev) + (Math.random() < ev % 1 ? 1 : 0);
    const got = v.buy(n, this.t);
    if (got) sfx.rush(got);
    this.rateAcc += got;
    this.rateT += dt;
    if (this.rateT >= 0.5) { this.rate = this.rate * 0.4 + (this.rateAcc / this.rateT) * 0.6; this.rateAcc = 0; this.rateT = 0; }
    if (this.pending && this.t >= this.pending.at) this.resolvePending();
    // timer
    const left = this.seatEnd - this.t;
    setNum(d.sTimer, mmss(left));
    const sec = Math.ceil(left);
    if (sec !== this.lastSecS) {
      this.lastSecS = sec;
      if (sec <= 10 && sec > 0) { sfx.warn(); this.el.classList.add('is-urgent'); }
    }
    if (left <= 0) return this.fail('seattime');
    if (v.free === 0 && this.r.picks.length === 0 && !this.pending) return this.fail('soldout');
    // draw
    this.ov.draw({ now: this.t, sel: this.sel, pending: this.pending ? this.pending.i : -1, fresh: reducedMQ.matches ? 0.5 : 0.35 });
    this.updateGrid();
    if (this.t - this.uiT > 0.15) {
      this.uiT = this.t;
      const b = v.blocks[this.sel];
      d.sLeft.textContent = int(v.free);
      d.sRate.textContent = int(this.rate);
      d.bFree.textContent = `${b.free}석`;
      d.bPairs.textContent = `${v.pairs(b)}곳`;
      this.paintGrades();
      if (Math.floor(this.t) !== this.lblT) { this.lblT = Math.floor(this.t); this.labelBlocks(); }
    }
  }

  paintGrades() {
    const v = this.venue, free = {}, pairs = {};
    for (const b of v.blocks) {
      free[b.grade] = (free[b.grade] || 0) + b.free;
      pairs[b.grade] = (pairs[b.grade] || 0) + v.pairs(b);
    }
    for (const tr of this.gbRows) {
      const g = tr.dataset.g;
      tr.querySelector('.gb__fill').style.transform = `scaleX(${(free[g] / this.gradeTotal[g]).toFixed(3)})`;
      tr.querySelector('.gb__n').textContent = `${free[g]}석`;
      tr.querySelector('.gb__p').textContent = `${pairs[g]}곳`;
    }
  }

  // ---------- 4. pay ----------
  enterPay() {
    if (this.phase !== 'seats' || this.r.picks.length === 0) return;
    if (this.pending) this.pending = null;
    this.setPhase('pay');
    this.el.classList.remove('is-urgent');
    const c = this.c, d = this.d, v = this.venue, r = this.r;
    r.payAt = this.t;
    this.payEnd = this.t + c.payTime;
    this.lastSecP = -1;
    this.busy = false;
    d.pShow.textContent = tidy(c.name);
    d.pCancel.textContent = tidy(c.cancelBy) + '까지';
    d.pSeats.innerHTML = r.picks.map((i) => `<li><b class="g">${v.grade(i)}</b><span>${v.seatName(i)}</span><span class="pr">${won(c.prices[v.grade(i)])}</span></li>`).join('');
    d.pDiscounts.innerHTML = DISCOUNTS.map((x) => `<label class="opt"><input type="radio" name="disc" value="${x.id}"><span class="opt__t">${x.label}</span><span class="opt__n">${x.note}</span></label>`).join('');
    d.pMethods.innerHTML = METHODS.map((x) => `<label class="opt"><input type="radio" name="method" value="${x.id}"><span class="opt__t">${x.label}</span><span class="opt__n">${x.note}</span></label>`).join('');
    d.pAgree.checked = false;
    d.pErr.textContent = '';
    d.pPen.textContent = '';
    d.pBusy.hidden = true;
    d.pForm.classList.remove('is-busy');
    this.updateTotal();
    setNum(d.pTimer, mmss(c.payTime));
    setTimeout(() => d.pDiscounts.querySelector('input').focus({ preventScroll: true }), 30);
  }

  sum() {
    const c = this.c, v = this.venue, picks = this.r.picks;
    const sub = picks.reduce((a, i) => a + c.prices[v.grade(i)], 0);
    const discId = this.d.pForm.elements.disc.value;
    const disc = DISCOUNTS.find((x) => x.id === discId);
    const off = disc && !disc.wrong ? Math.round((sub * disc.rate) / 100) * 100 : 0;
    const fee = FEE * picks.length;
    return { sub, off, fee, total: sub - off + fee };
  }

  updateTotal() {
    const d = this.d, s = this.sum();
    d.pSub.textContent = won(s.sub);
    d.pDisc.textContent = s.off ? '−' + won(s.off) : '0원';
    d.pFee.textContent = won(s.fee);
    d.pTotal.textContent = won(s.total);
  }

  penalty(sec, msg) {
    const d = this.d;
    this.payEnd -= sec;
    this.r.pen += sec;
    d.pErr.textContent = `${msg} 다시 고르세요.`;
    this.toast(`남은 시간 ${sec}초 줄었습니다`, msg, 2);
    d.pPen.textContent = `−${sec}초`;
    d.pPen.classList.remove('is-in');
    void d.pPen.offsetWidth;
    d.pPen.classList.add('is-in');
    clearTimeout(this.penT);
    this.penT = setTimeout(() => d.pPen.classList.remove('is-in'), 1200);
    sfx.penalty();
    this.shake(d.pTimerBox);
  }

  onPayChange() {
    if (this.phase !== 'pay' || this.busy) return;
    this.d.pErr.textContent = '';
    this.updateTotal();
  }

  onPay() {
    if (this.phase !== 'pay' || this.busy) return;
    const d = this.d, f = d.pForm.elements;
    const disc = f.disc.value, method = f.method.value;
    if (!disc) { d.pErr.textContent = '할인을 고르세요. 받을 할인이 없으면 일반입니다.'; return; }
    if (!method) { d.pErr.textContent = '결제 수단을 고르세요.'; return; }
    const dx = DISCOUNTS.find((o) => o.id === disc), mx = METHODS.find((o) => o.id === method);
    if (dx.wrong) {
      [...f.disc].forEach((x) => { x.checked = false; });
      this.updateTotal();
      this.penalty(3, dx.wrong);
      return;
    }
    if (mx.wrong) {
      [...f.method].forEach((x) => { x.checked = false; });
      this.penalty(3, mx.wrong);
      return;
    }
    if (disc === 'card' && method !== 'apjul') {
      [...f.method].forEach((x) => { x.checked = false; });
      this.penalty(4, '앞줄카드 할인은 앞줄카드로 결제할 때만 받을 수 있습니다.');
      return;
    }
    if (!d.pAgree.checked) { d.pErr.textContent = '취소 규정에 동의해야 결제할 수 있습니다.'; d.pAgree.focus(); return; }
    this.busy = true;
    this.r.disc = disc;
    this.r.paid = this.sum().total;
    d.pErr.textContent = '';
    d.pForm.classList.add('is-busy');
    d.pBusy.hidden = false;
    sfx.press();
    this.busyEnd = this.t + 1.2;
  }

  tickPay() {
    const d = this.d;
    if (this.busy) {
      if (this.t >= this.busyEnd) { this.r.doneAt = this.busyEnd; this.finish(); }
      return;
    }
    const left = this.payEnd - this.t;
    setNum(d.pTimer, mmss(left));
    const sec = Math.ceil(left);
    if (sec !== this.lastSecP) {
      this.lastSecP = sec;
      if (sec <= 5 && sec > 0) { sfx.warn(); d.pTimerBox.classList.add('is-urgent'); }
      else d.pTimerBox.classList.remove('is-urgent');
    }
    if (left <= 0) this.fail('paytime');
  }

  // ---------- 5. result ----------
  outcome() {
    const v = this.venue, r = this.r, picks = r.picks;
    const total = Math.max(0, r.doneAt - LEAD);
    const grades = picks.map((i) => v.grade(i));
    const order = ['VIP', 'R', 'S', 'A'];
    const worst = grades.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
    let key;
    if (picks.length === 1) key = 'solo';
    else if (!v.adjacent(picks[0], picks[1])) key = 'split';
    else if (worst === 'VIP') key = total <= this.c.godTime ? 'god' : 'vip2';
    else if (worst === 'R') key = 'r2';
    else key = 'sa2';
    return { key, total, grade: worst };
  }

  finish() {
    const o = this.outcome();
    sfx.done();
    this.showResult(o.key, o);
  }

  fail(key) {
    if (this.pending) this.pending = null;
    // a fail releases what you held
    for (const i of this.r.picks) this.venue.setState(i, TAKEN, this.t);
    this.r.picks = [];
    sfx.fail();
    this.showResult(key, { total: this.t - LEAD, grade: null });
  }

  showResult(key, o) {
    const c = this.c, r = this.r, v = this.venue, d = this.d;
    this.el.classList.remove('is-urgent', 'is-blank');
    d.pTimerBox.classList.remove('is-urgent');
    this.setPhase('result');
    const rank = RANKS[key];
    const ok = rank.score > 0;
    const seats = r.picks.slice().sort((a, b) => a - b);
    const srv = (t) => (t == null ? '—' : clockStr(OPEN_AT + (t - LEAD) * 1000));
    const bookNo = `T2611-${c.id === 'ballad' ? '12' : c.id === 'idol' ? '01' : '05'}-${String(r.posFirst).padStart(6, '0').slice(-6)}`;
    let seatHTML;
    if (!ok) seatHTML = '<p class="stub__noseat">좌석 없음</p>';
    else {
      const b = v.blocks[v.blockOf[seats[0]]];
      const same = seats.length === 1 || (v.blockOf[seats[0]] === v.blockOf[seats[1]] && v.rowOf[seats[0]] === v.rowOf[seats[1]]);
      const nums = seats.map((i) => v.colOf[i] + 1).join(`${WJ}·${WJ}`);
      seatHTML = same
        ? `<p class="stub__grade num">${b.grade}</p><p class="stub__seat"><span class="num">${b.id}</span>구역 <span class="num">${v.rowOf[seats[0]] + 1}</span>열 <span class="num">${nums}</span>번</p>`
        : `<p class="stub__grade num">${o.grade}</p><p class="stub__seat stub__seat--two">${seats.map((i) => `<span>${v.seatName(i)}</span>`).join('')}</p>`;
    }
    const stats = [
      ['오픈 반응', r.rt == null ? '—' : r.rt.toFixed(3) + '초'],
      ['대기 순번', int(r.posFirst) + '번'],
      ['좌석 확정', srv(r.payAt)],
      ['결제 완료', ok ? srv(r.doneAt) : '—'],
      ['이선좌', r.lost + '번'],
      ['새로고침', r.refreshes + '번'],
    ];
    d.stub.className = 'stub' + (ok ? '' : ' stub--void');
    d.stub.innerHTML = `
      <div class="stub__main">
        <div class="stub__top"><span class="stub__brand">앞줄티켓</span><span class="stub__state">${ok ? '예매 완료' : '예매 실패'}</span></div>
        <p class="stub__show">${tidy(c.name)}</p>
        <p class="stub__when">${c.dateShort}, ${c.venue}</p>
        <div class="stub__seatbox">${seatHTML}</div>
        <h2 class="stub__title" id="r-title">${rank.title}</h2>
        <p class="stub__line">${rank.line({ total: o.total, grade: o.grade })}</p>
        <dl class="stub__stats">${stats.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>
        ${ok && r.paid ? `<p class="stub__paid">결제 ${won(r.paid)}${r.disc === 'card' ? ', 앞줄카드 할인' : ''}${r.pen ? `, 결제에서 ${r.pen}초 잃음` : ''}</p>` : ''}
      </div>
      <div class="stub__tear" aria-hidden="true">
        <svg class="stub__bar" viewBox="0 0 120 40" preserveAspectRatio="none">${barcode(bookNo)}</svg>
        <p class="stub__no num">${bookNo}</p>
        <p class="stub__mini">광클 2026.11.20 20:00</p>
      </div>`;
    const best = this.h.onResult(c, { key, score: rank.score, total: o.total, title: rank.title, seat: ok ? (seats.length === 2 && v.adjacent(seats[0], seats[1]) ? `${v.seatName(seats[0])}${WJ}·${WJ}${v.colOf[seats[1]] + 1}번` : seats.map((i) => v.seatName(i)).join(', ')) : '' });
    d.rBest.textContent = best;
    if (ok) {
      d.rLab.textContent = '20:00:00부터 결제 완료까지';
      d.rBig.innerHTML = `<span class="num">${o.total.toFixed(1)}</span><span class="u">초</span>`;
    } else {
      d.rLab.textContent = '이번 판에 잡은 좌석';
      d.rBig.innerHTML = '<span class="num">0</span><span class="u">석</span>';
    }
    this.el.classList.toggle('is-fail', !ok);
    setTimeout(() => d.again.focus({ preventScroll: true }), 40);
  }
}

// Code-39-ish bars from the booking number: purely decorative, deterministic.
function barcode(text) {
  let x = 0, out = '', seed = 7;
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  while (x < 118) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const w = 0.8 + ((seed >> 8) % 3) * 0.9;
    const gap = 0.8 + ((seed >> 12) % 2) * 1.1;
    out += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="40"/>`;
    x += w + gap;
  }
  return out;
}
