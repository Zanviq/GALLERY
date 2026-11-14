# 훨훨 2027 — detail pass (2026-11-14, BRIEF §0000)

Audited at 360, 390, 768, 1024 and 1440 (every text line's breaks measured in headless Chrome, phone captures
read at 2x). Found → done.

**Display face: Jua → 카페24 단정해 (Cafe24 Danjunghae), subset renamed "Hanui Display".** Jua is on the
"AI default" list. The first pool (이사만루 / 더잠실 / 머니그라피) had nothing usable here: 더잠실체 forbids
modifying or converting the font, 머니그라피체 forbids modifying or redistributing it, and 이사만루체 marks file
modification ×. Cafe24 fonts are SIL OFL 1.1 (each official zip's License-*.pdf: "자유롭게 수정하고 재배포할 수
있습니다"); Ssurround went to camera and Ohsquare is ramen's, so of Danjunghae, Supermagic and Dangdanghae, set
side by side at 150 px: Danjunghae. A heavy, slightly narrow gothic whose stroke ends still look cut by a brush,
which suits hanji-and-bamboo kites and a 정월 poster; Supermagic read as handwriting, Dangdanghae as a modern
headline. No Reserved Font Name; renamed because the name table carries Cafe24's trademark (same reason as
Hanui Text). Licence: `works/kite/fonts/OFL-HanuiDisplay.txt`. 17 KB subset, coverage checked; it has no en dash,
which falls back to Hanui Text. Hero title gets .07em below it so 훨훨's descenders clear the edition line.
Favicons redrawn from its 훨; footer credits "카페24 단정해와 프리젠테이션". Hanui Text (Freesentation) stays.

**Type**
- Tracking was -0.01 / -0.02em at every size → scale: display -0.045em (훨훨, the 3분 / 20 m / 64명 figures,
  footer mark), section heads -0.035em (h2, kite names, dates), small heads -0.025em, body -0.01em.
- Body line height 1.75 → 1.65; h2 and the akmagi title .95 → 1.0; small heads 1.2 → 1.3.
- No `text-wrap` → `balance` on h1–h3, dt; `pretty` on p, li, dd, figcaption. The akmagi title now breaks
  "다섯 시에 / 줄을 끊습니다" instead of "다섯 시에 줄을 / 끊습니다".
- Breaks inside a quantity: "다섯 / 시에는" (hero, 360 and 1024), "판마다 한 / 사람은" (rules, 360–1440) →
  no-break spaces in 다섯 시, 한 해, 한 사람, 두 사람, 한 회, 한 번, 세 번, 한 판, 다섯 살, 열네 살, 두 대,
  다섯 대, 한 바퀴, 2월 20일.
- Units were glued on ("66cm", "150m", "초속 8m") → number, no-break space, unit everywhere ("66 cm", "20 m",
  "초속 4.0 m" in the live wind readout too). The subset now carries U+00A0.
- `tabular-nums` declared on the dates, times, figures, wind speed and spec values. Hanui Text's figures are
  fixed-width already (all 544 units), so the live wind speed never shifts; Hanui Display's are proportional
  with no `tnum`, which only touches the big dates, times and figures, none of which change in place.

**Copy**
- Hero: "연이 없어도, 처음이어도 됩니다" → "연이 없으면 빌려 드리고, 처음이면 공방에서 대나무 살부터 깎아 봅니다".
- Parking: "오전에 찹니다" → "토요일 10시 반이면 찹니다". Bring list: "보온병을 가져오면 … 보리차를 채워 드립니다".
- "가상 서비스입니다. 실제 주소가 아닙니다." kept beside the address.

**Controls and tokens**
- Focus ring 3 px / 3 px → 2 px / 2 px (ink on sky and white, white on ink and red).
- Menu button had no hover or pressed state; button, chips and nav links had no pressed state → added;
  pressed sound chip has its own hover; disabled chip no longer reacts.
- Easing `cubic-bezier(.2,.7,.2,1)` and `.16s` → `--ease: cubic-bezier(.16,1,.3,1)`, 150 / 220 ms.
- The long page had no way back up from the end → "맨 위로" in the footer.

Not changed: layout, colours, photographs, the wind/kite canvas, sound, reduced-motion behaviour.
