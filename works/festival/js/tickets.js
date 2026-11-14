// Ticket stubs with an in-page "reserved" state. Nothing is sent anywhere; the state lives in localStorage.

const TIERS = [
  { id: 'early', name: '얼리 사흘권', inc: '사흘 모두 입장, 재입장 자유.', price: 179000, soldout: true, soldNote: '6월 30일에 마감됐어요.' },
  { id: 'day', name: '하루권', inc: '고른 날 하루 입장, 재입장 자유.', price: 99000, pickDay: true },
  { id: 'three', name: '사흘권', inc: '사흘 모두 입장, 재입장 자유. 서울 직행버스를 먼저 예약할 수 있어요.', price: 209000 },
  { id: 'camp', name: '사흘권 + 캠핑', inc: '사흘 입장에 캠핑장 텐트 자리 2박(금, 토). 텐트는 직접 가져와요. 샤워장과 콘센트가 있어요.', price: 289000 },
];
const DAYS = { fri: '9월 3일 금요일', sat: '9월 4일 토요일', sun: '9월 5일 일요일' };
const MAX = 4;
const won = (n) => n.toLocaleString('ko-KR');
const MINUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>';

function code() {
  const a = new Uint16Array(1);
  (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : (a[0] = Math.floor(Math.random() * 65535));
  return 'NE27-' + String(1000 + (a[0] % 9000));
}

export class Tickets {
  constructor(list, { store, getDay, announce }) {
    this.list = list;
    this.store = store;
    this.getDay = getDay;
    this.announce = announce;
    this.saved = store.get('tickets', {});
    this.qty = {};
    this.day = {};
    TIERS.forEach((t) => {
      this.qty[t.id] = 1;
      this.day[t.id] = null;
      list.appendChild(this.stub(t));
    });
  }

  stub(t) {
    const li = document.createElement('li');
    li.className = 'stub' + (t.soldout ? ' is-soldout' : '');
    li.dataset.tier = t.id;
    const main = document.createElement('div');
    main.className = 'stub__main';
    main.innerHTML = `<h3 class="stub__name"></h3><p class="stub__inc"></p><p class="stub__price"><b></b><span>원</span></p>`;
    main.querySelector('.stub__name').textContent = t.name;
    main.querySelector('.stub__inc').textContent = t.inc;
    main.querySelector('.stub__price b').textContent = won(t.price);
    if (t.soldout) main.querySelector('.stub__price').insertAdjacentHTML('beforeend', '<span class="sr-only">, 마감</span>');
    if (t.pickDay) {
      const fs = document.createElement('fieldset');
      fs.className = 'seg stub__days';
      fs.innerHTML = '<legend class="sr-only">입장할 날</legend>';
      [['fri', '9.3\u00a0금'], ['sat', '9.4\u00a0토'], ['sun', '9.5\u00a0일']].forEach(([id, label]) => {
        const l = document.createElement('label');
        l.innerHTML = `<input type="radio" name="tix-day" value="${id}"><span>${label}</span>`;
        fs.appendChild(l);
      });
      fs.addEventListener('change', (e) => { this.day[t.id] = e.target.value; });
      main.appendChild(fs);
    }
    const side = document.createElement('div');
    side.className = 'stub__side';
    li.append(main, side);
    this.renderSide(t, li);
    return li;
  }

  syncDay(dayId) {
    // the day ticket follows the day being viewed until someone picks one
    const t = TIERS.find((x) => x.pickDay);
    if (this.day[t.id] && this.day[t.id] !== 'auto') return;
    const li = this.list.querySelector(`[data-tier="${t.id}"]`);
    const input = li && li.querySelector(`input[value="${dayId}"]`);
    if (input) input.checked = true;
    this.day[t.id] = null;
  }

  pickedDay(t) {
    if (!t.pickDay) return null;
    const li = this.list.querySelector(`[data-tier="${t.id}"]`);
    const c = li.querySelector('input[name="tix-day"]:checked');
    return c ? c.value : this.getDay();
  }

  renderSide(t, li, focus) {
    const side = li.querySelector('.stub__side');
    const saved = this.saved[t.id];
    li.classList.toggle('is-reserved', !!saved);
    li.classList.remove('is-holding');
    side.textContent = '';
    if (t.soldout) {
      side.innerHTML = '<p class="stub__soldout">마감</p><p></p>';
      side.lastChild.textContent = t.soldNote;
      return;
    }
    if (saved) {
      const done = document.createElement('div');
      done.className = 'stub__done';
      done.innerHTML = `<p class="stub__done-k" tabindex="-1">예약했어요</p><p class="stub__code"></p><p class="stub__what"></p><button class="link" type="button">예약 취소</button>`;
      done.querySelector('.stub__code').textContent = saved.code;
      const what = `${t.name} ${saved.qty}장${saved.day ? ', ' + DAYS[saved.day] : ''}`;
      done.querySelector('.stub__what').innerHTML = '';
      done.querySelector('.stub__what').append(what, document.createElement('br'), `합계 ${won(t.price * saved.qty)}원`);
      done.querySelector('button').addEventListener('click', () => this.cancel(t, li));
      side.appendChild(done);
      li.querySelectorAll('.stub__days input').forEach((i) => { i.disabled = true; });
      if (focus) done.querySelector('.stub__done-k').focus();
      return;
    }
    li.querySelectorAll('.stub__days input').forEach((i) => { i.disabled = false; });
    const qid = `qty-${t.id}`;
    side.innerHTML =
      `<p class="qty__label" id="${qid}">수량</p>` +
      `<div class="qty" role="group" aria-labelledby="${qid}">` +
      `<button type="button" data-q="-1" aria-label="한 장 빼기">${MINUS}</button>` +
      `<output aria-live="polite"></output>` +
      `<button type="button" data-q="1" aria-label="한 장 더하기">${PLUS}</button></div>` +
      `<p class="stub__sum"></p>` +
      `<button class="btn btn--ink stub__btn" type="button">예약하기</button>`;
    const out = side.querySelector('output');
    const sum = side.querySelector('.stub__sum');
    const minus = side.querySelector('[data-q="-1"]');
    const plus = side.querySelector('[data-q="1"]');
    const paint = () => {
      const q = this.qty[t.id];
      out.textContent = `${q}장`;
      sum.textContent = `합계 ${won(t.price * q)}원`;
      minus.disabled = q <= 1;
      plus.disabled = q >= MAX;
    };
    side.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      this.qty[t.id] = Math.min(MAX, Math.max(1, this.qty[t.id] + Number(b.dataset.q)));
      paint();
    }));
    paint();
    const btn = side.querySelector('.stub__btn');
    btn.addEventListener('click', () => this.reserve(t, li, btn));
    if (focus) btn.focus();
  }

  reserve(t, li, btn) {
    if (li.classList.contains('is-holding')) return;
    li.classList.add('is-holding');
    btn.textContent = '자리 잡는 중';
    btn.setAttribute('aria-busy', 'true');
    setTimeout(() => {
      this.saved[t.id] = { qty: this.qty[t.id], code: code(), day: this.pickedDay(t) };
      this.store.set('tickets', this.saved);
      this.renderSide(t, li, true);
      const s = this.saved[t.id];
      this.announce(`${t.name} ${s.qty}장을 예약했어요. 예약 번호 ${s.code}. 가상 예약이라 결제는 없어요.`);
    }, 450);
  }

  cancel(t, li) {
    delete this.saved[t.id];
    this.store.set('tickets', this.saved);
    this.renderSide(t, li, true);
    this.announce(`${t.name} 예약을 취소했어요.`);
  }
}
