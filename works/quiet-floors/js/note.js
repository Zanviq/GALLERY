// The neighbour note. Built and copied in the browser only; nothing is sent or stored.
const UNITS = ['501', '502', '401', '402', '301', '302', '201', '202'];

const T = {
  below: {
    kWhat: '들리는 소리', kAsk: '부탁', me: '301', to: '401',
    what: ['쿵쿵 뛰는 소리', '의자 끄는 소리', '문이 쾅 닫히는 소리', '세탁기 떨리는 소리', '무언가 떨어지는 소리'],
    when: ['밤 10시 넘어서', '아침 7시 전에', '저녁 8시 무렵', '주말 낮에'],
    ask: ['그 시간에는 매트 위에서 놀게 해 주실 수 있을까요?', '의자 다리에 패드를 붙여 주실 수 있을까요?', '밤 10시 넘어서는 조금만 살살 부탁드려요.', '세탁기는 밤 9시 전에 돌려 주실 수 있을까요?'],
  },
  above: {
    kWhat: '알릴 일', kAsk: '약속', me: '401', to: '301',
    what: ['아이 생일 모임이 있어서', '가구를 옮길 일이 있어서', '욕실 수리 공사가 있어서', '손님이 오셔서', '이사 짐을 싸야 해서'],
    when: ['이번 토요일 오후에', '다음 주 화요일 낮에', '이번 주말 저녁에', '내일 오전에'],
    ask: ['매트를 깔고 저녁 9시 전에 마칠게요.', '가구 다리에 패드를 붙이고 옮길게요.', '밤 10시 넘어서는 조용히 할게요.', '시끄러우면 편하게 말씀해 주세요.'],
  },
};

function relWord(me, to) {
  const fm = Number(me[0]);
  const ft = Number(to[0]);
  if (fm < ft) return '아래층';
  if (fm > ft) return '위층';
  return '옆집';
}

export function initNote() {
  const form = document.getElementById('note-form');
  const sel = (n) => form.elements[n];
  const paper = document.getElementById('note-paper');
  const status = document.getElementById('note-status');
  const count = document.getElementById('note-count');
  let mode = 'below';

  const fill = (s, items, keep) => {
    const prev = keep ? s.value : null;
    s.innerHTML = '';
    for (const it of items) {
      const o = document.createElement('option');
      o.value = it;
      o.textContent = it.length === 3 && /^\d+$/.test(it) ? `${it}호` : it;
      s.appendChild(o);
    }
    if (prev && items.includes(prev)) s.value = prev;
  };

  function setMode(m) {
    mode = m;
    const t = T[m];
    form.querySelector('[data-k-what]').textContent = t.kWhat;
    form.querySelector('[data-k-ask]').textContent = t.kAsk;
    fill(sel('me'), UNITS);
    sel('me').value = t.me;
    fillTo(t.to);
    fill(sel('what'), t.what);
    fill(sel('when'), t.when);
    fill(sel('ask'), t.ask);
    render();
  }
  function fillTo(pref) {
    const me = sel('me').value;
    const prev = pref || sel('to').value;
    fill(sel('to'), UNITS.filter((u) => u !== me));
    if (prev && prev !== me) sel('to').value = prev;
    if (sel('to').value === '' || sel('to').value === me) {
      // default to the unit above (asking) or below (telling)
      const f = Number(me[0]);
      const c = me[2];
      const nf = mode === 'below' ? Math.min(5, f + 1) : Math.max(2, f - 1);
      const cand = `${nf}0${c}`;
      sel('to').value = cand !== me ? cand : UNITS.find((u) => u !== me);
    }
  }

  function lines() {
    const me = sel('me').value;
    const to = sel('to').value;
    const extra = sel('extra').value.trim();
    const hi = `안녕하세요, ${relWord(me, to)} ${me}호예요.`;
    const body = mode === 'below'
      ? [hi, `요즘 ${sel('when').value} ${sel('what').value}가 들려서 쪽지 남겨요.`, '일부러 그러신 게 아니라는 거 알아요.', sel('ask').value]
      : [hi, `${sel('when').value} ${sel('what').value} 평소보다 소리가 날 수 있어요.`, sel('ask').value, '미리 양해 부탁드려요.'];
    if (extra) body.push(extra);
    return { to: `${to}호 이웃께`, body, from: mode === 'below' ? `고맙습니다. ${me}호 드림` : `${me}호 드림` };
  }

  function render() {
    const l = lines();
    paper.querySelector('[data-note-to]').textContent = l.to;
    const b = paper.querySelector('[data-note-body]');
    b.innerHTML = '';
    for (const line of l.body) {
      const p = document.createElement('p');
      p.textContent = line;
      b.appendChild(p);
    }
    paper.querySelector('[data-note-from]').textContent = l.from;
    count.textContent = `${sel('extra').value.length}/80`;
    status.textContent = '';
  }

  const text = () => {
    const l = lines();
    return [l.to, '', ...l.body, '', l.from].join('\n');
  };

  function fallbackCopy(t) {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function selectPaper() {
    const r = document.createRange();
    r.selectNodeContents(paper);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }
  const done = () => { status.textContent = '복사했어요. 이 페이지는 아무것도 보내지 않았어요.'; };
  const failed = () => {
    selectPaper();
    status.textContent = '복사가 막혀 있어요. 쪽지 글을 선택해 두었으니 직접 복사하세요.';
  };

  document.getElementById('note-copy').addEventListener('click', () => {
    const t = text();
    if (navigator.clipboard && window.isSecureContext) {
      // some browsers leave the promise pending behind a permission prompt; fall back after a moment
      let settled = false;
      const fb = () => { if (settled) return; settled = true; if (fallbackCopy(t)) done(); else failed(); };
      const timer = setTimeout(fb, 1200);
      navigator.clipboard.writeText(t).then(() => { if (settled) return; settled = true; clearTimeout(timer); done(); }, () => { clearTimeout(timer); fb(); });
    } else if (fallbackCopy(t)) done(); else failed();
  });

  form.addEventListener('submit', (e) => e.preventDefault());
  for (const r of form.querySelectorAll('input[name="who"]')) r.addEventListener('change', () => { if (r.checked) setMode(r.value); });
  sel('me').addEventListener('change', () => { fillTo(); render(); });
  for (const n of ['to', 'what', 'when', 'ask']) sel(n).addEventListener('change', render);
  sel('extra').addEventListener('input', render);
  setMode('below');
}
