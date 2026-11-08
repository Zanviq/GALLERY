// 색 구성, 스위치, 분해 층. 3D 와 화면 글이 같은 값을 쓴다.

export const COLORWAYS = {
  meok: {
    name: '먹',
    roman: 'Meok',
    caseColor: '#4c4f55',
    caseRough: 0.34,
    alpha: '#2a2c30', alphaLegend: '#dddcd5', alphaSub: '#e8ae35',
    mod: '#1f2024', modLegend: '#cfcec7', modSub: '#e8ae35',
    accent: '#e3a92f', accentLegend: '#1e1f22',
    css: { accent: '#E3A92F', onAccent: '#1E1F22', accentInk: '#7A5200', accentDeep: '#B07F14' },
  },
  baekja: {
    name: '백자',
    roman: 'Baekja',
    caseColor: '#c4c7c9',
    caseRough: 0.3,
    alpha: '#ecebe5', alphaLegend: '#2c4a8c', alphaSub: '#2c4a8c',
    mod: '#dcdcd6', modLegend: '#2c4a8c', modSub: '#2c4a8c',
    accent: '#2c4a8c', accentLegend: '#f2f1ec',
    css: { accent: '#2C4A8C', onAccent: '#FFFFFF', accentInk: '#2C4A8C', accentDeep: '#1D3466' },
  },
  bisaek: {
    name: '비색',
    roman: 'Bisaek',
    caseColor: '#8ca595',
    caseRough: 0.32,
    alpha: '#dfe5dc', alphaLegend: '#24493e', alphaSub: '#3f7563',
    mod: '#b9c8bc', modLegend: '#24493e', modSub: '#24493e',
    accent: '#2d5f50', accentLegend: '#e9efe8',
    css: { accent: '#2D5F50', onAccent: '#FFFFFF', accentInk: '#2D5F50', accentDeep: '#1C4136' },
  },
  juchil: {
    name: '주칠',
    roman: 'Juchil',
    caseColor: '#8a2a1d',
    caseRough: 0.34,
    alpha: '#26272a', alphaLegend: '#e7e3da', alphaSub: '#e0603f',
    mod: '#1d1e21', modLegend: '#d8d3c8', modSub: '#e0603f',
    accent: '#b3361f', accentLegend: '#f6eee6',
    css: { accent: '#B3361F', onAccent: '#FFFFFF', accentInk: '#A5301A', accentDeep: '#7E2414' },
  },
};

// 힘-거리 곡선 점: [이동 mm, gf]. press 는 누를 때, release 는 놓을 때.
export const SWITCHES = {
  goyo: {
    name: '고요',
    kind: '리니어',
    travel: 4.0,
    actuation: 2.0,
    actForce: 45,
    bottomForce: 58,
    press: [[0, 32], [0.15, 35], [2.0, 45], [3.5, 56], [3.75, 60], [3.9, 74], [4.0, 96]],
    release: [[4.0, 80], [3.85, 52], [3.5, 50], [2.0, 39], [0.15, 29], [0, 26]],
    feel: { bump: 0, click: 0 },
  },
  maru: {
    name: '마루',
    kind: '택타일',
    travel: 3.8,
    actuation: 2.0,
    actForce: 48,
    peakForce: 62,
    bottomForce: 60,
    press: [[0, 34], [0.25, 50], [0.5, 62], [0.75, 52], [1.3, 42], [2.0, 47], [3.3, 57], [3.6, 62], [3.7, 76], [3.8, 96]],
    release: [[3.8, 78], [3.65, 52], [3.2, 49], [2.0, 40], [1.3, 35], [0.7, 44], [0.45, 46], [0.2, 36], [0, 29]],
    feel: { bump: 0.5, click: 0 },
  },
  ttogak: {
    name: '또각',
    kind: '클릭',
    travel: 3.6,
    actuation: 1.9,
    actForce: 55,
    bottomForce: 65,
    press: [[0, 36], [0.6, 44], [1.5, 55], [1.75, 58], [1.9, 36], [2.2, 40], [3.1, 62], [3.4, 66], [3.5, 80], [3.6, 98]],
    release: [[3.6, 80], [3.45, 56], [3.0, 52], [2.0, 38], [1.6, 30], [1.4, 46], [0.6, 37], [0, 30]],
    feel: { bump: 0, click: 1.9 },
  },
};

// 분해 층: 위에서 아래 순서 (화면 목록 순서와 같다)
export const LAYERS = [
  { id: 'caps', name: '키캡' },
  { id: 'top', name: '상판' },
  { id: 'switches', name: '스위치' },
  { id: 'plate', name: '보강판' },
  { id: 'pcb', name: '기판' },
  { id: 'foam', name: '흡음재' },
  { id: 'weight', name: '황동 무게추' },
  { id: 'bottom', name: '하판' },
];

export const PRICES = { full: 398000, barebone: 298000 };
