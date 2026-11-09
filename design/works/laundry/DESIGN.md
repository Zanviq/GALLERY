# 뽀득 셀프 빨래방 (works/laundry) — DESIGN.md

Homepage of a fictional self-service laundromat chain with four invented branches in an
invented city (새물시). Read on a phone, often while standing at the machine with a bag of
laundry, so the first screen answers one question: *is there a free machine at my branch,
and when does mine finish?*

No UXKIN reference was used (not connected). The direction comes from the room itself:
every surface on the page is a thing you find in a Korean coin laundry.

## Material system (the core idea)

| material | where it is used | why |
|---|---|---|
| **mint wall tile** with pale grout | page ground | the tiled wall behind the machines |
| **stainless steel** face | machines on the board, the big washer front with the drum | the machines are the product |
| **graphite control panel** with seven-segment display | machine displays, course keypad | what you actually read at the machine |
| **white acrylic sign with four screw caps** | "넣으면 안 되는 것", 두고 간 물건 | the house rules screwed to the tile |
| **kiosk receipt strip** | 요금 summary on the panel | what the payment kiosk prints |

No card kit: nothing is a generic rounded card. Each block is one of the materials above.

## Colour

| token | hex | role |
|---|---|---|
| `--tile` | #BEE9DA | page ground (wall tile) |
| `--grout` | #D5F1E7 | 2px tile grout lines, 56px grid, on the ground only |
| `--tile-shade` | #A6DBC8 | tile edge under the machine wall, section boundaries on tile |
| `--steel` | #C5CCD2 | machine faces |
| `--steel-hi` | #E4E8EB | brushed highlight, panel face, input surfaces |
| `--steel-lo` | #8E99A3 | machine seams, door gasket edge (decorative, never the only boundary) |
| `--graphite` | #1F2428 | body text, control panel bezel, primary buttons, focus ring |
| `--panel` | #2A3136 | keypad surface |
| `--display` | #121517 | seven-segment window |
| `--seg-off` | #262C30 | unlit segments |
| `--ink-2` | #3B4744 on tile / #3E464D on steel | secondary text (7.3:1 / 5.9:1) |
| `--on-panel` | #E4E8EB, `--on-panel-2` #A7B1B9 | text on graphite (12.7:1 / 7.2:1) |
| `--white` | #FFFFFF | acrylic signs, laundry basket keys |
| `--select` | #F2F5F6 | "course selected" pilot light on the keypad (not a machine state) |
| `--led-green` | #12B76A | **machine state only**: 비어 있음 |
| `--led-red` | #F04438 | **machine state only**: 돌아가는 중 (steady), 끝남 (blinking) |

Rules: green and red never decorate, never mark links, never mark errors. A state is always
also written in words ("비어 있음", "12분", "끝남") so colour is never the only signal.
Clothes in the drum use white, graphite, steel and a darker tile mint, outlined in graphite.

Contrast (scripts/contrast.py): graphite on tile 11.8, on steel 9.7; red digits on display 4.9,
green digits on display 7.0; on-panel text 12.7.

## Typography

- **Jua** (OFL, Google Fonts subset): wordmark, headings, machine numbers (like the cut-vinyl
  number stickers on the machines). One weight. Never for body text.
- **뽀득 둥근체** = Nanum Square Round subset (NAVER, OFL 1.1). Renamed inside the font files
  because "NanumSquareRound" is a Reserved Font Name and a subset is a Modified Version.
  Weights 400, 700, 800. Body, UI, tables. `font-variant-numeric: tabular-nums` for prices.
- Countdown digits are not a font: they are seven-segment SVG drawn by `js/seg.js`.

Scale (mobile → ≥1024px): 13 / 15 / 16(body) / 19 / 23 / h2 26→34 / board h1 30→38 px.
Body line-height 1.65, headings 1.2. Measure ≤ 34em. Korean `word-break: keep-all`.

## Spacing, shape, depth

- 4px base: 4, 8, 12, 16, 24, 32, 48, 72, 96. Page gutter 16px (mobile) → 32px.
- Content width 1180px. Sections are separated by 72px (mobile) / 96px of tile.
- Radius by material: machine 9px top / 3px foot, washer front 16px, porthole 50%, keys 8px,
  acrylic sign 6px, tile 0.
- Shadows only where a thing stands off the wall: machine `0 2px 0 #8E99A3, 0 10px 18px -12px rgb(31 36 40 / .45)`;
  acrylic sign `0 1px 0 #fff inset, 0 8px 16px -12px rgb(31 36 40 / .5)`. Nothing else casts shadows.

## Components

- **Branch switch**: radio group drawn as the kiosk's branch keys (graphite outline, filled
  graphite when chosen). 48px tall.
- **Machine tile** (button): stainless face standing on a graphite kick plate, 4px apart from
  its neighbours like a bank of machines; graphite display strip with the Jua machine number,
  LED and three-cell seven-segment minutes; porthole showing the drum's contents (empty drum,
  tumbling load with water, or a heap at rest); state in words under the door.
- **Machine sheet**: `<dialog>`; bottom sheet on phones, centred panel on desktop. Big mm:ss
  display, course, "끝나면 알려 주기" toggle.
- **Keypad key** (course): graphite membrane key, pilot light, course name, minutes, price.
- **Instruction plate**: the four first-time steps printed on one stainless plate, divided by
  2px rules, not four cards.
- **Receipt**: the kiosk's white strip with dashed rules and a torn edge for the special machines.
- **Buttons**: keys on tile/steel = steel-hi fill + graphite 2px border + 2px graphite under-edge;
  pressed/selected = graphite fill, moved 2px down (a physical key). On the graphite panel the start
  key is the light one. Disabled = 50% opacity + `aria-disabled` and a sentence saying why. Focus = 3px graphite outline, 3px offset (white on graphite).
- **Links**: graphite, underlined 1px, 3px offset.
- **Toast**: graphite strip at the top of the viewport, `role="status"`.

## Imagery

No photos, no icon set, no bubbles. Small pictograms for the four first-time steps are drawn
in SVG in the same stroke as the machine (2px graphite, round caps), one per step only.
The drum is Canvas 2D. Favicon: the porthole.
