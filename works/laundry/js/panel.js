// The washer front: machine kind, course keypad, seven-segment display, start / pause,
// and the laundry basket. Drives the drum through a shortened version of each course.

import { COURSES, STEP_NAMES, ITEMS, DRUM_CAPACITY } from './data.js';
import { seg } from './seg.js';

const $ = (id) => document.getElementById(id);
const RPM = (Math.PI * 2) / 60;
const won = (n) => n.toLocaleString('ko-KR') + '원';
const OBJ = { sock: '양말을', towel: '수건을', shirt: '셔츠를', pants: '바지를' };

export class Panel {
  constructor(drum, { reduced }) {
    this.drum = drum;
    this.reduced = reduced;
    this.kind = 'washer';
    this.ci = 0;
    this.state = 'idle'; // idle | running | paused | done
    this.run = null;
    drum.onStep = (dt) => this.advance(dt);
    drum.onLocked = () => this.flashLock();

    this.buildKinds();
    this.buildKeypad();
    $('m-start').addEventListener('click', () => this.startPause());
    $('m-stop').addEventListener('click', () => this.stop());
    $('basket').addEventListener('click', (e) => {
      const b = e.target.closest('.bkey');
      if (!b) return;
      if (b.id === 'm-empty') this.emptyDrum(); else this.addItem(b.dataset.item);
    });
    this.render();
  }

  get course() { return COURSES[this.kind][this.ci]; }

  // ---------------------------------------------------------------- building
  buildKinds() {
    const group = $('kinds');
    const keys = [...group.querySelectorAll('.kind')];
    const pick = (btn, focus) => {
      if (this.state === 'running' || this.state === 'paused') { this.say('돌아가는 동안은 기계를 바꿀 수 없어요. 멈춘 뒤에 바꿔 주세요.'); return; }
      this.kind = btn.dataset.kind;
      this.ci = 0;
      for (const k of keys) { const on = k === btn; k.setAttribute('aria-checked', String(on)); k.tabIndex = on ? 0 : -1; }
      if (focus) btn.focus();
      this.drum.mode = this.kind;
      this.drum.waterTarget = 0;
      this.state = 'idle';
      this.buildKeypad();
      this.render();
      this.say('');
    };
    group.addEventListener('click', (e) => { const b = e.target.closest('.kind'); if (b) pick(b, false); });
    group.addEventListener('keydown', (e) => {
      const i = keys.indexOf(document.activeElement);
      if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % keys.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + keys.length) % keys.length;
      if (j === null) return;
      e.preventDefault();
      pick(keys[j], true);
    });
  }

  buildKeypad() {
    const pad = $('keypad');
    pad.innerHTML = COURSES[this.kind].map((c, i) => `<button type="button" role="radio" class="ckey" data-i="${i}" aria-checked="${i === this.ci}" tabindex="${i === this.ci ? 0 : -1}">
        <span class="ckey__pilot" aria-hidden="true"></span>
        <span class="ckey__name">${c.name}</span>
        <span class="ckey__meta">${c.min}분</span>
        <span class="ckey__won">${won(c.won)}</span>
      </button>`).join('');
    if (this.bound) return;
    this.bound = true;
    pad.addEventListener('click', (e) => { const b = e.target.closest('.ckey'); if (b) this.pickCourse(Number(b.dataset.i), false); });
    pad.addEventListener('keydown', (e) => {
      const keys = [...pad.querySelectorAll('.ckey')];
      const i = keys.indexOf(document.activeElement);
      if (i < 0) return;
      const cols = getComputedStyle(pad).gridTemplateColumns.split(' ').length;
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % keys.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + keys.length) % keys.length;
      if (e.key === 'ArrowDown') j = Math.min(keys.length - 1, i + cols);
      if (e.key === 'ArrowUp') j = Math.max(0, i - cols);
      if (j === null) return;
      e.preventDefault();
      this.pickCourse(j, true);
    });
  }

  pickCourse(i, focus) {
    const keys = [...$('keypad').querySelectorAll('.ckey')];
    if (this.state === 'running' || this.state === 'paused') {
      this.say('코스는 멈춘 뒤에 바꿀 수 있어요. 진짜 기계도 그래요.');
      if (focus) keys[this.ci].focus();
      return;
    }
    this.ci = i;
    keys.forEach((k, n) => { k.setAttribute('aria-checked', String(n === i)); k.tabIndex = n === i ? 0 : -1; });
    if (focus) keys[i].focus();
    if (this.state === 'done') this.state = 'idle';
    this.render();
  }

  // ---------------------------------------------------------------- running
  startPause() {
    if (this.state === 'running') {
      this.state = 'paused';
      this.drum.target = 0;
      this.drum.coast = false;
      this.drum.accel = 5;
      this.drum.locked = false;
      this.drum.busy = false;
      this.render();
      this.say('일시정지했어요. 문이 열려서 빨래를 더 넣거나 꺼낼 수 있어요.');
      return;
    }
    if (this.drum.load() === 0) { this.say('드럼이 비어 있어요. 빨래를 먼저 넣어 주세요.'); return; }
    if (this.state !== 'paused') {
      const c = this.course;
      const total = c.phases.reduce((s, p) => s + p[1], 0);
      this.run = { pi: 0, t: 0, elapsed: 0, total, said: -1 };
    }
    this.state = 'running';
    this.drum.locked = true;
    this.drum.busy = true;
    this.drum.coast = false;
    this.drum.wake();
    this.render();
  }

  stop() {
    if (this.state === 'idle') { this.say('지금은 멈춰 있어요. 문도 열려 있어요.'); return; }
    this.state = 'idle';
    this.run = null;
    this.drum.target = 0;
    this.drum.coast = true;
    this.drum.waterTarget = 0;
    this.drum.locked = false;
    this.drum.busy = false;
    this.drum.wake();
    this.render();
    this.say('멈췄어요. 물을 빼고 문을 열었어요.');
  }

  advance(dt) {
    if (this.state !== 'running' || !this.run) return;
    const r = this.run, c = this.course;
    r.elapsed += dt;
    r.t += dt;
    while (r.pi < c.phases.length && r.t >= c.phases[r.pi][1]) { r.t -= c.phases[r.pi][1]; r.pi++; }
    if (r.pi >= c.phases.length) { this.finish(); return; }
    const [name, dur, set] = c.phases[r.pi];
    const d = this.drum;
    if (set.spin) {
      const f = r.t / dur, max = set.spin;
      d.waterTarget = 0;
      let rpm;
      if (f < 0.16) rpm = 60;
      else if (f < 0.3) rpm = 95;
      else if (f < 0.84) rpm = max;
      else rpm = 0;
      d.accel = f < 0.84 ? (f < 0.3 ? 4 : 3.2) : 9;
      d.target = rpm * RPM;
    } else {
      const cyc = 5.8, k = Math.floor(r.t / cyc), within = r.t - k * cyc;
      const dir = set.rpm < 0 ? (k % 2 ? -1 : 1) : 1;
      d.target = within < 5 || set.rpm > 0 ? dir * Math.abs(set.rpm) * RPM : 0;
      d.accel = 7;
      d.waterTarget = this.kind === 'washer' ? (set.water ?? 0) : 0;
    }
    if (r.said !== r.pi) { r.said = r.pi; this.render(); }
    this.renderClock();
  }

  finish() {
    this.state = 'done';
    this.run = null;
    this.drum.target = 0;
    this.drum.coast = true;
    this.drum.locked = false;
    this.drum.busy = false;
    this.drum.waterTarget = 0;
    this.render();
  }

  // ---------------------------------------------------------------- basket
  addItem(kind) {
    if (this.drum.locked) { this.flashLock(); this.say('돌아가는 동안은 문이 잠겨 있어요. 일시정지하면 열려요.'); return; }
    const item = ITEMS[kind];
    const load = this.drum.load();
    if (load + item.load > DRUM_CAPACITY) { this.say("더 넣을 수 없어요. 드럼이 꽉 찼어요. 남은 빨래는 다음 판에 빨아 주세요."); return; }
    this.drum.add(kind, item.load);
    const now = load + item.load;
    if (this.state === 'done') this.state = 'idle';
    this.render();
    if (now > 7) this.say(`${OBJ[kind]} 넣었어요. 드럼의 3분의 2를 넘었어요. 더 넣으면 빨래가 잘 안 움직여서 덜 빨려요.`);
    else this.say(`${OBJ[kind]} 넣었어요.`);
  }

  emptyDrum() {
    if (this.drum.locked) { this.flashLock(); this.say('돌아가는 동안은 문이 잠겨 있어요. 일시정지하면 열려요.'); return; }
    if (!this.drum.load()) { this.say('드럼이 이미 비어 있어요.'); return; }
    this.drum.empty();
    if (this.state === 'done' || this.state === 'paused') { this.state = 'idle'; this.run = null; this.drum.busy = false; }
    this.render();
    this.say('다 꺼냈어요.');
  }

  flashLock() {
    const el = $('m-lock');
    el.hidden = false;
    clearTimeout(this.lockTimer);
    this.lockTimer = setTimeout(() => { el.hidden = true; }, 1600);
  }

  say(text) {
    const el = $('m-msg');
    if (el.textContent === text) el.textContent = '';
    el.textContent = text;
  }

  // ---------------------------------------------------------------- display
  minutesLeft() {
    const c = this.course;
    if (!this.run) return c.min;
    return Math.max(1, Math.ceil(c.min * (1 - this.run.elapsed / this.run.total)));
  }

  renderClock() {
    const text = this.state === 'done' ? 'End' : String(this.minutesLeft()).padStart(2, ' ');
    const el = $('m-seg');
    if (el.dataset.t !== text) { el.innerHTML = seg(text); el.dataset.t = text; }
  }

  render() {
    const c = this.course;
    const s = this.state;
    const running = s === 'running', paused = s === 'paused';
    const phase = this.run && this.run.pi < c.phases.length ? c.phases[this.run.pi][0] : null;
    $('m-led').dataset.state = s === 'idle' ? 'free' : s === 'done' ? 'done' : 'run';
    $('m-phase').textContent = s === 'idle' ? `${c.name} 코스 대기 중` : s === 'done' ? '끝' : paused ? '일시정지' : phase;
    this.renderClock();

    // step pilots: 세탁 / 헹굼 / 탈수 (washer), 건조 / 식힘 (dryer)
    const names = STEP_NAMES[this.kind];
    let cur = -1;
    if (this.run) {
      for (let i = 0; i <= Math.min(this.run.pi, c.phases.length - 1); i++) {
        const n = names.indexOf(c.phases[i][0] === '급수' ? names[0] : c.phases[i][0]);
        if (n >= 0) cur = n;
      }
    }
    if (s === 'done') cur = names.length;
    $('m-steps').innerHTML = names.map((n, i) => `<li class="${i < cur ? 'is-past' : i === cur ? 'is-now' : ''}"><span></span>${n}</li>`).join('');

    let line;
    if (s === 'idle') line = `${c.name} ${won(c.won)}, ${c.min}분, ${c.kg}kg까지. ${c.note}`;
    else if (s === 'done') line = '끝났어요. 문을 열고 꺼내 주세요.';
    else if (paused) line = '일시정지했어요. 시작을 누르면 이어서 돌아요.';
    else line = phase === '탈수' ? '탈수 중이에요. 빨래가 드럼 벽에 붙어 물이 빠져요.' : `${phase} 중이에요. 체험이라 1분 안쪽으로 줄였어요.`;
    const lineEl = $('m-line');
    if (lineEl.textContent !== line) lineEl.textContent = line;

    $('m-start-label').textContent = running ? '일시정지' : paused ? '다시 시작' : s === 'done' ? '다시 돌리기' : '시작';
    $('m-start').classList.toggle('is-on', running);
    $('machine').dataset.state = s;
    for (const k of $('keypad').querySelectorAll('.ckey')) k.setAttribute('aria-disabled', String(running || paused));
    for (const k of $('kinds').querySelectorAll('.kind')) k.setAttribute('aria-disabled', String(running || paused));
    for (const k of $('basket').querySelectorAll('.bkey')) k.setAttribute('aria-disabled', String(running));
    this.drum.canvas.classList.toggle('is-locked', running);
    const load = this.drum.load();
    $('m-load').innerHTML = `<span>드럼 <b>${load}</b>/${DRUM_CAPACITY}</span><span class="meter" aria-hidden="true"><span style="width:${load * 10}%"></span></span>`;
  }
}
