# 깊은쪽 《물 빼는 날》: detail audit (BRIEF §0000, 2026-11-14)

Checked at 360, 390, 768, 1024 and 1440 (line boxes of every heading, lead, caption and note;
spaces before units; middots) and phone captures at 2x. The page was already concrete; what read
as careless, and what was done:

**Type and line breaks**
- Gipeun Sans (Nanum Barun Gothic) ran at its default tracking; now -0.01em for text, -0.02em for the
  section leads, -0.025em for the side heads. Moirai One keeps -0.01em: its strokes are single hollow
  outlines, and tighter tracking makes neighbouring outlines touch.
- Section titles already balanced; small heads and legends now balance too, and paragraphs, list items
  and table cells use `text-wrap: pretty`.
- Dates and counts split across lines: "3월 / 10일부터" in the 예약 lead at 1440, "열 / 곡" in the
  hero at 390, and in places "2027년 3월 / 12일", "오후 6시 / 30분". No-break spaces now bind every
  date and time in the HTML (17 places), "열 곡", "41분 53초", and the live text in JS (the pickup
  sentences in `order.js`, the spoken time and the "1:12 / 3:48" counter in `turntable.js`).
- The label's "SRG-001 · 33⅓" can no longer break at the dot.
- Figures: the text face has fixed-width digits (583 units), so the running track time and the totals
  already line up; `tabular-nums` stays on them.

**Controls**
- Focus ring 3 px / 3 px became 2 px / 2 px (ink on light fields, vinyl on the black deck).
- Pressed states added for the side switch, lever and sound buttons, the track rows, the pickup
  options, the quantity buttons and the ink button (the existing 1 px press stays).
- One easing was already used throughout (`cubic-bezier(.2,.7,.2,1)`, an ease-out); it also drives the
  disc and tone arm, so it was left as it is rather than retuned.

**Copy** needed no rewrites: every line already carries a date, a count or a place. Every address keeps
"가상 서비스입니다. 실제 주소가 아닙니다."

Unchanged on purpose: layout, colours, photographs, fonts, the turntable's motion and sound.
Thumbnail and OG kept: the first view only changed by tracking and one line break.
