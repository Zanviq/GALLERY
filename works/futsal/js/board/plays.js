// The club's three set plays plus the blank board. Coordinates in metres; we attack toward +x.
// A move with join: true shares the beat of the move before it.

const run = (piece, x, y, join = false) => ({ kind: 'run', piece, to: { x, y }, join });
const pass = (target, x, y, join = false) => ({ kind: 'pass', piece: 'ball', target, to: { x, y }, join });
const shot = (x, y, join = false) => ({ kind: 'pass', piece: 'ball', target: null, to: { x, y }, join });

export const PLAYS = [
  {
    id: 'kickin',
    name: '킥인 3번',
    note: '킥인은 4초 안에 차요. 미란이 짧게 받으러 오는 순간 은채는 줄 따라 바로 뛰어요.',
    setup: {
      p1: { x: 2, y: 10 }, p3: { x: 22, y: 11 }, p11: { x: 31, y: 6 }, p7: { x: 29, y: 20.9 }, p9: { x: 35, y: 12.5 },
      ball: { x: 29, y: 20 },
    },
    moves: [
      run('p9', 31.5, 17), run('p11', 36.5, 8, true),
      pass('p9', 31.5, 17),
      run('p7', 35.5, 18.2), run('p3', 26, 13, true), pass('p7', 35.5, 18.2, true),
      run('p11', 37.4, 10.6), pass('p11', 37.4, 10.6, true),
      shot(40.5, 9.4),
    ],
  },
  {
    id: 'corner',
    name: '코너 짧게',
    note: '코너는 짧게 주고 뒤로 빼요. 다들 골대 앞에 몰리면 수진이 찰 길이 열려요.',
    setup: {
      p1: { x: 2, y: 10 }, p3: { x: 29, y: 10 }, p11: { x: 35, y: 15 }, p7: { x: 40.7, y: 20.7 }, p9: { x: 37, y: 9 },
      ball: { x: 39.8, y: 19.8 },
    },
    moves: [
      run('p11', 37.6, 17.6), run('p9', 38.4, 12, true),
      pass('p11', 37.6, 17.6),
      run('p3', 31, 12.6), pass('p3', 31, 12.6, true),
      shot(40.5, 9.0),
    ],
  },
  {
    id: 'rotation',
    name: '4-0 돌기',
    note: '넷이 한 줄로 서서 돌아요. 공 주고 바로 앞으로 뛰고, 빈자리는 옆 사람이 채워요.',
    setup: {
      p1: { x: 2.5, y: 10 }, p11: { x: 16, y: 2.5 }, p3: { x: 15, y: 7.5 }, p7: { x: 15, y: 12.5 }, p9: { x: 16, y: 17.5 },
      ball: { x: 15.9, y: 8.1 },
    },
    moves: [
      pass('p7', 15, 12.5),
      run('p3', 27, 3), run('p11', 15.5, 7.5, true),
      pass('p11', 15.5, 7.5),
      run('p7', 28, 17), run('p9', 15.5, 12.5, true),
      run('p3', 32.5, 6), pass('p3', 32.5, 6, true),
      shot(40.5, 9.6),
    ],
  },
];

export const BLANK = {
  id: 'blank',
  name: '빈 판',
  note: '직접 그려 보세요. 선수 자석에서 끌면 뛰는 길, 공에서 끌면 패스예요.',
  setup: {
    p1: { x: 1.8, y: 10 }, p3: { x: 12, y: 10 }, p11: { x: 19, y: 4.5 }, p7: { x: 19, y: 15.5 }, p9: { x: 27, y: 10 },
    ball: { x: 13.1, y: 10.6 },
  },
  moves: [],
};
