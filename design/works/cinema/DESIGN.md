# 점멸 — release page design (works/cinema)

Release page for 《점멸》, an invented black-and-white Korean independent feature, put out by the
invented distributor 낮은창필름. A small distributor's page that behaves like the things the film is made
of: the dark of the screen, the paper of a photographic print, and a poster on a cinema wall.

## Revision, 2026-11-09 (owner review)

The owner pointed at the drawn light-switch frame as the example of what looks AI-made. Every picture on
the page was a canvas drawing; all of them are gone.

- **Removed**: the 1,300-line canvas scene renderer (`js/frames.js` drawings of the building, stairs,
  room, hands, switch, bus...), the drawn hero picture and its canvas blink, the drawn press-note still,
  the review sheet `frames.html`, and the footer line that said the scenes were drawn.
- **Added**: 13 generated black-and-white film stills (Gemini, see `IMAGES.md`), graded as one set by
  `scripts/stills.py`. Key references came first (the flat's exterior, 은재's portrait, 상훈 at the bus
  door) and every later shot was generated from them with `--ref`, so the two actors, the switch and the
  building stay the same people and places. The "light off" frames (stairs, switch, window) are
  retouched from the lit ones rather than regenerated, so the cut between them changes only the light.
- **Added**: a proper main poster as the hero. Generated key art (the dark building, one lit window,
  은재 under the stop's lamp) with HTML type set on it: cast line, tagline, vertical title, festival
  line, release date and billing block. It is laid out in container units so it scales as one sheet.
  On first view the window goes dark and blinks on twice (one-off; never under reduced motion).
- **Added**: a full-width still (the two at the bus stop, with its yellow subtitle) between the trailer
  and the press note, and a portrait still in the press note.
- **More room**: sections 168px apart (104 on phones), headings 48px, list rows looser, the
  transcript folded into a disclosure, the trailer stage on a wider 1360px measure with the screen
  given 7/12 and the sheet 5/12.

## Direction

- **Three materials.** The page is the dark of a cinema (pure black). The poster is a printed sheet on
  it. The contact sheet is photographic paper (white border, black exposed area); the press note is
  paper too.
- **One loud element per screen.** The poster in the first view, the contact sheet with its loupe in
  the second, one full-width still in the third. Everything around them is quiet type on black.
- **Yellow is a voice, not a colour.** #FFE13B appears only where someone in the film speaks: the
  trailer screen subtitle, the subtitle under the full-width still and the transcript lines. Never on
  links, focus, buttons, the poster or the favicon.

## Colour

| token | value | role |
|---|---|---|
| `--black` | #000000 | page ground, film rebate, screen surround, poster ground |
| `--white` | #FFFFFF | primary text on black, paper border of the sheet, wax pencil, poster type |
| `--g-200` | #CFCFCF | secondary text on black (13.5:1) |
| `--g-400` | #9A9A9A | meta text on black, edge-print figures (7.4:1) |
| `--g-600` | #6B6B6B | control borders on black (UI parts, 3.9:1) |
| `--g-800` | #262626 | film base, hairline above the transcript |
| `--paper-ink-2` | #4D4D4D | secondary text on the white press note (8.5:1) |
| `--sub` | #FFE13B | subtitle lines only (16.1:1 on black) |

Reason: the film is shot in black and white, and the only colour a Korean audience sees on such a film
is the yellow of the subtitles. All photographs are greyscale. Poster type sits on the dark parts of the
key art with a bottom scrim and a soft dark halo; measured against the brightest 2% of pixels under each
line it stays above 9.7:1.

## Typography (unchanged families)

- **Diphylleia** 400 (OFL 1.1, no Reserved Font Name): title, headings, the poster tagline and date,
  the hero logline (26–36px), dates, theatre names, wax-pencil roll note, title cards.
- **LINE Seed Sans KR** 400 / 700 (OFL 1.1, © LY Corporation; subset renamed `Jeommyeol Sans`): body,
  UI, subtitles (700), poster cast line and billing block, edge print.
- `scripts/fonts.py` subsets both from every character in the HTML and JS and fails on a missing glyph.

## Layout

- Hero: poster left (`min(600px, 42vw, (100svh − 150px) × 0.67)`), right column split top and bottom:
  the logline set large in Diphylleia at the top, facts and the two links at the bottom. Under 1024px the
  poster stacks above the column at up to 560px wide.
- Trailer: sheet 5fr, screen 7fr from 900px; under 900px the six strips lie end to end under a fixed
  ring, with the screen above.
- Still: full width up to 1680px, subtitle 7% from the bottom, caption under it.
- Press note on white, story / still / director's note on a 12-column grid.

## Imagery

- Photographs only, all generated and graded to one greyscale set (levels per still, one shared fine
  grain). No drawn pictures anywhere. Code still draws what is naturally code: the contact sheet's
  rebate, perforations and edge print, the wax-pencil circles, the two title cards (type), the loupe
  ring and the UI.
- Each shot of the trailer is one still; its three frames are slightly tighter crops, so the camera
  seems to creep in, and the light-change shots alternate lit and retouched-dark versions.
- Sizes: stills at 400 / 800 / 1600px (sheet, loupe and screen pick the smallest that covers them;
  the screen shows the small one until the sharp one arrives), poster at 700 / 1200px.
- Favicon: unchanged (a single lit window in a black square).
