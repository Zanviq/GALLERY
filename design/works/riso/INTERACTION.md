# 겹 — INTERACTION.md

Posture: transient. A visitor plays for a minute, learns what overlap and drum order do, and then
needs the shop's facts to order. The peak is the first time two inks meet under their finger; the
end is a price and a pickup date they can copy.

## 1. Overprint table (the signature)

A4 landscape press sheet (297 × 210 mm trim, 10 mm paper margin for marks), rendered on canvas at
4 px/mm. Six cut pieces on three plates:

| plate | pieces |
|---|---|
| 형광 핑크 | the "겹" glyph, a small dot |
| 블루 | an arch, a triangle |
| 옐로 | a large disc, a long band |

Registration targets and the colour strip in the margin are printed by every plate, so the
misregistration of each pull shows as colour fringes, as on a real press sheet.

### Microinteractions

| | trigger | rules | feedback |
|---|---|---|---|
| Move a piece | pointer down on ink, drag | hit-test the topmost inked piece (last drum first); piece follows the pointer; clamped to the paper | live re-render of that plate; dashed black selection box (UI, not printed); cursor grab/grabbing |
| Touch drag | touchstart on a piece | `preventDefault` only when a piece is hit, so the sheet still scrolls the page elsewhere | same |
| Select by keyboard | Tab | each piece has a focusable handle (button) laid over it, in plate order | the selection box; handle label states plate, piece and position in mm |
| Nudge | ← ↑ → ↓ on a handle | 0.5 mm per press, Shift 5 mm | re-render; position in the drum panel caption |
| Nudge pad | four round buttons in the "고른 조각" box | 1 mm per press (touch and screen-reader path, like the machine's print-position keys) | re-render; position text |
| Re-ink a piece | "블루 판으로" etc. under the panel, for the selected piece | piece moves to another plate | re-render + status line |
| Drum order | 앞으로 / 뒤로 buttons on each drum row | swaps print order; order 1 prints first | the sheet re-prints drum by drum (feed wipe, ~0.9 s total), status line reads the new order |
| Density | − / + on each drum row, 1 to 5 (default 3) | scales coverage and void rate | re-render |
| New pull | 한 장 더 찍기 | new seed: grain, voids, banding, misregistration (≤ 0.8 mm, ≤ 0.25°); counter + 1 | feed wipe; "n번째 장" |
| Reset | 처음 배치로 | positions and plates back to defaults; order and density kept | re-render |
| Save | PNG로 저장 | 1268 × 920 px sheet + slug line (plate order, density, pull number) | file `gyeop-proof-07.png`; status "저장했습니다" |

### States

`idle → dragging → idle` (drop re-renders at full quality and updates the separations below),
`idle → printing (wipe) → idle` (input stays live; a new action cancels the wipe and jumps to the
end). There is no mode: selection is just which handle has focus.

### Motion

One orchestrated moment: on first view the sheet prints plate by plate in drum order. It repeats
only as the answer to a drum-order change or a new pull. Reduced motion: no wipe, final print shown
at once, and the text explains the order instead. Rendering runs only on demand (no idle loop);
the first wipe waits until the sheet is on screen and the tab is visible.

### Persistence

Positions, plates, order, density and pull number are kept in `localStorage` (wrapped in
try/catch). Without storage the page simply starts from the default layout.

## 2. Separations (file-prep section)

Three small greyscale canvases show the visitor's current sheet as the files the shop wants: one
grey plate per drum, black = full ink. They redraw after each drop / order change / re-ink, not
during a drag. Caption numbers follow the current drum order.

## 3. Order slip (estimator)

Fields: size (A4 / A3), paper (5 stocks), sheets (50–5000), colours (4 drums, at least one),
sides (one / two), trimming (none / trim to bleed).

| rule | value |
|---|---|
| master (stencil) | 6,000원 per colour per side |
| printing | A4 25원 · A3 40원 per sheet per colour per side; sheets beyond 1,000 at 70 % |
| paper | stock price per A3 sheet; A4 is half |
| trimming | 5,000원 + 1,000원 per started 100 sheets |
| turnaround | 2 working days; +1 for 3+ colours, +1 above 1,000 sheets, +1 for hand-fed stock |

"맨 위 교정쇄에 쓴 색으로 채우기" fills size A4 and the plates that have pieces on them. Below
1080px the total follows the visitor down the slip as a sticky line (aria-hidden; the bill itself
is the accessible source). Invalid input never blanks the slip: the field shows its message ("50장부터 받습니다"), the total
greys out and keeps the last valid figure. "주문 내용 복사" copies a plain-text summary; if the
clipboard is refused the text is selected for manual copy. The slip says it sends nothing.
