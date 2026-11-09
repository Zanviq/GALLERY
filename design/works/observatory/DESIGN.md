# 부엉재천문대 (observatory) — design system

솔메시립 부엉재천문대, the public observatory of an invented city. The whole page is in
"red-light mode": it is drawn the way an observing chart looks under a red torch, flat red ink
on black, so a visitor can open it on the observing deck without losing dark adaptation.
The planisphere is the one loud thing; everything around it is a quiet printed leaflet.

Direction note: UXKIN was not connected, so this is not based on compared reference sites. It is
based on the subject: paper planispheres, observing log sheets, red-filtered torches and
headlamps, dome slit warning paint, and topographic maps of the hill roads observatories sit on.

## Colour (four values, nothing else)

| token | hex | role | reason |
|---|---|---|---|
| `--night` | `#000000` | page ground, the sky window, text on lamp fills | the dark the eye is adapting to |
| `--lamp` | `#FF4436` | all text, star dots, horizon line, focus ring, active strokes, primary fill | the red LED of an observing torch |
| `--filter` | `#A3141B` | constellation lines, the ecliptic, rules, contour lines, idle control borders that are not the only cue | red gel seen at an angle |
| `--ember` | `#3D0709` | the planisphere holder plate, panel fills, Milky Way ground, hover fills | the red plastic body of a planisphere under red light |

- Contrast on black: lamp 6.1:1 (all text, any size). Lamp on ember 5.0:1 (text on plates and
  panels is fine). Black on lamp 6.1:1 (inverted labels, primary button). Filter on black is
  2.7:1, so filter is never text and never the only edge of a control; ember is fill only.
- No white, no grey, no other hue anywhere: favicon, OG image, focus ring, `::selection`
  (lamp ground, black text), scrollbar (`scrollbar-color: filter night`), form controls
  (`accent-color`, `caret-color`: lamp), canvas drawing. The shared gallery badge is passed
  through an SVG colour matrix that maps its luminance onto lamp red, so it obeys the rule too.
- No glow, bloom, blur, gradient, shadow or opacity ramp. Stars are flat dots with a black
  knock-out ring, as on a printed chart. Brightness differences are carried by size only.
- One theme. A red-light page has no light mode; `color-scheme: dark` so native bits stay dark.

## Typography

Nanum Myeongjo (voice) and Nanum Gothic Coding (data), both SIL OFL 1.1, self-hosted, subset
to the characters the page uses. Their Latin and digits are fine; no Latin face is added.

| face | weight | use |
|---|---|---|
| Nanum Myeongjo | 400 | body, list notes, form help |
| Nanum Myeongjo | 700 | h3, object names, button labels |
| Nanum Myeongjo | 800 | h1, h2, the wordmark |
| Nanum Gothic Coding | 400 | times, dates, coordinates, altitude/azimuth, magnitudes, apertures, prices |
| Nanum Gothic Coding | 700 | the evening clock stamps in the margin, the readout on the planisphere controls |

Scale (px, desktop / phone), from the classic 12-14-16-18-21-24-36-48-60 ladder:

| step | size | line height | use |
|---|---|---|---|
| display | 60 / 36 | 1.15 | h1 |
| h2 | 36 / 27 | 1.25 | section headings |
| clock | 36 / 24 | 1 | margin time stamps (coding 700) |
| h3 | 21 / 19 | 1.4 | sub-headings, telescope names |
| body | 18 / 17 | 1.8 | paragraphs (serif Korean needs the air) |
| small | 15 / 14 | 1.6 | notes, captions, the address note |
| data | 14 / 13 | 1.5 | coding readouts, table figures |

Measure 34em for body. Everything left-aligned. Headings are sentences, not labels: no all-caps,
no eyebrow labels, no single highlighted word.

## Spacing and grid

8-based: 4 8 12 16 24 32 48 64 96 128. Section gap 128 desktop / 80 phone.
Content max width 1240px, side gutter 16px phone, 32px tablet, 48px desktop.
Below the hero the page runs on a two-column "evening clock" grid: a 9rem margin holding the
time of the evening each section belongs to (17:00, 17:50, 18:10 ...), then the content.
This is a real sequence (one Saturday evening at the observatory), so the time stamps are
information. On phones the stamp sits above the heading.

## Shape and depth

- The planisphere is the only circle. Controls are capsules (radius 999px) like the rocker on
  a red torch; panels and the form are square-cornered plates (radius 0) filled with ember.
- Borders 1px. Lamp for anything interactive; filter only for decorative rules.
- No shadows. Depth is fill order: night < ember < lamp.

## Components

- **Button, primary**: lamp fill, night text, 44px min height, capsule. Hover adds a 2px
  night inset ring. Focus: 2px lamp outline, 3px offset.
- **Button, secondary**: night fill, 1px lamp border, lamp text. Hover: ember fill.
- **Pressed / selected** (`aria-pressed=true`) in a group (session times, list items, chips):
  lamp fill, night text.
- **Switch** (zoom, play, names): stays an outline capsule; a 10px lamp dot before the label is
  filled when on and hollow when off, like the switch lamp on a red torch.
- **Disabled**: dashed lamp border, text stays lamp (contrast kept), `cursor: not-allowed`.
- **Link**: lamp, underline 1px offset 3px; hover underline 2px.
- **Input / select**: night fill, 1px lamp border, lamp text, coding face for numbers.
  Focus: 2px lamp outline. Errors: an ember plate under the field with lamp text and a "!" mark.
- **Plate**: ember fill, 24px padding, used for the cancellation rule, the address, form errors,
  the form result and the "today" band under the header.
- **Session strip**: the 50-minute session drawn to scale (10/15/15/10 fr), ember blocks with a
  3px lamp edge; on phones the blocks stack and their height carries the duration.
- **Navigation**: wordmark left; four text links right; on phones the links wrap into one
  scrollable-free row of two lines, no hamburger (only four links).
- **Footer**: the fiction line, data credit, font credit.

## Imagery

No photos. Every picture is a drawing in the same red ink: the planisphere (canvas), a cloud
cover scale (svg), the dark-adaptation curve (svg), telescope light-path diagrams (svg) and a
contour map of the hill road (svg). Strokes 1.5px lamp for the subject, 1px filter for context.
No icon set; the few marks needed (arrows on steppers, a bus stop, a dome) are drawn inline.

## Font licence note (added in review)

NAVER reserves the "Nanum" names in the OFL, so the subsets are renamed after `scripts/fonts.py` runs:
`<scratchpad>/fontenv/Scripts/python.exe -I <scratchpad>/tools/rename_font.py fonts/nanum-myeongjo-400.woff2 "Bueongjae Serif"` (likewise 700/800, and "Bueongjae Mono" for the coding face). CSS and `js/planisphere.js` refer to the new names.
