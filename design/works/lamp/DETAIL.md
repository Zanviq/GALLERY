# 이슥 — detail pass (2026-11-14, BRIEF §0000)

Audited at 360, 390, 768, 1024 and 1440 (every text line's breaks measured in headless Chrome, phone captures
read at 2x). Fonts unchanged (Gyeotbang Serif = MaruBuri renamed, Hanken Grotesk for figures); both re-subset
for the new copy and now carry U+00A0. Found → done.

**Type**
- Tracking: h2 -0.025em → -0.035em, the 이슥 / 곁방 display words -0.04em → -0.045em, figures and the price
  set on the same scale, small heads -0.02em, body -0.01em (was 0).
- Body line height 1.85 → 1.75, leads 1.85 / 1.8 → 1.7: the serif kept its air, the paragraphs stopped
  floating apart. h2 1.14 → 1.16.
- `text-wrap: balance` was on h2 only → also h3, dt, summary; `pretty` on p, li, dd, figcaption.
- A date split inside a heading: "1차 400대, 12월 / 7일부터 보냅니다" (1440) → "1차 400대, / 12월 7일부터
  보냅니다". Units split from numbers: "깊이 50 / cm" (390), "머리 길이 36 / cm" (1024), "받침 지름 18 / cm"
  (1440); counters: "세 / 가지", "나사 두 / 개로" (360), "여섯 / 시간이면" (768) → no-break spaces in every
  number + unit (58 of them: lm, K, cm, mm, kg, W, V, lx, m) and in 다섯 단계, 세 가지, 두 사람, 두 개,
  한 장, 한 번, 세 대, 여섯 시간, 12월 7일; also in the live readouts written by light.js and order.js.

**Copy**
- The lux chart had no text alternative beyond its title → "표로 보기": lux at the centre and 20 / 40 / 60 cm
  for each of the five steps (same model the chart draws).
- Hours gain the exception: "목요일부터 토요일까지 오후 2시부터 밤 9시, 일요일은 저녁 7시까지".
- FAQ "다이얼의 딸깍 소리를 끌 수 있나요?" never answered the question → starts "끌 수는 없습니다."
- Footer "사람이 오래 앉는 자리에 놓을 물건을 만듭니다" (slogan) → "어둑시 등갓길의 두 사람 디자인
  작업실입니다. 이슥 전에는 원목 책상 받침과 연필꽂이를 만들었습니다."
- "가상 서비스입니다. 실제 주소가 아닙니다." kept beside the address.

**Controls and tokens**
- Focus ring offset 3 px → 2 px.
- Sound button had no hover, pressed or disabled look (it is disabled without WebAudio) → all three; buttons,
  links, colour-temperature radios, quantity steppers and FAQ rows gain a pressed state; FAQ rows a hover.
- Buttons had no transitions; nav used none → `--ease: cubic-bezier(.16,1,.3,1)`, 150 ms, colour / opacity /
  transform. The dial's 300 ms light response is the signature and stays.
- The long page had no way back up from the end → "맨 위로" under the footer.

Not changed: layout, colours, photographs, the dial, the scene, sound, reduced-motion behaviour.
