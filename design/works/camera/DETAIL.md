# 방금 1 — detail pass (2026-11-14, BRIEF §0000)

Audited at 360, 390, 768, 1024 and 1440 (line breaks of every heading and key line measured in headless
Chrome, phone captures read at 2x). Found → done.

**Type**
- Do Hyeon + Sunflower are on the "AI default" list → 카페24 써라운드 (display, figures, labels, buttons) +
  카페24 써라운드 에어 (reading), SIL OFL 1.1, subsets renamed "Bangeum Round" / "Bangeum Round Air"
  (DESIGN.md §글꼴 has the licence reasoning). The comma stand-in (`unicode-range: U+002C`) is gone: this comma
  reads as a comma at 136 px. Neither font has ×, so the subsets get one drawn from their own + (sizes would
  otherwise fall back to a system font mid-line).
- Tracking was one value (-0.01 / -0.02em) for every size → scale: display -0.045em, section heads -0.035em,
  small heads and figures -0.025em, body -0.01em. Line height 1.0 display, 1.3 heads, 1.65 body.
- Sizes drifted (lead set in five places, `--t-h3` 1.15/1.2/1.1) → `--t-lead`, one head line height.
- No `text-wrap` anywhere → `balance` on h1–h3, dt, summary, legend; `pretty` on p, dd, figcaption, li;
  `balance` on the print captions ("겨울 아침, 이불 위 / 귤" left 귤 alone at 390).
- Breaks between number and counter or unit: "아래로 한 / 장이" (360–768), "76 × 102 / mm" and "비율 / 4:5"
  (1024), "컬러 / 30장" (360) → no-break spaces in 한 장, 한 팩, 세 팩, 두 칸, 다섯 개, 12월 3일, all mm/g/m
  values, table rows, and the JS strings ("한 장 나오는 중", "한 대").
- Figures: Ssurround has proportional digits and no `tnum`; `tabular-nums` is set where figures are compared
  but cannot take effect, so the price table right-aligns to line up the last digit.
- 1440: the three hero figures touched ("189,000원13,000원") once the wider face came in → figure size
  clamp(26px, 2.3vw, 38px). 1024: the print-size note set five words a line → narrower diagram column there.
- Phone hero "방금" syllables touched at -0.045em → -0.02em plus a 0.03em gap.

**Copy**
- Hero: "누구 손에 건네든 바로 찍습니다" → "생일상 건너편 할머니에게 건네도 설명 한마디 없이 바로 찍습니다".
- Release fact "지금 예약하면 그날 보냅니다" contradicted the order note → "12월 2일까지 예약하면 3일부터 차례로
  보냅니다"; order note gains "하루 300대씩".
- Shutter lead: "처음엔 검다가 천천히 나타납니다" → "처음엔 회녹색으로 캄캄하다가, 형체부터 천천히 올라옵니다".
- Store hours gain the small exception: "일요일은 18시까지". Focus example: "케이크, 꽃, 졸고 있는 고양이".
- Footer credits the fonts ("글꼴은 카페24 써라운드와 써라운드 에어"), as Cafe24 asks when the licence text is not
  shown. "가상 서비스입니다. 실제 주소가 아닙니다." kept beside the address.

**Controls and tokens**
- Focus ring 3 px / 3 px → 2 px / 2 px (black on lemon and white, lemon on black).
- Sound toggle had no hover, pressed or disabled look (it is disabled when WebAudio is missing) → all three.
- Links and nav: pressed state; chips: pressed; FAQ rows: hover and pressed; `.btn:disabled` defined.
- Transitions were 90, 160, 200 and 300 ms with three easings → `--ease: cubic-bezier(.16,1,.3,1)`,
  150 / 220 ms, colour, opacity and transform only.
- Favicon (SVG, 32 px, 180 px) redrawn from Ssurround's 방.

Not changed: layout, colours, photographs, the shutter sequence, sound, reduced-motion behaviour.
