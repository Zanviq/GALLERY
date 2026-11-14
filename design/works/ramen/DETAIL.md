# 제맛: detail audit (BRIEF §0000, 2026-11-14)

Checked at 360, 390, 768, 1024 and 1440 with `audit.mjs` (line boxes of every heading and key line,
spaces before units, middots) and phone captures at 2x. Found, then fixed:

**Type**
- Both faces were on the "AI default" list (Black Han Sans, Gowun Dodum). Now Cafe24 Ohsquare and
  Ohsquare Air, one family in two weights (DESIGN.md, Typography).
- Tracking was one value (-0.02em) for every size and none on 26–40 px lines. Now a scale: -0.045em
  giants, -0.035em section heads, -0.025em lines and questions, -0.01em body, 0 for 15 px text.
- No `text-wrap`. Headings balance, paragraphs pretty. At 1024 the 고추 caption left "색." alone on
  a line; gone.
- `tabular-nums` was set on the spec values and timer but the new faces have no `tnum` and proportional
  digits, so 4:30 would have shuffled each second. The subset now carries tabular digits; prices, step
  times, packet specs and dates use them too.
- "200 × 150 mm" broke between 150 and mm, repeated four times, and × is not in the face. Said once in
  the packet paragraph. No-break spaces in 4분 30초 (HTML and the timer's live text), 12월 1일, 3만 원.
- The hero wordmark: the new face sits 0.17em under its baseline, so its ink is lifted onto the launch line.

**Copy**
- "제맛은 반대로 갑니다." (slogan) became what is actually done to each ingredient.
- "그게 제맛의 시작입니다." became the three notebooks the 1,900 tastings are written in (they are in the
  kitchen photo).
- 사는 곳: "편의점 일부", "가게가 많지 않습니다" became where the first three months go (김오름시 and around
  it, other regions from spring) and an order cut-off (오후 3시까지 주문하면 그날 보냅니다).
- 시험 주방 gained its exception (12월은 출시 준비로 한 번 쉽니다); the cup-noodle answer gained its
  noodle (1.4mm, cooks in 4분 in the cup).
- Packet captions now say only the colour and where it comes from.

**Controls and small touches**
- Focus ring 3 px / 3 px became 2 px / 2 px in the current text colour (visible on every field).
- Radio chips gained hover (#ECEDEE wash) and pressed states; buttons gained pressed states; colour
  transitions 180 ms on `cubic-bezier(.16,1,.3,1)`, colour only.
- FAQ: the open/close mark used "+" / "−" text (− not in the face); now drawn in the 3 px rule weight,
  and questions underline on hover.
- Footer: a quiet "맨 위로" link. Favicon, touch icon, OG and thumbnail re-rendered in the new face.

Unchanged on purpose: layout, colours, photographs, the 3 px rules, no radius, no shadows, the timer's
behaviour. The page has no motion, so reduced motion changes nothing.
