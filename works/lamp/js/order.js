// The order box: quantity 1–3 and a confirmation. Nothing is sent or stored anywhere.
const form = document.querySelector('[data-order]');
if (form) {
  const PRICE = 268000;
  const MAX = 3;
  let qty = 1;
  const val = form.querySelector('[data-qty-val]');
  const total = form.querySelector('[data-total]');
  const done = form.querySelector('[data-done]');
  const minus = form.querySelector('[data-qty="-1"]');
  const plus = form.querySelector('[data-qty="1"]');
  const won = (n) => n.toLocaleString('ko-KR');

  function show() {
    val.textContent = String(qty);
    total.textContent = won(PRICE * qty);
    minus.disabled = qty <= 1;
    plus.disabled = qty >= MAX;
  }
  form.querySelectorAll('[data-qty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      qty = Math.max(1, Math.min(MAX, qty + Number(btn.dataset.qty)));
      done.textContent = '';
      show();
    });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const no = 'GB-' + String(Math.floor(1000 + Math.random() * 9000));
    done.textContent = `주문을 받았습니다. 주문 번호 ${no}, ${qty}대, ${won(PRICE * qty)}원. 12월 7일부터 주문 순서대로 보냅니다. 가상 주문이라 실제로 보내는 것은 없습니다.`;
  });
  show();
}
