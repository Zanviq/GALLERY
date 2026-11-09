// The pledge. Counted on this device only (localStorage, wrapped), never sent anywhere.
const KEY = 'quiet-floors.pledge.v1';
const ITEMS = [
  ['washer', '밤 10시가 넘으면 세탁기와 청소기는 다음 날 돌려요.'],
  ['pad', '식탁 의자 다리에 패드를 붙여요.'],
  ['slipper', '집에서는 실내화를 신어요.'],
  ['door', '문은 손으로 잡고 닫아요.'],
  ['mat', '아이가 뛰는 자리에 매트를 깔아요.'],
];

function load() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (v && Array.isArray(v.items)) return { data: v, ok: true };
    return { data: null, ok: true };
  } catch (e) {
    return { data: null, ok: false };
  }
}
function save(v) {
  try {
    if (v) window.localStorage.setItem(KEY, JSON.stringify(v)); else window.localStorage.removeItem(KEY);
    return true;
  } catch (e) {
    return false;
  }
}

export function initPledge() {
  const list = document.getElementById('pledge-list');
  const form = document.getElementById('pledge-form');
  const submit = document.getElementById('pledge-submit');
  const help = document.getElementById('pledge-help');
  const n = document.querySelector('[data-tally]');
  const mine = document.getElementById('tally-mine');
  const st = document.getElementById('tally-state');
  const clear = document.getElementById('pledge-clear');

  for (const [id, text] of ITEMS) {
    const li = document.createElement('li');
    li.innerHTML = `<label class="promise"><input type="checkbox" name="promise" value="${id}"><span class="promise__box" aria-hidden="true"></span><span class="promise__t"></span></label>`;
    li.querySelector('.promise__t').textContent = text;
    list.appendChild(li);
  }
  const boxes = [...list.querySelectorAll('input')];
  const chosen = () => boxes.filter((b) => b.checked).map((b) => b.value);

  function refreshButton() {
    const any = chosen().length > 0;
    submit.disabled = !any;
    help.textContent = any ? '고른 약속은 이 기기에만 남아요.' : '하나 이상 고르면 약속할 수 있어요.';
  }
  function show(v) {
    const items = v ? v.items : [];
    n.textContent = String(items.length);
    mine.innerHTML = '';
    for (const id of items) {
      const t = ITEMS.find((x) => x[0] === id);
      if (!t) continue;
      const li = document.createElement('li');
      li.textContent = t[1];
      mine.appendChild(li);
    }
    clear.hidden = !items.length;
  }

  const first = load();
  let current = first.data;
  if (current) {
    for (const b of boxes) b.checked = current.items.includes(b.value);
    st.textContent = `${current.date}에 한 약속이에요.`;
  } else if (!first.ok) {
    st.textContent = '이 브라우저는 저장을 막아 두었어요. 약속은 이 화면을 닫으면 사라져요.';
  }
  show(current);
  refreshButton();

  for (const b of boxes) b.addEventListener('change', refreshButton);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const items = chosen();
    if (!items.length) return;
    const d = new Date();
    current = { items, date: `${d.getMonth() + 1}월 ${d.getDate()}일` };
    const ok = save(current);
    show(current);
    st.textContent = ok
      ? `약속 ${items.length}개를 이 기기에 남겼어요.`
      : `약속 ${items.length}개를 했어요. 이 브라우저는 저장을 막아 두어서, 화면을 닫으면 사라져요.`;
  });
  clear.addEventListener('click', () => {
    save(null);
    current = null;
    for (const b of boxes) b.checked = false;
    show(null);
    refreshButton();
    st.textContent = '이 기기에서 약속을 지웠어요.';
    submit.focus();
  });
}
