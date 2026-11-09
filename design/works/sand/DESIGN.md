# 색모래 병 (sand) · design system

Mobile-only interaction piece (REGISTRY row 22). One phone-width column: a real glass bottle you
fill with dyed craft sand from a jar you hold, tilt to slope the layers, shake to mix the top, cork,
and the finished bottle is set on a sunlit windowsill, ready to save as a photo.

## Revision 2026-11-10: what changed and why

The owner's third review: "12도 효과가 별로 없다" (the effect was weak, it did not impress), and
REVISION.md: the bottle, cork and jars were line drawings made in code. So:

- **The glass is a photograph.** A clear apothecary bottle shot on black with strip lights
  (generated, see IMAGES.md) is cut into two layers: the empty bottle under the sand
  (`bottle-back.webp`) and, from the same bottle filled with black sand, only the glass in front of
  the sand (`bottle-front.webp`) over it. The sand is drawn between them, so the reflections and the
  curve of the glass lie on the visitor's colours. The grid's walls are traced from the photo
  (`scripts/bottle_geo.py`), so grains stop exactly at the glass.
- **The sand looks like sand.** 300 × 602 cells (about 97,000 grains when full, 4× the old grid,
  each 0.7–1 CSS px), per-grain colour drift (lightness ±12% and a slight hue shift per grain),
  darker specks, bare-quartz specks that glint as the bottle turns, and darker sand where the glass
  curves away at the sides.
- **It moves like sand.** A visible stream falls from the tipped jar, piles form cones at about
  33 degrees and slip in small avalanches, layers lean with the tilt (see INTERACTION.md).
- **Real jars and a real cork.** One jar of white sand photographed on black, recoloured to the
  five sands (identical jars, exact palette); the cork comes from the same bottle photographed corked.
- **A finish that rewards.** Corking turns the bottle into an object on a sunlit windowsill: a
  photograph of this bottle filled with one colour-key sand, whose sand is replaced pixel by pixel by
  the visitor's own grains under the photo's sunlight and shade (`scripts/build_scene.py`,
  `js/finish.js`). The shadow, the cork and the glass are the photograph's own.
- **The first screen already shows it.** The bottle opens a quarter full of rocked wave layers
  (poured once at build time, `js/start.js`), and a short pour plays while the bottle rocks, until
  the visitor touches anything. Reduced motion: a still bottle about two thirds full.
- **Sound.** The pour has a sound made in the page (grain clicks, filtered), after the first touch;
  a 소리 toggle beside the tools.
- Removed: the drawn bottle, cork, cup and jar canvases (`render.js`), the drawn shelf and striped
  reflection, the in-page PNG poster (`export.js`), the drawn SVG favicon, the old `og.html`.

## Principle: only the sand has colour

The page itself stays one white ink on true black, like a white screen print on black card: type,
buttons, outlines. The photographs are neutral glass on black (the cork's natural brown is the one
material colour). All five dyed colours are spent on sand, so the layers are the only loud thing on
the screen and the visitor's own bottle is the whole picture. No gradients, glows or blurs in the UI.

## Colour

| token | hex | role |
|---|---|---|
| `--shelf` | `#000000` | the ground; the bottle and jar photos were shot on black and cut to alpha, so they sit on it exactly |
| `--ink` | `#FFFFFF` | type, button outlines, the filled primary button |
| `--ink-dim` | `#8A9096` | disabled controls only (6.5:1 on black) |
| `--sand-pink` 진분홍 | `#E4007F` | sand 1 |
| `--sand-yellow` 노랑 | `#FFE419` | sand 2; also the keyboard focus ring (16:1 on black) |
| `--sand-cobalt` 파랑 | `#1F4FE0` | sand 3 |
| `--sand-lime` 연두 | `#6CCB2A` | sand 4 |
| `--sand-white` 하양 | `#F2F4F5` | sand 5 |

**Why these five.** Craft sand is quartz coated in dye, sold in a handful of flat, fully saturated
shades, because a bottle is read from a metre away through glass: a layer only shows if it differs
sharply from the one under it. So two darks (진분홍, 파랑) and three lights (노랑, 연두, 하양), ordered
dark, light, dark, light, light on the rack so the next jar along contrasts by default.
**Why black.** White sand is one of the five; on black every sand keeps its full contrast against
the empty glass, and dark-field glass photography (glass drawn by its own light) only works on black.

**Grain colour.** Each grain gets one of 32 shades when it leaves the jar and keeps it: 28 ordinary
(lightness ±12%, ±11 per channel drift), 2 darker specks, 2 bare-quartz specks. Grains never blend;
mixing shuffles grains, so a shaken band is speckled, never a gradient. Sand within the outer 20% of
each row is darkened up to 45% in 8 steps (the glass curving away).

## Typography

One family: **Black And White Picture** 400 (Google Fonts, SIL OFL 1.1, no Reserved Font Name),
subset to the characters the page uses (`scripts/fonts.py`, checked by `scripts/fontcheck.py`). Its
letters are cut by thin horizontal gaps, which read like strata. Nothing is smaller than 17px.

| step | size / line-height | use |
|---|---|---|
| title | clamp(44px, 12.5vw, 56px) / 1.0 | 색모래 병 |
| aside | 28px / 1.2 | wide-screen note |
| lead | 18px / 1.35 | one line: what to do |
| status | 17px / 1.35, two lines reserved | what just happened (aria-live) |
| button | 19–22px / 1.0 | 붓기 and the other actions; tools 17px |
| small | 17px / 1.35 | jar names, footer |

## Grid and spacing

Phone column max 430px, 16px side padding; the stage runs edge to edge. Header, stage, deck fill
the screen; the footer sits just below it. The bottle is sized from the stage: its height fits
under room for the tipped jar (about the jar's width above the lip), its width leaves 12px a side.
Spacing scale 4 / 8 / 12 / 16 / 24 / 32. Radius 6px (stickers, QR tag), 12px (buttons).

## Components

- **Bottle stage**: back glass photo, sand canvas (grid resolution, scaled with pixelated
  rendering), front glass photo, cork photo. Turned on screen when tilted by drag or buttons;
  fixed on screen when the phone's sensors tilt the world instead.
- **Held jar**: the selected jar photo, resting upright beside the neck; while pouring it lifts and
  tips 84 degrees about its rim corner, which stays straight above the mouth (in the world frame).
- **Jar rack**: five jar photos with the name on a sticker; selected: lifted 6px, white sticker,
  `aria-pressed`.
- **Pour button** 붓기: filled white, hold to pour; pressed inverts. **Tilt buttons** 56px with a
  leaning-bottle line icon (UI, not a picture). **Tools** 흔들기 / 바로 쌓기 / 비우기 / 소리 켬
  (toggle; dashed outline when off).
- **Sensor card** (touch devices, once: after the opening pour or the first pour): compact, over the
  top of the stage.
- **Finish**: the windowsill photograph with the visitor's sand, covering the stage, fading in
  after the cork drops; 사진으로 저장 and 새 병 replace the controls.
- **Wide screens** (≥ 700px, fine pointer): the column centred, beside it 휴대폰에서 보는 페이지예요,
  the QR (inline SVG) and the keys.
- **Card captures**: `?card=thumb` and `?card=og` show the same page with only the stage (and the
  title for the share image); used for `thumbnails/sand.webp` and `og/sand.png`.

## Imagery

All pictures are generated photographs (IMAGES.md), cut to alpha on black: the bottle (two layers),
the cork, five jars, the windowsill. Icons: favicon and touch icon are the pink jar photo on black.
Code draws only the sand, the stream and the UI line icons.
