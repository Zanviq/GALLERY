# 또렷안경 (optician): detail pass, 2026-11-14 (BRIEF §0000)

Audited at 360, 390, 768, 1024 and 1440 (headless Chrome, both motion settings).

## Found

- **Font**: Gothic A1 is on the "AI default" list. Its digits are proportional, so the dioptre
  readout and the price column moved by a hair as the numbers changed.
- **Layout at 1024**: the lens bench and the price tables switched to two columns by window
  width, not by the column beside the 216 px rail. The bench's side column was 188 px wide: "1.5 / 6"
  split inside the index buttons, "지름 / 70mm / (최소 / 67mm / 필요)" stacked one word per line.
- **Breaks**: "150,000 / 원" inside the 1.74 button at 360; "가게에서 고른 국산 / 테" (one-syllable
  last line) at 360; "더 / 센 렌즈도" at 1440; "0.1 줄" and "S −2.25" could split; "일·공휴일" could
  break at the dot.
- **Wrapping**: no `text-wrap` anywhere (every paragraph `auto`); the intro line broke as
  "…동네 / 안경원입니다." at 1440.
- **Tracking**: the small heads (도수 찾기, 적록 이색 검사, table captions) used the chart's optotype
  spacing (+0.1 to +0.12em), so they read as chart lines that were not on the chart.
- **Tokens**: three easings (`ease-out`, `ease`, none); the 차례 toggle had no hover or pressed
  state; the index buttons had no pressed state.
- **Reduced motion** stopped everything: the wheel snapped, the blur jumped, "깎아 보기" skipped
  straight to the cut lens (BRIEF §000 asks for calmer, not still).

## Fixed

- **Fonts**: Kakao Big Sans for the chart lines, small heads, readout and stamp, and Kakao Small Sans
  for the text. From Kakao's own download; SIL OFL 1.1. The subsets are renamed Ttoryeot Display /
  Ttoryeot Text (name ID 7 says the names are Kakao trademarks), and digits 0-9 have one width
  because the family has no `tnum`. Build: `scripts/fonts.py`. Licence:
  `works/optician/fonts/OFL-KakaoSans.txt`. The footer credit, `og.html`, the OG image and the
  thumbnail use the new fonts.
- **Ranges** use the Korean tilde (10:00~20:00, 2~3일, 49,000~98,000원). Kakao's en dash is 0.84 em
  wide and read like a dash between words.
- **Tracking**: body −0.01em, small heads −0.025em; the chart lines keep their +0.26em. Line height
  1.72 for body text, 1.42 for the lede.
- **Wrapping**: `text-wrap-style: balance` on headings and the lede, `pretty` on text; no-break
  spaces in 0.1 줄, S −2.25, 국산 테, 더 센; word joiners around 일·공휴일 and 큰글씨·작은글씨.
- **Layout**: the bench and price grids follow the column (container query, 860 px), so at 1024 they
  stack; the index buttons keep "150,000원" on one line.
- **States**: one easing token `--ease` (expo-out); the wheel turns in 180 ms; the 차례 toggle
  gets hover and pressed states; the index buttons get a pressed state.
- **Reduced motion**: the wheel still turns, the blur still eases, and the cut runs slower (2.4 s
  instead of 1.6 s) instead of skipping.
- **Copy**: one lived-in exception under the opening hours: "토요일에는 오후 4시 반까지 맡기신
  안경만 그날 찾아가실 수 있습니다." (18:00 closing, 40-minute edging).

## Left as is

- The chart lines' wide optotype tracking: this is the page's concept.
- The face line drawings in 테 고르기: these were approved before §000, so I did not redraw them.
- With tabular digits a narrow "1" sits in a full-width cell, so "~ 18:00" shows a small gap.
  Columns of figures line up.
- REGISTRY.md (optician row and "Fonts in use") still says Gothic A1. I was not allowed to edit it.
