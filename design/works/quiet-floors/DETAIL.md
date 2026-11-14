# 사뿐: detail pass (BRIEF §0000, 2026-11-14)

Audited at 360, 390, 768, 1024 and 1440, with the section drawing played. Drawing, meter, sound,
colours and layout unchanged; the page already had pressed/disabled states and tabular numbers.

## Found
- Tracking 0 everywhere (Dongle display at 80–132 px, Paperlogy body and heads).
- No `text-wrap`. Breaks: the readout split "최대 50 / dB(예시)" at 1440 (JS string), "밤 / 10시",
  "같이 재 / 봐요", "싼 / 것부터", "다시 들어 / 보세요"; heading "돈 적게 드는 / 것부터" set the
  bound noun 것 alone at the head of the second line.
- Values and units joined by plain spaces in HTML and JS ("13 dB", "2천 원", "두 층 아래").
- Focus rings 3 px / 3 px; no transitions on any control.
- "4cm" glued while dB is spaced.

## Fixed
- Tracking: d1/d2 -0.02, other Dongle -0.01, h3 -0.025, lead -0.015, body -0.01. Headings and
  legends `balance`, text `pretty`.
- 21 HTML text nodes and the readout, compare and table strings in `js/sim.js`, `js/main.js`,
  `js/model.js`: ` ` between every value and dB, 천&nbsp;원/만&nbsp;원,
  한&nbsp;번, 두&nbsp;층, 두&nbsp;집; word joiner in "dB(예시)⁠를"; "4&nbsp;cm"; "밤&nbsp;10시",
  "재&nbsp;봐요", "싼&nbsp;것부터", "들어&nbsp;보세요". The copyable note text is left without them.
- Heading break moved: "돈 적게 / 드는 것부터".
- Tokens: one easing, 180 ms colour/transform transitions on buttons, chips, segments, pledge rows
  and the nav pill; `:active` on chips, segments, pledge rows and the pill; focus rings 2 px / 2 px.
- Dates column ("11.14") kept on one line (`nowrap`); Dongle's tabular digits were too wide for the
  6.2 rem column, so they are not used there.
- Thumbnail and OG retaken from the page in the same state as before (weights chip, 1440 layout).
