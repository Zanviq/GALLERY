# 정면사진관: design system

Homepage of an invented ID-photo studio brand from the invented city 볕드리시: since 1994, three stores
(맞바라기 본점, 마주봄점, 눈맞춤점), 92,000 sitters last year, known for one pale blue backdrop that has
not changed in thirty years. The shop writes in brisk 합니다체 and states its numbers plainly.

## Revision (2026-11-10): what changed and why

The owner's second review (BRIEF §0, REVISION "idphoto") said the page was built around a toy, drew
its people in code, and was crammed. This pass:

- **Removed** the framing-screen toy (drag/pinch/keys, pad, shutter, flash, printing and trimming
  animation, file builder), the opt-in camera (it no longer fits a page that only shows), the drawn
  parametric sitters and the drawn mini photos, the time bars, and localStorage. JS went from seven
  modules (~65 KB) to one 1.3 KB file: the phone menu and a guides toggle.
- **Replaced** the drawn sitters with generated photographs of five invented people, each shot and
  cut to its format (IMAGES.md). The format guides stay only as a light static overlay on those
  photos: the crown, eye and chin bands, a dashed centre line, and a bracket stating the head length
  of that very crop. One toggle button (`aria-pressed`) takes them off to see the clean photos.
- **Repositioned** from a single shop next to city hall to a known local brand with three stores, a
  history and a signature colour.
- **Opened the layout** like a poster (festival as the reference): one flat backdrop-blue field, the
  name as the image at up to 280 px, one 4×6 print of eight identical cuts, then one format per row
  at a shared scale with section padding of 96–176 px.
- The header mark and favicon are now the Song Myung glyph 정 turned into outlines inside crop
  corners (type, not a drawing). Thumbnail, OG and favicons re-rendered from the new page.

## Colour (unchanged: three colours and one derived tint)

| token | hex | role |
|---|---|---|
| `--backdrop` | `#B9D3EA` | the brand's backdrop roll. Header and hero field, the price section, the map's land, and the backdrop in every blue-backdrop photo (pulled to this exact value) |
| `--flash` | `#FFFFFF` | the flash and the white roll. Ground of the content sections, the print paper |
| `--ink` | `#101214` | cool near-black. Text, rules, pressed buttons, the footer ground |
| `--guide` | `#1F5A92` | the backdrop hue darkened until it reads as text. Only for the guide overlay, the measured numbers ("이 사진 3.40 cm") and links |

Contrast: ink on backdrop 12.13, ink on flash 18.77, guide on flash 7.15, guide on backdrop 4.62,
flash on ink 18.77. White-backdrop photos are graded to #F4F5F6 and carry a 1 px ink-14 % edge so
they separate from the white page. No warm colour, no red/green: a met rule is a filled ink box, an
unmet one an empty box, and the words say which.

## Typography (unchanged)

- **Song Myung** 400 (SIL OFL 1.1): display only, 28 px and up. The name (clamp 3.5–17.5 rem), section
  titles, format names, tip titles, store names, prices.
- **Noto Sans KR** 400/500/700 (SIL OFL 1.1): body, tables, numbers (tabular).
- Both subset by `scripts/fonts.py` to the characters on the page. No Latin face.

## Layout

- Gutter clamp(16px, 4vw, 56px), content 1240 px, measure 34 rem, section padding clamp(96px, 12vw, 176px).
- Hero: the name across the full measure; below it, 8fr print + 4fr text and facts (stacked on phones:
  text, print, facts).
- Formats: one row per format, rule between rows. The photo column is `50 mm × --mm + 76 px` wide, where
  `--mm` is one shared scale (10 px per mm on desktop, smaller on phones), so 3×4, 3.5×4.5 and 5×5 show
  their true relative sizes. The head bracket sits in the 76 px margin left of the photo.
- 앉기 전에: rows of tip text + a bad/good pair of the same person. 보정: text + before/after pair, then the table.
- Left-aligned everywhere. Radius 0 for photos and paper, 6 px for buttons. One paper shadow, on the print.

## Imagery

Generated photographs only (IMAGES.md): five sitters, three bad/good pairs, one before/after retouch
pair, one studio room. Code draws only what is code: the dashed trim lines on the print, guide bands,
tables, the street map made of rectangles and lines.
