// 타건 테스트: 한글은 타/분(두벌식 타수), 영문은 WPM.

const PASSAGES = {
  ko: [
    '키보드는 손이 가장 오래 머무는 도구입니다. 오늘 쓴 글자 수만큼 이 판을 두드렸습니다.',
    '바닥을 치는 소리가 낮으면 긴 글을 써도 덜 지칩니다.',
    '좋은 키보드는 눈보다 손가락이 먼저 알아봅니다.',
    '천천히 정확하게 치다 보면 속도는 저절로 따라옵니다.',
    '알루미늄을 깎고 황동을 눕히고 마지막에 키캡을 얹었습니다.',
  ],
  en: [
    'A heavy board stays still, so your hands can move.',
    'Type slowly at first; speed follows accuracy.',
    'Ten fingers, one rhythm, and a low round sound.',
    'The best keyboards are felt before they are seen.',
  ],
};

// 두벌식 타수: 초성 1, 중성 1~2, 종성 0~2 (Shift 는 세지 않는다)
const JUNG_TWO = new Set([9, 10, 11, 14, 15, 16, 19]); // ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ
const JONG_TWO = new Set([3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 18]); // ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ

export function strokes(str) {
  let n = 0;
  for (const ch of str) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const s = c - 0xac00;
      const jung = Math.floor((s % 588) / 28);
      const jong = s % 28;
      n += 1 + (JUNG_TWO.has(jung) ? 2 : 1) + (jong === 0 ? 0 : JONG_TWO.has(jong) ? 2 : 1);
    } else n += 1;
  }
  return n;
}

const isHangul = (ch) => /[가-힣ㄱ-ㆎ]/.test(ch);

export function createTyping(root, { onState } = {}) {
  const el = {
    passage: root.querySelector('[data-passage]'),
    passageSr: root.querySelector('[data-passage-sr]'),
    input: root.querySelector('[data-typer-input]'),
    status: root.querySelector('[data-typer-status]'),
    speed: root.querySelector('[data-stat="speed"]'),
    speedLabel: root.querySelector('[data-speed-label]'),
    acc: root.querySelector('[data-stat="acc"]'),
    time: root.querySelector('[data-stat="time"]'),
    result: root.querySelector('[data-result]'),
    rhythm: root.querySelector('[data-rhythm]'),
    retry: root.querySelector('[data-retry]'),
    next: root.querySelector('[data-next]'),
    langBtns: [...root.querySelectorAll('[data-lang-btn]')],
  };

  const st = {
    lang: 'ko',
    idx: { ko: 0, en: 0 },
    text: '',
    phase: 'idle', // idle | running | done
    t0: 0,
    composing: false,
    beats: [], // 키 누른 시각
    errors: 0,
    tick: 0,
  };

  function render(value = '') {
    const t = st.text;
    const frag = document.createDocumentFragment();
    const chars = [...t];
    const typed = [...value];
    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'c';
      span.textContent = ch;
      if (i < typed.length) {
        const last = i === typed.length - 1;
        if (last && st.composing && isHangul(typed[i])) span.classList.add('comp');
        else span.classList.add(typed[i] === ch ? 'ok' : 'bad');
      } else if (i === typed.length) span.classList.add('cur');
      frag.appendChild(span);
    });
    el.passage.replaceChildren(frag);
  }

  function setPassage() {
    const list = PASSAGES[st.lang];
    st.text = list[st.idx[st.lang] % list.length];
    el.passage.lang = st.lang;
    el.passageSr.textContent = `따라 칠 문장: ${st.text}`;
    el.passageSr.lang = st.lang;
    el.input.lang = st.lang;
    el.speedLabel.textContent = st.lang === 'ko' ? '타/분' : 'WPM';
    reset();
  }

  function reset(msg) {
    st.phase = 'idle';
    st.t0 = 0;
    st.beats = [];
    st.errors = 0;
    clearInterval(st.tick);
    el.input.value = '';
    el.input.readOnly = false;
    el.speed.textContent = '0';
    el.acc.textContent = '100';
    el.time.textContent = '0.0';
    el.result.hidden = true;
    el.status.textContent = msg || '입력을 시작하면 시간이 갑니다.';
    render('');
    onState && onState('idle');
  }

  function accuracy(value) {
    const t = [...st.text];
    const v = [...value];
    let ok = 0;
    v.forEach((ch, i) => { if (t[i] === ch) ok += 1; });
    const judged = st.composing ? Math.max(0, v.length - 1) : v.length;
    return judged ? Math.round((Math.min(ok, judged) / judged) * 100) : 100;
  }

  function speed(value, ms) {
    const min = Math.max(ms, 1) / 60000;
    if (st.lang === 'ko') return Math.round(strokes(value) / min);
    return Math.round(([...value].length / 5) / min);
  }

  function update() {
    const value = el.input.value;
    const ms = st.t0 ? performance.now() - st.t0 : 0;
    el.time.textContent = (ms / 1000).toFixed(1);
    if (ms > 600) el.speed.textContent = String(speed(value, ms));
    el.acc.textContent = String(accuracy(value));
  }

  function finish() {
    st.phase = 'done';
    clearInterval(st.tick);
    const ms = performance.now() - st.t0;
    const value = el.input.value;
    const sp = speed(value, ms);
    const acc = accuracy(value);
    el.speed.textContent = String(sp);
    el.acc.textContent = String(acc);
    el.time.textContent = (ms / 1000).toFixed(1);
    el.input.readOnly = true;
    el.result.hidden = false;
    const hasRhythm = drawRhythm();
    el.rhythm.parentElement.hidden = !hasRhythm;
    if (ms < 1500) {
      // 붙여넣기나 자동 입력처럼 사람이 칠 수 없는 속도는 재지 않는다
      el.speed.textContent = '—';
      el.status.textContent = '너무 빨라서 잴 수 없었습니다. 다시를 눌러 직접 쳐 보세요.';
      onState && onState('done');
      return;
    }
    const unit = st.lang === 'ko' ? '타' : 'WPM';
    el.status.textContent = st.lang === 'ko'
      ? `끝. 분당 ${sp}타, 정확도 ${acc}%, ${(ms / 1000).toFixed(1)}초 걸렸습니다.`
      : `끝. ${sp} ${unit}, 정확도 ${acc}%, ${(ms / 1000).toFixed(1)}초 걸렸습니다.`;
    onState && onState('done');
  }

  function drawRhythm() {
    // 키를 누른 시각을 가로 띠에 막대로 찍는다. 간격이 고르면 막대도 고르다.
    const svg = el.rhythm;
    const beats = st.beats;
    const W = 600, H = 56;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    if (beats.length < 4) return false;
    const t0 = beats[0].t, t1 = beats[beats.length - 1].t;
    const span = Math.max(1, t1 - t0);
    const ns = 'http://www.w3.org/2000/svg';
    const base = document.createElementNS(ns, 'line');
    base.setAttribute('x1', 0); base.setAttribute('x2', W); base.setAttribute('y1', H - 0.5); base.setAttribute('y2', H - 0.5);
    svg.appendChild(base);
    beats.forEach((b, i) => {
      const gap = i === 0 ? 0 : b.t - beats[i - 1].t;
      const h = Math.max(6, Math.min(H - 4, 6 + (gap / 420) * (H - 10)));
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', ((b.t - t0) / span) * (W - 3));
      r.setAttribute('y', H - h);
      r.setAttribute('width', 3);
      r.setAttribute('height', h);
      if (b.miss) r.setAttribute('class', 'miss');
      svg.appendChild(r);
    });
    return true;
  }

  function onInput() {
    if (st.phase === 'done') return;
    const value = el.input.value;
    if (st.phase === 'idle' && value.length) {
      st.phase = 'running';
      st.t0 = performance.now();
      el.status.textContent = '치는 중입니다. Esc를 누르면 처음부터 다시 합니다.';
      st.tick = setInterval(update, 200);
      onState && onState('running');
    }
    render(value);
    update();
    const len = [...value].length;
    const tlen = [...st.text].length;
    if (len >= tlen && !st.composing) finish();
  }

  el.input.addEventListener('input', onInput);
  el.input.addEventListener('compositionstart', () => { st.composing = true; });
  el.input.addEventListener('compositionend', () => { st.composing = false; onInput(); });
  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { reset('처음부터 다시 합니다.'); return; }
    if (e.key === 'Enter' && st.phase === 'running' && !e.isComposing) {
      if ([...el.input.value].length >= [...st.text].length - 1) finish();
      return;
    }
    if (!e.repeat && e.key !== 'Tab' && e.key !== 'Shift' && st.phase !== 'done') {
      const t = performance.now();
      const v = [...el.input.value];
      const i = v.length - 1;
      const miss = i >= 0 && !st.composing && v[i] !== [...st.text][i];
      st.beats.push({ t, miss });
    }
  });
  el.input.addEventListener('paste', (e) => {
    e.preventDefault();
    el.status.textContent = '붙여넣기는 세지 않습니다. 직접 쳐 주세요.';
  });

  el.retry.addEventListener('click', () => { reset(); el.input.focus(); });
  el.next.addEventListener('click', () => { st.idx[st.lang] += 1; setPassage(); el.input.focus(); });
  el.langBtns.forEach((b) => {
    b.addEventListener('click', () => {
      st.lang = b.dataset.langBtn;
      el.langBtns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      setPassage();
    });
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const other = el.langBtns.find((x) => x !== b);
        other.focus();
        other.click();
      }
    });
  });
  // roving tabindex for the radiogroup
  const syncTab = () => el.langBtns.forEach((x) => (x.tabIndex = x.getAttribute('aria-checked') === 'true' ? 0 : -1));
  el.langBtns.forEach((b) => b.addEventListener('click', syncTab));
  syncTab();

  setPassage();
  return { reset };
}
