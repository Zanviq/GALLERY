# 늦깎이 FS: design system

Homepage of an invented neighbourhood women's futsal club in the invented city 물굽이시. Most members
started as adults who had never played. The page is written by the club in 해요체: warm, direct, a
little proud ("다들 헛발질부터 했어요. 지금은 작전판대로 움직여요.").

Direction: the page is laid on the club's own court. The colours are the floor, the lines and the kit,
nothing else. The one loud thing is the tactics board in the first screen; every other section is plain
club paperwork (a checklist, a week, a results table, the fee sum, an address, a form).

UXKIN was not connected, so no reference sites were compared. The direction comes from the subject: an
indoor futsal hall (blue PU floor, white 8 cm lines), the claret kit, and the magnetic tactics board
every amateur team keeps in the locker room.

## Colour (four colours, one shade)

| token | hex | role |
|---|---|---|
| `--court` | `#1C4FA0` | the court floor. Ground of the header, hero/board, schedule and gym sections; headings and links on white |
| `--court-deep` | `#163F80` | a shade of the floor, only for the board's run-off strip and pressed toggle states |
| `--claret` | `#761C3C` | the kit. Player magnets, the crest, the fee section ground, primary buttons, "우리" score, form errors |
| `--white` | `#FFFFFF` | court lines, the ball, text on blue/claret, paper sections |
| `--ink` | `#0D1B2E` | cool blue-black from the court hue. Body text on white, footer ground |

Contrast (WCAG): white on court 7.85, white on claret 10.49, white on ink 17.31, court on white 7.85,
claret on white 10.49, ink on white 17.31. Claret on court is 1.34, so claret never sits on blue without
a white rim (magnets have a 2 px white rim; buttons on blue are white). Secondary text on blue is white
at 82 % opacity (about 6:1); never lower.

No orange ball, no yellow bibs, no neon, no gradients. The goalkeeper wears white (white magnet, claret
number), which is also the only "bib" colour besides claret.

## Typography

- **Do Hyeon** 400 (OFL, Google Fonts): display. Headings, the wordmark, kit numbers on magnets,
  times, scores, the fee sum. Chunky and condensed like shirt numbers and gym signage.
- **Sunflower** 500 / 700 (OFL, Google Fonts): body, UI, table text. 300 is not used (too thin on blue).
- Both subset by `scripts/fonts.py` to the characters in index.html and js/*.js.

Scale (rem at 16 px root; fluid sizes clamp between phone and 1440):

| step | size | line-height | font | use |
|---|---|---|---|---|
| display | clamp(2.75rem, 6.4vw, 6rem) | 1.02 | Do Hyeon | hero headline |
| h2 | clamp(2.125rem, 4.2vw, 3.5rem) | 1.08 | Do Hyeon | section titles |
| big | clamp(2.5rem, 5vw, 4.25rem) | 1 | Do Hyeon | fee sum, times |
| h3 | 1.5rem | 1.25 | Do Hyeon | sub-heads |
| body | 1.125rem | 1.7 | Sunflower 500 | paragraphs, lists |
| small | 1rem | 1.55 | Sunflower 500 | table, notes, tools |
| micro | 0.875rem | 1.45 | Sunflower 700 | address note, board legend |

Body lines stay under 34 Korean characters per line on desktop (max-width 36rem). No all-caps, no
eyebrow labels above headings, no letter-spacing tricks; Do Hyeon headings are set tight (-0.01em).

## Spacing and layout

- 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Page gutter: clamp(16px, 4vw, 48px). Content width 1240 px; text measure 36rem.
- Section padding: clamp(64px, 9vw, 128px) top and bottom.
- Everything is left-aligned. Nothing is centred except digits inside magnets.
- Hero (≥1024): headline across the top, then a grid of board (1fr) and a 340 px side column (set
  plays, coaching note, move list). 640–1023: one column, board horizontal. <640: one column, board
  rotated so the court runs up the phone (we attack upward).

## Shape and depth

- Radius: 0 for sections, tables and fields (court lines are straight). 999px for choices and toggles
  (set plays, speed and drag toggles, kit numbers, form radios, list toggles): they read as magnets
  on a strip. 4 px for actions (play, step, undo, submit).
- No shadows except the magnets: one 0 1px 0 rgb(13 27 46 / .5) "lift" under each magnet on the board.
- Rules: 2 px white lines on blue (they are court lines); 2 px ink/court lines on white.

## Components

- **Buttons**: primary = claret fill, white text (on white ground); on blue grounds primary = white
  fill, court text. Secondary = 2 px outline in the current text colour. Quiet = underlined text.
  Hover: fill darkens via `--court-deep` (blue) or outline thickens; pressed/selected: inverted.
  Disabled: 45 % opacity and `aria-disabled`. Height ≥ 44 px.
- **Focus**: 3 px outline in the ground's text colour, offset 3 px (white on blue/claret/ink, court on
  white). Board pieces: a white ring plus an ink ring so it reads on blue and on white magnets.
- **Links**: underlined, 2 px, offset 4 px; court on white, white on blue.
- **Inputs**: white field, 2 px ink border, ink text, square corners, 48 px tall. Error text claret.
- **Navigation**: one row on blue: crest + wordmark left, six anchor links right; wraps under the
  wordmark below 720 px. No sticky header (the board needs the height).
- **Table**: plain, 2 px court line under the header, 1 px ink/20 % lines between rows, our score in
  claret, future fixtures in a lighter row with "예정".
- **Footer**: ink ground, white text, the fiction line and font credits.

## Imagery and icons

- No photos and no people. The club is shown through its magnets (numbered, named in lists) and its
  kit (a line-drawn shirt in the fee section).
- Crest / favicon: a whole futsal court in white on claret, with the penalty areas drawn the way only
  futsal has them (two 6 m quarter circles joined by a short line). A first crest showing one goal end
  read as a briefcase at 32 px, so the full court replaced it.
- Icons: none from a set. The few pictograms (kit-bag items, the schedule) are drawn with the same
  2 px court line in SVG, or left as words.
- Motion: one moment. In normal motion the loaded set play replays once when the board first comes
  into view; everything else moves only when the visitor acts. Reduced motion: no autoplay; replays
  jump beat by beat.
