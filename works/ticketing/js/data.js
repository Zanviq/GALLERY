// 광클: concerts (= difficulty levels), venue layouts, copy. Everything here is invented.

export const GRADES = ['VIP', 'R', 'S', 'A'];
export const GRADE_HEAT = { VIP: 3.2, R: 1.9, S: 1.1, A: 0.65 };
export const OPEN_AT = 20 * 3600 * 1000; // 20:00:00.000 server time
export const LEAD = 8; // seconds on the clock before the open
export const FEE = 2000; // 예매수수료 per ticket

// Layout units: one seat = 1. orient 'up' = rows run left-right, row 1 nearest the stage;
// 'left' / 'right' = side stands, rows run top-bottom, row 1 nearest the floor.
function row(prefix, grade, y, rows, xs, cols = 8) {
  return xs.map((x, i) => ({ id: prefix + (i + 1), grade, x, y, cols, rows, orient: 'up' }));
}
function side(ids, grade, x, ys, orient, rows = 4, cols = 6) {
  return ids.map((id, i) => ({ id, grade, x, y: ys[i], cols, rows, orient }));
}
const step = (n, x0, gap = 9.5) => Array.from({ length: n }, (_, i) => x0 + i * gap);

const HALL = {
  W: 27, H: 25.5, stage: { x: 5.5, y: 0, w: 16, h: 2.4 },
  tiers: [{ y: 15.4, label: '2층' }],
  blocks: [
    ...row('A', 'VIP', 4, 4, step(3, 0)),
    ...row('B', 'R', 9.5, 5, step(3, 0)),
    ...row('C', 'S', 17, 4, step(3, 0)),
    ...row('D', 'A', 22.5, 3, step(3, 0)),
  ],
};

const ARENA = {
  W: 48.5, H: 26, stage: { x: 10.25, y: 0, w: 28, h: 3 },
  tiers: [],
  blocks: [
    ...row('A', 'VIP', 5, 6, step(4, 6)),
    ...row('B', 'R', 12.5, 6, step(4, 6)),
    ...side(['101', '102'], 'S', 0, [5, 12.5], 'left'),
    ...side(['103', '104'], 'S', 44.5, [5, 12.5], 'right'),
    ...row('2', 'A', 21, 5, step(5, 1.25)).map((b, i) => ({ ...b, id: String(201 + i) })),
  ],
};

const STADIUM = {
  W: 58, H: 33.5, stage: { x: 14, y: 0, w: 30, h: 3 },
  tiers: [],
  blocks: [
    ...row('A', 'VIP', 5, 6, step(5, 6)),
    ...row('B', 'R', 12.5, 6, step(5, 6)),
    ...row('C', 'S', 20, 6, step(5, 6)),
    ...side(['101', '102', '103'], 'S', 0, [5, 12.5, 20], 'left'),
    ...side(['104', '105', '106'], 'S', 54, [5, 12.5, 20], 'right'),
    ...row('2', 'A', 28.5, 5, step(6, 0.5)).map((b, i) => ({ ...b, id: String(201 + i) })),
  ],
};

export const CONCERTS = [
  {
    id: 'ballad',
    levelName: '쉬움',
    artist: '도해솔',
    title: '〈열두 번째 겨울〉',
    kind: '소극장 콘서트',
    name: '도해솔 소극장 콘서트 〈열두 번째 겨울〉',
    short: '도해솔 〈열두 번째 겨울〉',
    blurb: '피아노 한 대와 목소리 하나. 데뷔 열두 해째 겨울을 메아리 소극장에서 보냅니다. 앞줄과 뒷줄의 거리가 열다섯 걸음인 곳입니다.',
    date: '2026년 12월 19일 토요일 오후 7시 30분',
    dateShort: '2026.12.19 토 19:30',
    venue: '메아리 소극장',
    address: '메아리시 울림대로 12, 지하 1층',
    runtime: '110분',
    age: '8세 이상',
    hall: '1층과 2층',
    applicants: 9400,
    img: 'hall', alt: '공연 전의 빈 소극장. 분홍빛 막 앞 핀 조명 동그라미 안에 마이크 스탠드와 나무 의자가 있고, 옆에 피아노, 앞에는 빈 객석이 줄지어 있다',
    pos: { hero: '50% 45%', band: '50% 62%', event: '50% 62%' },
    prices: { VIP: 121000, R: 110000, S: 99000, A: 77000 },
    where: { VIP: '1층 앞쪽', R: '1층 뒤쪽', S: '2층 앞쪽', A: '2층 뒤쪽' },
    odds: { VIP: 0.75, R: 0.85, S: 0.92, A: 0.96 },
    latency: 0.18,
    seatTime: 50,
    payTime: 25,
    k: 0.034,
    queue: { base: 60, span: 4200, tau: 3, Pf: 1800, add: 300 },
    godTime: 26,
    layout: HALL,
  },
  {
    id: 'idol',
    levelName: '보통',
    artist: 'ORBEAT',
    title: '〈FIRST ORBIT〉 서울',
    kind: '월드투어',
    name: 'ORBEAT 월드투어 〈FIRST ORBIT〉 서울',
    short: 'ORBEAT 〈FIRST ORBIT〉',
    blurb: '데뷔 3년 만의 첫 월드투어. 열한 개 도시 가운데 첫 공연이 메아리 아레나에서 열립니다. 서울 공연은 이날 하루뿐입니다.',
    date: '2027년 1월 23일 토요일 오후 6시',
    dateShort: '2027.1.23 토 18:00',
    venue: '메아리 아레나',
    address: '메아리시 함성로 200',
    runtime: '150분',
    age: '8세 이상',
    hall: '플로어와 스탠드',
    applicants: 128000,
    img: 'arena', alt: '문 열기 전의 아레나. 플로어에 줄지은 빈 접이의자마다 분홍 응원봉이 하나씩 켜져 있고, 무대에서 하얀 빔 조명이 쏟아진다',
    pos: { hero: '50% 50%', band: '50% 56%', event: '50% 50%' },
    prices: { VIP: 165000, R: 154000, S: 132000, A: 99000 },
    where: { VIP: '플로어 앞쪽', R: '플로어 뒤쪽', S: '옆 스탠드', A: '뒤 스탠드' },
    odds: { VIP: 0.45, R: 0.6, S: 0.75, A: 0.85 },
    latency: 0.28,
    seatTime: 40,
    payTime: 20,
    k: 0.055,
    queue: { base: 900, span: 70000, tau: 5, Pf: 16000, add: 2400 },
    godTime: 30,
    layout: ARENA,
  },
  {
    id: 'reunion',
    levelName: '어려움',
    artist: '청동거울',
    title: '〈다시, 한 번〉',
    kind: '재결합 공연',
    name: '청동거울 재결합 공연 〈다시, 한 번〉',
    short: '청동거울 〈다시, 한 번〉',
    blurb: '1998년에 데뷔해 2006년에 흩어진 네 사람이 21년 만에 한 무대에 섭니다. 다음 공연은 없다고 미리 말해 두었습니다.',
    date: '2027년 5월 15일 토요일 오후 7시',
    dateShort: '2027.5.15 토 19:00',
    venue: '메아리 주경기장',
    address: '메아리시 너른마당길 1',
    runtime: '180분',
    age: '전체 관람가',
    hall: '그라운드와 스탠드',
    applicants: 640000,
    img: 'stadium', alt: '무대 뒤쪽에서 본 문 열기 전의 주경기장. 공연 장비가 무대에서 기다리고, 분홍과 하얀 조명이 빈 객석을 비춘다',
    pos: { hero: '50% 62%', band: '50% 58%', event: '50% 56%' },
    prices: { VIP: 187000, R: 165000, S: 143000, A: 110000 },
    where: { VIP: '그라운드 앞쪽', R: '그라운드 가운데', S: '그라운드 뒤쪽, 옆 스탠드', A: '뒤 스탠드' },
    odds: { VIP: 0.28, R: 0.42, S: 0.6, A: 0.75 },
    latency: 0.36,
    seatTime: 32,
    payTime: 16,
    k: 0.08,
    queue: { base: 9000, span: 400000, tau: 5, Pf: 70000, add: 15000 },
    godTime: 34,
    layout: STADIUM,
  },
];

export const ADDRESS_NOTE = '가상 서비스입니다. 실제 주소가 아닙니다.';

// Outcomes, best first. Copy for the stub.
export const RANKS = {
  god: { score: 6, title: '광클의 신', line: (r) => `VIP석 나란히, 결제까지 ${r.total.toFixed(1)}초.` },
  vip2: { score: 5, title: '성공한 덕후', line: () => 'VIP석에 친구와 나란히 앉습니다.' },
  r2: { score: 4, title: '피켓팅 생존자', line: () => 'R석 나란히. 이 정도면 잘 싸웠습니다.' },
  sa2: { score: 3, title: '어디든 나란히', line: (r) => `${r.grade}석이지만 둘이 같이 봅니다.` },
  split: { score: 2, title: '따로 또 같이', line: () => '두 자리를 잡았지만 떨어져 앉습니다.' },
  solo: { score: 1, title: '혼자라도 간다', line: () => '친구 표는 취소표를 노려 보세요.' },
  soldout: { score: 0, title: '취소표를 노리세요', line: () => '전석 매진. 취소표는 보통 결제 마감 뒤에 풀립니다.' },
  seattime: { score: 0, title: '취소표를 노리세요', line: () => '좌석 선택 시간이 끝나 잡은 좌석이 풀렸습니다.' },
  paytime: { score: 0, title: '결제 직전 탈락', line: () => '결제 시간이 끝나 좌석이 다른 사람에게 넘어갔습니다.' },
};

export const DISCOUNTS = [
  { id: 'none', label: '일반', note: '할인 없음', rate: 0 },
  { id: 'card', label: '앞줄카드 청구할인 10%', note: '앞줄카드로 결제할 때만', rate: 0.1 },
  { id: 'youth', label: '청소년 할인 20%', note: '만 13~18세, 입장할 때 신분증 확인', rate: 0.2, wrong: '만 27세는 청소년 할인을 받을 수 없습니다.' },
  { id: 'welfare', label: '장애인 할인 50%', note: '복지카드 지참, 동반 1인까지', rate: 0.5, wrong: '복지카드가 없어 이 할인을 받을 수 없습니다.' },
];

export const METHODS = [
  { id: 'apjul', label: '앞줄카드', note: '지갑에 있음' },
  { id: 'other', label: '다른 신용카드', note: '지갑에 있음' },
  { id: 'bank', label: '무통장입금', note: '오픈 당일에는 받지 않음', wrong: '이 공연은 오픈 당일 무통장입금을 받지 않습니다.' },
];
