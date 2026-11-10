# 부엉재천문대 (observatory) — interaction

Posture: transient. People open this page for a minute before going out, or on the deck in the
dark with one thumb. Every control must be obvious, large, and readable in red at low screen
brightness. The planisphere is the peak moment; the list beside it is the payoff
("so what do I actually get to see tonight?"); the ending is the last-bus line.

## The planisphere (회전 성도판)

Model: one state `{ date (KST calendar day), minutes (0..1439, KST) }` → instant `t`.
Everything else is derived: local sidereal time at 127.5°E, the disc angle (15° × LST), sun and
moon positions, the visible-object list, the canvas aria text.

Geometry follows a paper planisphere for 37.5°N, seen from below (east on the left):
- the star disc (equidistant polar projection, pole at the centre, edge at dec −60°) carries the
  stars, constellation lines, the Milky Way stipple, the ecliptic and, on its rim, the date ring;
- the holder plate (ember) is fixed. It has the horizon window cut out and the hour ring
  printed on its edge; 0시 sits at the bottom, evening hours to the left.
- The date mark of the set day lines up with the set time on the hour ring. That is the real
  way to read a planisphere, and the page draws a small pointer at that alignment.

### Triggers → rules → feedback

| trigger | rule | feedback |
|---|---|---|
| drag on the star area | angle change Δθ around the centre → Δtime = Δθ / 15° h ÷ 1.00274; date rolls over at midnight | the disc follows the finger 1:1; readout and list update live |
| drag on the date ring (outer band) | Δθ → Δdate = Δθ / 0.9856° per day, time held | the ring slides; the date readout steps day by day |
| tap / click (moved < 6px) on a star, DSO or line | nearest bright star or object within 18px, else nearest constellation line within 14px, else clear | label drawn on the chart with a leader; the info line under the chart names it with direction and altitude |
| focus the planisphere, ←/→ | −/+ 10 min (Shift: −/+ 1 day) | same as drag |
| ↑/↓, PageUp/PageDown | +/− 1 h | same |
| buttons −1시간 / +1시간 / −1일 / +1일 | step | same |
| button 지금 하늘 | set to the current KST time | same; button announces "지금으로 맞췄습니다" via live region |
| session buttons 18:30 / 19:30 / 20:30 | set today's (set date's) session time for the season | same |
| chip in "창 안의 별자리" | select that constellation | chart highlights its lines in lamp at 2px and labels it |
| item in "오늘 밤 볼 것" | select that object | chart circles it and labels it |

Pointer: `touch-action: none` on the canvas only; the canvas is a square no wider than the
column, so on phones there is always page margin above and below it to scroll by.

"창 크게 보기" (a switch, `aria-pressed`) swaps the geometry, not a CSS zoom: the chart radius
grows until the horizon window fills the square and the disc centre moves up so the zenith sits
in the middle. Type and line widths keep their size. The rings and pointer leave the frame, so
the switch announces that; date changes then go through the buttons. Pointer capture keeps a drag alive when the
finger leaves the disc. Two-finger gestures are ignored.

### Motion

- Normal motion: on first view (when the disc scrolls into view) the disc turns from two hours
  earlier to the set time over 1.2 s, ease-out. Buttons tween the disc over 280 ms.
  "밤새 돌려 보기" plays the night from the set time to sunrise at 1 hour per second; any
  pointer or key input stops it. Nothing else moves on the page.
- Reduced motion (revised 2026-11-10, BRIEF §000 "calmer, not still"): the same as normal motion.
  The first-view turn, the 280 ms button tweens and "밤새 돌려 보기" (1 hour per second) all run, at
  the speed the owner called "적당". The owner's Windows has animation effects off, and the page
  without them read as dead. Dropped under `reduce`: only smooth scrolling (nav jumps and the scroll
  back to the disc from the list). The blanket CSS rule against transitions and animations is gone;
  the page had none to stop.
- One rAF loop, alive only while a tween or play runs, the canvas is on screen
  (IntersectionObserver) and the tab is visible (visibilitychange). Otherwise the canvas is
  redrawn once per state change.

### States

- Night (sun < −12°): list shows targets per telescope.
- Twilight (−12° to −0.8°): list shows targets but notes "하늘이 아직 밝습니다".
- Day (sun > −0.8°): the list says the sky is bright and offers 오늘 첫 회차 시각 as a button.
- Monday / closed days: the list still works (it is a sky, not a booking), and the line above it
  says 휴관 and names the next open evening.
- Nothing above 20° in a group: that telescope row says what it will do instead.
- Selected object sets below the horizon after a time change: selection stays, the info line
  says "지금은 지평선 아래" so the visitor sees why the label vanished.

### Accessibility

- The canvas wrapper is `role="slider"` with `aria-valuetext` like "11월 9일 월요일 오후 8시".
  Its accessible description says how to use the keys. The list and chips are real buttons, so
  every object can be reached and labelled without a pointer.
- The visible-constellation chips and the list are the text alternative to the chart.
- A polite live region announces only the settled time (not every drag frame).

## The evening timeline

Plain document; no motion. Each section has its evening time in the margin. Links in the top
navigation jump to sections (native smooth scroll only when motion is allowed).

## Group request form (단체 예약)

- Fields: 단체 종류 (radio), 인원 (number 10–40), 희망 날짜 (three selects avoided; a text
  date field with format hint and validation), 회차 (radio), 요청 사항 (optional textarea).
  No names, phone numbers or other personal data.
- Validation on submit, then per field on change. Errors sit under the field, say what to do
  ("10명에서 40명 사이로 적어 주십시오"), and focus moves to the first error.
- Submit "신청 내용 확인" → a plate replaces nothing; it appears under the form with the
  summary and the line "가상 천문대라서 이 신청은 어디에도 보내지 않았습니다." Focus moves to it.
- The form says before submit, beside the button, that it sends nothing.

## Storage

Nothing is stored. The page always opens on tonight (the current time if it is already dark,
otherwise the season's middle session), so there is no localStorage or sessionStorage at all.
`?at=YYYY-MM-DDTHH:MM` opens a given KST instant and `?capture` hides the gallery badge; both
exist only for the thumbnail and review captures.
