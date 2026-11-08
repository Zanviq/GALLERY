// Interactive timetable: stages x time, stage filter, "my picks" kept in localStorage, clash marks.

const START = 13 * 60;          // grid starts 13:00
const SLOT = 5;                 // minutes per grid row
const ROWS = (12 * 60) / SLOT;  // until 01:00

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const hh = h < 6 ? h + 24 : h;
  return hh * 60 + m - START;
};
const isKo = (s) => /[가-힣]/.test(s);
const CHECK = '<svg class="act__check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

export class Timetable {
  constructor(root, { data, store, getDay, announce }) {
    this.root = root;
    this.data = data;
    this.store = store;
    this.getDay = getDay;
    this.announce = announce;
    this.stages = data.stages;
    this.gridEl = root.querySelector('.tt__grid');
    this.panel = root.querySelector('.tt__panel');
    this.empty = root.querySelector('.tt__empty');
    this.onlyBtn = root.querySelector('[data-picks-only]');
    this.countEl = root.querySelector('[data-picks-count]');
    this.stage = 'all';
    this.only = false;
    this.picks = new Set(store.get('picks', []));
    this.mq = window.matchMedia('(max-width: 720px)');

    root.querySelectorAll('input[name="stage"]').forEach((r) => {
      r.addEventListener('change', () => { if (r.checked) { this.stage = r.value; this.render(); } });
    });
    this.onlyBtn.addEventListener('click', () => {
      this.only = !this.only;
      this.onlyBtn.setAttribute('aria-pressed', String(this.only));
      this.render();
    });
    root.querySelector('[data-show-all]').addEventListener('click', () => {
      this.only = false;
      this.onlyBtn.setAttribute('aria-pressed', 'false');
      this.render();
      this.onlyBtn.focus();
    });
    this.gridEl.addEventListener('click', (e) => {
      const b = e.target.closest('.act');
      if (b) this.togglePick(b.dataset.id);
    });
    this.mq.addEventListener('change', () => this.render());
    this.render();
  }

  dayActs() {
    const day = this.getDay();
    return this.data.acts.filter((a) => a.day === day);
  }

  clashes(acts) {
    const picked = acts.filter((a) => this.picks.has(a.id));
    const out = new Set();
    for (let i = 0; i < picked.length; i++) {
      for (let j = i + 1; j < picked.length; j++) {
        const a = picked[i], b = picked[j];
        if (toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end)) { out.add(a.id); out.add(b.id); }
      }
    }
    return out;
  }

  togglePick(id) {
    const act = this.data.acts.find((a) => a.id === id);
    if (this.picks.has(id)) this.picks.delete(id); else this.picks.add(id);
    this.store.set('picks', [...this.picks]);
    const on = this.picks.has(id);
    this.update();
    const clash = this.clashes(this.dayActs()).has(id);
    this.announce(`${act.name} ${on ? '내 선택에 담았어요' : '내 선택에서 뺐어요'}.${on && clash ? ' 다른 공연과 시간이 겹쳐요.' : ''}`);
    if (this.only && !on) this.render();
  }

  // update pressed / clash state without rebuilding (keeps focus where it is)
  update() {
    const acts = this.dayActs();
    const clash = this.clashes(acts);
    this.gridEl.querySelectorAll('.act').forEach((b) => {
      const id = b.dataset.id;
      b.setAttribute('aria-pressed', String(this.picks.has(id)));
      b.classList.toggle('is-clash', clash.has(id));
    });
    this.countEl.textContent = String(this.picks.size);
  }

  actButton(a, stageName) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'act';
    b.dataset.id = a.id;
    b.setAttribute('aria-pressed', String(this.picks.has(a.id)));
    b.innerHTML =
      `<span class="act__name${isKo(a.name) ? ' is-ko' : ''}"></span>` +
      `<span class="act__time"></span>` +
      `<span class="act__genre"></span>` +
      `<span class="act__clash">시간 겹침</span>` + CHECK;
    b.querySelector('.act__name').textContent = a.name;
    if (!isKo(a.name)) b.querySelector('.act__name').lang = 'en';
    b.querySelector('.act__time').textContent = `${a.start}–${a.end}`;
    b.querySelector('.act__genre').textContent = stageName ? `${a.genre}, ${stageName}` : a.genre;
    if (!stageName) {
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = `, ${this.stages.find((s) => s.id === a.stage).name}`;
      b.querySelector('.act__time').after(sr);
    }
    return b;
  }

  render() {
    const day = this.getDay();
    const all = this.dayActs();
    const acts = all.filter((a) => (this.stage === 'all' || a.stage === this.stage) && (!this.only || this.picks.has(a.id)));
    const noPicks = this.only && acts.length === 0;
    this.empty.hidden = !noPicks;
    this.gridEl.hidden = noPicks;
    this.gridEl.textContent = '';
    this.countEl.textContent = String(this.picks.size);
    const tab = this.root.querySelector(`[role="tab"][data-day="${day}"]`);
    if (tab) this.panel.setAttribute('aria-labelledby', tab.id);
    if (noPicks) return;

    if (this.mq.matches) this.renderList(acts);
    else this.renderGrid(acts);
    this.update();
  }

  renderGrid(acts) {
    const stages = this.stage === 'all' ? this.stages : this.stages.filter((s) => s.id === this.stage);
    const g = document.createElement('div');
    g.className = 'tgrid';
    g.style.setProperty('--cols', stages.length);
    const corner = document.createElement('div');
    corner.className = 'tgrid__corner';
    g.appendChild(corner);
    stages.forEach((s, i) => {
      const h = document.createElement('div');
      h.className = 'tgrid__stage';
      h.style.gridColumn = String(i + 2);
      h.innerHTML = '<i aria-hidden="true"></i><b></b><span></span>';
      h.querySelector('i').textContent = String(this.stages.indexOf(s) + 1);
      h.querySelector('b').textContent = s.name;
      h.querySelector('span').textContent = s.note;
      g.appendChild(h);
      const col = document.createElement('div');
      col.className = 'tgrid__col';
      col.style.gridColumn = String(i + 2);
      g.appendChild(col);
    });
    for (let hr = 0; hr < 12; hr++) {
      const h = document.createElement('div');
      h.className = 'tgrid__hour';
      const row = 2 + (hr * 60) / SLOT;
      h.style.gridRow = `${row} / span ${60 / SLOT}`;
      h.textContent = `${String((13 + hr) % 24).padStart(2, '0')}:00`;
      h.setAttribute('aria-hidden', 'true');
      g.appendChild(h);
    }
    const sorted = acts.slice().sort((a, b) => toMin(a.start) - toMin(b.start));
    sorted.forEach((a) => {
      const col = stages.findIndex((s) => s.id === a.stage);
      if (col < 0) return;
      const b = this.actButton(a, null);
      const r0 = 2 + toMin(a.start) / SLOT;
      const r1 = 2 + toMin(a.end) / SLOT;
      b.style.gridColumn = String(col + 2);
      b.style.gridRow = `${r0} / ${Math.min(r1, ROWS + 2)}`;
      g.appendChild(b);
    });
    this.gridEl.appendChild(g);
  }

  renderList(acts) {
    const wrap = document.createElement('div');
    wrap.className = 'tlist';
    const sorted = acts.slice().sort((a, b) => toMin(a.start) - toMin(b.start));
    let hour = null;
    sorted.forEach((a) => {
      const h = a.start.slice(0, 2);
      if (h !== hour) {
        hour = h;
        const hh = document.createElement('p');
        hh.className = 'tlist__hour';
        hh.setAttribute('aria-hidden', 'true');
        hh.textContent = `${h}:00`;
        wrap.appendChild(hh);
      }
      const stage = this.stages.find((s) => s.id === a.stage);
      wrap.appendChild(this.actButton(a, stage.name));
    });
    this.gridEl.appendChild(wrap);
  }
}
