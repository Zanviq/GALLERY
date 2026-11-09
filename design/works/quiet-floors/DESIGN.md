# 사뿐 (quiet-floors) design system

A promo page for 사뿐, a 층간소음 campaign run by the invented 겹뜰 주민협의회 of the invented
겹뜰시. Neighbour to neighbour, no blame, practical. Light only.

Direction: **an architect's building section, painted like a Korean apartment block.** The page is
drawn the way a section drawing is drawn: thick cut lines, thin projection lines, concrete hatch in the
slabs. The flat colour fields are the paint on the outside of the block. The one instrument in the
building, the noise meter, is the only place red appears.
No UXKIN references were used (not connected); the direction comes from the subject: section drawings,
apartment exterior paint, a handheld sound level meter.

## Colour

Concrete and the two paints all sit at the same luminance (1.04:1 against each other), so they are told
apart by hue and by ink outlines, never by contrast alone. Every edge that matters is an ink line.

| token | hex | role |
|---|---|---|
| `--slab` | #D6D6D2 | exposed concrete. Slabs in the drawing, slab separators, main page ground |
| `--slab-hatch` | #9FA09B | concrete hatch dots and aggregate triangles (decoration only) |
| `--paint-green` | #B5DCB0 | exterior paint. Ground of "작은 것부터" and "협의회" |
| `--paint-sky` | #BFD9F2 | exterior paint, also the sky behind the block. Hero and pledge ground |
| `--room` | #EEEFEC | room interiors in the section |
| `--paper` | #FFFFFF | inputs, the neighbour note |
| `--ink` | #262B30 | text, cut lines, primary buttons. Cool dark grey, concrete in shadow. 9.4:1 or more on every ground |
| `--ink-2` | #4B535A | secondary text, furniture lines, input borders. 5.15:1 or more on every ground |
| `--meter-body` | #1C2024 | the meter's body and display |
| `--meter-red` | #E5372E | **meter only**: 7-segment digits (large, 3.84:1 on body), level bar segments, the "지금" bar, the meter in the drawing |
| `--meter-dim` | #8A2A25 | **meter only**: lit bar segments that sit inside the background-noise band |
| `--meter-off` / `--meter-band` | #2B3136 / #48525A | unlit segments; unlit background band and the "고치기 전" bar |
| `--meter-label` | #C9CDD0 | small labels printed on the meter body |

Rules: red never leaves the meter or its readings panel; every red reading also has a number and a word.
No gradients, no blurred shadows, no tints of the palette beyond those listed.

## Typography

- **Dongle 700** (display, OFL, no Reserved Font Name). Its syllables are small in the em and jump
  around the baseline: a syllable without a final consonant spans 0.08–0.43 em, one with a final
  consonant drops to −0.40 em. That bounce is the face's character, so it is kept and the metrics are
  overridden in `@font-face` to the real glyph box (`ascent-override: 56%`, `descent-override: 42%`,
  `line-gap-override: 0%`), with line-height .94. Used for headlines, onomatopoeia (쿵쿵, 드르륵),
  prices, dates, the pledge count and the painted block number 103.
- **Paperlogy 400 / 700** (body, OFL, no Reserved Font Name). Body, UI, the note. The 400 subset carries
  every Hangul syllable so text typed into the note keeps its face.
- Meter digits are not a font: they are 7-segment shapes drawn in SVG, like the instrument.

| step | face | size | line-height | use |
|---|---|---|---|---|
| d1 | Dongle 700 | min(19.5vw, 110px) phone, 130px tablet, fitted to the text column on desktop (max 124 / 100px) | .94 | hero headline, pledge count (200px) |
| d2 | Dongle 700 | clamp(80px, 19vw, 132px) | .94 | section headlines |
| d3 | Dongle 700 | clamp(64px, 13vw, 92px) | .94 | prices; onomatopoeia use clamp(88px, 22vw, 150px) |
| t-lead | Paperlogy 400 | 20px (18 mobile) | 1.65 | lead paragraphs |
| t-body | Paperlogy 400 | 17px | 1.75 | body |
| t-h3 | Paperlogy 700 | 19px | 1.4 | item titles |
| t-ui | Paperlogy 700 | 16px | 1.3 | buttons, chips, labels |
| t-small | Paperlogy 400 | 14px | 1.6 | notes, legends, fine print |

Text column max 36rem. Left aligned everywhere; nothing centred except digits inside the meter.

## Spacing

8-based: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section padding 96px (desktop) / 64px (mobile).
Page gutter 16px on phones, 32px tablet, 48px desktop. Content max width 1240px.

## Shape and depth

- Radius: 0 for anything architectural (drawing, slabs, panels, the note), 6px for buttons and inputs,
  999px for toggle chips, 20px for the meter body (a handheld object).
- No blurred shadows. Depth comes from line weight: cut lines 3px, projection lines 1.5px.
  The meter alone gets a solid 0 3px 0 ink offset, as if drawn on the sheet.
- Slab separator: a 20px (mobile 14px) concrete band with hatch, bounded by 3px ink lines. It sits
  between "floors" of the page because the page is about the slab.

## Components

- **Primary button**: ink fill, white text (14.3:1), 48px tall, 6px radius. Hover #3A4047.
  Focus: 3px ink outline, 3px offset. Disabled: 45% opacity, label says why.
- **Quiet button**: transparent, 2px ink border, ink text; hover fills `--room`.
- **Toggle chip** (activity radio, fix checkbox): paper fill, 2px ink border, 999px radius, 48px tall.
  Selected: ink fill, white text, and a drawn marker (dot for radio, check for checkbox), never colour only.
- **Link**: ink, 1.5px underline at 3px offset; hover 3px underline.
- **Input / select / textarea**: paper, 2px `--ink-2` border, 6px radius, 48px tall; focus 3px ink outline.
- **Meter**: `--meter-body` rounded body, 7-segment red digits, 20-step bar, "최대" hold, unit "dB",
  a printed label "예시 수치". Focus ring on dark is white.
- **Nav**: wordmark left, anchors right on ≥ 860px; on phones only the wordmark and "약속하기".
- **Footer**: ink ground, slab-coloured text (9.8:1), the address with its fiction note.

## Imagery and icons

No photos and no icon set. Everything is drawn as a section: rooms, furniture outlines, people as simple
rounded figures in `--ink-2`. The two or three UI glyphs needed (check, copy) are inline SVG strokes in ink.
