// 낱말 문제. 이 파일의 대괄호 안은 그대로 JSON이어야 한다
// (design/works/jamo/scripts/ 의 검사·폰트 스크립트가 읽는다).
// tiles: 칠판에 처음 흩어 둘 기본 자모(겹자모 없이). chalk: 처음 분필 획 수.
// steps: 연습 문제에서만 쓰는 안내. when 은 main.js 의 조건 이름.
export const LESSONS = [
  {
    "id": "t1", "answer": "나무", "tiles": "ㄴㅏㅁㅜ", "chalk": 0,
    "clue": "숲에 가면 가장 많이 보여요.",
    "steps": [
      { "when": "start", "say": "자모를 끌어 첫 칸에 놓아 보세요. 눌러서 고른 다음 칸을 눌러도 돼요.", "point": "ㄴ" },
      { "when": "placed", "say": "자음과 모음이 한 칸에 모이면 글자 하나가 돼요." },
      { "when": "syllable", "say": "그렇게요. 남은 자모로 둘째 칸도 채워 보세요." }
    ]
  },
  {
    "id": "t2", "answer": "연필", "tiles": "ㅇㅕㄴㅍㅣㄹ", "chalk": 0,
    "clue": "깎아서 쓰고, 끝에 지우개가 달린 것도 있어요.",
    "steps": [
      { "when": "start", "say": "칸의 아래쪽 반은 받침 자리예요. 받침이 될 자음은 아래쪽에 놓아요.", "point": "ㄴ" }
    ]
  },
  {
    "id": "t3", "answer": "기차", "tiles": "ㄱㅣㅈㅏ", "chalk": 1,
    "clue": "철길을 따라 여러 칸이 줄지어 달려요.",
    "steps": [
      { "when": "start", "say": "ㅈ에 획 하나를 더하면 ㅊ이 돼요. 분필을 끌어 ㅈ 위에 놓아 보세요.", "point": "ㅈ", "tool": "chalk" },
      { "when": "stroked", "say": "분필은 한 획 쓸 때마다 닳아요. 이제 낱말을 완성해 보세요." }
    ]
  },
  {
    "id": "t4", "answer": "바다", "tiles": "ㅁㅏㅌㅏ", "chalk": 0,
    "clue": "파도가 치고 짠물이 끝없이 펼쳐진 곳이에요.",
    "steps": [
      { "when": "start", "say": "분필이 다 닳았어요. 지우개로 ㅌ의 획 하나를 지우면 분필이 한 획 돌아와요.", "point": "ㅌ", "tool": "eraser" },
      { "when": "erased", "say": "돌아온 분필로 ㅁ에 획을 더하면 ㅂ이 돼요." }
    ]
  }
];

export const PUZZLES = [
  { "id": "sagwa", "group": 0, "answer": "사과", "tiles": "ㅅㅏㄱㅗㅏ", "chalk": 0,
    "clue": "빨갛게 익고, 한 입 베어 물면 아삭해요." },
  { "id": "tteokguk", "group": 0, "answer": "떡국", "tiles": "ㄷㄷㅓㄱㄱㅜㄱ", "chalk": 0,
    "clue": "설날 아침에 한 그릇 먹으면 한 살을 더 먹는대요." },
  { "id": "mujigae", "group": 0, "answer": "무지개", "tiles": "ㅁㅜㅈㅣㄱㅏㅣ", "chalk": 0,
    "clue": "비가 그친 하늘에 걸리는 일곱 빛깔 띠예요." },
  { "id": "yeodeol", "group": 0, "answer": "여덟", "tiles": "ㅇㅕㄷㅓㄹㅂ", "chalk": 0,
    "clue": "일곱 다음, 아홉 앞에 오는 수를 우리말로 써요." },

  { "id": "uyu", "group": 1, "answer": "우유", "tiles": "ㅇㅜㅇㅜ", "chalk": 1,
    "clue": "젖소에게서 얻는 하얀 마실 거리예요." },
  { "id": "kokkiri", "group": 1, "answer": "코끼리", "tiles": "ㄱㅗㄱㄱㅣㄹㅣ", "chalk": 1,
    "clue": "부채 같은 귀를 펄럭이고 긴 상아가 난 동물이에요." },
  { "id": "jajeongeo", "group": 1, "answer": "자전거", "tiles": "ㅅㅏㅅㅓㄴㄱㅓ", "chalk": 2,
    "clue": "두 바퀴를 발로 굴려서 달려요." },
  { "id": "tomato", "group": 1, "answer": "토마토", "tiles": "ㄴㅗㅁㅏㄴㅗ", "chalk": 4,
    "clue": "빨갛게 익는 채소예요. 거꾸로 읽어도 이름이 같아요." },
  { "id": "patbingsu", "group": 1, "answer": "팥빙수", "tiles": "ㅁㅏㄴㅁㅣㅇㅅㅜ", "chalk": 5,
    "clue": "곱게 간 얼음에 달게 삶은 붉은 콩을 듬뿍 얹어 먹어요." },

  { "id": "podo", "group": 2, "answer": "포도", "tiles": "ㅂㅗㅌㅗ", "chalk": 0,
    "clue": "송이송이 달리는 보랏빛 열매예요." },
  { "id": "piano", "group": 2, "answer": "피아노", "tiles": "ㅁㅣㅇㅑㄴㅛ", "chalk": 0,
    "clue": "흰 건반과 검은 건반을 눌러 소리를 내요." },
  { "id": "dotori", "group": 2, "answer": "도토리", "tiles": "ㅌㅛㄴㅗㄹㅣ", "chalk": 0,
    "clue": "다람쥐가 볼이 불룩하도록 물고 가는 열매예요." },
  { "id": "cheongbaji", "group": 2, "answer": "청바지", "tiles": "ㅅㅕㅇㅍㅑㅅㅣ", "chalk": 0,
    "clue": "질긴 파란 무명천으로 만든, 누구나 한 벌쯤 가진 옷이에요." },
  { "id": "badasseugi", "group": 2, "answer": "받아쓰기", "tiles": "ㅁㅏㄴㅇㅑㅅㅅㅡㅋㅣ", "chalk": 0,
    "clue": "선생님이 불러 주는 문장을 듣고 공책에 그대로 옮겨 적어요." },
  { "id": "undongjang", "group": 2, "answer": "운동장", "tiles": "ㅇㅠㄷㄴㅗㅇㅅㅏㅇ", "chalk": 0,
    "clue": "체육 시간에 줄 서서 달리기를 하는 넓은 마당이에요." },
  { "id": "chilpan", "group": 2, "answer": "칠판", "tiles": "ㅈㅣㄹㅂㅑㄷ", "chalk": 0,
    "clue": "분필로 쓰고 지우개로 지우는, 교실 앞의 초록 벽이에요." }
];

export const GROUPS = [
  { "name": "모아 쓰기", "note": "자모를 모으고 겹쳐서 글자를 만들어요." },
  { "name": "획 더하기", "note": "분필로 획을 더해 다른 자모를 만들어요." },
  { "name": "획 옮기기", "note": "한 자모에서 지운 획을 다른 자모에 더해요." }
];
