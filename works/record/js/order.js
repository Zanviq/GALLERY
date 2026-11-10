// Pre-order (fictional): nothing is sent anywhere. The confirmation is kept in this browser only.
const PRICE = 39000, SHIP = 3000, KEY = 'gipeunjjok:preorder';
const PLACES = {
  ship: '택배로 3월 10일부터 차례로 보냅니다.',
  hole: '3월 10일부터 판가게 가운뎃구멍(서울)에서 찾으실 수 있습니다.',
  needle: '3월 10일부터 레코드 바늘집(잔물시)에서 찾으실 수 있습니다.',
  grout: '3월 10일부터 음반가게 흰줄눈(대전)에서 찾으실 수 있습니다.',
};
const won = (n) => `${n.toLocaleString('ko-KR')}원`;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
}
function store(v) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY);
  } catch (e) { /* private mode: keep it in memory only */ }
}

export function initOrder(form) {
  if (!form) return;
  const nOut = form.querySelector('.qty__n');
  const total = form.querySelector('.pre__total');
  const minus = form.querySelector('[data-qty="-1"]');
  const plus = form.querySelector('[data-qty="1"]');
  const done = form.querySelector('.pre__done');
  let qty = 1;

  const where = () => form.querySelector('input[name="where"]:checked').value;
  function sum() {
    return PRICE * qty + (where() === 'ship' ? SHIP : 0);
  }
  function render() {
    nOut.textContent = `${qty}장`;
    total.textContent = won(sum());
    minus.disabled = qty <= 1;
    plus.disabled = qty >= 2;
  }
  form.addEventListener('change', render);
  form.querySelectorAll('.qty__btn').forEach((b) => b.addEventListener('click', () => {
    qty = Math.max(1, Math.min(2, qty + Number(b.dataset.qty)));
    render();
  }));

  function show(v, focus) {
    form.classList.add('is-done');
    done.hidden = false;
    done.querySelector('[data-done-code]').textContent = v.code;
    done.querySelector('[data-done-text]').textContent =
      `청록반 ${v.qty}장, 합계 ${won(v.total)}. ${PLACES[v.where]} 판 번호는 보내는 날 재킷 뒷면에 적힙니다.`;
    if (focus) done.focus();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = `SRG1-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const v = { code, qty, where: where(), total: sum() };
    store(v);
    show(v, true);
  });

  form.querySelector('.pre__undo').addEventListener('click', () => {
    store(null);
    done.hidden = true;
    form.classList.remove('is-done');
    form.querySelector('.pre__go').focus();
  });

  const saved = load();
  if (saved && PLACES[saved.where]) {
    qty = saved.qty === 2 ? 2 : 1;
    const r = form.querySelector(`input[value="${saved.where}"]`);
    if (r) r.checked = true;
    show(saved, false);
  }
  render();
}
