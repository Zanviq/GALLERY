// The order slip: prices and pickup date from the shop's rate card. Nothing is sent anywhere.

const STOCK = {
  m80: { name: '모조 80g', a3: 40 },
  m120: { name: '모조 120g', a3: 70 },
  m180: { name: '모조 180g', a3: 120 },
  r210: { name: '러프 210g', a3: 210 },
  f250: { name: '펠트 250g', a3: 300, hand: true },
};
const SIZE = { A4: { label: 'A4 (210 × 297mm)', run: 25, paper: 0.5 }, A3: { label: 'A3 (297 × 420mm)', run: 40, paper: 1 } };
const INK_NAMES = { black: '블랙', pink: '형광 핑크', blue: '블루', yellow: '옐로' };
const MASTER = 6000; // one stencil per colour per side
const SEPARATION = 10000;
const DISCOUNT_FROM = 1000; // sheets beyond this print at 70 %
const MIN = 50;
const MAX = 5000;
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const OPEN = (d) => d.getDay() >= 2; // Tuesday to Saturday

const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
const num = (n) => n.toLocaleString('ko-KR');

function nextOpen(d) {
  const x = new Date(d);
  do x.setDate(x.getDate() + 1); while (!OPEN(x));
  return x;
}

export function quote(o) {
  const stock = STOCK[o.stock];
  const size = SIZE[o.size];
  const colours = o.inks.length;
  const plates = colours * o.sides;
  const master = plates * MASTER;
  const full = Math.min(o.qty, DISCOUNT_FROM);
  const extra = Math.max(0, o.qty - DISCOUNT_FROM);
  const run = (full + extra * 0.7) * size.run * plates;
  const paper = o.qty * stock.a3 * size.paper;
  const trim = o.trim ? 5000 + Math.ceil(o.qty / 100) * 1000 : 0;
  const sep = o.sep ? SEPARATION : 0;
  const days = 2 + (colours >= 3 ? 1 : 0) + (o.qty > DISCOUNT_FROM ? 1 : 0) + (stock.hand ? 1 : 0);
  return { stock, size, colours, plates, master, run, paper, trim, sep, days, total: master + run + paper + trim + sep, extra };
}

export function readyDate(days, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = OPEN(today) ? today : nextOpen(today); // the day the file is checked
  for (let i = 0; i < days; i++) d = nextOpen(d);
  return d;
}

export function initSlip({ tableInks } = {}) {
  const form = document.getElementById('slip-form');
  const qty = document.getElementById('qty');
  const lines = document.getElementById('bill-lines');
  const total = document.getElementById('total');
  const dateEl = document.getElementById('bill-date');
  const err = document.getElementById('bill-error');
  const bill = document.getElementById('bill');
  const copyBtn = document.getElementById('copy');
  const copyStatus = document.getElementById('copy-status');
  const fallback = document.getElementById('copy-fallback');
  const mini = document.getElementById('mini');
  let last = null;

  function read() {
    const f = new FormData(form);
    const raw = String(qty.value).trim();
    return {
      size: f.get('size'),
      stock: f.get('stock'),
      qtyRaw: raw,
      qty: raw === '' ? NaN : Number(raw),
      inks: f.getAll('ink'),
      sides: Number(f.get('sides')),
      trim: f.get('trim') === '1',
      sep: f.get('sep') === '1',
    };
  }

  function problem(o) {
    if (!Number.isFinite(o.qty) || !Number.isInteger(o.qty)) return { field: 'qty', text: '장수를 숫자로 적어 주세요.' };
    if (o.qty < MIN) return { field: 'qty', text: '50장부터 받습니다. 장수를 50 이상으로 적어 주세요.' };
    if (o.qty > MAX) return { field: 'qty', text: '5,000장이 넘는 일은 창구에서 따로 견적을 냅니다. 5,000 이하로 적어 주세요.' };
    if (!o.inks.length) return { field: 'ink', text: '색을 하나 이상 고르세요. 색 하나가 판 하나입니다.' };
    return null;
  }

  function row(item, detail, amount) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = item;
    const td1 = document.createElement('td');
    td1.textContent = detail;
    const td2 = document.createElement('td');
    td2.className = 'amt';
    td2.textContent = amount;
    tr.append(th, td1, td2);
    return tr;
  }

  function update() {
    const o = read();
    const p = problem(o);
    qty.setAttribute('aria-invalid', p && p.field === 'qty' ? 'true' : 'false');
    if (p) {
      err.textContent = p.text;
      err.hidden = false;
      bill.classList.add('is-stale');
      copyBtn.disabled = true;
      mini.textContent = '';
      return;
    }
    err.hidden = true;
    err.textContent = '';
    bill.classList.remove('is-stale');
    copyBtn.disabled = false;
    const q = quote(o);
    const sideText = o.sides === 2 ? '양면' : '단면';
    lines.textContent = '';
    lines.append(
      row('제판', `${q.plates}판 × ${num(MASTER)}원`, won(q.master)),
      row('인쇄', `${num(o.qty)}장 × ${q.colours}색 × ${sideText}${q.extra ? `, 1,000장 넘는 ${num(q.extra)}장은 30% 덜` : ''}`, won(q.run)),
      row('종이', `${q.stock.name} ${o.size} ${num(o.qty)}장`, won(q.paper)),
      row('재단', o.trim ? `기본 5,000원 + 100장마다 1,000원` : '안 함', o.trim ? won(q.trim) : '0원'),
      row('분판', o.sep ? '컬러 파일을 색별로 나눔' : '색별 파일로 받음', o.sep ? won(q.sep) : '0원'),
    );
    total.textContent = won(q.total);
    mini.textContent = `합계 ${won(q.total)}, 작업 ${q.days}일`;
    const d = readyDate(q.days);
    const when = `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
    dateEl.textContent = `작업 ${q.days}일. 오늘 파일을 보내면 ${when} 오후부터 찾아갈 수 있습니다. 공휴일이 끼면 그만큼 늦어집니다.`;
    last = [
      '겹 리소 인쇄실 주문 내용',
      `크기: ${q.size.label}`,
      `종이: ${q.stock.name}`,
      `장수: ${num(o.qty)}장`,
      `색: ${o.inks.map((k) => INK_NAMES[k]).join(', ')} (${q.plates}판)`,
      `인쇄 면: ${sideText}`,
      `재단: ${o.trim ? '도련까지 재단' : '안 함'}`,
      `파일: ${o.sep ? '컬러 파일 하나 (분판 맡김)' : '색별 회색조 파일'}`,
      `합계: ${won(q.total)} (부가세 포함)`,
      `받는 날: ${when}부터`,
    ].join('\n');
    fallback.hidden = true;
    copyStatus.textContent = '';
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  form.querySelectorAll('.qty__step').forEach((b) => {
    b.addEventListener('click', () => {
      const cur = Number(qty.value);
      const base = Number.isFinite(cur) ? cur : MIN;
      qty.value = String(Math.min(MAX, Math.max(MIN, base + Number(b.dataset.step))));
      update();
    });
  });

  const fromTable = document.getElementById('from-table');
  if (tableInks) {
    fromTable.addEventListener('click', () => {
      const inks = tableInks();
      form.querySelectorAll('input[name="ink"]').forEach((el) => {
        el.checked = inks.includes(el.value);
      });
      const a4 = form.querySelector('input[name="size"][value="A4"]');
      a4.checked = true; // the proof sheet is A4 landscape
      update();
      copyStatus.textContent = `교정쇄대로 채웠습니다. A4, ${inks.map((k) => INK_NAMES[k]).join(', ')}.`;
    });
  } else {
    fromTable.hidden = true;
  }

  copyBtn.addEventListener('click', async () => {
    if (!last) return;
    try {
      await navigator.clipboard.writeText(last);
      fallback.hidden = true;
      copyStatus.textContent = '주문 내용을 복사했습니다. 메일이나 메시지에 붙여 넣으세요.';
    } catch (e) {
      fallback.value = last;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      copyStatus.textContent = '복사하지 못했습니다. 아래 칸의 내용을 직접 복사하세요.';
    }
  });

  update();
}
