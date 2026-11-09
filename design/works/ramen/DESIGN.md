# 제맛: design system

Homepage of an invented instant-noodle brand from a three-person food startup. The one idea: **국물은 재료
하나로.** Each of the four 라면 takes its broth from the single ingredient its name says (멸치, 고추, 대파,
후추); the rest of the soup is salt and soy. The page says so in the first view and then shows the four
like a series of posters: same grid, same layout, a different flat field each time. Launch 12월 1일, 1,600원.
Copy is plain 합니다체 with numbers (ml, 분, mm, kcal, %), the way a packet back talks.

Direction: not taken from UXKIN (not connected here). It follows the owner's references in this gallery:
너울 2027 (one flat field, huge type as the image, a strict grid) and 정면사진관 (a brand colour with a
reason, photographs that belong to the field).

## Colour

One field per flavour, taken from the ingredient. Text on each field is the colour that passes contrast.

| token | hex | from | text on it | contrast |
|---|---|---|---|---|
| `--myeolchi` | `#A8BCCB` | the blue-silver back of a large dried soup anchovy | ink | 9.57 |
| `--gochu` | `#B3112E` | sun-dried red chilli: a blue-leaning crimson on purpose, not vermilion | white | 6.92 |
| `--daepa` | `#2A7536` | the dark green leaf of a Korean leek scallion | white | 5.68 |
| `--huchu` | `#141516` | black peppercorn; also the page's ink | white | 18.28 |
| `--ink` | `#111214` | text, rules, footer | on white 18.74 | |
| `--white` | `#FFFFFF` | ground of the reading sections (idea, packets, cooking, people, buy) | | |
| `--ink-2` | `#4A4D52` | the long "usual soup" ingredient list only (the quiet half of a contrast) | on white 8.49 | |

The hero uses the 고추 field: red is what Korean shoppers read as 라면, and 고추 is the lead flavour.
No orange, amber, gold, cream, beige, purple, gradients. The yellow of an egg yolk or the gold of a
broth only appears inside photographs.

## Typography

- **Black Han Sans** 400 (SIL OFL 1.1, no Reserved Font Name): wordmark, ingredient names, headings,
  big numbers (550, 4:30), short labels. Display only, 20 px and up.
- **Gowun Dodum** 400 (SIL OFL 1.1, no Reserved Font Name): body, specs labels, captions, FAQ.
- No Latin face: both families carry the digits and the few Latin units (ml, mm, kcal) well enough.
- Subset to the characters on the page by `scripts/fonts.py` (Google Fonts `text=` API).

Scale (fluid, clamp): wordmark `min(29vw, 43svh, 560px)` on desktop, 44vw on phones · flavour name `clamp(132px, 21vw, 360px)` ·
h2 `clamp(40px, 6vw, 96px)` · big number `clamp(64px, 10vw, 168px)` · claim `clamp(32px, 4.4vw, 72px)` ·
lede 19–21 px / 1.7 · body 17–18 px / 1.75 · small 15 px / 1.6. Black Han Sans is set tight
(letter-spacing -0.02em, line-height 0.86 for the giants).

## Grid and spacing

- 12 columns at 1024 px and wider, 6 at 600–1023, 4 below 600.
- Margin `--m: clamp(20px, 5vw, 80px)`, gutter `--g: clamp(16px, 2.2vw, 32px)`; content runs edge to
  edge between the margins (no centred max-width box), like a poster sheet.
- 8 px spacing unit. Section padding `clamp(96px, 13vw, 200px)` top and bottom.
- Fields are full-bleed. Rules are 3 px solid in the text colour (festival weight), never hairlines.

## Components

- **Flavour poster** (same layout four times): name across cols 1–7, cut-out pot over cols 7–12, one line
  and a short paragraph under the name, a spec band of six cells (물 · 시간 · 면 두께 · 맵기 · 열량 · 스프
  속 재료) across the full width between 3 px rules, and the ingredient still life as a full-bleed band
  at the foot, transparent so it lies on the same field.
- **맵기 scale**: five 맵 glyphs growing in size; filled up to the level, outlined after it, with the
  level written out ("5단계 중 4") for everyone and for screen readers.
- **Packet front**: flat 4:3 rectangles in HTML/CSS, type and colour only, scaled with container query
  units so each one is one poster; corner crop marks and a caption with the size and the field colour.
- **Cooking steps**: big time (or water amount) in Black Han Sans, two sentences, one photograph.
- **Timer**: flavour radios, texture radios (꼬들, 30초 덜 · 그대로 · 퍼진, 30초 더), one start/stop button, a huge
  countdown. The only script on the page.
- Buttons: 3 px ink border, square corners, ink fill when pressed (`aria-pressed`, checked radios).
  Focus: 3 px outline in the current text colour, 3 px offset.
- Links: underlined 2 px, offset 0.2em.
- No radius anywhere, no shadows in CSS (the pot shadows are photographed).

## Imagery

Gemini photographs (IMAGES.md), one look across the set: bright daylight from the left, crisp digital,
true colour, straight-down for everything that sits on a field.

- Pots and still lifes were shot on paper of roughly the field colour, then cut out by
  `scripts/cutout.py`: the paper becomes transparent and its shadow becomes black at the right alpha,
  so they lie on the exact CSS field with a real shadow and no visible rectangle.
- The same stainless-steel two-handled pot in all four flavours and the hero (`--ref`).
- Cooking and people photos stay rectangular, on white, cropped hard.
