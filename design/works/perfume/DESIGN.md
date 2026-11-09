# 담금 DAMGEUM — design system (revision of 2026-11-09)

A fictional perfume house in an invented town (가온시 장독골) that steeps each scent's raw material
in alcohol for forty days and fills every bottle by hand. The site is its homepage
(gallery.zanviq.dev/perfume/). Tokens live at the top of `works/perfume/css/site.css`.

## What changed in this revision, and why

The owner called the first version's 3D bottle on a blurred amber background unnatural and
AI-looking (BRIEF §0). So:

- **Removed:** the WebGL liquid pool and three.js bottle (`js/hero.js`, `vendor/three.min.js` and its
  build), the WebGL notes cylinder (`js/vessel.js`), the canvas forty-day plate (`js/plate.js`), the
  per-scent page re-tinting and scent picker, the scent finder quiz, the drawn bottle brand mark, the
  SVG map, the rendered stills, and every script that produced them.
- **Added:** nine generated still-life photographs of one consistent bottle (IMAGES.md), a poster
  hero on a flat colour field, four quiet scent spreads, a process section told with photographs and
  type, and a typographic favicon.
- **Re-coloured:** honey/amber/gold are gone; see Colour.
- **Line-up:** 조청 (amber grain syrup) was replaced by 누룩 (rice and nuruk), so no scent photograph
  pulls the page back to honey. The four are now 유월 (green plum, June), 누룩 (rice, November),
  오미 (omija, September), 먹 (ink, January): each is steeped in its own season.
- **Interaction:** none beyond reading, three anchor links and the small visit booking form (which
  sends nothing and says so). No animation; nothing to switch off for reduced motion.

## Idea

A printed catalogue more than an app. One flat field of colour carries the huge headline (the
festival reference the owner likes); everything else is photographs on plaster-white with room
around them, and type that does the explaining.

## Colour

Three materials of the atelier, and one green from the first steeping of the year.

| Token | Hex | Role | Reason |
|---|---|---|---|
| `--plum` | `#a9c25a` | the one colour field (hero, visit), selection | 청매: the unripe June plum the year starts with; sampled from the plums in the photographs and lifted to their lit side |
| `--plaster` | `#eef1ef` | page ground | the cool lime-plaster wall and ledge in every photograph, so the photos sit on their own surface |
| `--plaster-2` | `#e2e6e4` | recessed panel | |
| `--ink` | `#15191b` | text, buttons, checked chips | 먹: the ink the perfumer writes the dates on the labels with |
| `--ink-2` | `#4e575b` | secondary text on plaster | |
| `--leaf` | `#2b3a0e` | secondary text and control borders on the plum field | plum-leaf green |

Contrast (`contrast.py`): ink on plaster 15.6:1, ink-2 on plaster 6.5:1, ink on plum 8.9:1, leaf on
plum 6.2:1, plaster on ink 15.6:1, muted footer text 7.9:1.

Not cream, not amber, not sage-with-cream: the white is cool (green-grey), the green is a saturated
fruit green, and the dark is a blue-black ink, not the warm `#1a1714` family.

## Typography

| Token | Family | Use |
|---|---|---|
| `--f-text` | **Hahmlet** (OFL) | headlines (200), statement and leads (300), body (400) |
| `--f-latin` | **Newsreader** (OFL) | the DAMGEUM wordmark (roman); scent numbers, Latin scent names, day numbers (italic 300) |
| `--f-ui` | **Damgeum Sans** = IBM Plex Sans KR 400/500 subset, renamed because "Plex" is a Reserved Font Name | nav, labels, prices, form |

Subsets are built by `subset_fonts.py` from the page text (Newsreader only gets the ~25 Latin glyphs it
sets). Sizes: hero 52→140px, scent names 56→120px, section heads 36→68px, statement 24→40px,
body 16–17px. `word-break: keep-all`; `text-wrap: balance` on headings. No caps eyebrows.

## Layout

12-column grid, max 1440px, gutter 20→72px, section rhythm 112→208px.

1. **Hero** (plum field): headline top-left in two lines, lede and two facts bottom-left, the bottle
   photograph in columns 8–12. Phone: headline, lede, photograph, facts.
2. **Season**: one sentence about when each scent is steeped (columns 2–10), then the four bottles in a
   row across the full width (a tighter crop on phones).
3. **Scents** ×4: photograph in six columns, text block aligned to its bottom edge in four, alternating
   sides. Number, huge name, Latin name, one line, a three-row notes table, strength, season, prices.
4. **Atelier**: heading + story, the steeping shelf full width, the five steps (day number in
   Newsreader italic) beside the hands photograph, then the smelling room full width.
5. **Visit** (plum field): address with the fictional-address note, directions, hours; booking form
   directly on the field (no card).
6. **Footer** (ink).

Rules (hairlines) appear only in the two small tables (scent notes, visit facts).

## Components

- Chips: 48px tall, 1px leaf border, 2px radius; checked = ink fill; taken slots dashed + struck
  through + "마감".
- Button: 52px, ink fill, plaster text. Quiet button: underlined text, 44px tall.
- Focus: 2px ink outline, 3px offset (plaster on the footer).

## Files

- `works/perfume/`: `index.html`, `css/site.css`, `js/main.js` (booking only), `fonts/` (5 woff2 +
  licences), `img/` (19 webp + 3 favicons).
- `design/works/perfume/`: `DESIGN.md`, `IMAGES.md`, `INTERACTION.md`, `contrast.py`,
  `subset_fonts.py`, `scripts/grade.py` (photo grading), `scripts/make_icons.py` (favicons from the
  Hahmlet 담 glyph), `scripts/cdp.mjs` (capture/check runner, `CDP_PORT` env), `pp-shots.mjs`
  (older puppeteer runner kept because BRIEF §6 points other works at it).
