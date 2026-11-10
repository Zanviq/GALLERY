# 닳다: 탁은결 개인전 (works/sculpture)

A promo page for an invented sculpture show, made as the web version of an exhibition poster and
catalogue. Promo (홍보), desktop + mobile. No JavaScript of its own.

## The show (all invented)

- **Artist:** 탁은결 (Tak Eungyeol), b. 1981 in 모롱시. Learned terrazzo wet-grinding (물갈기) on
  floor-laying sites. Since 2014 she measures the worn places in buildings about to be demolished
  (a market stair, a classroom threshold, a terminal bench, a bathhouse pool edge), casts a new
  block of white cement and crushed green bottle glass from the same neighbourhood, and grinds it by
  hand until it reaches the recorded depth. "It does not copy the wear; it wears again."
- **Exhibition:** 《닳다》 / *Worn*, 모롱시립미술관 1·2전시실, 2026.10.29 – 2027.2.28, free.
- **Works:** six sculptures and one series of nine rubbings (catalogue on the page, with sizes in cm,
  original place, years in use and the deepest point of wear).
- Not resembling a famous sculptor's signature: no stones on plates, weathering-steel curves,
  mirrors, casts of bodies, pierced organic forms, stacked found objects or wrapped forms. Closest
  relative is the general idea of casting everyday architecture; here the forms are new stone,
  ground, and the subject is wear.
- Name checks (web search, 2026-11-10): 탁은결 (sculptor), 《닳다》 (exhibition), 모롱시 /
  모롱시립미술관, 모롱역, 너덜샘로, 편서율: no matches. Place names used: 모롱시, 모롱역,
  너덜샘로, 모롱중앙시장, 모롱초등학교, 모롱시외버스터미널, 모롱동부목욕탕 (all invented).

## Direction

Poster first, catalogue second. The owner's reference is 너울 2027 (`works/festival`): one flat
colour field, huge type used as the image, strict grid, few gimmicks. Here the first screen is the
poster: the title in two weights, artist, deck line, dates, venue, admission and one photograph of
one work. Everything after it is a spacious museum catalogue on white.

The typographic idea comes from the title: **닳** is set in Noto Serif KR 900 (the new block) and
**다** in 200 (the same letterform after it has been worn down). The two extreme weights carry the
show's idea without any effect; the footer repeats the mark in green on black.

## Grid

- 4 columns under 640px (margin 20px, 16px at ≤374px; gutter 16/12px), 8 columns from 640px
  (32 / 20), 12 columns from 1024px (margin clamp(32px, 3.4vw, 64px), gutter clamp(20px, 1.7vw, 32px)).
- Section padding: 96 / 128 / clamp(144px, 12vw, 220px). Spacing otherwise on an 8px rhythm.
- Desktop poster: title over columns 1–8 (its size is the width of eight columns ÷ 2.04, capped at
  40svh), photo columns 9–12 (height capped at `100svh - 330px`, cropped from the top on short
  screens), facts row across all twelve under a 3px rule. The poster fills exactly the first screen
  at 1024×768, 1280×720, 1366×768, 1440×900 and 1920×1080 (`min-height: calc(100svh - 60px)`), so
  the dates are always in the first view.
- Phone poster order: title, artist, dates and facts, photo, deck. At 390×844 the first screen
  says what, who, when and where before the photograph.
- Sections: heading in columns 1–3, content from column 4. Plates sit on the grid in pairs of
  7+4, 10, 6+5, 7+5 columns and two full bleeds; the catalogue list uses `subgrid` so its
  columns are the page's columns.

## Colour

| token | value | role | reason |
|---|---|---|---|
| `--green` | `#1E9A47` | poster field, programme field, footer mark, `:target` highlight, selection | the green bottle glass crushed into every work; the colour that appears when the stone is ground |
| `--ink` | `#0A0A0A` | all text and rules | neutral black (not a warm "ink") |
| `--paper` | `#FFFFFF` | catalogue ground | the white of the cement and the gallery walls in the photographs |
| `--mute` | `#545454` | notes, list header | secondary text on white |
| footer fine print | `#BDBDBD` on `#0A0A0A` | | |

Contrast: ink on green 5.4:1, ink on white 19:1, mute on white 7.6:1, #BDBDBD on ink 10:1.
Green is never used for small text on white (3.9:1). No banned colours (no cream, beige, orange,
amber, gold, purple, gradients).

## Type

- **Noto Serif KR** (Google Fonts, SIL OFL 1.1, "Copyright 2012 Google Inc.", no Reserved Font
  Name, so the subset keeps its name; licence in `fonts/OFL-NotoSerifKR.txt`): 900 for headings, the title's first syllable, catalogue titles, the museum
  mark; 200 for the title's second syllable and the lead sentence of the curatorial text; 400 for
  everything else. Subset per weight (200: 8 KB, 400: 76 KB, 900: 25 KB).
- **Schibsted Grotesk** 400 / 700 (Google Fonts, SIL OFL 1.1, "Copyright 2023 The Schibsted-Grotesk
  Project Authors", no RFN; `fonts/OFL-SchibstedGrotesk.txt`), new to the registry:
  dates, times, sizes, catalogue numbers and English titles (`.num`, `[lang=en]`). Korean in the
  same elements falls back to the serif, the way museum labels mix a grotesk for figures with a
  serif for words. 17 KB per weight.
- Sizes: title = 8 columns ÷ 2.04, at most 40svh (360px at 1440×900; 48vw on a phone); section titles
  clamp(30px, 3.2vw, 48px); lead clamp(27px, 3.5vw, 56px) in 200; body 17/18px, line-height 1.8;
  captions 14px; programme dates clamp(56px, 5.4vw, 92px) grotesk 700.
- `word-break: keep-all`; the catalogue titles hang the full-width 〈 by half an em.

## Components

- Header: museum mark (900) + English name, four anchor links (44px targets).
- Figures: photo, then a caption row whose catalogue number is a link to the list (hit area
  enlarged with a pseudo-element).
- Catalogue list: an `ol` of rows (number, title Ko/En, year, material, size, original place and
  years, deepest wear). 3px rule at the top and bottom, 2px between rows. Desktop shows a column
  header row (aria-hidden; each row reads on its own).
- Programme: one row per event, the date as the image (grotesk 700), name in 900, text and meta.
- Visit and credits: plain definition lists on the grid. The address carries "가상 서비스입니다.
  실제 주소가 아닙니다."
- Footer: black band with the green mark, the show line and the fiction note.
- Focus: 3px black outline (white in the footer). No rounded corners, no shadows, no cards.

## Imagery

16 Gemini generations (see IMAGES.md): crisp, neutral museum photography in one white skylit
gallery for the works, and overcast documentary daylight for the survey, the studio and the glass.
No people (2026-11-10, BRIEF §000): the survey, studio and visitor views were redone as the stair
with the straightedge, the workshop with the tools on the half-ground slab, and the empty room.
No grain, no film look, matching the flat poster. Exported to webp q76 at 2–3 widths with `srcset`;
everything below the poster is `loading="lazy"`. The whole page is about 0.9 MB of images and
0.15 MB of fonts.

## Interaction

One quiet touch, no script: catalogue numbers link photos and list rows both ways, and the target
is marked in the identity green (a green frame round the photo, a green band on the row). Smooth
scrolling only without `prefers-reduced-motion`.

## Files

- `works/sculpture/index.html`, `css/site.css`, `css/fonts.css` (generated), `fonts/` (5 woff2 +
  2 OFL texts), `img/` (photos, favicon.svg drawn from the 닳 glyph, favicon-32.png,
  apple-touch-icon.png).
- `design/works/sculpture/scripts/fonts.py` (subset + coverage check + favicon),
  `scripts/images_md.py` (writes IMAGES.md), `scripts/cdp.mjs` (captures; set `CDP_PORT`).
- `thumbnails/sculpture.webp` (1200×900 capture of the poster, gallery badge removed),
  `og/sculpture.png` (1920×1008 viewport at 0.625 scale, deck line and photo caption hidden).
