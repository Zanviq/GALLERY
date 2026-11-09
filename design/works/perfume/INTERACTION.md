# 담금 — interaction (revision of 2026-11-09)

The page shows; it does not perform. Everything that moved in the first version (liquid pool, bottle
tilt, notes cylinder, scent re-tinting, finder quiz) was removed with the WebGL.

What is left:

| | |
|---|---|
| Navigation | three in-page links (향, 작업실, 방문); smooth scrolling only when reduced motion is not requested |
| Visit booking | radio chips for 5 open days (Tue–Sat), 5 slots (a few marked 마감, the same ones every time for a date), 1–2 people. Submit without a day/time: the missing group's legend is underlined, a `role="alert"` line names what is missing, focus moves to the first missing group. Submit with both: the form is replaced by a confirmation whose heading takes focus; "다른 시간 고르기" brings the form back with focus on the chosen slot. Nothing is sent or stored; the form says so. |
| Keyboard | skip link, then wordmark and the three nav links; chips are native radios (arrow keys inside a group, Tab between groups). |
| Motion | none. No scroll-triggered effects, no loops, no storage. |
