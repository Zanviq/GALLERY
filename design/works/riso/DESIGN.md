# 겹 리소 인쇄실 — DESIGN.md

The page is the counter of a small risograph shop: a press sheet you can play with, then the
shop's own paperwork (ink chart, paper swatch book, file-prep sheet, order slip, pickup notice).
Direction comes from print-shop vernacular, not from other websites (UXKIN was not connected).

## Colour

Every colour is a drum of ink or the paper it lands on. Secondary colours (red-orange, violet-blue,
green) are never tokens: they only exist where two inks overlap on a print, computed by the ink model.

| token | value | role | why |
|---|---|---|---|
| `--paper` | `#FFFFFF` | page, sheet, form ground | uncoated white stock; no cream |
| `--black` | `#000000` | text, rules, focus ring | the black drum; text is "printed" in it |
| `--pink` | `#FF48B0` | fluorescent pink drum: prints, large display only, never body text (3.1:1) | the drum the shop is known for |
| `--blue` | `#0078BF` | blue drum: order-slip form lines and labels, links, prints (4.7:1 on white) | a one-colour form is printed in a spot colour |
| `--yellow` | `#FFE800` | yellow drum: prints and fills only, never text or lines (1.2:1) | weakest, most transparent ink |
| `--grey-rule` | `#BDBDBD` | sheet edge and disabled UI only | paper edge seen under shop lights |
| `--grey-text` | `#555555` | secondary text (7.5:1) | pencil notes on the forms |

Ink model on prints (canvas): each drum applies `C = C × lerp(1, ink, cover)` then
`C = lerp(C, ink, cover × hide)`. Hide (opacity) per ink: pink .30, blue .26, yellow .10, so the
drum printed last visibly wins in overlaps. Grain, voids, banding and misregistration are generated
per pull with a seeded PRNG; no stock textures. Grain appears only on prints (sheet, chart patches,
paper swatches), never on the page.

No dark mode: the subject is ink on white paper and the inks are designed against white.

## Type

- **Black Han Sans** (OFL) — brand, section headings, big figures (total price, drum numbers),
  the "겹" glyph on the sheet. One weight.
- **Gowun Dodum** (OFL) — everything else. One weight; emphasis by size or by moving to Black Han
  Sans, never fake bold.
- Scale (px, desktop / mobile): 12 · 14 · 16 (body) · 19 · 24 · 34 · 52 / 40 · 120 (brand on table).
  Body line-height 1.7, headings 1.15. Measure ≤ 36em for Korean prose.
- No all-caps labels, no eyebrow labels, no mono face.

## Spacing and layout

- 8px base: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Sections 96px apart (64 on mobile).
- Content width 1240px max, 24px gutter (16 on mobile). Left-aligned throughout.
- Sections are printed sheets: trim marks at the corners, a colour control strip where the sheet
  is a print. No hairline rules between blocks; whitespace and the sheets themselves separate.

## Shape and depth

- Radius 0 for paper, forms, swatches. Radius 999px only on round drum buttons (± and order).
- No shadows except one on the press sheet (`0 1px 0 #BDBDBD, 0 10px 30px -18px rgb(0 0 0 / .35)`),
  because it is the one sheet lying on the counter.

## Components

- **Button (primary)**: black fill, white text, 44px min height, 2px black border; hover inverts
  to white fill; focus is a 3px black outline offset 3px; disabled grey text on grey border.
- **Button (drum)**: round 44px, 2px black border, white fill; pressed = black fill.
- **Links**: blue, underline 1px offset 3px; hover thickens underline.
- **Inputs (order slip)**: boxes drawn in blue 1.5px; values typed in black; radio/checkbox as
  boxes the shop would tick, with a black check drawn in SVG.
- **Navigation**: one row of text links in the header; wraps on mobile; no sticky bar.
- **Ink chart**: per ink a tint ramp (100/70/40/15 %, stochastic screen, one strip) and a 3 × 3
  matrix of first drum × second drum, so drum order is visible outside the table too.
- **Paper**: a rate-card table (sample print, stock, thickness and face, use, A3/A4 price); on
  phones each row becomes a block.
- **Footer**: the shop's imprint line plus "가상 인쇄실입니다. zanviq gallery 작품."

## Imagery

- No photos, no icon set. Every picture is either a generated print (canvas, with grain) or a
  technical drawing in black/blue lines (SVG: margins, bleed, drum).
- Favicon: the "겹" glyph misregistered in pink over blue.
