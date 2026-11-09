# 늦깎이 FS: interaction

Since the 2026-11-09 revision the page has no signature interaction. The tactics board (drag
magnets, draw runs and passes, replay set plays) and the shirt-number picker were removed with all
their code: the owner asked whether the board was needed, and a club homepage does its job by
showing the club, the week and the gym clearly.

What is left is ordinary page behaviour:

| element | behaviour | keyboard / no-JS |
|---|---|---|
| Menu (< 900 px) | `<details>` pill 차례/닫기 opens a panel of the six section links; a link click, Escape or a click outside closes it | native `<details>`; Escape returns focus to the summary; works without JS |
| 다음 훈련 | JS writes the next Monday or Thursday 20:30 (e.g. "11월 12일 목요일 저녁 8시 반") | static fallback text "월요일, 목요일 저녁 8시 반" |
| 문의 form | validates the name, then shows a status line that says nothing was sent | `role="status"`; the error is linked with `aria-describedby` and focus moves to the field |
| Anchor links | smooth scroll | `scroll-behavior: auto` under reduced motion |

No storage, no timers, no animation loops.
