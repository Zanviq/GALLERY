# 또렷안경 — interaction spec

Story of the page: a visitor plays the patient for a fictional customer's right eye (S −2.25),
finds the prescription with the lens wheel, confirms it with the duochrome (peak), picks a
frame size on a drawn face, then sees that frame and prescription cut from a lens blank on the
bench. Everything after the hero uses the result of the step before it.

## 1. Lens wheel (hero)

- Trigger: drag the black wheel around its centre (pointer capture, `touch-action:none` on the
  wheel only); keys on the focused wheel (`role=slider`): ←/↓ −0.25, →/↑ +0.25, PageDown/PageUp
  ±1.00, Home −4.00, End +4.00; two buttons "−0.25" "+0.25" (48 px).
- Rules: range −4.00…+4.00 in 0.25 D steps, 9° per step, gap at the bottom of the ring.
  Error e = value − (−2.25). Under-correction (e > 0) blurs. Over-minus (e < 0) is absorbed by
  accommodation up to 1.75 D, so the chart stays sharp but shrinks ~2 %/D; past that it blurs.
  Readable line VA = 1 / (1 + 1.8|e| + 0.6e²). Blur σ (chart units) = 1.1 × (1/VA − 0.85), ≥ 0.
- Feedback: feGaussianBlur on the chart group only (never on page text), wheel rotates with a
  180 ms expo-out ease (kept under reduced motion: a 9° turn), readout "S −1.75" (red when minus, sign always
  printed), live status in words: better / worse than the previous step and the smallest line
  that can be read. At e = 0 and in the hidden over-minus zone the words are identical, on
  purpose: acuity alone cannot tell them apart — the duochrome can.
- Ends: buttons get `aria-disabled` at −4.00 / +4.00; dragging past the end clamps.

## 2. Duochrome (hero, under the wheel)

- Trigger: three answer buttons — "왼쪽 빨강", "같습니다", "오른쪽 초록".
- Rules: chromatic offset 0.25 D. Red half blur uses |e − 0.25|, green half |e + 0.25|.
  Red sharper → the examiner adds −0.25 (wheel turns). Green sharper → adds +0.25.
  "같습니다" at e = 0 → result state. At e ≠ 0 → the page says the two halves still differ.
- Feedback: wheel moves one step, a sentence explains why (RAM-GAP in plain Korean).
  Result: "처방: 오른눈 S −2.25" record line and a link down to 테 고르기.
- Colour-blind path: halves are named by side; the question is asked by side.

## 3. Frame fitting (0.3)

- Trigger: face width (3 segmented buttons), three range inputs: lens width 46–58, bridge
  14–22, temple 130–150 (step 5).
- Rules: frame width = 2A + DBL + 16. Fit if within ±4 mm of face width. Decentration
  d = (A + DBL − PD) / 2; ≤ 4 mm is centred. Temple straight part = L − 38 must land within
  ±4 mm of the ear.
- Feedback: front and side drawings redraw instantly; stamp "52□18-140" updates, the number
  being changed is underlined; three plain sentences (width, eye position, temple) in a live
  region (polite, announced after input settles).

## 4. Lens bench (0.4)

- Inputs come from 2 and 3 (S −2.25, A, DBL, PD). Trigger: index buttons 1.56 / 1.60 /
  1.67 / 1.74 and "깎아 보기".
- Rules: minimum blank = A + 3 + 2d + 2 → smallest of 60/65/70/75 that fits. Edge thickness
  t(x) = 1.2 + x²·2.25 / (2000(n − 1)) along the horizontal meridian.
- Feedback: blank circle, frame outline offset by d, cross-section drawn ×4 in height with the
  edge thicknesses. "깎아 보기": a wheel dot runs round the outline (1.6 s), the off-cut fades;
  under reduced motion the dot runs slower (2.4 s) instead of skipping. Pressing again resets.

## Motion and loops

No autoplay anywhere. The only timed motion is the user-started cut (requestAnimationFrame,
cancelled when off-screen or hidden). Blur transitions ease 150 ms in both motion settings
(BRIEF §000: calmer, not still). No storage is used.
