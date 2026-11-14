# 담금 (perfume): detail pass, 2026-11-14 (BRIEF §0000)

An owner favourite, so this pass was conservative. Audited at 360, 390, 768, 1024 and 1440 in both
motion settings.

## Found

- Counters split at 360-1440: "네 / 가지", "마흔 / 날을", "한 / 번에", "두 / 분까지", "사백 / 병".
- "50 ml" and "15 ml" used ordinary spaces. The spaced middots in "풋매실과 쑥 · 6월" and
  "16% · 6월에" could leave the dot at the start of a line.
- In the booking chips built in JS, "11월 / 17일" and "오후 3시 / 30분" could split.
- `figcaption`, `li` and `dd` were not covered by `text-wrap: pretty` (only `p` was).
- Transitions had no easing token; the button and chips had no pressed state.
- Already right: `balance` on headings, `pretty` on paragraphs, tabular prices, focus rings, and
  the liquid keeps moving under reduced motion (slower, smaller rings).

## Fixed

- No-break spaces: 네 가지, 마흔 날, 한 병씩, 사백 병, 두 번, 한 번에, 두 분, 50 ml, 15 ml. A
  no-break space before every spaced middot keeps the dot on its line. Same in the JS labels
  (11월 17일, 오후 3시 30분, 낮 12시).
- `text-wrap-style: pretty` on `li`, `dd` and `figcaption`.
- `--ease` (expo-out) on the button, chip and pick transitions; pressed state (1 px down) on the
  button and chips.

## Left as is

- Copy: already lived-in (북쪽 방 선반, 42일째, 사백 병 남짓, 3번 출구에서 12분). No line needed
  rewriting.
- The thumbnail at 1200×900 matches the current first view line for line, so I did not retake it
  or the OG.
