// Branches, machines, courses and lost items. Everything here is invented.

export const FAKE_NOTE = '가상 서비스예요. 실제 주소가 아니에요.';

// kind: washer | dryer | shoe (운동화 세탁기) | shoedry (운동화 건조기) | pet (반려동물 세탁기) | petdry
const W = (num, kg) => ({ kind: 'washer', num, kg });
const D = (num, kg) => ({ kind: 'dryer', num, kg });

export const BRANCHES = [
  {
    id: 'neureup',
    name: '느릅마루점',
    addr: '새물시 느릅마루길 21, 1층',
    way: '느릅마루길 버스 정류장 앞 편의점 옆 건물이에요.',
    parking: '건물 뒤 2대, 30분 무료',
    rate: 70, // mean seconds of simulated time between customers
    machines: [
      W(1, 20), W(2, 20), W(3, 20), W(4, 20), W(5, 30), W(6, 30),
      D(7, 25), D(8, 25), D(9, 25), D(10, 25), D(11, 25), D(12, 25),
      { kind: 'shoe', num: 13, kg: 4 }, { kind: 'shoedry', num: 14, kg: 4 },
    ],
    lost: [
      ['회색 양말 한 짝', 3, '9번 건조기'],
      ['아이 실내화 한 켤레', 5, '13번 운동화 세탁기'],
      ['흰색 세탁망', 8, '2번 세탁기'],
      ['체크무늬 손수건', 12, '11번 건조기'],
    ],
  },
  {
    id: 'jongdal',
    name: '종달샘점',
    addr: '새물시 종달샘로 7',
    way: '종달샘로 골목 안쪽, 파란 차양 아래 유리문이에요.',
    parking: '주차 자리가 없어요',
    rate: 160,
    machines: [W(1, 20), W(2, 20), W(3, 20), W(4, 30), D(5, 25), D(6, 25), D(7, 25), D(8, 25)],
    lost: [
      ['남색 수면 양말 한 짝', 1, '6번 건조기'],
      ['머리끈 두 개', 4, '2번 세탁기'],
    ],
  },
  {
    id: 'bitmul',
    name: '빗물터점',
    addr: '새물시 빗물터1길 3, 지하 1층',
    way: '계단으로 내려오면 바로 보여요. 엘리베이터는 건물 왼쪽에 있어요.',
    parking: '건물 지하 주차장 1시간 무료',
    rate: 85,
    machines: [
      W(1, 20), W(2, 20), W(3, 20), W(4, 20), W(5, 30),
      D(6, 25), D(7, 25), D(8, 25), D(9, 25), D(10, 25),
      { kind: 'shoe', num: 11, kg: 4 },
    ],
    lost: [
      ['회색 후드 끈', 2, '4번 세탁기'],
      ['아기 턱받이', 6, '8번 건조기'],
      ['검은 장우산', 9, '입구 우산꽂이'],
    ],
  },
  {
    id: 'solbawi',
    name: '솔바위점',
    addr: '새물시 솔바위로 40-2, 1층',
    way: '솔바위로 언덕 중간, 세탁기 그림 간판이 보이는 곳이에요.',
    parking: '가게 앞 1대',
    rate: 120,
    machines: [
      W(1, 20), W(2, 20), W(3, 30), D(4, 25), D(5, 25), D(6, 25), D(7, 25),
      { kind: 'pet', num: 8, kg: 15 }, { kind: 'petdry', num: 9, kg: 15 },
    ],
    lost: [
      ['강아지 장난감 공', 2, '8번 반려동물 세탁기'],
      ['흰 양말 한 짝', 7, '5번 건조기'],
    ],
  },
];

export const KIND = {
  washer: { name: '세탁기', group: 'washer', min: [25, 48], short: '세탁' },
  dryer: { name: '건조기', group: 'dryer', min: [30, 60], short: '건조' },
  shoe: { name: '운동화 세탁기', group: 'special', min: [25, 25], short: '운동화 세탁' },
  shoedry: { name: '운동화 건조기', group: 'special', min: [20, 20], short: '운동화 건조' },
  pet: { name: '반려동물 세탁기', group: 'special', min: [40, 40], short: '반려동물 세탁' },
  petdry: { name: '반려동물 건조기', group: 'special', min: [30, 30], short: '반려동물 건조' },
};

export const GROUPS = [
  { id: 'washer', name: '세탁기' },
  { id: 'dryer', name: '건조기' },
  { id: 'special', name: '전용 기계' },
];

// Course names a simulated customer might pick, by kind (shown in the machine sheet).
export const SIM_COURSES = {
  washer: [['표준', 38], ['표준', 38], ['표준', 38], ['이불', 48], ['울·섬세', 32], ['빠른 찬물', 24]],
  dryer: [['중온', 30], ['중온', 40], ['고온', 30], ['고온', 50], ['저온', 40], ['중온', 60]],
  shoe: [['운동화', 25]],
  shoedry: [['운동화 건조', 20]],
  pet: [['반려동물', 40]],
  petdry: [['반려동물 건조', 30]],
};

/*
 * Courses on the washer front. `demo` describes the shortened run that drives the drum:
 * phases are [name, seconds, settings]. rpm < 0 means the drum alternates direction.
 */
export const COURSES = {
  washer: [
    { id: 'std', name: '표준', min: 38, won: 4000, kg: 20, note: '평소 빨래는 거의 다 이 코스예요.',
      phases: [['급수', 4, { water: 0.3, rpm: -30 }], ['세탁', 14, { water: 0.3, rpm: -46 }], ['배수', 3, { water: 0, rpm: 30 }],
        ['헹굼', 9, { water: 0.28, rpm: -46 }], ['배수', 3, { water: 0, rpm: 30 }], ['탈수', 14, { spin: 190 }]] },
    { id: 'bed', name: '이불', min: 48, won: 6000, kg: 30, note: '이불 한 채나 패딩 두 벌까지. 물을 많이 받고 천천히 돌려요.',
      phases: [['급수', 5, { water: 0.38, rpm: -24 }], ['세탁', 16, { water: 0.38, rpm: -36 }], ['배수', 3, { water: 0, rpm: 24 }],
        ['헹굼', 10, { water: 0.36, rpm: -36 }], ['배수', 3, { water: 0, rpm: 24 }], ['탈수', 13, { spin: 150 }]] },
    { id: 'wool', name: '울·섬세', min: 32, won: 4000, kg: 20, note: '니트, 속옷, 블라우스. 살살 흔들고 약하게 짜요.',
      phases: [['급수', 4, { water: 0.34, rpm: -18 }], ['세탁', 12, { water: 0.34, rpm: -26 }], ['배수', 3, { water: 0, rpm: 18 }],
        ['헹굼', 8, { water: 0.32, rpm: -26 }], ['배수', 3, { water: 0, rpm: 18 }], ['탈수', 9, { spin: 100 }]] },
    { id: 'quick', name: '빠른 찬물', min: 24, won: 3000, kg: 20, note: '땀 밴 운동복처럼 덜 더러운 빨래를 찬물로 빨리.',
      phases: [['급수', 3, { water: 0.26, rpm: -34 }], ['세탁', 8, { water: 0.26, rpm: -48 }], ['배수', 2, { water: 0, rpm: 30 }],
        ['헹굼', 6, { water: 0.24, rpm: -48 }], ['배수', 2, { water: 0, rpm: 30 }], ['탈수', 11, { spin: 190 }]] },
    { id: 'rinse', name: '헹굼·탈수', min: 18, won: 2000, kg: 20, note: '손빨래한 것을 헹구고 짜기만 해요.',
      phases: [['급수', 3, { water: 0.28, rpm: -30 }], ['헹굼', 9, { water: 0.28, rpm: -46 }], ['배수', 3, { water: 0, rpm: 30 }], ['탈수', 12, { spin: 190 }]] },
    { id: 'spin', name: '탈수만', min: 8, won: 1000, kg: 20, note: '덜 짜진 빨래를 한 번 더 짜요.',
      phases: [['탈수', 13, { spin: 190 }]] },
  ],
  dryer: [
    { id: 'mid', name: '중온', min: 30, won: 4000, kg: 25, note: '면 티셔츠와 수건이 섞인 보통 빨래.',
      phases: [['건조', 30, { rpm: -50, heat: 2 }], ['식힘', 6, { rpm: -40, heat: 0 }]] },
    { id: 'hot', name: '고온', min: 30, won: 4000, kg: 25, note: '수건, 이불처럼 두꺼운 면.',
      phases: [['건조', 30, { rpm: -50, heat: 3 }], ['식힘', 6, { rpm: -40, heat: 0 }]] },
    { id: 'low', name: '저온', min: 40, won: 5000, kg: 25, note: '운동복, 니트처럼 열에 약한 옷. 덜 뜨겁게 오래 돌려요.',
      phases: [['건조', 34, { rpm: -46, heat: 1 }], ['식힘', 6, { rpm: -40, heat: 0 }]] },
    { id: 'more', name: '10분 더', min: 10, won: 1000, kg: 25, note: '덜 말랐을 때 이어서 돌려요.',
      phases: [['건조', 12, { rpm: -50, heat: 2 }], ['식힘', 4, { rpm: -40, heat: 0 }]] },
  ],
};

export const STEP_NAMES = {
  washer: ['세탁', '헹굼', '탈수'],
  dryer: ['건조', '식힘'],
};

export const ITEMS = {
  sock: { name: '양말', load: 1 },
  towel: { name: '수건', load: 2 },
  shirt: { name: '셔츠', load: 2 },
  pants: { name: '바지', load: 3 },
};
export const DRUM_CAPACITY = 10;
