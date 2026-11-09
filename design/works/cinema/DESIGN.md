# 점멸 — release page design (works/cinema)

Release page for 《점멸》, an invented black-and-white Korean independent feature, put out by the
invented distributor 낮은창필름. Direction chosen from the subject, not from reference sites (UXKIN was
not connected): a small distributor's page that behaves like two things the film is made of, the dark of
the screen and the paper of a photographic print.

## Direction

- **Two materials.** The page is the dark of a cinema (pure black). Objects on it are paper: the
  contact sheet (white photographic paper border, black exposed area) and one press-note block on white.
- **One loud element.** The contact sheet with its loupe is the only bold thing. Everything around it is
  quiet type on black: no cards, no icons, no section numbers.
- **Yellow is a voice, not a colour.** #FFE13B appears only where someone in the film speaks: the hero
  subtitle, the trailer screen subtitle and the subtitle transcript. Never on links, focus, buttons,
  marks or the favicon.

## Colour

| token | value | role |
|---|---|---|
| `--black` | #000000 | page ground, film rebate between strips, screen surround |
| `--white` | #FFFFFF | primary text on black, paper border of the sheet, wax pencil, focus ring on dark |
| `--g-200` | #CFCFCF | secondary text on black (13.5:1) |
| `--g-400` | #9A9A9A | meta text on black, edge-print figures (7.4:1) |
| `--g-600` | #6B6B6B | rules and control borders on black (UI parts, 3.9:1) |
| `--g-800` | #262626 | film base / rebate, hairline fills on black |
| `--paper-ink-2` | #4D4D4D | secondary text on the white press note (8.5:1) |
| `--sub` | #FFE13B | subtitle lines only (16.1:1 on black) |

Reason: the film is shot in black and white, and the only colour a Korean audience sees on such a film
is the yellow of the subtitles. Frames inside the sheet are drawn in grey values only.
Focus: 2px white outline + 2px black gap on dark; 2px black outline on the white press note.

## Typography

- **Diphylleia** 400 (OFL 1.1, JAMO / Minha Hyung, no Reserved Font Name). Title, headings, dates set
  as display, title cards inside the trailer, wax-pencil roll note. Brush-edged strokes read like a
  title card; never below 21px.
- **LINE Seed Sans KR** 400 / 700 (OFL 1.1, © LY Corporation, no Reserved Font Name; the font's
  trademark field names "LINE Seed KR", so the subset is renamed `Jeommyeol Sans` to keep the
  trademark off a modified font). Body, UI, subtitles (700), edge print and stop sign inside frames.
- Scale (px, classical): 12 · 14 · 17 (body) · 21 · 28 · 36 · 56 · 96 · clamp up to 200 (title).
- Body 17/1.8, measure ≤ 34em. Headings Diphylleia 36/1.25 desktop, 28 phone. No all-caps labels,
  no eyebrows; a heading is just the name of the thing (줄거리, 감독의 말, 상영관, 관객과의 대화).
- Subtitles: LINE Seed 700, clamp(16px, 2.2vw, 24px), black outline drawn with text-shadow, centred at
  the bottom of the picture like a real subtitle.

## Spacing and layout

- 8px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Sections 128px apart on desktop, 80 on phones.
- Content width 1200px; gutters 24px (16px under 400px).
- Hero: picture left-heavy (a lit window at night, drawn), the title set vertically at the right edge
  like a Korean release poster, release facts in one block under the picture. Left aligned throughout;
  the only centred block is the credits, set the way end credits are (role right, name left).
- Trailer: sheet and screen side by side (equal columns) from 900px, so both fit one desktop
  viewport; under 900px the six strips lie end to end in one horizontal strip that scrolls under a
  fixed loupe ring, with the screen above it.

## Shape and depth

- Paper and film are cut, so corners are square. Exceptions taken from the objects: 35mm frame
  corners round 2% of the frame height, perforations round slightly, the loupe is a circle.
- No shadows except the loupe's rim. No gradients outside the drawn frames.

## Components

- **Links**: white, 1px underline offset 4px; hover thickens the underline. On paper: black.
- **Buttons** (trailer controls): 44px squares or 44px-high text buttons, 1px `--g-600` border,
  white glyphs drawn as SVG triangles; hover border white; pressed state inverts (white ground, black
  glyph); disabled at 40% opacity.
- **Lists** (상영관, 관객과의 대화, 자막 전문): rows separated by space only, no rules; date or
  name in Diphylleia on the left, details right. No ticket shapes, no grid timetable. The current
  shot in the transcript gets a 3px white bar on its left edge.
- **Fake-address note**: 13px `--g-400` beside every address: "가상 서비스입니다. 실제 주소가 아닙니다."
- **Footer**: distributor line, festival line, "가상 영화입니다. zanviq gallery 작품."
- **Gallery badge**: `/shared/back.js` with `data-theme="light"`, bottom-right (keeps its yellow text
  off a page where yellow means subtitles). Its small orange logo square is shared site chrome and the
  only hue on the page that this work does not control.

## Imagery

- No photographs. Every frame of the film is drawn on canvas in greys: a building at night, a
  stairwell, a room, hands, rain on glass, a bus stop, silhouettes, a light switch, a bus at night.
- Film grain and halation exist only inside frames (and the hero picture, which is a frame). The page
  background stays flat black.
- Wax pencil: white, slightly broken stroke, used for the director's circled selects, one X on the
  fogged last frame, and the roll note.
- Favicon: a single lit window in a black square, white and grey only.
