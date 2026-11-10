# 담금 — interaction (revision of 2026-11-10, owner's fourth review)

The owner on the still version: "3번도 적당한 움직이는 배경이어서 좋았다. 다시 돌려놔줘." The first
version's moving pool is back, inside the photographic page, behind the information. The page still
reads first; the liquid only lets the visitor feel it.

## 1. The plum field is a liquid surface (`js/pool.js`)

| | |
|---|---|
| What | Both 청매 fields (hero, visit) are the surface of the steeping liquid seen from above: a slow, domain-warped flow moves it on its own, a caustic net of light drifts across it, and the window on the left (the light of every photograph) glints off it in thin lines. |
| Port | From the first version's `js/hero.js`: the same height-field wave sim (ping-pong, half float), the same flow noise and caustic net, the 유월 liquid's physics (damping 0.985, spread 0.06, brush 0.022, 2 steps). Changed: raw WebGL2, no three.js (−540 KB), no 3D bottle (the photograph is the bottle), a flat top-down view instead of a pool receding to a horizon, the photographs' palette and light. |
| Colour | Shaded on `--plum` #a9c25a: caustic light toward #d4e496, glints toward plaster #eef1ef, troughs at most 7% darker. The caustic mean is subtracted so the field averages to the flat colour. Measured on captures: field floor gives ink ≥ 8.1:1 and leaf ≥ 5.6:1. |
| Hero: stir | Pointer move over the hero leaves a wake of rings; a click or tap drops one ring. Strength follows pointer speed, clamped. Full frame rate for 2.5 s after input, ~30 fps otherwise. |
| Visit: calm | Same liquid at `quiet: 0.35` (caustics ×0.65, shading and glints ×0.42), not stirrable: the booking form sits on it. |
| Reduced motion | Calmer, not still (BRIEF §000): flow and caustics at 0.6× speed, one sim step per frame (slower waves), rings 0.6× as strong, 30 fps. Switching the OS setting applies live. Nothing scroll-linked, no parallax. |
| Cost | Canvas at 0.6 × min(dpr, 1.5) of CSS size (0.5 on weak devices), sim at ~4 CSS px per cell and at most ~110k cells. If the first 90 frames average over 24 ms, resolution drops once. `powerPreference: low-power`. |
| Pausing | Each field stops when its section leaves the viewport (IntersectionObserver) or the tab is hidden (`visibilitychange`). |
| Fallback | No WebGL2 / no half-float targets / context lost: the canvas is removed (or faded out) and the flat CSS `--plum` field stays. The flat colour is always underneath, so there is no flash before the first frame (the canvas fades in over 1.2 s). |

## 2. The four bottles answer (season row)

Brought back from the first version's collection preview (hover answered with the scent).

| | |
|---|---|
| Rest | Each bottle in the row photograph has its name set under it on the plaster (유월 · 누룩 · 오미 · 먹), so which is which reads without any interaction. |
| Hover / focus | The name underlines and a second line appears: what is steeped in it and the month (풋매실과 쑥 · 6월 …). 200 ms opacity fade. |
| Click / tap / Enter | The bottle and its name are one link to that scent's spread (`#yuwol` …). |
| Keyboard | Four links after the header nav; focus ring (2px ink) frames the bottle and its name. |
| Phone | Same links (the hit area is the bottle and name, ≥ 70 × 100 px); the second line is not shown (no hover, and four of them would collide). |

## 3. Unchanged

- Navigation: three in-page links; smooth scrolling only without reduced motion.
- Visit booking: as before (5 open days, 5 slots, 1–2 people, error names what is missing and
  moves focus; confirmation takes focus; nothing is sent or stored, and the form says so).
