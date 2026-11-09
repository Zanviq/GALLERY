// Machine wall, headline sentences, machine sheet with "끝나면 알려 주기", and the toast.

import { BRANCHES, KIND, GROUPS, FAKE_NOTE } from './data.js';
import { seg, tileText, clockText } from './seg.js';

const MIN = 60000;
const $ = (id) => document.getElementById(id);

// Contents of the porthole on a tile, by state. Simple shapes in the clothes colours.
const LOAD_RUN = '<svg class="mc__load" viewBox="-20 -20 40 40" aria-hidden="true" focusable="false">' +
  '<path d="M-11 3c3-4 9-5 12-1 2 3-1 7-6 7s-8-2-6-6z" class="ld-a"/>' +
  '<path d="M3 -12c4-2 9 0 9 4s-4 6-8 5-5-7-1-9z" class="ld-b"/>' +
  '<path d="M6 6c3 0 6 2 5 5s-6 3-8 1 0-6 3-6z" class="ld-c"/></svg>';
const LOAD_DONE = '<svg class="mc__load" viewBox="-20 -20 40 40" aria-hidden="true" focusable="false">' +
  '<path d="M-13 9c2-5 8-6 13-4s9 0 11 3c1 3-2 6-12 6s-13-1-12-5z" class="ld-a"/>' +
  '<path d="M-6 4c2-3 7-3 9 0 1 2-2 3-5 3s-5-1-4-3z" class="ld-b"/>' +
  '<path d="M5 6c3-2 7-1 7 1s-3 3-6 2-3-2-1-3z" class="ld-c"/></svg>';

function minutesWord(ms) {
  return ms < MIN ? '1분 안에' : `${Math.ceil(ms / MIN)}분`;
}

function clockKo(t) {
  const d = new Date(t);
  const h = d.getHours(), m = d.getMinutes();
  const half = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${hh}시 ${m}분`;
}

export class Board {
  constructor(sim, { reduced }) {
    this.sim = sim;
    this.reduced = reduced;
    this.branchId = BRANCHES[0].id;
    this.watch = new Set(); // "branchId:num"
    this.tiles = new Map();
    this.visible = true;
    this.open = null; // machine in the sheet
    this.lastHeadline = '';
    this.titleBase = document.title;

    this.wall = $('wall');
    this.sheet = $('sheet');
    this.buildBranchKeys();
    this.bindSheet();
    this.bindToast();

    const io = new IntersectionObserver((es) => {
      this.visible = es[0].isIntersecting;
      document.getElementById('board').classList.toggle('is-off', !this.visible);
      if (this.visible) this.update(true);
    });
    io.observe(this.wall);

    const clearTitle = () => { if (!document.hidden) document.title = this.titleBase; };
    window.addEventListener('focus', clearTitle);
    document.addEventListener('visibilitychange', clearTitle);
  }

  buildBranchKeys() {
    const row = $('branch-keys');
    row.innerHTML = BRANCHES.map((b) =>
      `<label class="bk"><input type="radio" name="branch" value="${b.id}"><span>${b.name}</span></label>`).join('');
    row.addEventListener('change', (e) => {
      if (e.target.name === 'branch') this.setBranch(e.target.value, true);
    });
  }

  setBranch(id, user = false) {
    if (!BRANCHES.some((b) => b.id === id)) id = BRANCHES[0].id;
    this.branchId = id;
    const input = document.querySelector(`input[name="branch"][value="${id}"]`);
    if (input) input.checked = true;
    if (user) {
      try { localStorage.setItem('ppodeuk.branch', id); } catch (e) { /* storage unavailable */ }
    }
    this.st = this.sim.branch(id);
    this.renderWall();
    this.renderInfo();
    this.renderLost();
    this.update(true);
    this.onBranch?.(this.st.branch);
  }

  renderWall() {
    const { machines } = this.st;
    this.tiles.clear();
    this.wall.innerHTML = GROUPS.map((g) => {
      const list = machines.filter((m) => KIND[m.kind].group === g.id);
      if (!list.length) return '';
      return `<div class="wall__group" data-group="${g.id}">
        <h2 class="wall__title">${g.name} <span class="wall__count" data-count="${g.id}"></span></h2>
        <div class="wall__row">${list.map((m) => this.tileHTML(m)).join('')}</div></div>`;
    }).join('');
    for (const el of this.wall.querySelectorAll('.mc')) {
      const m = machines.find((x) => x.num === Number(el.dataset.num));
      this.tiles.set(m.num, { el, m, segText: '', word: '', label: '', state: '' });
      el.addEventListener('click', () => this.openSheet(m, el));
    }
  }

  tileHTML(m) {
    const k = KIND[m.kind];
    const dry = m.kind === 'dryer' || m.kind === 'shoedry' || m.kind === 'petdry';
    const tag = k.group === 'special' ? k.short : `${m.kg}kg`;
    return `<button class="mc mc--${k.group}${dry ? ' mc--dry' : ''}" type="button" data-num="${m.num}">
      <span class="mc__top"><span class="mc__num" aria-hidden="true">${m.num}</span><span class="mc__led" aria-hidden="true"></span><span class="mc__seg" aria-hidden="true"></span></span>
      <span class="mc__door" aria-hidden="true"><span class="mc__glass"></span></span>
      <span class="mc__word"></span>
      <span class="mc__tag" aria-hidden="true">${tag}</span>
      <span class="mc__mine" aria-hidden="true">내 빨래</span>
    </button>`;
  }

  words(m, now) {
    if (m.state === 'free') return { word: '비어 있음', label: '비어 있음' };
    if (m.state === 'done') return { word: '끝남', label: '끝남, 꺼내 주세요' };
    const left = m.endsAt - now;
    if (left < MIN) return { word: '곧 끝남', label: '돌아가는 중, 곧 끝남' };
    return { word: `${minutesWord(left)} 남음`, label: `돌아가는 중, ${minutesWord(left)} 남음` };
  }

  // Called every second by main.js, and on demand.
  update(force = false) {
    const finished = this.sim.tick();
    for (const f of finished) this.finished(f.branch, f.machine);
    if (!this.st) return;
    const now = this.sim.now();
    if (this.visible || force) {
      for (const t of this.tiles.values()) {
        const m = t.m;
        const segText = tileText(m.state, m.endsAt - now);
        const { word, label } = this.words(m, now);
        if (t.state !== m.state) { t.el.dataset.state = m.state; t.state = m.state; t.el.querySelector('.mc__glass').innerHTML = m.state === 'run' ? LOAD_RUN : m.state === 'done' ? LOAD_DONE : ''; }
        if (t.segText !== segText) { t.el.querySelector('.mc__seg').innerHTML = seg(segText); t.segText = segText; }
        if (t.word !== word) { t.el.querySelector('.mc__word').textContent = word; t.word = word; }
        const mine = this.watch.has(`${this.branchId}:${m.num}`);
        t.el.classList.toggle('is-mine', mine);
        const full = `${m.num}번 ${KIND[m.kind].name}, ${label}, ${m.kg}kg${mine ? ", 내 빨래" : ""}`;
        if (t.label !== full) { t.el.setAttribute('aria-label', full); t.label = full; }
      }
      this.renderCounts(now);
    }
    if (this.open) this.renderSheet();
  }

  renderCounts(now) {
    const ms = this.st.machines;
    const by = (g) => ms.filter((m) => KIND[m.kind].group === g);
    for (const g of GROUPS) {
      const el = this.wall.querySelector(`[data-count="${g.id}"]`);
      if (!el) continue;
      const list = by(g.id);
      const free = list.filter((m) => m.state === 'free').length;
      el.textContent = `${list.length}대 중 ${free}대 비어 있음`;
    }
    const w = by('washer'), d = by('dryer');
    const wf = w.filter((m) => m.state === 'free').length;
    const df = d.filter((m) => m.state === 'free').length;
    const name = this.st.branch.name;
    let head, branch;
    if (wf && df) { branch = `${name}에`; head = `빈 세탁기 ${wf}대, 빈 건조기 ${df}대가 있어요.`; }
    else if (wf) { branch = `${name}에`; head = `빈 세탁기 ${wf}대가 있어요. 건조기는 다 쓰는 중이에요.`; }
    else if (df) { branch = `${name}에`; head = `빈 세탁기는 없고, 빈 건조기 ${df}대가 있어요.`; }
    else { branch = `${name}은`; head = '세탁기와 건조기가 다 차 있어요.'; }
    if (head + branch !== this.lastHeadline) {
      $('board-branch').textContent = branch;
      $('board-headline').textContent = head;
      if (this.lastHeadline) $('board-live').textContent = `${branch} ${head}`;
      this.lastHeadline = head + branch;
    }
    const soonest = (list) => list.filter((m) => m.state === 'run').sort((a, b) => a.endsAt - b.endsAt)[0];
    const parts = [];
    const sw = soonest(w), sd = soonest(d);
    if (sw) {
      const l = sw.endsAt - now;
      parts.push(l < MIN ? `다음에 끝나는 세탁기는 ${sw.num}번, 1분 안에 끝나요.` : `다음에 끝나는 세탁기는 ${sw.num}번, ${Math.ceil(l / MIN)}분 남았어요.`);
    }
    if (sd) {
      const l = sd.endsAt - now;
      parts.push(`건조기는 ${sd.num}번이 ${l < MIN ? '곧' : `${Math.ceil(l / MIN)}분 뒤에`} 끝나요.`);
    }
    const waiting = ms.filter((m) => m.state === 'done').length;
    if (waiting) parts.push(`끝나고 주인을 기다리는 기계가 ${waiting}대 있어요.`);
    const next = parts.join(' ');
    const el = $('board-next');
    if (el.textContent !== next) el.textContent = next;
  }

  renderInfo() {
    const b = this.st.branch;
    const count = (g) => b.machines.filter((m) => KIND[m.kind].group === g).length;
    const special = b.machines.filter((m) => KIND[m.kind].group === 'special').map((m) => KIND[m.kind].name);
    $('branch-info').innerHTML = `<dl class="info">
      <div><dt>주소</dt><dd>${b.addr}<small class="fake-note">${FAKE_NOTE}</small></dd></div>
      <div><dt>찾아오기</dt><dd>${b.way}</dd></div>
      <div><dt>기계</dt><dd>세탁기 ${count('washer')}대, 건조기 ${count('dryer')}대${special.length ? `, ${special.join('와 ')}` : ''}</dd></div>
      <div><dt>주차</dt><dd>${b.parking}</dd></div>
      <div><dt>여는 시간</dt><dd>24시간, 1년 내내</dd></div></dl>`;
  }

  renderLost() {
    const b = this.st.branch;
    $('lost-branch').textContent = `${b.name} 바구니에 지금 있는 것`;
    const today = new Date();
    $('lost-list').innerHTML = b.lost.map(([what, days, where]) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
      const left = 14 - days;
      return `<li><span class="lost__what">${what}</span><span class="lost__meta">${d.getMonth() + 1}월 ${d.getDate()}일, ${where}에서</span><span class="lost__left">${left}일 더 보관</span></li>`;
    }).join('');
  }

  // ---------------------------------------------------------------- sheet
  bindSheet() {
    $('notify').addEventListener('click', () => {
      if (!this.open) return;
      const key = `${this.branchId}:${this.open.num}`;
      if (this.watch.has(key)) this.watch.delete(key); else this.watch.add(key);
      this.update(true);
    });
    this.sheet.addEventListener('close', () => {
      const back = this.openFrom;
      this.open = null;
      if (back && document.contains(back)) back.focus();
    });
    // tap on the backdrop closes
    this.sheet.addEventListener('click', (e) => { if (e.target === this.sheet) this.sheet.close(); });
  }

  openSheet(m, from) {
    this.open = m;
    this.openFrom = from;
    this.renderSheet();
    if (!this.sheet.open) this.sheet.showModal();
  }

  renderSheet() {
    const m = this.open;
    const now = this.sim.now();
    const k = KIND[m.kind];
    const key = `${this.branchId}:${m.num}`;
    const mine = this.watch.has(key);
    $('sheet-title').textContent = `${m.num}번 ${k.name}`;
    $('sheet-spec').textContent = `${this.st.branch.name}, ${m.kg}kg`;
    this.sheet.dataset.state = m.state;
    $('s-led').dataset.state = m.state;
    let phase, segText, state;
    if (m.state === 'free') {
      phase = '비어 있음'; segText = '--:--';
      state = `지금 쓸 수 있어요. 키오스크에서 ${m.num}번을 누르세요.`;
    } else if (m.state === 'done') {
      phase = '끝남'; segText = 'End';
      const ago = Math.max(0, Math.floor((now - m.doneAt) / MIN));
      state = mine ? '내 빨래가 끝났어요. 다음 분을 위해 10분 안에 꺼내 주세요.'
        : ago < 1 ? '방금 끝났어요. 주인이 곧 꺼내 갈 거예요.' : `끝난 지 ${ago}분 됐어요. 주인이 곧 꺼내 갈 거예요.`;
    } else {
      const left = m.endsAt - now;
      phase = `${m.course[0]} 코스`; segText = clockText(left);
      state = `돌아가는 중이에요. ${clockKo(m.endsAt)}쯤 끝나요.`;
    }
    $('s-phase').textContent = phase;
    const segEl = $('s-seg');
    if (segEl.dataset.t !== segText) { segEl.innerHTML = seg(segText); segEl.dataset.t = segText; }
    $('sheet-state').textContent = state;
    const btn = $('notify');
    const canWatch = m.state === 'run';
    btn.hidden = !canWatch;
    btn.setAttribute('aria-pressed', String(mine && canWatch));
    btn.querySelector('.key__label').textContent = mine ? '알려 드릴게요 (끄기)' : '끝나면 알려 주기';
    const note = $('sheet-note');
    note.hidden = !canWatch;
    if (canWatch) {
      let t = '이 페이지를 열어 둔 동안 화면 위쪽에 알려 드려요. 알림 권한은 묻지 않아요.';
      if (this.sim.speed === 1 && m.endsAt - now > 3 * MIN) t += ' 빨리 감기를 켜면 금방 볼 수 있어요.';
      if (note.textContent !== t) note.textContent = t;
    }
  }

  // ---------------------------------------------------------------- notifications
  finished(branch, m) {
    const key = `${branch.id}:${m.num}`;
    if (!this.watch.has(key)) return;
    this.toast(`${branch.name} ${m.num}번 ${KIND[m.kind].name}가 끝났어요. 꺼내 주세요.`);
    try {
      if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate([180, 90, 180]);
    } catch (e) { /* no vibration */ }
    if (document.hidden || !document.hasFocus()) document.title = '(끝남) ' + this.titleBase;
  }

  bindToast() {
    $('toast-close').addEventListener('click', () => this.hideToast());
  }

  toast(text) {
    const t = $('toast');
    $('toast-text').textContent = text;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.hideToast(), 12000);
  }

  hideToast() {
    $('toast').hidden = true;
  }
}
