// Sound dock: play/stop, the 16-step lights and the pattern editor (4 rows x 16 steps).
import { Band, SONGS, TRACKS } from './audio.js';

export class Dock {
  constructor(root, { band, reduced, getDay, announce, onState }) {
    this.root = root;
    this.band = band;
    this.reduced = reduced;
    this.getDay = getDay;
    this.announce = announce;
    this.onState = onState || (() => {});
    this.play = root.querySelector('[data-sound]');
    this.label = root.querySelector('.dock__label');
    this.stepsEl = root.querySelector('[data-steps]');
    this.bpmEl = root.querySelector('[data-bpm]');
    this.toggle = root.querySelector('[data-seq-toggle]');
    this.panel = root.querySelector('#seq-panel');
    this.grid = root.querySelector('[data-seq]');
    this.dayEl = root.querySelector('[data-seq-day]');
    this.err = root.querySelector('.dock__err');
    this.raf = 0;
    this.lastEvent = 0;
    this.nowStep = -1;
    this.hiddenPause = false;
    this.focus = { r: 0, c: 0 };

    for (let i = 0; i < 16; i++) this.stepsEl.appendChild(document.createElement('i'));
    this.lights = [...this.stepsEl.children];

    if (!Band.supported()) {
      this.play.disabled = true;
      this.err.hidden = false;
    }
    this.play.addEventListener('click', () => this.togglePlay());
    this.toggle.addEventListener('click', () => this.setPanel(this.panel.hidden));
    root.querySelector('[data-seq-reset]').addEventListener('click', () => {
      this.band.resetDay(this.getDay());
      this.renderGrid();
      this.announce('원래 패턴으로 돌렸어요.');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.panel.hidden) {
        this.setPanel(false);
        this.toggle.focus();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.panel.hidden && !this.root.contains(e.target)) this.setPanel(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.band.playing) {
        this.hiddenPause = true;
        this.stop(true);
      } else if (!document.hidden && this.hiddenPause) {
        this.hiddenPause = false;
        this.start(true);
      }
    });
    band.on((type) => { if (type === 'day') this.setDayLabels(); });
    this.grid.addEventListener('keydown', (e) => this.gridKeys(e));
    this.setDayLabels();
    this.renderGrid();
  }

  setDayLabels() {
    const day = this.getDay();
    const song = SONGS[this.band.playing ? this.band.pendingDay || this.band.day : day];
    this.bpmEl.textContent = `${song.bpm} BPM`;
  }

  dayChanged() {
    this.band.setDay(this.getDay());
    this.setDayLabels();
    this.renderGrid();
  }

  setPanel(open) {
    this.panel.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      this.renderGrid();
      const cell = this.grid.querySelector('[tabindex="0"]');
      if (cell) cell.focus();
    }
  }

  async togglePlay() {
    if (this.band.playing) this.stop(false);
    else this.start(false);
  }

  async start(quiet) {
    try {
      this.band.setDay(this.getDay());
      this.play.classList.add('is-on');
      this.label.textContent = '소리 끄기';
      await this.band.start();
      this.setDayLabels();
      this.onState(true);
      if (!quiet) this.announce(`소리를 켰어요. ${SONGS[this.band.day].bpm} BPM.`);
      this.tick();
    } catch (e) {
      this.play.classList.remove('is-on');
      this.label.textContent = '소리 켜기';
      this.play.disabled = true;
      this.err.hidden = false;
    }
  }

  async stop(quiet) {
    this.play.classList.remove('is-on');
    this.label.textContent = '소리 켜기';
    this.lights.forEach((l) => l.classList.remove('is-on'));
    this.markNow(-1);
    this.onState(false);
    if (!quiet) this.announce('소리를 껐어요.');
    await this.band.stop();
  }

  tick() {
    if (this.raf) return;
    const loop = () => {
      this.raf = 0;
      if (!this.band.playing) return;
      const now = this.band.now;
      for (const ev of this.band.events) {
        if (ev.time > this.lastEvent && ev.time <= now) {
          this.lastEvent = ev.time;
          // the step lights run under reduced motion too (a small light, not movement)
          this.lights.forEach((l, i) => l.classList.toggle('is-on', i === ev.step));
          this.markNow(ev.step);
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  markNow(step) {
    if (this.panel.hidden || step === this.nowStep) return;
    this.nowStep = step;
    this.grid.querySelectorAll('.is-now').forEach((c) => c.classList.remove('is-now'));
    if (step < 0) return;
    this.grid.querySelectorAll(`[data-c="${step}"]`).forEach((c) => c.classList.add('is-now'));
  }

  renderGrid() {
    const day = this.getDay();
    const d = { fri: '9.3 들물', sat: '9.4 만조', sun: '9.5 썰물' }[day];
    this.dayEl.textContent = d;
    const rows = this.band.rows[day];
    this.grid.textContent = '';
    TRACKS.forEach((tr, r) => {
      const row = document.createElement('div');
      row.className = 'seq__row';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', tr.label);
      const lab = document.createElement('span');
      lab.className = 'seq__label';
      lab.setAttribute('aria-hidden', 'true');
      lab.textContent = tr.label;
      row.appendChild(lab);
      for (let c = 0; c < 16; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'seq__cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute('aria-pressed', String(rows[tr.id][c]));
        cell.setAttribute('aria-label', `${tr.label} ${c + 1}번째 칸`);
        cell.tabIndex = r === this.focus.r && c === this.focus.c ? 0 : -1;
        cell.addEventListener('click', () => {
          const on = this.band.toggleCell(day, tr.id, c);
          cell.setAttribute('aria-pressed', String(on));
          this.setFocus(r, c, false);
        });
        row.appendChild(cell);
      }
      this.grid.appendChild(row);
    });
  }

  setFocus(r, c, move = true) {
    this.focus = { r, c };
    this.grid.querySelectorAll('.seq__cell').forEach((el) => {
      el.tabIndex = Number(el.dataset.r) === r && Number(el.dataset.c) === c ? 0 : -1;
    });
    if (move) {
      const el = this.grid.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (el) el.focus();
    }
  }

  gridKeys(e) {
    const { r, c } = this.focus;
    let nr = r, nc = c;
    if (e.key === 'ArrowRight') nc = (c + 1) % 16;
    else if (e.key === 'ArrowLeft') nc = (c + 15) % 16;
    else if (e.key === 'ArrowDown') nr = (r + 1) % TRACKS.length;
    else if (e.key === 'ArrowUp') nr = (r + TRACKS.length - 1) % TRACKS.length;
    else if (e.key === 'Home') nc = 0;
    else if (e.key === 'End') nc = 15;
    else return;
    e.preventDefault();
    this.setFocus(nr, nc);
  }
}
