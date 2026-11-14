# 또렷안경 (optician) — design system

A neighbourhood optician that edges its own lenses. The page is built like a wall eye chart:
one very large line at the top, every section a smaller line below it, the decimal acuity of
each line printed in the margin. The chart is the structure, not decoration: the heading size of
every section is computed from that acuity, so the margin number and the type size always agree.

Direction note: UXKIN was not connected, so this is not based on compared reference sites. It is
based on the subject itself: printed and projected optotype charts, the phoropter, the duochrome
slide, frame size stamps (52□18-140) and lens-edging work sheets.

## Colour (four values, nothing else)

| token | hex | role | reason |
|---|---|---|---|
| `--white` | `#FFFFFF` | every background, the chart face, text on ink | the backlit chart and the exam-room wall |
| `--ink` | `#111316` | text, optotypes, line drawings, the lens-wheel body, filled buttons | chart letters and the black phoropter housing |
| `--red` | `#D0021B` | left half of the duochrome band; minus powers on the readout; minus ticks on the wheel | duochrome slide red; phoropters print minus powers in red |
| `--green` | `#00A05A` | right half of the duochrome band; the brand mark's right half | duochrome slide green |

- One derived tint: `--ink-soft` = ink at 72 % (secondary text, 7.4:1 on white). No greys beyond it.
- Contrast: ink/white 18.4:1. Red on white 5.7:1 (text OK). Ink on red 3.3:1 and ink on green 5.5:1,
  used only for large optotypes. Green is never text on white (3.4:1).
- Red and green never carry meaning alone: the duochrome halves are labelled 왼쪽/오른쪽 and the
  answers are asked by side; minus values always print their "−" sign.
- No dark mode. The subject is a lit white chart; the page keeps one light theme on purpose.

## Typography

Since 2026-11-14 (detail pass, BRIEF §0000): Kakao's two digital faces, chosen for a page about
reading letters at different sizes. Kakao Big Sans (카카오 큰글씨) draws the chart lines, Kakao
Small Sans (카카오 작은글씨) the small print. SIL OFL 1.1, from Kakao's own download; subsets
renamed "Ttoryeot Display" / "Ttoryeot Text" (name ID 7 marks the names as Kakao trademarks),
digits set to one width because the family has no `tnum`. Build: `scripts/fonts.py`; licence:
`works/optician/fonts/OFL-KakaoSans.txt`. (Gothic A1 before.) No Latin face is added.

| face | weight | use |
|---|---|---|
| Text (Small Sans Regular) | 400 | body copy, table cells |
| Text (Small Sans Bold) | 700 | labels, buttons, step names, the readout's S and D |
| Display (Big Sans ExtraBold) | 800, asked as 900 | chart lines (h1/h2, index, footer line), the readout number, the size stamp 52□18-140, small heads (도수 찾기, 적록 이색 검사, table captions) |

Ranges use the Korean tilde (10:00~20:00, 2~3일): Kakao's en dash is nearly an em wide.
Tracking: chart lines keep the optotype spacing below; small heads −0.025em; body −0.01em.

Chart scale: `font-size = min(--line-1 / acuity, available width / measured width in em)`.
`--line-1` (the 1.0 line) is 22 px from 1024 px, 18 px on tablets, 15 px on phones, so the lines
still step down on a 360 px screen. Chart lines are tracked +0.26em (optotype spacing) with the
word space pulled in by 0.12em.

| line | section | desktop px | phone px (375) |
|---|---|---|---|
| 0.1 | 또렷안경 (h1) | width-bound, up to 168 | width-bound, ~56 |
| 0.2 | 검안 순서 | 110 | width-bound, ~53 |
| 0.3 | 테 고르기 | 73 | 50 |
| 0.4 | 렌즈 가공 | 55 | 37.5 |
| 0.5 | 사후 관리 | 44 | 30 |
| 0.6 | 가격 | 37 | 25 |
| 0.8 | 찾아오는 길 | 27.5 | 18.75 |
| 1.0 | footer line | 22 | 15 |

Body 17 px / 1.72 (16 px on phones), measure 34em. Headings left-aligned; nothing centred
except glyphs inside the chart.

## Spacing

8-based: 4 8 12 16 24 32 48 64 96 128. Space above a chart line shrinks with the line, like a
real chart: `clamp(64px, --line-1 * 1.25 / acuity, 152px)`.

Layout: desktop ≥ 1024 has a 216 px sticky left rail (brand mark, the chart index, opening
hours) and a content column up to 1120 px. Each section is a two-column grid: a 56 px margin
column for the acuity number and the content. Phones: a sticky 56 px top bar with a 차례 button.

## Shape and depth

Square corners for all blocks, buttons and inputs; full circles only for lenses and the wheel.
No shadows, no gradients, no blur except the optical blur inside the chart.

## Components

- Button, filled: ink background, white 700 text, 48 px high. Hover: underline. Pressed: 1 px down.
- Button, outline: white, 2 px ink border. Selected (segmented): ink fill, white text, `aria-pressed`.
- Focus: 3 px ink outline with 3 px white offset (on ink: white outline).
- Range: 2 px ink track with millimetre ticks, 24 px square ink thumb.
- Links: ink, 1 px underline at 0.2em offset; 2 px on hover.
- Tables: rows separated by 1 px ink; numbers right-aligned, tabular.
- Disabled: 40 % ink, `aria-disabled`.

## Imagery

No photographs or icon set. Everything is SVG line work at 1.5 px ink (technical-drawing
style, dimension lines with end ticks), plus the custom optotypes: twelve Hangul syllables
(가 거 나 너 다 더 라 러 카 커 타 터) drawn on a 10 × 10 grid with a 2-unit stroke, the
1/5 stroke rule real optotypes follow. Brand mark: a ring split red | green, the duochrome.
