# 물길 (startup): detail pass, 2026-11-14 (BRIEF §0000)

An owner favourite, so this pass was conservative. Audited at 360, 390, 768, 1024 and 1440 in both
motion settings.

## Found

- **Reduced motion stopped the chart.** The bay became a precomputed still for each step, and a
  global rule set every transition to 0 ms. On the owner's machine (which reports `reduce`), the
  homepage's living chart was dead. BRIEF §000 asks for calmer, not still.
- Units used ordinary spaces: 100 m, 347 kg, 4 m/s, 1,184 kg, 1.6 m, 1.8 m³, 350 kg, 1.1 kW,
  32 kWh, 4.2 × 2.1 m, 680 kg, 1.5 m, 14 m/s, 31.4 t, 56.5 t, 12억 원, 68억 원. The HUD values
  written by JS had the same problem.
- Counters split at 360: "열여섯 / 명이", "세 / 해역에서", and "(수거 / 장치)" inside a role title.
- Middots without word joiners: 그물·밧줄, 병·용기, 선체·기구, 협력·연구.
- No `text-wrap` on headings or paragraphs.
- Already right: tracking, tabular figures (set on `body`), one easing token, pressed states,
  focus rings on the light and night grounds, scroll padding under the fixed header, and the
  honest "잘 안 된 점" copy.

## Fixed

- **Reduced motion**: the bay keeps drifting at 0.6× and the boats keep working. The camera cuts
  instead of gliding, and the forecast lines appear instead of drawing. Controls (wind, boats,
  spill, reset, tap to spill) act on the moving bay. Short colour and state transitions are back.
  The unused still-frame path is removed (`js/chart/story.js`).
- No-break spaces in every number and unit pair above, in the HUD and wind readouts written by
  JS, and in 열여섯 명, 세 해역, 네 곳 and 수거 장치. A no-break space before the spaced dash in the
  season dates.
- Word joiners around the middots in visible text.
- `text-wrap-style: balance` on headings, role titles and the mix caption; `pretty` on text.

## Left as is

- Copy: already concrete and lived-in (142일 중 23일, 8월 큰비 뒤 사흘, 관제사 1명이 최대 8척).
  No line needed rewriting.
- The canvas label "그물·밧줄" in `render.js` is drawn text that never wraps, so it needs no
  joiners.
- The first view did not change, so I did not retake the thumbnail or OG.
