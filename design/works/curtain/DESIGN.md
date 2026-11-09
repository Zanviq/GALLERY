# curtain — design system

One full-viewport stage. The page has no sections: a black house, a silver rail, two emerald
velvet panels, and behind them a dark stage where one bare bulb has been left on.
The fiction: the page is the house curtain of a one-performer show, 〈남겨 둔 불〉, whose only
performer is the ghost light (the bulb theatres leave burning on an empty stage overnight).

Direction was set from the subject, not from reference sites (UXKIN was not connected).

## Colour (dark only: it is a stage)

Every colour is a material in the room. Nothing is decorative.

| token | hex | role | why |
|---|---|---|---|
| `--house` | `#000000` | page, proscenium, legs, stage floor | a dark house is true black, not a tinted near-black |
| `--velvet` | `#0D5C47` | cloth base albedo (shader) | REGISTRY. Emerald velvet: the classic house-curtain cloth, here green instead of red |
| `--velvet-deep` | `#011E16` | cloth face-on and in fold cavities | velvet pile looks darkest where it points at you |
| `--velvet-sheen` | `#74D2AE` | grazing-angle sheen, crushed-pile marks | the pale green bloom velvet shows where it turns away |
| `--velvet-back` | `#3C6658` | the plain-woven back of the cloth (back faces, torn flaps) | velvet's reverse is flat and dull |
| `--silver-hi` | `#F1F4F5` | rail highlight, bulb core, stage title | polished nickel/silver catching light |
| `--silver` | `#C3CACD` | rail, rings, tassels, button lines, body text | the hardware |
| `--silver-lo` | `#5E676B` | shadow side of rail and tassels, disabled lines | |
| `--text` | `#DDE3E5` | hint/status text (thin hairline face needs the brightest silver) | 15.9:1 on black |
| `--text-dim` | `#8F999D` | footer line | 7.2:1 on black |
| `--lamp` | `#EEF3F1` | the ghost light and its pool on the floor | a bare bulb, read as cool white so the page stays out of amber |

Banned here on purpose: red (the cliché house curtain), brass and gold (the cliché rail), warm
lamp light. Contrast: every text colour is at least 7:1 on `--house`.

## Typography

- Family: **Grandiflora One** 400 (SIL OFL 1.1, Haesung Cho / JAMO), self-hosted, subset to the
  glyphs on the page. No second family: the face's hairline strokes read as silver wire, which is
  the same material as the rail and the stitches.
- Because the strokes are hairlines, nothing is set smaller than 14px and running text is 17px.

| step | size | line-height | use |
|---|---|---|---|
| title | clamp(44px, 8vw, 104px) | 1.0 | 〈남겨 둔 불〉 on the back wall |
| sub | clamp(18px, 2.2vw, 24px) | 1.35 | one line under the title |
| body | 17px | 1.6 | stage note, hint/status line |
| button | 17px | 1 | 열기 / 닫기 / 찢기 / 꿰매기 |
| small | 14px | 1.4 | footer line |

Letter-spacing 0 everywhere; no capitals labels, no italics.

## Space and layout

- 8px base: 8, 12, 16, 24, 32, 48.
- Layers, back to front: stage canvas (wall, floor, lamp) → title card (DOM) → cloth canvas
  (WebGL, transparent) → hardware canvas (rail, rings, tassels, legs, apron) → controls.
- Top band (fly space) 60px (54px on very short screens): holds the gallery badge only; the rail hangs just below it.
- Apron below the curtain hem: ~132px desktop / ~150px phone: hint line on the left, four buttons
  on the right (phone: hint above, buttons in one row of four, each ≥ 44px tall).
- Legs (side masking): 3% of width, min 10px.

## Shape and depth

- Buttons: rectangle, 2px radius, 1px `--silver` line. No shadows anywhere in CSS; depth comes
  only from the cloth shading and the light.

## Components

- **Cue button** (the only control): transparent fill, 1px silver line, silver label.
  Hover: line and label `--silver-hi`, faint silver fill (8%). Pressed: fill `--silver`, label black.
  Focus-visible: 2px `--silver-hi` outline, 3px offset. `aria-pressed` is not used; actions are verbs.
- **Hint line**: one sentence, changes with what just happened (`aria-live="polite"`).
- **Footer**: "가상 공연입니다. zanviq gallery 작품." in `--text-dim`.

## Imagery

- No photos, no icon set. Everything is drawn: the cloth by a fragment shader, the hardware and
  lamp by Canvas2D with gradients computed from one light direction (front-top for the curtain,
  the bulb for the stage).
- Favicon: a silver ring on the rail with a fold of emerald.
