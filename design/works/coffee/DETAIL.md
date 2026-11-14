# 사흘 커피 로스터스 — detail pass (2026-11-14, BRIEF §0000)

Audited at 360, 390, 768, 1024 and 1440 (every text line's breaks measured in headless Chrome, phone captures
read at 2x). Fonts unchanged (Saheul Batang = RIDIBatang renamed, Libre Caslon Text for figures); both
re-subset for the new copy and now carry U+00A0. Found → done.

**Type**
- Tracking: 사흘 and 불땀길 7 -0.03 / -0.02em → -0.045em, h2 -0.02em → -0.035em (line height 1.06 → 1.1),
  bean names, method names, recipe, menu and plan heads → -0.02em, body -0.01em (was 0).
- `text-wrap: balance` on h1–h3 already; added on dt, and `pretty` on p, li, dd, figcaption.
- Nav "오시는 / 길" broke inside the item at 1024 → nav links never wrap.
- Counters split from their numbers: "열 / 자리" (360), "두 / 번", "세 / 번째", "한 / 가지를" (390–1440),
  "두 / 가지는", "그 / 주 안에", "두 / 개뿐" (1440) → no-break spaces in every Korean number + counter.
- Units were glued on in the HTML ("200g", "5kg", "1,800m", "790μm") but spaced in the recipe ("15 g")
  → one rule: number, no-break space, Latin unit (18 places, plus the grinder's live strings: 36 g, 150 ml,
  790 μm). °C stays attached ("92°C"): Caslon's degree sign carries its own space.
- Dates "11월 / 9일" could split → no-break space between month and day; "불땀길 7" likewise.
- Figures that are compared or change in place (menu prices, the scale, μm, prices, calendar, ranges) use
  Caslon's `tnum`; the recipe time and hours keep proportional figures because the tabular colon in
  "2:45" sets wide.

**Copy**
- Grinder lead gains the scale: "한 칸 돌릴 때마다 가루가 약 32 μm씩 굵어집니다" (the dial's own model).
- "봉투에 왜 골랐는지 적어 보냅니다" → "손글씨로 두세 줄 적어 보냅니다".
- "한 번 건너뛰기, 그만두기는 언제든" → "다음 배송 사흘 전까지 매장에 말씀하시면 됩니다".
- All three "가상 서비스입니다. 실제 주소가 아닙니다." notes kept.

**Controls and tokens**
- Focus ring 3 px / 3 px → 2 px / 2 px (white on cherry and black, currentColor on white; dial keeps a
  4 px offset on its circle).
- Sound button had no hover, pressed or disabled look → all three; buttons, links, nav, method tiles gain a
  pressed state; the phone menu button gains hover, pressed and an open state.
- Transitions `.15s` (default ease, one also animating padding) → `--ease: cubic-bezier(.16,1,.3,1)`,
  150 ms, colour / opacity / transform only. The pile's cross-fade and the calendar's breathing dot stay.

Not changed: layout, colours, photographs, the grinder, sound, reduced-motion behaviour.
