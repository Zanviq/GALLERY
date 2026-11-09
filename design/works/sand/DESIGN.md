# 색모래 병 (sand) · design system

Mobile-only interaction piece (REGISTRY row 22). One phone-width column: a glass bottle you fill
with dyed craft sand, tilt to slope the layers, shake to mix the top, cork, and save as a PNG.

Direction was set from the subject itself (dyed craft sand, sand-art bottles, a black glass display
shelf), not from UXKIN examples; the UXKIN connector is not set up in this environment.

## Principle: only the sand has colour

Everything that is not sand is printed in one white ink on black, like a white screen print on black
card: the bottle, the cork, the cup, the icons, the type, the buttons. All five colours are spent
inside the glass, so the layers are the only colourful thing on the screen and the visitor's own
bottle is the whole picture. No gradients, glows, blurs or shadows anywhere: sand is matte, and the
grain does the texturing.

## Colour

| token | hex | role |
|---|---|---|
| `--shelf` | `#000000` | the ground: a black glass display shelf. True black, not a tinted near-black |
| `--ink` | `#FFFFFF` | all line art, type, button outlines, the filled primary button |
| `--ink-dim` | `#8A9096` | disabled controls only (6.5:1 on black, still readable) |
| `--sand-pink` 진분홍 | `#E4007F` | sand jar 1 |
| `--sand-yellow` 노랑 | `#FFE419` | sand jar 2; also the keyboard focus ring (16:1 on black) |
| `--sand-cobalt` 파랑 | `#1F4FE0` | sand jar 3 |
| `--sand-lime` 연두 | `#6CCB2A` | sand jar 4 |
| `--sand-white` 하양 | `#F2F4F5` | sand jar 5 |

**Why these five.** Craft sand is quartz sand coated in dye, and shops stock it in a handful of
flat, fully saturated shades because a sand bottle is read from a metre away through 1–2 mm of glass:
a layer only shows if it differs sharply from the one under it. Muted or in-between shades
disappear into their neighbours once the grains are mixed. So the set is two dark sands (진분홍
L 0.18, 파랑 L 0.11) and three light ones (노랑 0.77, 연두 0.52, 하양 0.90):

- every dark/light pair is 2.2:1 to 5.9:1 in luminance (파랑/노랑 5.0, 파랑/하양 5.9, 진분홍/노랑 3.6);
- the two darks are 102° apart in hue (red-violet against blue), so they never read as one layer;
- the lights are separated by hue and chroma: lime was pushed from a yellow-green (hue 85°) to
  hue 95° so it is 42° from the lemon yellow (the weakest pair; 1.6:1 plus the hue gap), and white
  is neutral against two saturated colours.

The jar rack is ordered dark, light, dark, light, light (1 진분홍, 2 노랑, 3 파랑, 4 연두, 5 하양) so
that picking the next jar along gives a contrasting layer by default.

**Why black.** White sand is one of the five. On a light ground a white layer looks like empty glass
and a falling yellow stream vanishes; on black every sand, including white and yellow, keeps its full
contrast against the empty glass, so the stream is visible all the way down. Black is also the
display shelf in the registry ("검은 유리"). The risk of black is the neon-on-dark look, so: no glow,
no bloom, no gradient, no blurred light; the glass reflection on the shelf is drawn as flat
horizontal print stripes, not a fade.

**Grain colour.** Each grain gets a fixed shade when it leaves the cup and keeps it for life:
lightness jitter of about ±7%, 4% of grains a darker speck (-22%), 3% a lighter speck (+18%, the
undyed quartz showing through the dye). Grains never blend; mixing shuffles grains, so a shaken band
reads as speckled, never as a smooth gradient.

## Typography

One family: **Black And White Picture** 400 (Google Fonts, SIL OFL 1.1, no Reserved Font Name),
subset to the characters the page uses. Its letters are cut by thin horizontal black gaps, which on
this page read like the strata in a sand bottle; that is why it is set big. It is decorative and the
cuts close up at small sizes, so nothing on the page is smaller than 17px.

| step | size / line-height | use |
|---|---|---|
| title | clamp(44px, 13vw, 58px) / 1.0 | 색모래 병 |
| aside | 28px / 1.2 | wide-screen note |
| lead | 20px / 1.35 | the one line on what to do, status line |
| button | 20px / 1.0 | 붓기 and the other actions |
| body | 18px / 1.45 | permission explanation, save note |
| small | 17px / 1.35 | jar names, footer |

The font has no `·`, `°`, `←`, `→`, `…` or curly quotes in Hangul text; copy avoids them (checked by
`scripts/fontcheck.py`).

## Spacing, shape, depth

- Spacing scale 4 / 8 / 12 / 16 / 24 / 32 px. Column side padding 16px; column max width 430px.
- Radius: 6px on stickers (jar labels, the QR tag), 12px on buttons. The bottle has its own curves.
- Depth: none. No shadows. Pressed state is shown by inverting ink and ground.
- Lines: 2px white for outlines and icons, the same weight as the bottle's glass line at phone size.

## Components

- **Bottle stage** (canvas): the bottle, the cup above it and the falling stream. Fills the free
  height of the column. Drag sideways to tilt (when sensors are off), quick back-and-forth to shake.
- **Jar rack**: five buttons, each a small glass jar of grainy sand drawn on a canvas with the name on
  a sticker below. Selected: label becomes a white sticker with black text and the jar sits 6px
  higher; `aria-pressed`.
- **Pour button** 붓기: filled white, black text, hold to pour (pointer or Space). Pressed: inverts to
  black with a white 2px outline.
- **Tilt buttons**: square 56px, white outline, a leaning-bottle icon. Hidden while sensors drive tilt.
- **Text buttons** 흔들기 / 바로 쌓기 / 비우기 / 코르크 막기 / 그림으로 저장 / 새 병: 48px tall, 2px white
  outline, white text; hover darkens the ground to `#1F1F1F` (flat), pressed inverts.
  Disabled: dashed `--ink-dim` outline and text.
- **Focus**: 3px solid `--sand-yellow` ring, 3px offset, on everything focusable.
- **Sensor card**: over the lower part of the stage, black with a 2px white outline, explanation +
  센서 켜기 (filled) + 버튼으로 할게요 (outline).
- **Status line**: one line under the title, `aria-live="polite"`, replaces the hint after the first
  action.
- **Wide-screen aside** (≥ 860px): beside the column, "휴대폰에서 보는 페이지예요", the QR on a white
  tag (black modules, 4-module quiet zone) and the short address.
- **Footer**: "가상 모래 공예예요. zanviq gallery 작품." at 17px.

## Imagery and icons

No photos and no icon set. The only pictures are the canvas sand and white line drawings made for
this page: the bottle, the cork, the cup, five jars, two leaning-bottle tilt icons and the favicon
(a small bottle with three sand layers).
