// The trailer as it sits on the contact sheet: 36 frames on six strips of six.
// Each shot covers one to three consecutive frames; `scene` names the drawing in frames.js.
// `sub` is the subtitle line (shown in yellow), `card` a title card drawn inside the frame.

export const SHOTS = [
  { from: 1, to: 3, scene: 'building', sub: '엄마 집은 이번 주 안에 비울게.',
    desc: '비 오는 밤, 언덕 위 아파트. 4층 맨 끝 창만 불이 꺼져 있다.' },
  { from: 4, to: 6, scene: 'stairs', sub: '계단 불은 아직도 늦게 켜지네.',
    desc: '어두운 계단. 한 박자 늦게 전등이 켜지고 은재가 올라간다.' },
  { from: 7, to: 9, scene: 'room', sub: '엄마는 이 의자에서 창밖만 봤어요.',
    desc: '짐 상자가 쌓인 방. 은재가 창을 향한 의자에 앉는다.' },
  { from: 10, to: 12, scene: 'notebook', sub: '날짜마다 동그라미가 두 개씩 있어요.',
    desc: '두 손이 작은 수첩을 편다. 날짜 옆마다 동그라미가 두 개.' },
  { from: 13, to: 15, scene: 'glass', sub: '열한 시 사십 분, 막차가 여기 서요.',
    desc: '빗방울 맺힌 창. 아래로 버스 불빛이 다가온다.' },
  { from: 16, to: 18, scene: 'stop', sub: '안 타실 거면 문 닫을게요.',
    desc: '소리개고개 정류장. 버스 전조등이 가까워진다.' },
  { from: 19, to: 21, scene: 'two', sub: '불이 두 번 켜지면, 저도 전조등을 두 번 켰어요.',
    desc: '가로등 아래 두 사람. 우산을 든 은재와 모자를 쓴 상훈.' },
  { from: 22, to: 24, scene: 'switch', sub: '잘 있다는 뜻이었대요.',
    desc: '벽의 낡은 스위치. 손가락이 불을 켰다가 끈다.' },
  { from: 25, to: 25, scene: 'card', card: 'title',
    desc: '검은 화면에 제목 〈점멸〉.' },
  { from: 26, to: 28, scene: 'bus', sub: '한 달 내내 그 창이 깜깜했어요.',
    desc: '빗속을 달리는 막차 안. 와이퍼 너머로 가로등이 지나간다.' },
  { from: 29, to: 31, scene: 'reach', sub: '엄마, 나 왔어.',
    desc: '창가에 선 은재가 벽의 스위치로 손을 뻗는다.' },
  { from: 32, to: 34, scene: 'window', sub: '내일도 켤게요.',
    desc: '정류장에서 올려다본 4층 창. 꺼져 있다가 켜지고, 다시 꺼진다.' },
  { from: 35, to: 35, scene: 'card', card: 'date',
    desc: '검은 화면에 12월 2일 개봉.' },
  { from: 36, to: 36, scene: 'fogged',
    desc: '롤의 끝. 빛이 들어 하얗게 탄 컷.' },
];

export const FRAME_COUNT = 36;

// Director's selects, circled in white wax pencil on the sheet.
export const SELECTS = [9, 14, 20, 23, 33];
// Crossed out on the sheet.
export const REJECTS = [36];

// Pace for 넘겨 보기 (ms per frame).
export const PACE = { frame: 650, card: 1400 };

export const FRAMES = [];
SHOTS.forEach((shot, s) => {
  for (let n = shot.from; n <= shot.to; n++) {
    FRAMES.push({ n, shot: s, k: n - shot.from, scene: shot.scene, card: shot.card || null });
  }
});

export function shotOf(n) {
  return SHOTS[FRAMES[n - 1].shot];
}
