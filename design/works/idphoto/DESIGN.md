# 정면사진관: design system

Homepage of an invented ID and passport photo studio in the invented city 볕드리시, two minutes'
walk from the (invented) city hall's 민원실. The shop writes in brisk 합니다체: it knows every format
by heart and says so plainly ("여권은 흰 배경입니다. 머리는 3.2에서 3.6 cm 사이로 맞춥니다.").

Direction: the page is the studio itself. The top of the page is the backdrop paper, the one loud
thing is the camera's framing screen with live guides, and the one bright moment is the flash.
Everything below is the shop's counter paperwork: a format sheet, a list of what to fix before you
sit down, a retouching table that tells the truth, a price board, a file slip and a map.

UXKIN was not connected, so no reference sites were compared. The direction comes from the subject:
the pale blue backdrop roll every Korean ID photo has been shot against, the white roll the passport
rules ask for, the flash, the crop guide on the camera's screen, and the 4×6 print with dashed
trim lines that the shop cuts in front of you.

## Colour (three colours and one derived tint)

| token | hex | role |
|---|---|---|
| `--backdrop` | `#B9D3EA` | the pale blue backdrop roll. Ground of the first screen (studio + tool), the price board, the map's land |
| `--flash` | `#FFFFFF` | the flash and the white roll. Ground of the paperwork sections, text on ink, the print paper |
| `--ink` | `#101214` | cool near-black. All body text, the sitter's hair and jacket, the studio darkness around the backdrop, the footer ground, primary buttons |
| `--guide` | `#1F5A92` | derived from the backdrop hue (208°), darkened until it reads as text. Only for crop guides, rulers, live measurements, the selected format's mark and links |

Contrast (WCAG, `scripts/contrast.py`): ink on backdrop 12.13, ink on flash 18.77, guide on backdrop
4.62, guide on flash 7.15, flash on guide 7.15, flash on ink 18.77. Ink on guide is 2.62, so ink text
never sits on guide; guide is never a fill under text except with flash text.
Derived by opacity only (not new colours): the dim outside the crop is ink at 62 % (flash text on it
6.9 over the blue roll, 5.3 over the white roll), guide bands are guide at 16 %, and the band words sit on small guide tags in flash (7.15).

Not used: any warm colour, any red/green pass/fail. A met check is a filled ink box with a flash
tick; an unmet check is an empty ink box. The words say which ("맞음", "아직").

## Typography

- **Song Myung** 400 (SIL OFL 1.1, Google Fonts): display, only at 36 px and above. The wordmark,
  section titles, the price numbers and minutes on the price board. Its cut, high-contrast strokes
  read like a hand-lettered shop sign next to millimetre-precise guides.
- **Noto Sans KR** 400 / 500 / 700 (SIL OFL 1.1, Google Fonts): body, UI, tables, readouts
  (`font-variant-numeric: tabular-nums` for every measurement).
- Both subset by `scripts/fonts.py` to the characters in index.html and js/*.js. No Latin face.

| step | size | line-height | font | use |
|---|---|---|---|---|
| wordmark | clamp(3.25rem, 7.6vw, 7.25rem) | 1.0 | Song Myung | h1 |
| h2 | clamp(2.25rem, 4.4vw, 3.5rem) | 1.12 | Song Myung | section titles |
| price | clamp(2.25rem, 3.6vw, 3rem) | 1.0 | Song Myung | won and minutes on the board |
| h3 | 1.25rem | 1.4 | Noto 700 | sub-heads, format names in the tool |
| lead | 1.1875rem | 1.7 | Noto 400 | first paragraph of a section |
| body | 1.0625rem | 1.75 | Noto 400 | paragraphs, lists |
| small | 0.9375rem | 1.6 | Noto 400/500 | tables, readouts, notes |
| micro | 0.8125rem | 1.45 | Noto 500 | ruler numbers in the viewfinder, sheet margin text |

Measure: 34rem for running text (about 32 Korean characters per line). No all-caps, no eyebrow
labels, no letter-spacing tricks, no single-word accent colours in headings. Song Myung is set with
-0.01em tracking; never below 36 px, never for body.

## Spacing and layout

- 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Page gutter: clamp(16px, 4vw, 48px). Content width 1240 px.
- Section padding: clamp(72px, 10vw, 136px) top, a little less below.
- Left-aligned everywhere. Nothing is centred except the sitter in the frame and the shutter glyph.
- Studio (≥1024): a two-column instrument. Left column 400 px: wordmark, one paragraph, the format
  list, the checklist. Right column: the framing screen (square-ish, up to 640 px) with its control
  pad and shutter underneath. 640–1023: wordmark and paragraph, then the format list as a wrapped
  row, then screen, then pad + checklist side by side. <640: one column in the order a customer
  meets them: format, screen, pad, shutter, checklist.
- Paperwork sections alternate nothing: all on flash white, separated by space and by the
  section title, except the price board (backdrop ground) and the footer (ink ground).

## Shape and depth

- Radius 0 for anything that is paper or photo: frames, mini photos, the print sheet, cut pieces,
  tables, the map. Radius 6 px for buttons, format rows and inputs. The shutter is a circle.
- One shadow, only for paper lying on the counter: `0 1px 2px rgb(16 18 20 / .22), 0 10px 28px -14px
  rgb(16 18 20 / .45)` on the print sheet and its cut pieces.
- Lines: 2 px ink for table heads and the format list; 1.5 px guide lines in the viewfinder; dashed
  1 px ink only where paper will actually be cut (trim lines on the sheet, the cut-out mini photos).

## Components

- **Buttons**: primary = ink fill, flash text (48 px tall, 6 px radius). Secondary = 2 px ink outline,
  transparent. Quiet = underlined text link in guide. Hover: primary lifts to guide fill; secondary
  gets an ink fill with flash text. Disabled: 40 % opacity plus `aria-disabled`.
- **Shutter**: 72 px circle, ink ring 3 px around a flash disc with an ink core; the word 셔터 sits
  beside it, never inside. Pressed: the core shrinks 4 px.
- **Control pad**: 48 px square buttons with drawn SVG icons (2 px ink strokes, butt caps): zoom −/+,
  four nudges, two tilts, reset. Grouped by what they move, with visible group words (크기, 위치,
  기울기).
- **Format list**: native radios inside full-width rows; name left (Noto 700), size right
  (tabular), the backdrop the format needs as a small swatch square. Selected row: ink fill, flash
  text, the swatch keeps its own colour with a flash rim.
- **Checklist**: five rows, box + item + live readout ("3.42 cm, 3.2–3.6 안"). A summary line above
  is the only live region.
- **Focus**: 3 px outline in guide on light grounds, flash on ink grounds, offset 3 px. The framing
  screen gets the same ring plus a visible key hint while focused.
- **Tables**: 2 px ink head rule, 1 px ink at 20 % between rows, no zebra, no cards.
- **Links**: guide, underlined (1 px, offset 3 px). Visited same colour.

## Imagery and icons

- No photographs. The sitter is an original parametric vector drawing (three invented customers):
  flat ink hair and jacket, flash-white skin and shirt with ink line work, nothing else. The same
  drawing makes the mini photos in 촬영 전 준비 (the before/after of each tip).
- The print sheet is drawn from the actual capture: 4×6 inch landscape, 8 cuts for 3.5×4.5 and 3×4,
  6 cuts for 5×5, dashed trim lines, corner crop marks and a one-line margin imprint.
- The map is an invented street plan in backdrop and flash with ink labels.
- Icons are drawn for this page only (control pad, file, clock). No icon set, no emoji.
