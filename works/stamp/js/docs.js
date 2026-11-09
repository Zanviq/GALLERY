// The paperwork. Every document is 100 x 130 units (1 unit = 1/100 of its width) and keeps its
// target on the stamp row (y = 28). Target centres sit at 0.08 + 0.1k of the width (48, 58, 68, 88)
// so the stepped tray can line each one up exactly with the ring.
export const DOC_H = 130;
export const ROW_Y = 28;
export const BOXES = [38, 58, 78]; // 결재란 칸 left edges, 20 wide
export const BOX_NAMES = ['담당', '과장', '부장'];

const pick = (rand, a) => a[Math.floor(rand() * a.length)];
const n1 = (v) => Math.round(v * 10) / 10;

const DEPTS = ['총무팀', '영업2팀', '물류팀', '회계팀', '기획팀', '고객지원팀'];
const PEOPLE = ['표다온', '맹하준', '석나래', '탁윤슬', '배단비', '엄태주', '변하람', '차소율', '남궁별', '옥지환'];
const FORMS = [
  { title: ['품의서'], items: [
    ['탕비실 원두와 종이컵 구매의 건', '원두 2kg, 종이컵 1,000개', '86,000원'],
    ['3층 복합기 토너 교체의 건', '검정 토너 2개, 컬러 토너 1개', '214,000원'],
    ['회의실 의자 바퀴 교체의 건', '의자 바퀴 40개', '72,000원'],
    ['문서 파쇄기 구매의 건', '파쇄기 1대 (세단식)', '189,000원'],
  ] },
  { title: ['기안서'], items: [
    ['우산 대여함 설치의 건', '1층 출입구 옆, 우산 20개', '154,000원'],
    ['화분 물 주기 당번 변경의 건', '월, 목 총무팀에서 맡음', '없음'],
    ['냉장고 정리의 날 지정의 건', '매달 마지막 금요일 17시', '없음'],
    ['엘리베이터 앞 게시판 교체의 건', '코르크 게시판 2개', '96,000원'],
  ] },
  { title: ['지출', '결의서'], items: [
    ['영업2팀 출장비 정산의 건', '교통비, 숙박비 2일', '342,500원'],
    ['거래처 연말 인사 카드 발송의 건', '카드 120장, 우편 요금', '131,000원'],
    ['신입 사원 명함 제작의 건', '명함 4인 각 200장', '64,000원'],
  ] },
  { title: ['구매', '요청서'], items: [
    ['창고 선반 두 칸 추가의 건', '철제 선반 2단', '238,000원'],
    ['사내 체육대회 간식 구매의 건', '음료 60개, 떡 60인분', '410,000원'],
    ['4층 형광등 교체의 건', 'LED 등 18개', '162,000원'],
  ] },
  { title: ['출장', '신청서'], items: [
    ['물류센터 재고 실사 출장의 건', '1박 2일, 2명', '280,000원'],
    ['거래처 납품 회의 출장의 건', '당일, 1명', '48,000원'],
  ] },
];
const BANNED = [
  ['사장실 안마의자 구매의 건', '예산 없음'],
  ['전 직원 금요일 휴무의 건', '다시 써 와요'],
  ['탕비실 아이스크림 냉동고의 건', '겨울이에요'],
  ['회의 없는 주 지정의 건', '회의해 봅시다'],
  ['옥상 해먹 설치의 건', '안전 문제'],
];
const QUOTES = [
  ['견적서', '(주)층층선반', [['철제 선반', '4'], ['선반 받침', '16'], ['설치비', '1']]],
  ['거래명세서', '클립상자 상사', [['A4 복사지', '10'], ['클립 상자', '20'], ['볼펜', '50']]],
  ['견적서', '(주)층층선반', [['의자 바퀴', '40'], ['가스 실린더', '6'], ['출장 수리', '1']]],
  ['거래명세서', '물방울셈 정수', [['정수기 필터', '3'], ['컵 디스펜서', '1'], ['점검비', '1']]],
];
const CONTRACTS = [
  ['청소 용역 계약서', '(주)쓸고닦고'],
  ['물품 공급 계약서', '클립상자 상사'],
  ['비밀 유지 약정서', '(주)접힌모서리'],
  ['시설 점검 계약서', '볼트한줌 설비'],
];

// ---------------------------------------------------------------- hand marks (SVG paths)

export function scribble(rand, x, y, w, h) {
  const n = 4 + Math.floor(rand() * 3);
  let d = `M${n1(x)} ${n1(y + h * 0.65)}`;
  for (let i = 1; i <= n; i++) {
    const px = x + (w * i) / n;
    const up = i % 2 ? -0.15 : 1.05;
    d += ` Q${n1(px - w / (2 * n) + (rand() - 0.5) * w * 0.18)} ${n1(y + up * h * (0.55 + rand() * 0.5))} ${n1(px)} ${n1(y + h * (0.3 + rand() * 0.45))}`;
  }
  d += ` M${n1(x + w * 0.05)} ${n1(y + h * 1.05)} q${n1(w * 0.45)} ${n1(-h * 0.3)} ${n1(w * 0.9)} ${n1(-h * 0.08)}`;
  return d;
}

export function markerRing(rand, cx, cy, rx, ry) {
  const a0 = rand() * Math.PI * 2;
  const n = 44, turns = 1.14;
  const wob = rand() * 6;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 - turns * Math.PI * 2 * t;
    const grow = 1 + 0.09 * t + 0.03 * Math.sin(a * 2 + wob);
    const x = cx + Math.cos(a) * rx * grow;
    const y = cy + Math.sin(a) * ry * grow;
    d += (i ? 'L' : 'M') + n1(x) + ' ' + n1(y);
  }
  return d;
}

function strike(rand, x0, x1, y) {
  const s = (rand() - 0.5) * 0.8;
  return `M${n1(x0)} ${n1(y - 1 + s)}L${n1(x1)} ${n1(y - 1 - s)}M${n1(x0 + 0.6)} ${n1(y + 1.2 + s)}L${n1(x1 - 0.4)} ${n1(y + 1.1 - s)}`;
}

// ---------------------------------------------------------------- markup helpers

// text at (x, y) in document units, size in units; a = 'l' | 'c' | 'r'
const T = (x, y, s, text, cls = '', a = 'l') =>
  `<span class="t ${cls} t-${a}" style="--x:${x};--y:${y};--s:${s}">${text}</span>`;
const svg = (body, cls = '') => `<svg class="lines ${cls}" viewBox="0 0 100 130" aria-hidden="true" focusable="false">${body}</svg>`;
const L = (d, w = 0.35, cls = '') => `<path class="${cls}" d="${d}" stroke-width="${w}"/>`;
const R = (x, y, w, h, sw = 0.55) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke-width="${sw}"/>`;

function docNo(rand) {
  return `한칸-1109-${String(10 + Math.floor(rand() * 89))}`;
}

function approvalBlock(rand, signed, circled, crossed) {
  // 결재란: label column 31..38, 칸 38..98, header 13..19, stamp row 19..37
  let lines = R(31, 13, 67, 24, 0.6) + L('M38 13V37M58 13V37M78 13V37M38 19H98', 0.4);
  let marks = '';
  let text = T(34.5, 18.4, 4.4, '결', '', 'c') + T(34.5, 25.6, 4.4, '재', '', 'c');
  BOX_NAMES.forEach((name, i) => { text += T(BOXES[i] + 10, 13.5, 4.2, name, '', 'c'); });
  for (const i of signed) marks += L(scribble(rand, BOXES[i] + 3, 23, 14, 8), 0.7, 'pen');
  for (const i of circled) marks += L(markerRing(rand, BOXES[i] + 10, 28.4, 11.8, 9.2), 1.05, 'marker');
  if (crossed) marks += L(`M39 36.2L97 20`, 0.9, 'marker');
  return { lines, marks, text };
}

function footer(rand) {
  return T(6, 121.5, 3.8, '(주)한칸물산', 'soft') + T(94, 121.5, 3.8, docNo(rand), 'soft', 'r');
}

// ---------------------------------------------------------------- documents

// o.flaw: 'nosign' (a 칸 before the circled one was never signed) or 'tape' (the amount was
// changed with correction tape instead of a 정정인): both must go back unstamped.
// o.urgent: a 긴급 note in marker. o.again: back from the 미결 pile, marked 재상신.
function gyeoljaeDoc(rand, boxes, banned, o = {}) {
  const form = banned ? FORMS[0] : pick(rand, FORMS);
  let [subject, line2, amount] = banned ? [banned[0], '자세한 내용은 붙임 참조', '미정'] : pick(rand, form.items);
  if (o.flaw === 'tape' && amount === '없음') amount = '58,000원';
  const who = pick(rand, PEOPLE), dept = pick(rand, DEPTS);
  // already signed: every 칸 before the first circled one (one of them left blank on a 'nosign')
  const first = boxes.length ? Math.min(...boxes) : 1;
  let signed = [];
  for (let i = 0; i < first; i++) signed.push(i);
  if (o.flaw === 'nosign') signed.splice(Math.floor(rand() * signed.length), 1);
  const ab = approvalBlock(rand, banned ? [0] : signed, boxes, !!banned);
  const title = form.title.length === 1
    ? T(18, 21.6, 8.2, form.title[0], 'title', 'c')
    : T(18, 17.6, 6.6, form.title[0], 'title', 'c') + T(18, 26.4, 6.6, form.title[1], 'title', 'c');
  let lines = ab.lines + R(5, 42, 93, 24, 0.55) + L('M5 50H98M5 58H98M22 42V66', 0.35) + R(5, 70, 93, 42, 0.45) + L('M5 118H98', 0.3);
  let text = title + ab.text;
  text += T(13.5, 43.6, 4.2, '기안자', '', 'c') + T(25, 43.4, 4.6, `${who} (${dept})`);
  text += T(13.5, 51.6, 4.2, '금액', '', 'c');
  if (o.flaw === 'tape') {
    // a strip of correction tape over the printed figure, a new figure written on it in pen
    const w = amount.length * 3.3 + 5;
    text += `<span class="tape" style="--x:24;--y:50.7;--w:${n1(w)}"></span>`;
    text += T(25.5, 50.3, 6, amount.replace(/^\d/, (dg) => String((Number(dg) % 9) + 1)), 'hand pen');
  } else {
    text += T(25, 51.4, 4.6, amount);
  }
  text += T(13.5, 59.6, 4.2, '제목', '', 'c') + T(25, 59.4, 4.6, subject);
  text += T(9, 73.5, 4.2, banned ? '아래와 같이 건의하오니 검토 바랍니다.' : '아래와 같이 시행하고자 하오니 결재 바랍니다.');
  text += T(9, 81, 4.2, `1. 내용: ${line2}`);
  text += T(9, 88, 4.2, '2. 기안일: 2026. 11. 9.');
  text += T(9, 95, 4.2, `3. 담당: ${dept} ${who}`);
  text += T(9, 103, 4, '붙임 1부. 끝.', 'soft');
  text += footer(rand);
  let marks = ab.marks;
  if (banned) {
    text += T(52, 63, 26, '반려', 'hand big', 'c');
    text += T(74, 98, 8.5, banned[1], 'hand', 'c');
  }
  if (o.urgent) {
    text += T(5, 2.2, 8.4, '긴급', 'hand');
    marks += L('M4.5 11.4C10 10.6 16 10.9 21.5 10.4', 0.9, 'marker');
  }
  const html = `<div class="sheet">${svg(lines)}${text}${svg(marks, 'ink')}</div>`;
  return { html, targets: boxes.map((i) => ({ u: BOXES[i] + 10, box: i })) };
}

function money(v) { return v.toLocaleString('ko-KR'); }

function jeongjeongDoc(rand) {
  const [title, vendor, items] = pick(rand, QUOTES);
  const prices = items.map(() => (2 + Math.floor(rand() * 40)) * 1000);
  const total = items.reduce((s, it, i) => s + Number(it[1]) * prices[i], 0);
  // a transposed pair of digits, the commonest slip
  const digits = String(total).split('');
  let k = 1 + Math.floor(rand() * Math.max(1, digits.length - 3));
  if (digits[k] === digits[k + 1]) k = 0;
  const wrong = digits.slice();
  [wrong[k], wrong[k + 1]] = [wrong[k + 1], wrong[k]];
  let bad = Number(wrong.join(''));
  if (bad === total) bad = total + 9000;
  const old = money(bad) + '원';
  const w = old.length * 2.9; // Hi Melody figure width at 6.2 units, measured roughly
  let lines = R(5, 14, 93, 28, 0.6) + L('M27 14V42', 0.4) + R(5, 48, 93, 46, 0.5) + L('M5 56H98M5 65.5H98M5 75H98M5 84.5H98M52 48V94M70 48V94', 0.33) + L('M5 118H98', 0.3);
  let marks = L(strike(rand, 58 - w / 2 - 1.5, 58 + w / 2 + 1.5, 28), 0.55, 'pen');
  let text = T(50, 3.2, 7.6, title.split('').join(' '), 'title', 'c');
  text += T(16, 21.6, 4.4, '합계', '', 'c') + T(16, 28.2, 4.4, '금액', '', 'c');
  text += T(58, 24.2, 6.2, old, 'fig', 'c');
  text += T(58, 15.2, 6.4, money(total) + '원', 'hand', 'c');
  text += T(28.5, 49.6, 4.2, '품명', '', 'c') + T(61, 49.6, 4.2, '수량', '', 'c') + T(84, 49.6, 4.2, '금액', '', 'c');
  items.forEach((it, i) => {
    const y = 58 + i * 9.5;
    text += T(8, y, 4.4, it[0]) + T(61, y, 4.4, it[1], '', 'c') + T(95, y, 4.4, money(Number(it[1]) * prices[i]), '', 'r');
  });
  text += T(9, 99, 4.2, '위와 같이 계산합니다. (부가세 포함)');
  text += T(9, 106.5, 4.2, `공급자 ${vendor}`);
  text += footer(rand);
  const html = `<div class="sheet">${svg(lines)}${text}${svg(marks, 'ink')}</div>`;
  return { html, targets: [{ u: 58 }] };
}

function ganinDoc(rand) {
  const [title, party] = pick(rand, CONTRACTS);
  // page 2 underneath (0..100), page 1 on top shifted left (-32..68): the seam is at 68
  let bLines = L('M70 118H94', 0.3) + R(71, 94, 24, 17, 0.4);
  let bText = T(94, 122, 3.8, '2/2', 'soft', 'r');
  bText += T(74, 12, 4.4, '제4조 (대금)') + T(74, 18.5, 3.9, '매월 말일에', 'soft') + T(74, 24.5, 3.9, '지급한다.', 'soft');
  bText += T(74, 34, 4.4, '제5조 (기간)') + T(74, 40.5, 3.9, '계약일부터', 'soft') + T(74, 46.5, 3.9, '1년으로 한다.', 'soft');
  bText += T(74, 56, 4.4, '제6조 (기타)') + T(74, 62.5, 3.9, '정하지 않은', 'soft') + T(74, 68.5, 3.9, '사항은 협의.', 'soft');
  bText += T(74, 80, 4, '2026. 11. 9.', 'soft');
  bText += T(73, 95.5, 3.7, '갑 한칸물산') + T(73, 102, 3.7, `을 ${party.replace('(주)', '').split(' ')[0]}`) + T(73, 108.5, 3.7, '(인)', 'soft');
  let bMarks = L('M86 12 C80 14 76 18 71.5 23.5', 0.75, 'marker') + L('M71 19.6L71.2 24.2L75.2 22.6', 0.75, 'marker');
  bText += T(88, 3.4, 8.4, '간인', 'hand', 'c');
  // page 1, in its own frame (x + 32)
  let aLines = L('M8 44H92', 0.3) + L('M8 118H92', 0.3);
  let aText = T(50, 5, 6.8, title, 'title', 'c') + T(50, 14, 3.8, '(1/2)', 'soft', 'c');
  aText += T(10, 24, 4.4, '제1조 (목적)') + T(10, 30.5, 3.9, `(주)한칸물산(갑)과 ${party}(을)은`, 'soft') + T(10, 36.5, 3.9, '아래 내용으로 계약을 맺는다.', 'soft');
  aText += T(10, 50, 4.4, '제2조 (범위)') + T(10, 56.5, 3.9, '본사 사무실 3개 층 전체', 'soft');
  aText += T(10, 68, 4.4, '제3조 (금액)') + T(10, 74.5, 3.9, '월 1,980,000원 (부가세 별도)', 'soft');
  aText += T(10, 86, 4, '다음 장에 이어집니다.', 'soft');
  const html =
    `<div class="sheet sheet-b">${svg(bLines)}${bText}${svg(bMarks, 'ink')}</div>` +
    `<div class="sheet sheet-a">${svg(aLines)}${aText}</div>`;
  return { html, targets: [{ u: 68 }], ext0: -32 }; // the seam is the right edge of page 1
}

/**
 * spec: { kind: 'gyeoljae', boxes: [i...], flaw?: 'nosign' | 'tape', urgent?: true }
 *     | { kind: 'jeongjeong' } | { kind: 'ganin' } | { kind: 'banryeo' }; any spec may carry again: true
 * returns { kind, el, sheets: [{el, x0}], ext0, ext1, targets, label, hold, flaw, urgent, again }
 * hold = the document must go back without a stamp (반려, or a flaw). A flawed document is labelled
 * like a clean one on purpose: spotting the flaw is the player's job.
 */
export function buildDoc(spec, rand) {
  let built, label;
  if (spec.kind === 'gyeoljae') {
    built = gyeoljaeDoc(rand, spec.boxes, null, spec);
    label = spec.boxes.length > 1 ? `${spec.boxes.map((i) => BOX_NAMES[i]).join(', ')} 두 칸` : `${BOX_NAMES[spec.boxes[0]]} 칸`;
    if (spec.urgent) label = `긴급, ${label}`;
  } else if (spec.kind === 'banryeo') {
    built = gyeoljaeDoc(rand, [], pick(rand, BANNED));
    label = '반려, 찍지 말고 보내기';
  } else if (spec.kind === 'jeongjeong') {
    built = jeongjeongDoc(rand);
    label = '정정인, 두 줄 그은 숫자';
  } else {
    built = ganinDoc(rand);
    label = '간인, 겹친 이음매에 반씩';
  }
  const el = document.createElement('div');
  el.className = `doc doc-${spec.kind}`;
  el.innerHTML = built.html;
  const sheets = [...el.querySelectorAll('.sheet')].map((s) => ({ el: s, x0: s.classList.contains('sheet-a') ? -32 : 0 }));
  if (spec.again) {
    // back from the pile: 재상신 in marker, low on the page that carries the target
    sheets.find((s) => s.x0 === 0).el.insertAdjacentHTML('beforeend', T(94, spec.kind === 'ganin' ? 111.4 : 103.6, 6.4, '재상신', 'hand', 'r'));
  }
  return {
    kind: spec.kind, el, sheets, label,
    ext0: built.ext0 || 0, ext1: 100,
    targets: built.targets.map((t) => ({ ...t, status: null })),
    hold: spec.kind === 'banryeo' || !!spec.flaw,
    flaw: spec.flaw || null, urgent: !!spec.urgent, again: !!spec.again,
  };
}
