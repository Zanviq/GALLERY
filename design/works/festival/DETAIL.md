# 너울 2027 (festival): detail pass, 2026-11-14 (BRIEF §0000)

An owner favourite, so this pass was conservative. Audited at 360, 390, 768, 1024 and 1440 in both
motion settings.

## Found

- Counters split from their nouns at 390: "서른 / 팀이", "네 / 번째고", "이 / 브라우저에만",
  "이 / 페이지의". In the FAQ and directions, "1시 / 30분", "여섯 / 곳" and "만 / 13세" could split.
- No `text-wrap` on paragraphs (all `auto`).
- Timetable hours (14:00 … 23:00) and day dates (9.3, 9.4, 9.5) were not tabular.
- Day labels built in JS ("9.3 금", "9.3 들물") could break between date and day.
- Already right: the poster still answers a hand under reduced motion, the step lights run, and the
  wipe stays. One easing token (`--ease`), pressed states on buttons, `theme-color`, OG, the address
  note.

## Fixed

- No-break spaces: 세 무대, 서른 팀, 네 번째, 이 페이지, 이 브라우저, 여섯 번, 세 곳, 1시 30분,
  11시 30분, 만 13세, 만 12세, 여섯 곳, 한 개, 8월 27일. Also in the JS labels (9.3 금, 9.3 들물).
- `text-wrap-style: balance` on headings and FAQ questions, `pretty` on text.
- Tabular figures on the timetable hours and day dates.

## Left as is

- Copy: already concrete (13:00 gates, 1,200 parking spaces at 12,000원, the last shuttle 01:30,
  refunds until 8월 27일). No line needed rewriting.
- "179,000 / 원" flagged by the line probe at 1024 is a false alarm: the small 원 sits beside the
  big figure on the same baseline.
- The hidden `.hint-still` sentence stays in the HTML; it never shows.
- The first view did not change, so I did not retake the thumbnail or OG.
