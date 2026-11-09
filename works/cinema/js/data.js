// The trailer as it sits on the contact sheet: 36 frames on six strips of six.
// Each shot covers one to three consecutive frames. A frame is a still (img/still-<img>-<w>.webp) cropped
// to 3:2 around [cx, cy] (fractions of the still) at `zoom`; neighbouring frames creep in a little.
// `sub` is the subtitle line (shown in yellow), `card` a title card set as type.

export const SHOTS = [
  { from: 1, to: 3, sub: '엄마 집은 이번 주 안에 비울게.',
    desc: '비 오는 밤, 언덕 위 아파트. 4층 맨 끝 창만 불이 꺼져 있다.',
    frames: [['place', 0.5, 0.5, 1], ['place', 0.5, 0.42, 1.1], ['place', 0.52, 0.34, 1.22]] },
  { from: 4, to: 6, sub: '계단 불은 아직도 늦게 켜지네.',
    desc: '어두운 계단. 한 박자 늦게 전등이 켜지고 은재가 올라간다.',
    frames: [['stairs-off', 0.5, 0.5, 1.04], ['stairs', 0.5, 0.5, 1.04], ['stairs', 0.6, 0.52, 1.18]] },
  { from: 7, to: 9, sub: '엄마는 이 의자에서 창밖만 봤어요.',
    desc: '짐 상자가 쌓인 방. 은재가 창을 향한 의자에 앉는다.',
    frames: [['room', 0.5, 0.5, 1], ['room', 0.45, 0.5, 1.1], ['room', 0.38, 0.46, 1.24]] },
  { from: 10, to: 12, sub: '날짜마다 동그라미가 두 개씩 있어요.',
    desc: '두 손이 작은 수첩을 편다. 줄마다 작은 동그라미가 둘씩 그려져 있다.',
    frames: [['notebook', 0.5, 0.5, 1], ['notebook', 0.48, 0.55, 1.14], ['notebook', 0.45, 0.57, 1.3]] },
  { from: 13, to: 15, sub: '열한 시 사십 분, 막차가 여기 서요.',
    desc: '빗방울 맺힌 창. 아래로 버스 불빛이 다가온다.',
    frames: [['glass', 0.5, 0.5, 1], ['glass', 0.55, 0.56, 1.1], ['glass', 0.58, 0.62, 1.22]] },
  { from: 16, to: 18, sub: '안 타실 거면 문 닫을게요.',
    desc: '소리개고개 정류장. 막차의 문이 열리고 기사 상훈이 내다본다.',
    frames: [['driver', 0.5, 0.5, 1], ['driver', 0.46, 0.44, 1.12], ['driver', 0.43, 0.38, 1.28]] },
  { from: 19, to: 21, sub: '불이 두 번 켜지면, 저도 전조등을 두 번 켰어요.',
    desc: '가로등 아래 두 사람. 우산을 든 은재와 모자를 쓴 상훈.',
    frames: [['two', 0.5, 0.5, 1], ['two', 0.5, 0.54, 1.08], ['two', 0.52, 0.55, 1.18]] },
  { from: 22, to: 24, sub: '잘 있다는 뜻이었대요.',
    desc: '벽의 낡은 스위치. 어머니의 손가락이 불을 켰다가 끈다.',
    frames: [['switch-off', 0.42, 0.5, 1.05], ['switch', 0.42, 0.5, 1.05], ['switch-off', 0.42, 0.5, 1.05]] },
  { from: 25, to: 25, card: 'title',
    desc: '검은 화면에 제목 〈점멸〉.' },
  { from: 26, to: 28, sub: '한 달 내내 그 창이 깜깜했어요.',
    desc: '빗속을 달리는 막차 안. 와이퍼 너머로 가로등이 지나간다.',
    frames: [['bus', 0.5, 0.5, 1], ['bus', 0.56, 0.5, 1.1], ['bus', 0.62, 0.5, 1.22]] },
  { from: 29, to: 31, sub: '엄마, 나 왔어.',
    desc: '창가에 선 은재가 벽의 스위치로 손을 뻗는다.',
    frames: [['reach', 0.5, 0.5, 1], ['reach', 0.42, 0.5, 1.1], ['reach', 0.34, 0.52, 1.22]] },
  { from: 32, to: 34, sub: '내일도 켤게요.',
    desc: '정류장에서 올려다본 4층 창. 꺼져 있다가 켜지고, 다시 꺼진다.',
    frames: [['window-off', 0.55, 0.32, 1], ['window', 0.55, 0.32, 1.04], ['window-off', 0.55, 0.32, 1.08]] },
  { from: 35, to: 35, card: 'date',
    desc: '검은 화면에 12월 2일 개봉.' },
  { from: 36, to: 36,
    desc: '롤의 끝. 빛이 들어 하얗게 탄 컷.',
    frames: [['fogged', 0.5, 0.5, 1]] },
];

// Director's selects, circled in white wax pencil on the sheet.
export const SELECTS = [9, 14, 20, 23, 33];
// Crossed out on the sheet.
export const REJECTS = [36];

// Pace for 넘겨 보기 (ms per frame).
export const PACE = { frame: 650, card: 1400 };

export const FRAMES = [];
SHOTS.forEach((shot, s) => {
  for (let n = shot.from; n <= shot.to; n++) {
    const k = n - shot.from;
    const f = shot.frames ? shot.frames[k] : null;
    FRAMES.push({
      n, shot: s, k, card: shot.card || null,
      img: f ? f[0] : null,
      crop: f ? f.slice(1) : null,
    });
  }
});

export function shotOf(n) {
  return SHOTS[FRAMES[n - 1].shot];
}
