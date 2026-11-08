// 너울 2027 — 가상 페스티벌 데이터. 사람·팀·장소 모두 지어낸 것.
// The JSON body is also read by design/works/festival/scratch/*.py, so keep it strict JSON.
export const FESTIVAL = {
  "stages": [
    { "id": "mulmaru", "name": "물마루", "en": "Mulmaru", "note": "바다 쪽 큰 무대" },
    { "id": "shed", "name": "소금창고", "en": "Salt Shed", "note": "옛 목조 소금창고" },
    { "id": "sandbar", "name": "모래톱", "en": "Sandbar", "note": "물가 DJ 무대" }
  ],
  "days": [
    {
      "id": "fri", "date": "2027-09-03", "md": "9.3", "dow": "금", "dowLong": "금요일", "tide": "들물",
      "color": "vermilion", "bpm": 120, "seed": 903,
      "gates": "13:00", "hours": "14:00–01:00",
      "rows": [["glass-mackerel"], ["mint-foghorn", "gomu-janghwa"], ["salt-mahjong", "yeobo-orchestra"], ["bora-telefax", "kite-archive", "saebyeok-swim"], ["okchun-stereo", "pale-kelp"]]
    },
    {
      "id": "sat", "date": "2027-09-04", "md": "9.4", "dow": "토", "dowLong": "토요일", "tide": "만조",
      "color": "ultramarine", "bpm": 126, "seed": 904,
      "gates": "13:00", "hours": "14:00–01:00",
      "rows": [["ultra-haenyeo"], ["tangerine-parliament"], ["sogeumjaengi", "dal-baggage", "seagull-expo"], ["two-lane-antenna", "jiwoo-vapor"], ["copper-jindo", "mulsujebi", "maru-86"]]
    },
    {
      "id": "sun", "date": "2027-09-05", "md": "9.5", "dow": "일", "dowLong": "일요일", "tide": "썰물",
      "color": "gardenia", "bpm": 96, "seed": 905,
      "gates": "12:30", "hours": "13:30–22:30",
      "rows": [["midnight-persimmon"], ["pine-needle-club", "siroo"], ["solar-chamoe", "neujeun-galmaegi", "ferry-de-luxe"], ["sunday-boiler", "yuna-blueprint"], ["noon-anchor", "oz-dongne"]]
    }
  ],
  "acts": [
    { "id": "glass-mackerel", "name": "GLASS MACKEREL", "ko": "글래스 매커럴", "genre": "인디 록", "day": "fri", "stage": "mulmaru", "start": "21:40", "end": "23:10" },
    { "id": "mint-foghorn", "name": "MINT FOGHORN", "ko": "민트 포그혼", "genre": "신스팝 듀오", "day": "fri", "stage": "mulmaru", "start": "19:40", "end": "20:50" },
    { "id": "gomu-janghwa", "name": "고무장화", "ko": "고무장화", "genre": "포크 록 트리오", "day": "fri", "stage": "mulmaru", "start": "17:50", "end": "18:40" },
    { "id": "yeobo-orchestra", "name": "YEOBO ORCHESTRA", "ko": "여보 오케스트라", "genre": "9인조 브라스", "day": "fri", "stage": "mulmaru", "start": "16:00", "end": "16:50" },
    { "id": "saebyeok-swim", "name": "새벽수영부", "ko": "새벽수영부", "genre": "인디 팝", "day": "fri", "stage": "shed", "start": "15:00", "end": "15:50" },
    { "id": "kite-archive", "name": "KITE ARCHIVE", "ko": "카이트 아카이브", "genre": "포스트록", "day": "fri", "stage": "shed", "start": "17:00", "end": "17:50" },
    { "id": "bora-telefax", "name": "BORA TELEFAX", "ko": "보라 텔레팩스", "genre": "알앤비", "day": "fri", "stage": "shed", "start": "18:50", "end": "19:40" },
    { "id": "pale-kelp", "name": "PALE KELP", "ko": "페일 켈프", "genre": "앰비언트", "day": "fri", "stage": "sandbar", "start": "14:00", "end": "15:30" },
    { "id": "salt-mahjong", "name": "SALT MAHJONG", "ko": "솔트 마작", "genre": "일렉트로닉 라이브", "day": "fri", "stage": "sandbar", "start": "21:00", "end": "22:30" },
    { "id": "okchun-stereo", "name": "OKCHUN STEREO", "ko": "옥천 스테레오", "genre": "디스코 디제이", "day": "fri", "stage": "sandbar", "start": "23:10", "end": "01:00" },

    { "id": "ultra-haenyeo", "name": "ULTRA HAENYEO", "ko": "울트라 해녀", "genre": "일렉트로닉 밴드", "day": "sat", "stage": "mulmaru", "start": "21:50", "end": "23:20" },
    { "id": "tangerine-parliament", "name": "TANGERINE PARLIAMENT", "ko": "탠저린 팔러먼트", "genre": "훵크 밴드", "day": "sat", "stage": "mulmaru", "start": "19:50", "end": "21:00" },
    { "id": "sogeumjaengi", "name": "소금쟁이", "ko": "소금쟁이", "genre": "사이키델릭 록", "day": "sat", "stage": "mulmaru", "start": "18:00", "end": "18:50" },
    { "id": "dal-baggage", "name": "DAL & THE BAGGAGE", "ko": "달 앤 더 배기지", "genre": "소울", "day": "sat", "stage": "mulmaru", "start": "16:10", "end": "17:00" },
    { "id": "mulsujebi", "name": "물수제비", "ko": "물수제비", "genre": "어쿠스틱 듀오", "day": "sat", "stage": "shed", "start": "15:10", "end": "15:55" },
    { "id": "jiwoo-vapor", "name": "JIWOO VAPOR", "ko": "지우 베이퍼", "genre": "하이퍼팝", "day": "sat", "stage": "shed", "start": "17:10", "end": "17:55" },
    { "id": "two-lane-antenna", "name": "TWO-LANE ANTENNA", "ko": "투레인 안테나", "genre": "슈게이즈", "day": "sat", "stage": "shed", "start": "18:50", "end": "19:40" },
    { "id": "seagull-expo", "name": "SEAGULL EXPO", "ko": "시걸 엑스포", "genre": "개러지 펑크", "day": "sat", "stage": "shed", "start": "20:40", "end": "21:30" },
    { "id": "copper-jindo", "name": "COPPER JINDO", "ko": "코퍼 진도", "genre": "힙합 크루", "day": "sat", "stage": "sandbar", "start": "14:30", "end": "15:30" },
    { "id": "maru-86", "name": "MARU 86", "ko": "마루 86", "genre": "테크노 디제이", "day": "sat", "stage": "sandbar", "start": "23:30", "end": "01:00" },

    { "id": "midnight-persimmon", "name": "MIDNIGHT PERSIMMON", "ko": "미드나잇 퍼시먼", "genre": "오케스트럴 팝", "day": "sun", "stage": "mulmaru", "start": "20:50", "end": "22:20" },
    { "id": "pine-needle-club", "name": "PINE NEEDLE CLUB", "ko": "파인 니들 클럽", "genre": "재즈 퀸텟", "day": "sun", "stage": "mulmaru", "start": "19:00", "end": "20:00" },
    { "id": "ferry-de-luxe", "name": "FERRY DE LUXE", "ko": "페리 디럭스", "genre": "시티팝", "day": "sun", "stage": "mulmaru", "start": "17:20", "end": "18:10" },
    { "id": "siroo", "name": "SIROO", "ko": "시루", "genre": "국악 앙상블", "day": "sun", "stage": "mulmaru", "start": "15:30", "end": "16:20" },
    { "id": "neujeun-galmaegi", "name": "늦은 갈매기", "ko": "늦은 갈매기", "genre": "싱어송라이터", "day": "sun", "stage": "shed", "start": "14:30", "end": "15:15" },
    { "id": "sunday-boiler", "name": "SUNDAY BOILER", "ko": "선데이 보일러", "genre": "매스 록", "day": "sun", "stage": "shed", "start": "16:30", "end": "17:20" },
    { "id": "yuna-blueprint", "name": "YUNA BLUEPRINT", "ko": "유나 블루프린트", "genre": "일렉트로닉 팝", "day": "sun", "stage": "shed", "start": "18:20", "end": "19:10" },
    { "id": "noon-anchor", "name": "NOON ANCHOR", "ko": "눈 앵커", "genre": "서프 록", "day": "sun", "stage": "sandbar", "start": "13:30", "end": "14:30" },
    { "id": "solar-chamoe", "name": "SOLAR CHAMOE", "ko": "솔라 참외", "genre": "쿰비아", "day": "sun", "stage": "sandbar", "start": "19:20", "end": "20:30" },
    { "id": "oz-dongne", "name": "OZ DONGNE", "ko": "오즈 동네", "genre": "발레아릭 디제이", "day": "sun", "stage": "sandbar", "start": "20:50", "end": "22:30" }
  ]
};
