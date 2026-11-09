# 늦깎이 FS: design system

Homepage of an invented neighbourhood women's futsal club in the invented city 물굽이시. Most members
started as adults who had never played. The page is written by the club in 해요체: warm, direct, a
little proud.

## Revision, 2026-11-09/10 (owner review)

The owner said the first version crammed too much onto the screen and asked whether the tactics
board was needed at all. It was not: it was a toy that made the club look like an app.

- **Removed:** the SVG tactics board and all of its code (`js/board/`, about 50 KB of JS, the
  move list, play/step/speed tools, set-play buttons, the legend and keyboard help), the line-drawn
  kit shirt and the shirt-number picker, and the SVG street map. Nothing on the page is drawn with
  code any more except the small crest (a mark) and type.
- **Hero:** a typographic poster in the spirit of 너울 2027: one flat court-blue field, 늦깎이 set
  huge as the image, FS and 월·목 20:30 on the right like a poster's date block, a 6 px white rule
  (a court line), then the club's founding note as the headline: "같이 공 찰 사람, 못 차도 돼요."
- **Photos:** six generated documentary photos of the invented club (see IMAGES.md). The first set
  was shot on a "35 mm film" look; the owner said it read like eerie spirit photos and clashed with
  the page, so all six were regenerated as bright, crisp, contemporary digital sports photography,
  with no grade, grain or vignette added.
- **Only the essentials, with room:** 처음 오는 날, 훈련 일정, 경기 기록, 회비, 체육관, 문의. Section
  padding went from clamp(64,9vw,128) to clamp(96,12vw,192) px; each section holds one idea, one
  photo and one list or table.
- Interaction left: a `<details>` menu on narrow screens, the next-training date, and the contact
  form that sends nothing.

## Colour (kept; four colours and one shade)

| token | hex | role |
|---|---|---|
| `--court` | `#1C4FA0` | the court floor. Header, hero, schedule and gym grounds; headings on white |
| `--court-deep` | `#163F80` | hover/pressed states on blue, the open menu panel, image placeholder |
| `--claret` | `#761C3C` | the kit. Crest, fee section ground, submit button, wins in the table |
| `--white` | `#FFFFFF` | court lines, text on blue/claret, paper sections |
| `--ink` | `#0D1B2E` | cool blue-black from the court hue. Body text on white, footer ground |

The photos carry the same palette for real: royal-blue floor, claret shirts, navy shorts, white
lines and walls. Contrast: white on court 7.85, white on claret 10.49, court on white 7.85, claret on
white 10.49, ink on white 17.31; secondary text is white at 84 % on blue/claret (about 5.8:1) and
ink at 74 % on white (about 7.3:1).

## Typography (kept)

- **Do Hyeon** 400 (OFL): display. The 늦깎이 mark, FS, times, section titles, the fee sum, scores.
- **Sunflower** 500 / 700 (OFL): body, UI, table text.
- Both subset by `scripts/fonts.py` to the characters in index.html and js. Do Hyeon and Sunflower
  have no middle dot or en dash, so times use `~` and the 월·목 dot is a small CSS circle.

| step | size | use |
|---|---|---|
| mark | clamp(6.5rem, 23vw, 21rem); 41vw under 720 px | 늦깎이 |
| FS | clamp(4rem, 11vw, 10rem) | FS |
| note | clamp(2.5rem, 5.6vw, 5rem) | the founding note |
| h2 | clamp(2.75rem, 6vw, 5.25rem) | section titles |
| say | clamp(1.625rem, 2.9vw, 2.5rem) | one-line statements under titles |
| day | clamp(4.5rem, 9vw, 8rem) | 월 목 토 |
| body | 1.125rem / 1.75 | paragraphs |
| small | 0.9375rem | captions, table notes, the address note |

## Layout

- Content width 1240 px, gutter clamp(16px, 4vw, 48px), column gap clamp(16px, 2.4vw, 40px).
- Hero: mast grid (mark | FS + time + place), 6 px white rule, then note (7fr) and intro (5fr).
  Lead photo 2:1 under it, still on blue.
- 처음 오는 날: title + statement + free-visit note beside a 4:5 photo; below, two lists side by side.
- 훈련 일정: three rows only (월, 목, 토), each a huge day letter, the time and one line; rest days
  are one sentence. 16:10 photo under it.
- 경기 기록: 3:2 photo over 8 of 12 columns, the table offset to columns 5-12 below it.
- 회비: the sum huge, a four-line breakdown, then the 4:5 kit still life beside it.
- 체육관: 16:9 photo, then the address (with the fiction note) and four facts.
- Everything left-aligned; no cards, no shadows, no eyebrows, no numbered sections.

## Components

- Buttons: white on blue (hero CTA), claret on white (submit), 52 px tall, radius 4.
- Menu (< 900 px): `<details>` with a pill summary (차례 / 닫기) and a full-width panel of large
  display links; closes on a link, Escape (focus returns to the summary) or a click outside.
- Focus: 3 px outline in the ground's text colour (white on blue/claret/ink, court on white).
- Table: plain, 2 px court rule under the head, wins in claret, fixtures in ink at 74 %.
- Form: 2 px ink fields, pill radios, a note that nothing is sent.

## Motion

None. No animation and no autoplay; smooth anchor scrolling only, switched off for reduced motion.
