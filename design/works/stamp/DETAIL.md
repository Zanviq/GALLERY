# 칼퇴 결재: detail pass (BRIEF §0000, 2026-11-14)

Game. Gameplay, timing, the continuous tray and its 1.0→2.4배속 ramp are untouched (no JS edits).
Fonts (East Sea Dokdo, Hi Melody), photos, sound and the cover are unchanged. Audited at 360, 390,
768, 1024, 1440 (and 1920 for overflow).

## Found
- Already careful in places: the HUD clock sets each digit in a fixed-width cell, the cover copy is
  a real memo from 부장 도상훈, the work log is a believable form.
- The speed reading "1.0배속" → "2.4배속" shifted "배속" as the digits changed: neither face has
  tabular figures, so the `tabular-nums` on it did nothing.
- No `text-wrap` on headings; paragraphs only partly `pretty`.
- Number-and-unit spaces breakable: `오후 5시 58분 45초`, `두 칸`, `한 번에`, `여섯 장`.
- Focus ring 3px/3px; button colour transitions on a generic `ease-out`.

## Fixed
- Speed reading sits in a fixed right-aligned slot (1.45em), so "배속" stays put.
- `text-wrap: balance` on h1–h3, `pretty` on p/li.
- No-break spaces for times, counts and counters (the cover's "오후 5시 58분 45초." stays one line).
- Focus 2px/2px (the primary button keeps its 7px offset outside the double rule); button colour
  eases with `cubic-bezier(.16,1,.3,1)` at 150 ms; reduced motion still drops it, as before.

## Left as is
- "칼퇴 / 결재" stacks on purpose (the cover poster).
- Thumbnail and OG not retaken: the first view did not visibly change.
- Checked under reduced motion: after "결재 시작" the belt moves continuously
  (-55 → -72 → -89 → -106 → -123 → -140 → -157 px in 200 ms steps), same as with motion on.
