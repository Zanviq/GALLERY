# 가락 65 (keyboard): detail pass, 2026-11-14 (BRIEF §0000)

An owner favourite, so this pass was conservative. Audited at 360, 390, 768, 1024 and 1440 in both
motion settings.

## Found

- "USB- / C" split at 390 (책상 위에서는 이만합니다 lede); "한 / 뼘" could split.
- No `text-wrap` on paragraphs (all `auto`).
- `.facts__n` big figures (68, 319×112, 1.9, 6.5°) were not tabular. The `.num` spans already were.
- Button transitions used the default `ease`, the FAQ icon another; the buttons and the sound
  toggle had no pressed state.
- Already right: tracking scale (−0.045 to −0.05em display, −0.01em lead), `keep-all`, focus
  rings on every ground, `theme-color`, OG, the keycap press still moves under reduced motion.

## Fixed

- `USB-C` kept on one line (`.nw`) in the lede and the spec table; no-break spaces in 한 뼘 and
  319 × 112.
- `text-wrap-style: balance` on headings and FAQ questions, `pretty` on text.
- Tabular figures on `.facts__n`.
- One easing token `--ease` (expo-out) for the button and FAQ icon transitions. The keycap curves
  are tuned per switch and stay as they were. Pressed state (1 px down) on buttons and the
  sound toggle.

## Left as is

- "글자 없는 / 키캡" and "또각 / 클릭" break on purpose (`<br>` and the switch type label).
- "319×112 / mm" in the facts row: the big number and the unit below it are the design.
- The copy was already concrete (300대, 11월 30일, 22/35 mm, 420 g, "혼자 쓰는 방에 권합니다").
  No line needed rewriting.
- The first view did not change, so I did not retake the thumbnail or OG.
