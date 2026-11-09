# curtain: interaction

One interaction, kept because it is the payoff: open the house curtain and the reopening season is
standing on the stage behind it. Everything else on the page is read, not played.

## Story

| beat | what happens |
|---|---|
| first view | Closed emerald curtain (a photograph), front-lit from high right. On it: 백열극장이 다시 엽니다, 2027년 3월 12일 금요일, one line about the light kept on for 1,159 nights, a filled 막 열기 button and the hint "또는 막을 손으로 잡고 옆으로 끌어 보세요". A sliver of the lit stage floor shows under the hem. |
| tease (once, 2.6 s after load, not with reduced motion) | The lead edges part a hand's width and fall back together: a line of the stage shows through the seam, then the curtain is still again. Cancelled by any grab or button. |
| pull | The cloth follows the hand: the grip bulges sideways, the hem lags and swings, the rings slide along the rail. Up to 15% open the announcement stays; by 37% it has faded. |
| open | Both panels gathered at the sides, folds squeezed tight. The stage photograph with its ghost light, and the poster on its back wall: 〈남겨 둔 불〉, 3.12, the first night, four shows with dates. 막 닫기 and 네 편 자세히 보기 appear. |
| close | The curtain travels back (2.4 s, ease in-out) and the announcement returns. |

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

## Controls and keyboard

- Tab order: 백열극장 (wordmark) → 프로그램 → 예매 → 오시는 길 → 막 열기 → … → gallery badge.
  Activating 막 열기 moves focus to 막 닫기 when the curtain has opened, and back the other way.
- The canvas is not a tab stop; the buttons are the keyboard path. An `aria-live` line announces
  "막이 열렸습니다. 빈 무대에 불 하나가 켜져 있고, 재개관 시즌 네 편이 적혀 있습니다." / "막이 닫혔습니다."
- The poster on the stage is `aria-hidden`: it repeats what the programme section says in full.
- Touch: the canvas has `touch-action: pan-y`, so vertical swipes scroll the page and sideways drags
  pull the cloth. Mouse: the cursor shows grab only over cloth.

## Reduced motion

- No tease. The page starts still.
- Dragging still works (it is the user's own motion) but damping goes from 0.985 to 0.8, so the
  cloth follows without swinging.
- 막 열기 / 막 닫기 compute the end state off-screen and show it in one frame.

## Performance and lifecycle

- Fixed 60 Hz steps, at most three per frame, eight solver passes (seven on phones).
- The loop sleeps once the cloth has been still for half a second, when the stage scrolls out of
  view (IntersectionObserver), and when the tab is hidden.
- No storage. Without JavaScript the stage photo and the announcement show without a curtain, with a
  one-line note.
