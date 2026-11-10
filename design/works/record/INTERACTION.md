# 깊은쪽 《물 빼는 날》 — interaction

One lively thing, in its own section, beside the information it plays: the turntable. Everything else on the
page is read, not played with (one small pre-order form). Code: `works/record/js/turntable.js` (UI and
geometry), `js/music.js` (sound), `js/order.js` (form).

## 1. The turntable (`#listen`, black field = the deck's top plate)

Geometry in units of the record diameter D (the deck is 1.3 D × 1.16 D): record centre (0.52, 0.64), tonearm
pivot (1.12, 0.28), effective length 0.757 D (230 mm on a 304 mm record), so the arm swings over the record like
a real one. The grooves run from r 0.479 D (first groove) to 0.215 D (end of the side) at a constant pitch over
the side's real length (3 s lead-in, the tracks, 2 s gaps); the run-out is locked at 0.178 D. Thin rings on the
record mark the gaps between tracks (from the track lengths, recalculated for each side).

| Trigger | Rule | Feedback |
|---|---|---|
| Section in view | The record spins at 33⅓ rpm (1.8 s a turn), easing up over about a second. | Label type turns with it; the light band (sheen) stays still. |
| Pointer over the record | Radius → position on the side → track. | That track's band of grooves lightens; its row underlines. |
| Click / tap on the record | Arm lifts if down, swings to that radius (260–760 ms, ease), drops after 120 ms. Label/run-out area drops into the run-out. | Arm shadow shrinks (lowered), needle thump, surface crackle, music from that point in that track. |
| Drag the tonearm (mouse, pen or touch; 48 px hit band along the arm) | Arm follows the pointer angle around the pivot, clamped between rest and run-out; while dragging the needle is up and silent. Release over the grooves drops it there; release off the record returns to rest. | Band under the needle lightens while dragging. |
| Tap the tonearm without dragging | Works the cue lever. | |
| `바늘 내리기 / 바늘 들기` (cue lever, `aria-pressed`) | Down: at the arm's radius (from rest: just before A1/B1). Up: lifts, keeps the place. | Button fills turquoise when the needle is down. |
| Track row (`aria-pressed`) | Flips the record if it is the other side, then cues to just before the track and drops. Pressing the playing row lifts the needle. | Row fills turquoise, its length becomes elapsed time "1:12 / 4:12", a one-line note opens under it. |
| `A면 / B면` | Lift, arm to rest, flip (scaleX through 0 in 520 ms; under reduced motion a fade instead), redraw rings for that side. | Label letter changes A → B; status "B면을 얹었습니다." |
| Playing | Position = start + audio-clock time. The arm creeps inward (it really tracks the groove); crossing a gap changes track; past the last track the run-out clicks once a revolution. | Row elapsed time per second; status names the track; at the end "A면이 끝났습니다. B면으로 뒤집어 보세요." |
| Keyboard on the tonearm (`role=slider`, focus ring around the arm) | ←/↑ and →/↓ move 15 s; Page Up/Down a track; Home to rest; End to the last track; Enter/Space lower or lift. While the needle is down, moves seek and keep playing. | `aria-valuetext` "A면 3번 물 빼는 날, 2분 54초, 바늘 내림"; status line is `aria-live`. |

Every action has a keyboard path: the slider, the lever, the side buttons, the track rows (all real buttons).

## 2. Sound (`js/music.js`)

- Nothing sounds before a gesture. The first needle drop (click, drag, tap, row, lever, keyboard) creates the
  AudioContext inside that gesture and turns sound on, unless the visitor already chose 소리 끔.
- `소리 켜짐 / 꺼짐` (`aria-pressed`) mutes the output (0.12 s ramp); the record keeps playing silently.
- No AudioContext: the button is disabled with "이 브라우저에서는 소리를 낼 수 없습니다"; needle, rows and time
  still work on a performance.now clock.
- Ten tracks are composed in code: tempo, metre (B5 is in 3/4), key, chord progression per section, drum, bass,
  chord, arpeggio patterns, and a four-bar melody generated from the chords (seeded by track id: chord tones on
  strong steps, passing notes between, the first bar's shape returns in the third, the phrase ends home). Each
  has its own voices (plucked guitar, electric piano, organ, pad, bell, fuzz bass, driven chords) and its own
  room: everything runs through a generated 2.4-second impulse response (the drained pool) and a slow pitch
  "wow" at the record's rotation frequency. B1 잠영 is heard through a 1.1 kHz low-pass (under water).
- A look-ahead scheduler (25 ms timer, 140 ms ahead) per playback session; each session has its own gain node
  that is faded and dropped on lift, so nothing leaks into the next drop. The output has headroom (peaks
  0.5–0.73 measured offline for all ten tracks, `design/works/record/scripts/audiotest.js`).

## 3. Reduced motion (BRIEF §000: calmer, not still)

Under `prefers-reduced-motion: reduce` the record still spins at its real speed, the arm still swings and
lowers, the music still plays, the row still counts. Dropped: smooth scrolling (only set under
no-preference) and the flip's horizontal fold (a fade instead). Nothing on the page is scroll-linked.

## 4. Pausing

The spin and arm loop (one rAF) runs only while the listen section is on screen and the tab is visible. When
it leaves the screen or the tab hides, the loop stops and the AudioContext is suspended, which also stops the
transport clock; coming back resumes at the same point.

## 5. Pre-order (`#order`, fictional)

Radio options (택배 / three shops), quantity 1–2 with disabled ends, live total, submit → a confirmation panel
in the same place that takes focus (code SRG1-xxxx, what and where), "가상 예약입니다" before and after, kept
only in localStorage (wrapped in try/catch; works without it), 예약 취소 returns focus to the button.

## 6. Hero

Still, like a printed poster. Only one small answer: pointing at the sleeve (hover-capable pointers only)
draws the record 6% further out of it and turns it 24 degrees (0.7 s), so the printed label shows a little more.
