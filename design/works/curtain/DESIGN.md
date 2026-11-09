# curtain: 백열극장이 다시 엽니다

## What changed in the 2026-11-10 revision, and why

The owner's third review: "7번은 전달력이 부족하다". The first version (〈남겨 둔 불〉, "a one-performer
show starring the ghost light") showed a curtain on a black screen and nothing else: a visitor could
not say what the page was or why to pull. REVISION.md also noted that the CG velvet read as 3D.

1. **A message people know.** The page is now the reopening announcement of an invented 98-seat
   basement theatre, 백열극장. The idea of the ghost light stays, as the reason for the page: the
   theatre closed for repairs on 2024-01-08 and kept one bulb burning on the empty stage for the
   1,159 nights until it reopens on 2027-03-12. The closed curtain carries the announcement
   (theatre name, 다시 엽니다, the date, one line about the light) and a clear cue: a filled
   "막 열기" button and "또는 막을 손으로 잡고 옆으로 끌어 보세요".
2. **The payoff is a poster.** Opening the curtain uncovers the empty stage with its ghost light
   (photograph) and, set on the stage's dark back wall, the season as a poster: 재개관 시즌
   〈남겨 둔 불〉, a huge hairline "3.12", the first night, and the four shows with their dates.
3. **Then spacious information**, as a theatre would print it: the four shows (dates, company,
   genre, running time, one or two lines each), the story of the light with a close photograph of
   the bulb, tickets, and the theatre with its invented address and the fiction note.
4. **Photographic cloth.** The velvet is a generated photograph of a closed emerald curtain. The
   simulation was rebuilt as a 2D cloth in the picture plane: at rest every pixel is the photograph;
   when the cloth moves the photograph moves with it, and where it gathers it is squeezed, its folds
   deepened and darkened. No lighting model, no sheen term, no rail, rings or tassels drawn in code.
   The stage, previously drawn with Canvas gradients, is a photograph too.
5. **Fewer verbs.** Tearing and mending are gone: they made sense for a toy, not for a theatre
   announcing it is open again. What remains is the curtain itself: pull it, or press 막 열기/닫기.
6. **A second, readable face** for the information (see Typography); Grandiflora One is kept for
   everything poster-like.

Names checked by web search with no collision found: 백열극장, 빈터시, 쪽문길, 극단 백열,
극단 낮은지붕, 몸짓모임 아홉걸음. None are in BRIEF §5's taken list.

## Grid

- 12 columns, gutter `clamp(16px, 1.8vw, 28px)`, side margin `clamp(20px, 4.4vw, 72px)`.
- Closed curtain: the announcement sits bottom-left in columns 1–7, in the cloth's own shade (the
  front-of-house light is a pool high and right of centre, computed in screen space so it stays
  put while the cloth moves through it).
- Open stage: the poster takes columns 1–7 on the dark back wall; the lamp stands right of centre in
  the photograph (66% across). The poster's left edge moves in past the gathered cloth (`--stack`,
  measured from the simulation). Below 900px the poster spans all columns; on screens taller than
  5:3 the photo switches to a tall crop with the lamp in the lower half and the stage controls move
  up under the programme (`--after-top`).
- Sections: programme rows are date (columns 1–5) | title, meta and text (6–12). Facts (tickets,
  visit) use the same split. One column below 900px.

## Colour

| token | hex | role | why |
|---|---|---|---|
| `--house` | `#000000` | header, stage, story section, footer | a dark house is true black; the photographs are graded so their shadows reach it |
| `--velvet` | `#0D5C47` | programme, tickets and visit sections | REGISTRY's emerald: the curtain's colour becomes the page's one flat colour field once you scroll past it |
| `--ink` | `#F4F7F6` | display type, buttons | cold white of the bulb, not warm |
| `--ink-2` | `#DCE6E2` | running text | 6.0:1 on emerald, 15:1 on black |
| `--ink-3` | `#C7D6D0` | meta lines, dt labels, notes | 5.0:1 on emerald |
| `--ink-dim` | `#A3AFAB` | footer line | 9:1 on black |

The velvet photograph is colour-corrected toward `#0D5C47` (R x0.72, B x1.13). Stage and bulb
photographs are near-greyscale (18% saturation, slightly cool) so the only colour on the page is the
cloth and the field made from it. Banned palettes avoided: no red curtain, no brass or gold, no
warm lamp light.

Measured contrast of the announcement on the curtain (95th-percentile brightest velvet pixel behind
each line, `scripts/contrast.py`): title 6.1:1 (1440) / 4.9:1 (390), date 8.6:1, running text
7.2:1 (1440) / 6.0:1 (390), hint 8.9:1. The text also carries a soft dark shadow.

## Typography

- **Grandiflora One** 400 (SIL OFL 1.1, Haesung Cho / JAMO; no Reserved Font Name): the wordmark,
  the announcement, the poster, section titles, show titles and dates, prices, the address. Its
  hairline strokes at 46–280px read like a printed theatre bill.
- **Baekyeol Sans** = **SUIT** Regular (SIL OFL 1.1, SUNN), subset and renamed because its licence
  reserves the name "SUIT" (name table and CSS both say Baekyeol Sans). Everything you read:
  running text, meta lines, nav, buttons, labels. Added because the information sections need a
  face that stays legible at 15–19px on emerald, which the hairline display face does not. SUIT has
  no en dash; the CSS stack falls back to Grandiflora One's for the date ranges.
- Both are subset to the page's 328 characters (`scripts/fonts.py`; 48 KB + 18 KB); `scripts/fontcheck.py` checks coverage.

| step | face | size |
|---|---|---|
| announcement title | Grandiflora | clamp(52px, 8.4vw, 136px) / 1.02 |
| poster date | Grandiflora | clamp(120px, 17vw, 280px) / 0.92 (tall screens: up to 30vw) |
| section title | Grandiflora | clamp(46px, 6.2vw, 96px) / 1.06 |
| show date, show title | Grandiflora | clamp(42px, 5.6vw, 88px), clamp(38px, 4.2vw, 64px) |
| prices, address | Grandiflora | clamp(30px, 3.4vw, 52px) |
| running text | Baekyeol Sans | 19px / 1.75 (17px on phones) |
| meta, labels, nav, buttons | Baekyeol Sans | 15–17px |

Letter-spacing 0; no capitals labels, no italics, no eyebrow labels.

## Components

- **Buttons**: 52px tall, 2px radius. Solid (막 열기): white fill, black label. Line (막 닫기, 네 편
  자세히 보기): 1px white line on a 35% black fill so they read on the stage photo. Focus ring 2px
  white, 3px offset.
- **Nav links**: at least 44x44px.
- **Gallery badge**: bottom-right (`/shared/back.js`), clear of the announcement and the stage controls.

## Imagery

Photographs only (IMAGES.md): the velvet (used as the cloth texture), the empty stage with the
ghost light, a close-up of the bulb. Code draws only type, layout, and the cloth's motion. The
favicon is a square of the velvet photograph with a slit of light at the seam.
