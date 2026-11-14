# 부엉재 천문대: detail pass (BRIEF §0000, 2026-11-14)

Audited at 360, 390, 768, 1024 and 1440 (and 1920 for overflow). The page already had balanced
headings, keep-all, tabular figures in its mono face and pressed button states; planisphere, red-only
palette, sky data and motion are unchanged.

## Found
- Tracking one value (-0.01) from the 60 px title to the 17 px body.
- No `pretty` on paragraphs: "가스 / 구름.", "먼저 / 봅니다." stranded in narrow columns.
- Degree sign: both faces draw ° on a wide advance (Nanum Myeongjo 0.95 em with the ring at the
  left; Nanum Gothic Coding full width, centred), so "20°보다", "고도 5°." and "서 44°" rendered as
  "20° 보다", "5° .", "44 °": it read as a typo.
- Middots "3·4월, 9·10월", "M81·M82" could break; counters with plain spaces ("세 번", "두 대",
  "40억 년"); a particle could start a line after ")" in the footer.
- Focus offset 3 px; no transitions.
- Resizing during the night play (1440 → 360) left the canvas at its old width: 497 px scroll width
  at 360 until the next redraw.

## Fixed
- Tracking: h1 -0.035, section heads -0.03, other heads -0.02, body -0.01; `pretty` on p, li, dd,
  list notes and the session flow.
- Degrees written as 도 in running text and in the list column (20도보다, 고도 4도, 서 43도); the
  canvas label "북위 37.5°" stays (nothing follows it).
- 17 text nodes: `&nbsp;` for counters, 6시&nbsp;30분, 1월&nbsp;1일; `&#x2060;` around the month
  middots and after "자료)"; JS strings "두 대", "40억 년", "M81⁠·⁠M82".
- Units glued to numbers (412m, 800mm) left as they are: consistent across the page, unbreakable.
- Tokens: one easing, 180 ms transitions on buttons, list targets and chips; `:disabled`; focus
  ring 2 px / 2 px. `.disc canvas { max-width: 100% }` so the planisphere shrinks with its column.
- Thumbnail retaken (title tracking and "20도" are in the first view); OG comes from `og.html`,
  which did not change, so it was kept.
