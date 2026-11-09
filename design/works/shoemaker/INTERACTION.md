# 발 본뜨기: interaction spec

The bench in the first screen. A sheet of grey pattern card lies on the oxblood bench. A foot outline
is on it. The visitor can trace their own outline, read what the workshop would read from it, and then
see the outline turned into the flat pieces of an upper, chalked on a hide.

Concept story: you arrive (exposition), a foot is already traced on the card and the numbers are
filled in (inciting: "that is what they do first"), you draw your own or pick another foot and move the
rulers (rising action), the numbers and the suggested last change with you, then you press
"본으로 옮기기" and the line breaks into five pieces that land on a hide with grain arrows (climax). The
end is the card under it: a last size and a list of pieces in millimetres, and a quiet link down to
"첫 방문과 치수", which says the real measuring takes an hour and a tape.

## Model

- Coordinates are millimetres. The sheet is 200 × 300 mm, foot toes up, heel on a printed heel line at
  y = 270. The SVG viewBox is the sheet, so the ruler printed on it is true to the model.
- An outline is 160 points, closed, resampled at equal spacing and smoothed once.
- Measurements come from the outline:
  - **발 길이**: extent along the long axis (principal axis of the points).
  - **볼 너비**: the widest chord across the axis between 60 % and 80 % of the length from the heel.
  - **발등 둘레 (추정)**: a flat outline has no height, so it is estimated: 2.05 × 볼 너비 + 0.16 × 길이,
    shown with "약". The page says why it is a guess.
  - **추천 라스트**: (길이 + 6 mm toe room) rounded up to the next 5 mm, plus a width grade from
    볼 너비 / 길이: < .365 좁은 볼 (D), < .395 보통 (E), < .425 넓은 볼 (2E), otherwise 3E.
  - Outside 220–300 mm the last line says the workshop's lasts do not reach that size.
- Pattern pieces are built from the same numbers (vamp length from 길이, spread from 발등 둘레 and
  볼 너비), so they grow when the rulers move. Five pieces for one shoe: 앞날개, 뒷날개 바깥쪽,
  뒷날개 안쪽, 혀, 안감. Each is 72 points, closed.

## States

```
stage:   [paper] --본으로 옮기기--> [morphing ->] --done--> [hide]
         [hide]  --발 모양으로--> [morphing <-] --done--> [paper]
outline: [sample A|B|C] --pointerdown on paper--> [drawing]
         [drawing] --pointerup, valid--> [drawn] (becomes 4th choice "직접 그린 발")
         [drawing] --pointerup, invalid | pointercancel--> previous outline restored + message
         any --종이 비우기--> [empty]   (paper only)
         [empty] --choose sample | draw--> outline
```

Only one mode exists (paper or hide) and the button text and the ground colour make it impossible to
miss. Drawing is only possible on paper; on the hide the cursor is plain and nothing happens.

## Triggers, rules, feedback

| trigger | rule | feedback |
|---|---|---|
| page load, sheet scrolled into view once | sample B is drawn around once like a pencil going round a foot (1.4 s), then the dimension lines and numbers appear | numbers fill the card; status: "본 B를 올려 두었습니다. 종이 위에 직접 그려도 됩니다." |
| pointerdown on paper (mouse, pen, one finger) | previous outline drops to a ghost; points are collected while the pointer is down (min 1.2 mm apart, clamped to the sheet); other pointers ignored | a leather chalk line follows the pointer with no lag |
| pointerup | rejected if the path is under 300 mm, if the ends are more than 60 mm apart, or if the enclosed area is under 6,000 mm²; otherwise closed, resampled, smoothed, turned upright (wide end up) and set on the heel line | accepted: the outline eases to its upright place (260 ms), dimension lines redraw, status "그린 발을 쟀습니다. 발 길이 258 mm." Rejected: ghost returns, status says exactly what to do |
| sample choice (eyelet radio group) | loads the sample outline and sets both rulers to its numbers | outline swaps (cross-fade 180 ms), numbers update |
| 길이 / 볼 너비 ruler (range, 1 mm) | scales the current outline along / across its axis; works on samples and drawn feet; on the hide it reshapes the pieces live | outline and pieces follow the thumb; the card updates; status announces the final value after 400 ms of rest |
| 본으로 옮기기 (one button whose label names the next action) | paper → hide. The outline is cut into five arcs, each arc morphs into one piece; the ground changes from card grey to hide; stroke changes from leather to white chalk | 1.3 s: ground 0–350 ms, pieces 150–1050 ms staggered 70 ms, then grain arrows, labels, eyelets, notches and seam allowance (1000–1300 ms). Button reads "발 모양으로 돌아가기". The piece list with sizes appears under the card |
| 발 모양으로 돌아가기 | reverse, 0.8 s | back to paper; drawing allowed again |
| 종이 비우기 (paper only) | empties the sheet | heel line and hint "뒤꿈치를 이 선에 맞추고 발 둘레를 한 바퀴 그려 보세요"; card shows "—"; rulers and 본으로 옮기기 disabled with that reason in text |

## Keyboard and assistive tech

- Tab order: sample group (arrow keys inside) → 길이 → 볼 너비 → 본으로 옮기기 → 종이 비우기 → the card. The rulers carry `aria-valuetext` in millimetres.
- Drawing is pointer-only. The line above the controls says so and gives the keyboard path:
  "키보드로는 샘플 발을 고르고 눈금자로 길이와 볼 너비를 맞춥니다."
- The SVG is `role="img"` with a label rebuilt from the current numbers ("발 윤곽, 길이 258 mm, 볼 너비
  101 mm" / "가죽 위의 본 다섯 장"). The status line is `aria-live="polite"`; ruler input is announced
  only after it rests.
- Focus is a 3 px outline (white on oxblood, polish on chalk).

## Motion

- Easing: cubic-bezier(.2,.7,.2,1) for arrivals, ease-in-out for the morph. Nothing bounces.
- Reduced motion: no load trace, no morph, no cross-fade. The end state is shown at once; every
  explanation is still in text.
- All animation is time-based in requestAnimationFrame and runs only while something changes; there is
  no idle loop. If the tab is hidden mid-morph the next frame jumps to the end.

## Edge cases

- pointercancel or a second finger: the stroke is dropped and the previous outline returns.
- Very fast strokes: points are interpolated so the line has no gaps.
- Window resize while drawing: pointer → sheet coordinates use the current screen CTM on every event.
- Scribbles that cross themselves: caught by the area test and the "ends apart" test.
- A drawn foot facing sideways or upside down is turned upright before it is measured.
- Touch: the sheet has `touch-action: none` so drawing does not scroll the page; the sheet is never
  taller than 64 % of the viewport, so there is always page around it to scroll with.
