# 백열극장: detail pass (BRIEF §0000, 2026-11-14)

Audited at 360, 390, 768, 1024 and 1440 (closed and open curtain). Photographs, cloth, flicker,
colours and layout unchanged.

## Found
- Tracking 0 at every size, including the 52–136 px title and the 120–280 px poster date.
- No `text-wrap`. Breaks: "저녁 7시 / 30분" (360), "3월 / 13일" (1440), "그 / 불과", "첫 / 시즌".
- Middots in "극단 백열 · 연극 · 90분" could start a line; dates and counters joined by plain spaces.
- `tabular-nums` on the poster dates did nothing: the SUIT subset had been cut without its `tnum`.
- Buttons: hover only, no pressed state, no transitions; focus offset 3 px.
- "15cm" glued while the page otherwise spaces units; footer had no way back to the top.

## Fixed
- Tracking: title -0.035, poster date and section titles -0.03, show titles -0.025, dates, prices,
  address and poster lines -0.02, body -0.01. Headings `balance`, text `pretty`.
- 15 text nodes: `&nbsp;` in 7시&nbsp;30분, 3월&nbsp;12일 and the like, 네&nbsp;편, 세&nbsp;번;
  spaced middots keep their word (`&nbsp;· `); "15&nbsp;cm"; "그&nbsp;불과", "첫&nbsp;시즌".
- `scripts/fonts.py` keeps SUIT's `tnum`; Baekyeol Sans re-cut (same face, now with tabular figures,
  plus the glyphs of the new footer link).
- Tokens: one easing, 180 ms transitions on buttons and nav; `:active` and `:disabled` states;
  focus ring 2 px / 2 px. Footer "맨 위로".
- Thumbnail and OG retaken with `scripts/stills.mjs` (title tracking changed in the first view).
