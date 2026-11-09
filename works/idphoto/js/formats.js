// Every format the shop shoots, in millimetres. crown/chin are the guide bands measured from the top
// of the cut; a crown inside its band and a chin inside its band always give a legal head size.
// eye is the eye-line band measured from the bottom of the cut.
export const FORMATS = [
  {
    id: 'passport', name: '여권', w: 35, h: 45, head: [32, 36], crown: [3, 5], chin: [37, 39], eye: [23, 27],
    backdrop: 'white', backdropName: '흰색', cols: 4, rows: 2,
    note: '정수리부터 턱까지 3.2–3.6 cm. 흰 배경, 6개월 안에 찍은 사진. 입은 다물고 이가 보이지 않게 찍습니다.',
    price: 15000, minutes: [['촬영', 5], ['고르기', 2], ['자르기와 밝기', 3], ['인화와 재단', 5]],
  },
  {
    id: 'idcard', name: '주민등록증', w: 35, h: 45, head: [32, 36], crown: [3, 5], chin: [37, 39], eye: [23, 27],
    backdrop: 'white', backdropName: '흰색', cols: 4, rows: 2,
    note: '여권과 크기가 같습니다. 흰 배경을 권하는 곳이 많아 흰색으로 찍고, 머리 크기도 여권 기준으로 맞춥니다.',
    price: 15000, minutes: [['촬영', 5], ['고르기', 2], ['자르기와 밝기', 3], ['인화와 재단', 5]],
  },
  {
    id: 'license', name: '운전면허', w: 35, h: 45, head: [32, 36], crown: [3, 5], chin: [37, 39], eye: [23, 27],
    backdrop: 'blue', backdropName: '하늘색', cols: 4, rows: 2,
    note: '여권과 크기가 같고, 무늬 없는 단색 배경이면 됩니다. 저희는 하늘색으로 찍고, 흰색이 필요하면 바꿔 찍습니다.',
    price: 15000, minutes: [['촬영', 5], ['고르기', 2], ['자르기와 밝기', 3], ['인화와 재단', 5]],
  },
  {
    id: 'visa', name: '비자', w: 50, h: 50, head: [25, 35], crown: [3, 7], chin: [32, 38], eye: [28, 35],
    backdrop: 'white', backdropName: '흰색', cols: 3, rows: 2,
    note: '가로세로 5 cm. 나라마다 규정이 다릅니다. 이 화면은 머리 2.5–3.5 cm, 흰 배경으로 맞춥니다. 신청할 나라의 안내문을 가져오시면 그대로 맞춥니다.',
    price: 18000, minutes: [['촬영', 5], ['고르기', 2], ['자르기와 밝기', 3], ['인화와 재단', 5]],
  },
  {
    id: 'job', name: '취업용 반명함', w: 30, h: 40, head: [24, 28], crown: [3, 5], chin: [29, 31], eye: [22, 26],
    backdrop: 'blue', backdropName: '하늘색', cols: 4, rows: 2, ours: true,
    note: '정해진 규정이 없는 규격이라 저희 기준으로 맞춥니다. 머리 2.4–2.8 cm, 어깨선까지 보이게. 이력서 사진 칸에 맞춰 자릅니다.',
    price: 25000, minutes: [['촬영', 10], ['고르기', 5], ['보정', 10], ['인화와 재단', 5]],
  },
];

export const byId = (id) => FORMATS.find((f) => f.id === id) || FORMATS[0];

// The 4×6 inch print, landscape.
export const SHEET = { w: 152.4, h: 101.6 };

export const cm = (mm, digits = 2) => (mm / 10).toFixed(digits);
export const px = (mm, dpi) => Math.round(mm / 25.4 * dpi);
