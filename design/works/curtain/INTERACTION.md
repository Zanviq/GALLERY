# curtain: interaction

One interaction, kept because it is the payoff: open the house curtain and the reopening season is
standing on the stage behind it. Everything else on the page is read, not played.

## Fourth review (2026-11-10, later): alive again, under reduced motion too

The owner: "6번도 그냥 애니메이션이 완전히 사라져서 별로야." Their Windows has animation effects off,
so the browser reports `prefers-reduced-motion: reduce`, and the page dropped the tease and jumped
open and closed: it looked dead. BRIEF §000: calmer, not still. Now:

- **The velvet breathes.** House air in the cloth simulation: the panels drift a few px together,
  the hem most, a slow swell runs across each panel so the photographed folds gather and ease, and
  now and then the lead edges ease apart near the floor so a thin line of the lit stage shows
  through the seam. Measured at rest over 60 s (`scripts/air.mjs`), 1440x828:
  hem drift up to 10 px, seam parted 19% of the time, at most 17 px; reduced: 6 px, 8%, 7 px.
- **A line of light under the hem**, brightest under the lamp, flickering with the bulb.
- **The cloth answers a passing hand.** Mouse or pen moving over the curtain eases the cloth near
  it toward a share of the pointer's speed (hem and lead edge most, heading hardly at all; capped,
  so a long sweep stirs the seam but never throws the curtain open). A tap or click without a pull
  dents the velvet: the cloth round it is drawn in and swings back.
- **The ghost light is tungsten.** It breathes and, once in its 9.7 s cycle, the filament dips
  twice (about 0.1 s each; well under three flashes a second). The room in the photograph dims with
  it (photo opacity 1 to 0.9), the glow over the bulb more (1 to 0.56). The close-up of the bulb in
  "1,159일 동안 켜 둔 불" does the same on its own 8.3 s clock.
- **The light reaches out when the stage is revealed.** Past 30% open the dark laid over the stage
  lifts from the bulb outward: the pool round the lamp first (1.6 s), the walls and floor after
  (3.8 s, from 0.6 s). The poster type sits above it and is readable at once.
- **The tease, the opening and the closing run under reduced motion too.**

| | motion on | reduced motion |
|---|---|---|
| cloth damping per step | 0.985 (swings) | 0.94 (follows without swinging) |
| house air | strength 1, clock 1 | strength 0.8, clock 0.8 |
| 막 열기 / 막 닫기 rope | 2.4 s | 3.2 s |
| tease (2.6 s / 3 s after load) | to 7% open, 1.3 s out, 1.8 s back | to 4.5%, 1.9 s out, 2.6 s back |
| hand passing over | full | half |
| lamp flicker cycle | 9.7 s (close-up 8.3 s) | 13.1 s (11.3 s) |
| stage light spreading | 1.6 s / 3.8 s | 2.2 s / 4.6 s |
| smooth scrolling to anchors | on | off |

## Story

| beat | what happens |
|---|---|
| first view | Closed emerald curtain (a photograph), front-lit from high right. On it: 백열극장이 다시 엽니다, 2027년 3월 12일 금요일, one line about the light kept on for 1,159 nights, a filled 막 열기 button and the hint "또는 막을 손으로 잡고 옆으로 끌어 보세요". A sliver of the lit stage floor shows under the hem. |
| at rest | The cloth drifts in the house air; now and then the seam eases open near the floor. A line of light under the hem flickers with the bulb. A passing mouse stirs the hem and seam; a tap dents the velvet. |
| tease (once, 2.6 s after load; 3 s and smaller with reduced motion) | The lead edges part a hand's width and fall back together: a line of the stage shows through the seam. Cancelled by any grab or button. |
| pull | The cloth follows the hand: the grip bulges sideways, the hem lags and swings, the rings slide along the rail. Up to 15% open the announcement stays; by 37% it has faded. |
| open | Both panels gathered at the sides, folds squeezed tight. The stage photograph with its ghost light, and the poster on its back wall: 〈남겨 둔 불〉, 3.12, the first night, four shows with dates. Past 30% open the light spreads out from the bulb over about 4 s. 막 닫기 and 네 편 자세히 보기 appear. |
| close | The curtain travels back (2.4 s, 3.2 s with reduced motion; ease in-out) and the announcement returns. |

## Mechanics (`js/cloth.js`, `js/render.js`)

- Each panel is a 2D Verlet grid (31x26 on desktop, 19x22 on phones), x/y in CSS pixels, hung
  from rings on a rail just above the visible area. Down the warp the cloth is inextensible (a
  follow-the-leader pass after the solver, applied as a correction without adding velocity); across
  the weft it may never be longer than cut and folds freely down to its bulk (16% of a cell at the
  heading, 23% at the hem, so a gathered panel flares a little toward the floor). A row never rises
  above the row it hangs from.
- Rings slide on the rail, keep a minimum gap, and stay where they were left when no hand or rope
  works the panel. The outer ring is fixed.
- A grab holds the nearest point firmly and its neighbours loosely (0.6 / 0.25), within reach of its
  ring (the cloth cannot be pulled longer than it is). The hand moves at most 14px per step. A
  sideways pull also carries the rings between the hand and the lead edge (opening) or behind it
  (closing), because velvet hardly stretches.
- Drawing: each vertex carries the texture coordinate of its rest position (the photo covers each
  panel like `object-fit: cover`, both panels meeting at the photo's own seam; tall phone panels are
  pleated up to 1.8x tighter so they show more than two folds). The fragment shader keeps the photo
  as it is at rest; where the weft is squeezed it darkens the local mean and amplifies the fold
  detail (mip-biased lookup), multiplies a screen-space front-of-house light, and darkens the
  turned lead edge. A soft shadow strip runs along each lead edge on the stage.
- Fallback without WebGL (`?nogl` forces it): Canvas2D draws every cell as the matching slice of the
  photograph with an affine transform, then the same light as a radial gradient (source-atop).
- House air (`Cloth.airAt`): one sideways acceleration per column, weighted down the panel by
  row^1.6: a common sway (periods 6.8 s and 11.9 s, the right panel 0.7 rad behind), a swell
  travelling across each panel (5.2 s), gusts that come and go, and a seam term that pulls the
  last columns outward (s^6) only while the lead edges meet. Per-column and per-row terms are
  precomputed, so a step costs no per-point trigonometry.
- Light over the stage photo is CSS (`site.css`): `.set` is a size container, and the bulb's place
  in the cover-fitted photo is computed with container units from the photo's aspect, its
  object-position and the bulb's measured position (wide photo 0.658/0.342, tall 0.549/0.671), so
  the glow (`.lamp`, screen blend), the dark that lifts (`.falloff`) and the line under the hem
  (`.spill`) follow every crop with no script.
- The stored speeds near the hem never reach zero (`hang()` takes back a little sag every step
  and leaves it as speed), so "is the cloth moving" is measured as real displacement per step.

## Controls and keyboard

- Tab order: 백열극장 (wordmark) → 프로그램 → 예매 → 오시는 길 → 막 열기 → … → gallery badge.
  Activating 막 열기 moves focus to 막 닫기 when the curtain has opened, and back the other way.
- The canvas is not a tab stop; the buttons are the keyboard path. An `aria-live` line announces
  "막이 열렸습니다. 빈 무대에 불 하나가 켜져 있고, 재개관 시즌 네 편이 적혀 있습니다." / "막이 닫혔습니다."
- The poster on the stage is `aria-hidden`: it repeats what the programme section says in full.
- Touch: the canvas has `touch-action: pan-y`, so vertical swipes scroll the page and sideways drags
  pull the cloth. Mouse: the cursor shows grab only over cloth.

## Reduced motion

Calmer, not still (table above). Everything moves, more slowly and with more damping; only smooth
scrolling to anchors is dropped. The flicker never exceeds two dips in half a second, once per
cycle.

## Performance and lifecycle

- Fixed 60 Hz steps. While a hand, the rope or a swing moves the cloth: every frame, up to four
  steps, eight solver passes (seven on phones). With only the air moving it: a frame every 31 ms
  (48 ms for the Canvas2D fallback) and five passes. About 0.6 ms a step for the desktop grid at rest, in
  node on this machine.
- The loop stops when the stage scrolls out of view (IntersectionObserver) and when the tab is
  hidden; the CSS lamps pause with it (`.is-away`), and the close-up pauses on its own observer.
  `?still` turns the air off (debugging); then the loop sleeps once the cloth is still.
- No storage. Without JavaScript the stage photo and the announcement show without a curtain, with a
  one-line note; the lamp still glows and flickers there (pure CSS).
