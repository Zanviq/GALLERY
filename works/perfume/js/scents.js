// The four scents of 담금: copy, page palette (mirrors css/site.css) and liquid physics.
// Colors for the liquid are sRGB hex; the shaders convert them to linear.

export const SCENTS = [
  {
    id: 'yuwol',
    no: '01',
    name: '유월',
    latin: 'Yuwol',
    line: '덜 익은 유자 껍질과 손으로 비빈 쑥잎. 비가 그친 유월 아침의 마당.',
    conc: '오 드 퍼퓸 16%',
    price50: '168,000원',
    price15: '58,000원',
    notes: [
      { key: 'top', label: '첫 향', when: '뿌리고 15분 동안', items: '풋유자, 초피',
        text: '덜 익은 유자 껍질을 비틀 때 튀는 즙. 초피가 혀끝처럼 살짝 저릿하게 받칩니다.' },
      { key: 'heart', label: '가운데 향', when: '30분부터 세 시간까지', items: '쑥, 무화과잎',
        text: '손바닥으로 비빈 쑥잎과 무화과잎의 풋내. 달지 않고 조금 쌉싸름합니다.' },
      { key: 'base', label: '잔향', when: '세 시간 뒤부터', items: '편백, 젖은 이끼',
        text: '비 맞은 편백 울타리와 돌 틈의 이끼. 해가 질 때까지 서늘하게 남습니다.' },
    ],
    liquid: {
      deep: '#1d2a0c', body: '#7f8f2c', light: '#dfe6a0', key: '#f4f8ec', floor: '#3a4320',
      layers: ['#d9df98', '#9aa846', '#4d5a1d'],
      clarity: 0.85, gloss: 1.0,
    },
    physics: { damping: 0.985, spread: 0.06, brush: 0.022, flow: 1.0, steps: 2, amp: 0.8 },
  },
  {
    id: 'jocheong',
    no: '02',
    name: '조청',
    latin: 'Jocheong',
    line: '갓 볶은 보리와 오래 고은 조청. 손목에 꿀처럼 붙어 있습니다.',
    conc: '오 드 퍼퓸 20%',
    price50: '168,000원',
    price15: '58,000원',
    notes: [
      { key: 'top', label: '첫 향', when: '뿌리고 15분 동안', items: '볶은 보리, 생강',
        text: '뚜껑을 열면 갓 볶은 보리차 냄새가 먼저 올라옵니다. 생강이 끝을 살짝 맵게 세웁니다.' },
      { key: 'heart', label: '가운데 향', when: '30분부터 세 시간까지', items: '조청, 말린 대추',
        text: '가마솥에서 오래 고은 조청의 끈적한 단내. 말린 대추가 단맛을 붉게 눌러 줍니다.' },
      { key: 'base', label: '잔향', when: '세 시간 뒤부터', items: '안식향, 송진',
        text: '바닐라처럼 따뜻한 안식향과 소나무 송진. 저녁이 되어도 손목에 단내가 남습니다.' },
    ],
    liquid: {
      deep: '#2a0f02', body: '#b3620c', light: '#f6c46a', key: '#ffe6bd', floor: '#4a2408',
      layers: ['#f1cf86', '#c87a1c', '#5a2405'],
      clarity: 0.7, gloss: 1.1,
    },
    physics: { damping: 0.955, spread: 0.32, brush: 0.04, flow: 0.42, steps: 1, amp: 1.25 },
  },
  {
    id: 'omi',
    no: '03',
    name: '오미',
    latin: 'Omi',
    line: '술에 담근 오미자와 말린 장미. 끝은 오래 낀 스웨이드 장갑처럼 부드럽습니다.',
    conc: '오 드 퍼퓸 18%',
    price50: '168,000원',
    price15: '58,000원',
    notes: [
      { key: 'top', label: '첫 향', when: '뿌리고 15분 동안', items: '오미자, 핑크 페퍼',
        text: '술에 담근 오미자를 처음 맛볼 때처럼 시고, 달고, 조금 짭니다. 핑크 페퍼가 그 위에서 톡 튑니다.' },
      { key: 'heart', label: '가운데 향', when: '30분부터 세 시간까지', items: '말린 장미, 산딸기',
        text: '꽃잎이 바스락할 만큼 말린 장미. 생화보다 낮고 진하며, 산딸기가 붉은 즙을 보탭니다.' },
      { key: 'base', label: '잔향', when: '세 시간 뒤부터', items: '스웨이드, 머스크',
        text: '오래 낀 스웨이드 장갑의 안쪽처럼 부드럽고 따뜻하게 가라앉습니다.' },
    ],
    liquid: {
      deep: '#240309', body: '#8f1530', light: '#ef8e9f', key: '#ffe2e2', floor: '#3c0a16',
      layers: ['#eda3ae', '#a92640', '#4a0817'],
      clarity: 0.55, gloss: 1.0,
    },
    physics: { damping: 0.972, spread: 0.16, brush: 0.03, flow: 0.7, steps: 1, amp: 1.0 },
  },
  {
    id: 'meok',
    no: '04',
    name: '먹',
    latin: 'Meok',
    line: '벼루에 간 먹과 소나기 지난 마당의 돌. 방 안에 낮게 깔립니다.',
    conc: '엑스트레 24%',
    price50: '186,000원',
    price15: '64,000원',
    notes: [
      { key: 'top', label: '첫 향', when: '뿌리고 15분 동안', items: '젖은 돌, 흑후추',
        text: '소나기가 지나간 뒤 마당 돌에서 올라오는 냄새. 흑후추가 차갑게 선을 긋습니다.' },
      { key: 'heart', label: '가운데 향', when: '30분부터 세 시간까지', items: '먹, 한지',
        text: '벼루에 먹을 갈 때의 그을음과 장뇌. 마른 한지가 그 사이를 가볍게 채웁니다.' },
      { key: 'base', label: '잔향', when: '세 시간 뒤부터', items: '침향, 백단',
        text: '타지 않은 침향의 깊은 나무 냄새와 백단. 다음 날 아침 옷깃에서도 맡아집니다.' },
    ],
    liquid: {
      deep: '#050608', body: '#2b3037', light: '#a9b3bf', key: '#eef3f8', floor: '#0d0f12',
      layers: ['#b9c1ca', '#5b636d', '#14171b'],
      clarity: 0.18, gloss: 1.35,
    },
    physics: { damping: 0.966, spread: 0.2, brush: 0.032, flow: 0.55, steps: 1, amp: 1.05 },
  },
];

export const DEFAULT_SCENT = 'jocheong';

export const byId = (id) => SCENTS.find((s) => s.id === id) || SCENTS[1];

// Korean particle after a word: 은/는, 이/가, 을/를, 과/와, (이)라
export function josa(word, pair) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const batchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [withB, without] = pair.split('/');
  // '(으)로' takes 로 after ㄹ: 유월로, 조청으로
  if (withB === '으로' && code % 28 === 8) return word + without;
  return word + (batchim ? withB : without);
}
