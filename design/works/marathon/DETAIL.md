# 곧은내 하프마라톤 2027: detail audit (BRIEF §0000, 2026-11-14)

Checked at 360, 390, 768, 1024 and 1440 (line boxes of every heading, lead, caption and question;
spaces before units; middots) and phone captures at 2x. The page was already concrete and tidy;
what read as careless, and what was done:

**Type**
- The text face (Spoqa Han Sans Neo, as Goteunnae Sans) ran at its loose default everywhere. Now
  -0.01em body, -0.02em leads, bold values and questions, -0.025em small heads; 0 for 14–15 px
  captions and notes. Gasoek One stays at -0.01em: its sidebearings are near zero and tighter
  tracking fuses the strokes (checked at 1440 on 곧은내 하프마라톤 and 21.0975).
- No `text-wrap`. Headings, questions and legends balance; paragraphs, captions and list items pretty.
  At 360 two questions broke as "…들어올 / 수 있을까요?" and "…바꿀 수 / 있나요?"; now no-break
  spaces bind 들어올 수 / 바꿀 수 and the lines balance.
- No-break spaces inside every date and duration in running text (2027년 4월 4일, 2월 26일,
  1시간 30분, 오전 7시 30분), also in the form's confirmation sentence. Word joiners around the
  middot in the map legend (출발·도착). The same label inside the map SVG keeps a plain middot: SVG text never wraps.
- Figures were already tabular in the text face; Gasoek's times keep their own (they line up).

**Copy**
- Hero: "강둑을 따라 곧고 평평하게 달리는…" became "고저차가 14m뿐인 강둑 코스를…" (the claim earns
  its number).
- Course: "처음 하프에 나서는 분도, 기록을 줄이려는 분도 자기 속도로 끝까지 갈 수 있습니다" (a
  slogan) became last year's result: 5,812명 가운데 5,640명이 3시간 안에.
- Pacer photo caption "빨간 깃발이 표지입니다." became what the photo shows and when the flags are used.

**Controls**
- One easing for the page: `cubic-bezier(.16,1,.3,1)`, 180 ms, colour only.
- Focus ring 3 px / 3 px became 2 px / 2 px (white on blue and black grounds, black on white).
- Buttons and the entry choices gained pressed states; nav and footer links dim when pressed.

Unchanged on purpose: layout, colours, photographs, map and profile drawings, fonts, the form's
behaviour. The page has no animation beyond colour transitions.
Thumbnail retaken (the hero lead changed); the OG image does not show that line and was kept.
