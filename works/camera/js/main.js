// Page scripts: the shutter section and the reservation form (which sends nothing).
import './shoot.js';

const order = document.getElementById('order');
if (order) {
  const BODY = 189000;
  const total = document.getElementById('order-total');
  const ticket = document.getElementById('ticket');
  const no = document.getElementById('ticket-no');
  const what = document.getElementById('ticket-what');
  const again = document.getElementById('ticket-again');
  const submit = order.querySelector('button[type="submit"]');
  const won = (n) => `${n.toLocaleString('ko-KR')}원`;
  const FILM = { 0: '', 36000: '컬러 필름 30장', 15000: '흑백 필름 10장' };

  const values = () => {
    const color = order.querySelector('input[name="color"]:checked').value;
    const film = Number(order.querySelector('input[name="film"]:checked').value);
    return { color, film, sum: BODY + film };
  };
  const update = () => { total.textContent = won(values().sum); };
  order.addEventListener('change', update);
  order.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = values();
    no.textContent = `예약 번호 BG-${String(Math.floor(1000 + Math.random() * 9000))}`;
    what.textContent = `방금 1 ${v.color} 한 대${v.film ? `, ${FILM[v.film]}` : ''}. 합계 ${won(v.sum)}.`;
    ticket.hidden = false;
    submit.hidden = true;
    ticket.focus();
  });
  again.addEventListener('click', () => {
    ticket.hidden = true;
    submit.hidden = false;
    submit.focus();
  });
  update();
}
