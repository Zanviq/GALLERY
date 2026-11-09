# 획 하나 차이 (jamo) · design system

Row 16 of `design/works/REGISTRY.md`. A Korean word puzzle on a classroom chalkboard: jamo are
assembled into syllable blocks (모아쓰기), and strokes are added or rubbed off letters the way
훈민정음 derives ㅋ from ㄱ (가획). UXKIN was not connected, so this direction comes from the subject
(a Korean classroom board, 깍두기 공책, a teacher's marking habits), not from compared websites.

## Idea in one line
The page is the board, and only chalk is decorated. Everything chalk touches (letters, frames,
marks, dust) carries the material; everything else (layout, buttons, panels) stays flat and quiet.

## Colour (each colour is a chalk that a teacher actually uses, and has one job)

| token | hex | role |
|---|---|---|
| `--board` | `#1E3B2F` | the ground. Classroom 녹색 칠판, slightly blue-green like a slate board under fluorescent light |
| `--board-deep` | `#152B22` | side rail, ledge groove, dialogs (the same board in shadow, not a new colour) |
| `--haze` | `#F2F2EE` @ 4–8 % | erased-chalk residue: eraser arcs, ghosts of solved words, smudges where letters were lifted |
| `--chalk` | `#F2F2EE` | white chalk: consonants, frames, clue, all running text (10.9:1 on board) |
| `--chalk-dim` | `#B4C3BA` | secondary text such as notes and counts (6.7:1) |
| `--sky` | `#9CC9F5` | vowels. Korean literacy boards colour vowels apart from consonants; it lets the eye split the pile (7.0:1) |
| `--yellow` | `#F7E26B` | the chalk you hold: the chalk stick, strokes you added, selection, keyboard focus, the teacher's instruction line (9.3:1) |
| `--pink` | `#F4A6C1` | the teacher's marking chalk: the 동그라미 and 꽃동그라미 on a solve, and the wrong-word note (6.4:1) |
| `--metal` | `#8E9894` | the aluminium ledge and the eraser body (UI part, 4.1:1) |

No gradients. No wood frame. The haze is the only texture on the ground, and it is the board's own
history (where the eraser went), not a grain overlay.

## Typography
- **Orbit** (Sooun Cho, JAMO; SIL OFL 1.1), one weight (400). Its jamo are built from straight,
  even strokes, so a stroke added to ㄱ really reads as one more line. No Latin face added; Orbit's
  Latin covers the few digits.
- Subset generated from the puzzle data: page text, every jamo, and every syllable a player can
  reach in any puzzle that Orbit contains (about 1,400). Syllables Orbit lacks are assembled from
  jamo pieces by the block renderer.
- Scale (px, desktop / phone): tile glyph 56 / 42 · block syllable 0.74 × block · clue 32 / 21
  (line height 1.35) · title 22 / 18 · body and buttons 16 · notes 14 (minimum).
- No all-caps, no letter-spacing tricks, no italic. Hierarchy is size and chalk colour only.

## Spacing and layout
- 8-based scale: 4 8 12 16 24 32 48 64. Page gutter 16 (phone) / 32 (desktop).
- One screen, no page scroll on the board view (100dvh). Regions, top to bottom: header row,
  clue, answer blocks, the open board where tiles lie, the ledge.
- Wide screens (≥ 1180px) add a right rail: today's date written like the corner of a real board,
  then the 낱말 공책 (puzzle list). Narrower screens open the same list as a sheet.
- Left aligned. The clue reads like a teacher's line written from the left edge, not a centred hero.

## Shape and depth
- Chalk shapes are drawn, not styled: frames, circles and underlines come from a canvas chalk
  brush (speckled, broken where the board's tooth skipped). CSS radius only on buttons (6px) and
  the sheet (10px).
- One shadow: a lifted tile while dragging (`0 10px 18px rgb(0 0 0 / .35)`). Nothing else floats.

## Components
- **Tile**: a jamo in chalk, no box. Hit area 48–90px (never under 44px). Selected or focused:
  yellow dashed box. Strokes the player added are drawn in yellow on the letter itself (the ink the
  new jamo has and the old one lacks, computed from Orbit at runtime); erased strokes leave a ghost.
- **Block (칸)**: square chalk frame, dotted midline; top half takes 첫소리/가운뎃소리, bottom half
  takes 받침 (a "받침" note sits there until filled). The two hit areas reach past the frame so each
  is at least 44px tall on phones.
- **Chalk stick / eraser**: drawn objects on the ledge, both draggable and tappable. The stick's
  length is the stroke count.
- **Buttons**: chalk-outlined text on the board (white text, a 2px border run through the same tooth
  filter as the clue, 6px radius, 44px tall). Primary action ("다음 낱말") is filled yellow with
  board-coloured text.
- **Stroke chart**: on roomy boards the right edge of the open board carries the 가획 table a teacher
  would keep on the side of a board (ㄱㅋ, ㄴㄷㅌ, ㅁㅂㅍ, ㅅㅈㅊ, ㅏㅑ ㅓㅕ, ㅗㅛ ㅜㅠ) with the added
  strokes in yellow. Hidden in the first two lessons, before strokes are taught.
- **Header**: title, and on wide screens a one-line description beside it (no eyebrow, no hero).
- **Sheet (낱말 공책)**: board-deep panel; each puzzle is a row of empty 칸 that fill with the
  answer once solved, with the teacher's mark beside it.

## Imagery and icons
No photos, no icon set. Every mark is chalk: 동그라미, 꽃동그라미, slash, the stroke arrow on the
ledge. The favicon is a ㄱ with one yellow stroke turning it into ㅋ. The OG image (`og/jamo.png`) is
the key visual from `keyvisual.html`: ㅅ ㅈ ㅊ with their added strokes, and 칠판 in a 꽃동그라미.

## Motion
Motion answers the player: a tile lands with a puff of dust; a stroke is drawn on; the eraser
rubs; a solve is circled; a new puzzle arrives with one eraser wipe. Nothing moves on its own.
`prefers-reduced-motion`: no dust, no wipe, marks appear drawn at once.
