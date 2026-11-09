// 제맛: the noodle timer. Everything else on the page is static.
// Time is kept as an end timestamp, so the count stays right when the tab sleeps; the display
// only ticks while the timer runs (once a second, nothing animates).

const root = document.getElementById('timer');

if (root) {
  const clock = root.querySelector('.timer__time');
  const state = root.querySelector('.timer__state');
  const go = root.querySelector('.timer__go');
  const reset = root.querySelector('.timer__reset');
  const sets = root.querySelectorAll('.timer__set');
  const baseTitle = document.title;

  const NAMES = { myeolchi: '멸치', gochu: '고추', daepa: '대파', huchu: '후추' };
  const EGG_AT = 120; // seconds after the noodles go in

  let total = 270;     // seconds for the chosen flavour and texture
  let left = total;    // seconds left when paused
  let endAt = 0;       // timestamp while running
  let tick = 0;
  let eggSaid = false;

  const picked = (name) => root.querySelector(`input[name="${name}"]:checked`);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  // 을/를 after a number word: 4분을, 4분 30초를
  const eul = (w) => { const c = w.charCodeAt(w.length - 1); return (c - 0xac00) % 28 ? `${w}을` : `${w}를`; };
  const spoken = (s) => {
    const m = Math.floor(s / 60), r = s % 60;
    return m && r ? `${m}분 ${r}초` : m ? `${m}분` : `${r}초`;
  };

  function settings() {
    const f = picked('flavour');
    const t = Number(picked('texture').value);
    total = Number(f.dataset.sec) + t;
    left = total;
    eggSaid = false;
    root.removeAttribute('data-done');
    clock.textContent = mmss(total);
    const texture = t < 0 ? ' 꼬들하게' : t > 0 ? ' 퍼지게' : '';
    state.textContent = `${NAMES[f.value]}, 물 ${f.dataset.water}ml.${texture} ${eul(spoken(total))} 잽니다.`;
  }

  function render() {
    const s = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    clock.textContent = mmss(s);
    document.title = `${mmss(s)} · ${baseTitle}`;
    if (!eggSaid && total - s >= EGG_AT && s > 0) {
      eggSaid = true;
      state.textContent = '2분 지났습니다. 계란은 지금 넣으세요.';
    }
    if (s === 0) finish();
  }

  function start() {
    endAt = Date.now() + left * 1000;
    sets.forEach((f) => { f.disabled = true; });
    go.textContent = '멈춤';
    reset.disabled = false;
    if (left === total) state.textContent = `시작했습니다. ${spoken(total)} 뒤에 불을 끄세요.`;
    else state.textContent = '다시 잽니다.';
    clearInterval(tick);
    tick = setInterval(render, 1000);
    render();
  }

  function pause() {
    clearInterval(tick);
    tick = 0;
    left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    go.textContent = '계속';
    state.textContent = `멈췄습니다. ${spoken(left)} 남았습니다.`;
    document.title = baseTitle;
  }

  function finish() {
    clearInterval(tick);
    tick = 0;
    left = 0;
    root.setAttribute('data-done', '');
    go.textContent = '시작';
    go.disabled = true;
    state.textContent = '불을 끄세요. 다 됐습니다.';
    clock.textContent = '0:00';
    document.title = `다 됐습니다 · ${baseTitle}`;
  }

  function restart() {
    clearInterval(tick);
    tick = 0;
    sets.forEach((f) => { f.disabled = false; });
    go.disabled = false;
    go.textContent = '시작';
    reset.disabled = true;
    document.title = baseTitle;
    settings();
  }

  go.addEventListener('click', () => (tick ? pause() : start()));
  reset.addEventListener('click', restart);
  root.addEventListener('change', (e) => { if (e.target.matches('input[type="radio"]')) settings(); });
  document.addEventListener('visibilitychange', () => { if (tick && !document.hidden) render(); });

  settings();
}
