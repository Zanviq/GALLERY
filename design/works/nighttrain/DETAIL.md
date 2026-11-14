# 밤차: detail pass (BRIEF §0000, 2026-11-14)

Audited at 360, 390, 768, 1024, 1440 (and 1920 for overflow). Look, layout, colours, photos and
the booking demo are unchanged.

## Found
- **Serif was Gowun Batang**, on the §0000 "AI default" list. Its 700 did all headings.
- Tracking flat: h1 -0.025em, h2 -0.02em, h3 and body 0. Body line height 1.8.
- No `text-wrap`: "밤기차를 다시 띄운 / 사람들" (360/390), "불을 끄고 독서등만 / 켭니다" (1024).
- Units split from numbers: `412 km`, `74 kg`, `190 × 80 cm`, `85억 원`, `주 3–4회`, `5시간 10분`,
  `밤 11시 5분`, `여덟 시간`, `11월 15일` (JS) could break at any of those spaces.
- `412km` in the route heading and `52km` in its text, but `412 km` everywhere else.
- Middots unjoined: `금·토 밤`, `1인실·2인실`.
- Focus ring 3px/3px (others in the gallery use 2px/2px); transitions `ease`, colour only.
- Footer had no way back to the top on a long page.
- "따뜻한 차 한 잔" was the one generic heading among concrete ones.
- Favicon drawn from the Gowun Bold 밤, so it no longer matched the page.

## Fixed
- Serif: 이롭게 바탕체 Medium, subset and renamed **Bamcha Batang** (OFL 1.1, RFN '이롭게 바탕체',
  'iropke batang'), 31.5 KB instead of 110 KB for two Gowun weights. One weight: the face covers
  400–700 and `font-synthesis: none`, so nothing is faux-bolded; the bar chart's 밤차 rows use
  night blue instead of bold. Orbit unchanged. Licence: `works/nighttrain/fonts/OFL-BamchaBatang.txt`.
- Tracking tokens `--tr-display -.04em`, `--tr-head -.035em`, `--tr-small -.025em`,
  `--tr-body -.01em`; h1 1.12, h2 1.22, body 1.75.
- `text-wrap: balance` on h1–h3, `pretty` on p/li/dd/figcaption; `tabular-nums` on body (Orbit is
  monospaced and the Iropke figures are one width already, so this only states the intent).
- No-break spaces between every number and unit, time-of-day and hour, native numeral and counter;
  word joiners around middots. JS dates and durations use ` `.
- `412 km` / `52 km` everywhere.
- Focus 2px/2px; one easing `cubic-bezier(.16,1,.3,1)` at 180 ms on colour, border and transform.
- Footer: "맨 위로 ↑" beside the legal line (44px target).
- Tea step: "보리차 한 잔, 아니면 캐모마일" and when it comes ("출발하고 25분쯤 지나면 승무원이
  문을 한 번 두드리고").
- Favicon set redrawn from the Bamcha 밤 (`scripts/icons.py`); thumbnail and OG retaken.

## Left as is
- Orbit's wide mono space in `74 kg`: it is the departure-board face doing what it does.
- No ambient motion: this page was approved as a still poster with a working timetable.
