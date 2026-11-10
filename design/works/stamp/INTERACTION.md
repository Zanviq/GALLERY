# 칼퇴 결재 — interaction spec

Posture: transient (a 75-second round), but replayed, so intermediates must be able to skip the
lesson and start in one press. One manual trigger does all the playing: **꾹** (tap anywhere on the
tray or the 꾹 button, Space, Enter).

Revision 2 (2026-11-10, owner's fourth review: "이전의 연속성이 사라지고 뚝뚝 끊기는 느낌이 너무
싫다. 내가 말한 긴장감은 속도를 점점 올리라는 의미였다."): the rules are the original ones again
(no 미결 pile, no documents to let through unstamped, no clock jump, no crunch events, no tray
knock). The tension is the tray itself: it never stops, and it gets faster every second.

## Concept story

17:58:45 at (주)한칸물산. 과장님 and 부장님 are at a workshop; 총무팀 구도담 대리 has the stamp
and 75 seconds of documents on the outgoing tray. Stamp each one in the right place and leave at
18:00 sharp. The tray starts at a stroll and ends more than twice as fast. Peak: a long run of 정확
while the tray races in the last 15 seconds. End: the clock hits 18:00, the tray glides to a stop,
and the 업무 일지 comes out as a carbon copy with the round's speed ramp on it; the player gives it
the last stamp of the day and 부장's marker comment appears.

## State machine

```
[cover] --결재 시작 (first time)--> [lesson] --done/skip--> [ready] --1.3s--> [playing]
[cover] --결재 시작 (has played)--> [ready]
[cover] --연습부터--> [lesson]
[playing] --P / 멈춤 / blur / tab hidden--> [paused] --계속하기--> [resume-grace 0.7s] --> [playing]
[paused] --처음부터--> [ready]      [paused] --첫 화면--> [cover]
[playing] --clock 18:00--> [closing] --tray glides to a stop 1.1s--> [log]
[log] --확인 도장 꾹--> [log-signed] --한 판 더--> [ready] | --첫 화면--> [cover]
[lesson] behaves like [playing] with its own documents and no clock; pause works the same.
```
Impossible states: no stamping in cover/paused/log (except the single 확인 stamp), no pausing in
cover/log, no clock while in lesson.

## The speed curve (the tension)

The tray speed is a geometric curve over the 75 clock seconds:
`v(t) = 0.50 x 2.4^(t/75)` document widths per second, so 0.50 at 17:58:45 and 1.20 at 18:00.
Every second adds the same share of speed (about 1.2 %), which is felt as a steady build rather than
a step; the absolute rise is largest at the end, so the last stretch is clearly fast.

| clock | 17:58:45 | :59:00 | :59:15 | :59:30 | :59:45 | 18:00 |
|---|---|---|---|---|---|---|
| speed (dw/s) | 0.50 | 0.60 | 0.71 | 0.85 | 1.01 | 1.20 |
| 배속 shown | 1.0 | 1.2 | 1.4 | 1.7 | 2.0 | 2.4 |

- No jumps anywhere: the tray spins up from rest over 0.5 s (smoothstep) when the round starts, after
  a pause and after the lesson's stop; at 18:00 it decays smoothly to a stop. The largest change of
  speed the check bot measured once the tray is up to speed is 0.02 dw/s per second.
- Visible: the time rule under the HUD is a wedge drawn from the curve (thin at 17:58:45, full height
  at 18:00); carbon fills it towards 18:00, so the player sees both how far the round is and how
  much faster it gets. Beside it the speed now, as 배속 (1.0 to 2.4). The rail ticks under the
  documents ride with the tray, and the ink smears more the faster it runs. In the last ten seconds
  the clock turns solid carbon (a state, not an event).
- Audible: the paper swish of each arriving sheet gets brighter and shorter with the speed.
- 느긋하게 (slow pace) multiplies the whole curve by 0.7. Best records are kept per pace.

## The stamp (core microinteraction)

- **Trigger**: pointerdown on the tray or the 꾹 button (not click, so there is no 300ms wait),
  keydown Space or Enter while playing. Uses `event.timeStamp` to place the stamp where the tray
  was at the moment of the press, not at the next frame.
- **Rules**:
  - The stamp is ready again 140ms after a press; presses inside that window are ignored.
  - The aim is a fixed point on the tray (dashed blue ring). The press judges every unsatisfied
    target on the document under the aim by horizontal distance `dx` (in document widths):
    `정확` if |dx| <= max(0.028, v * 0.045s); `조금 비뚤` if |dx| <= min(max(0.07, v * 0.11s), 0.095);
    otherwise `빗나감` (on the paper but in the wrong place, or in the wrong 결재란 칸).
    In time: 정확 ±56 ms at the start and ±45 ms at 18:00; 조금 비뚤 ±140 ms down to ±79 ms.
  - Nothing under the aim: `헛도장` (stamp hits the steel tray).
  - A 반려 document under the aim: `반려인데!`.
  - A target that slides past the aim by more than the outer tolerance without a stamp: `놓침`.
  - A 반려 document that leaves the aim clean: `반려 지킴`.
  - Success (정확, 조금 비뚤, 반려 지킴) adds to 연속; any other result resets it.
  - Multiplier: ×1, ×2 at 6 in a row, ×3 at 12, ×4 at 18 (counted per stamp, so a two-칸 document
    counts twice). Points: 정확 100, 조금 비뚤 40, 반려 지킴 60, all times the multiplier.
- **Feedback**: the seal drops (60ms), rests on the paper and lifts; the impression is generated at
  the real landing point (pressure tilt, partial rim, speckle, smear when the tray is fast) in a
  worker and appears within the descent; a thump; a marker word next to the impression; the HUD 연속
  and 점수 update; a polite live region reads the result. A slip also gives one quick carbon flash
  over the tray (300 ms, opacity only), the judgement word struck through and a short low double
  knock. The tray never jolts.

## Document rules (what "correct" means)

| doc | target | how it is marked |
|---|---|---|
| 결재 (품의서, 기안서, 지출결의서…) | one 칸 of 담당 / 과장 / 부장 | that 칸 circled in marker, others signed or crossed |
| 두 칸 결재 (late) | two 칸, stamped one after the other | both circled |
| 정정인 | the struck-through figure | double strike line, new figure written above |
| 간인 | the seam where two sheets overlap | "간인" note with an arrow; after stamping, the sheets separate and each keeps half |
| 반려 | none; must stay clean | "반려" written across, 결재란 crossed |

All targets sit on one row of the document (the stamp row) so only timing matters, and every
target centre is at 0.08 + 0.1k document widths, which keeps the optional step mode exact.

## Round timeline (75 s, normal pace)

| arrival | documents | gap between sheets |
|---|---|---|
| 0–15 s | 결재 one 칸 | 0.16–0.32 dw |
| 15–35 s | + 정정인 | 0.14–0.30 dw |
| 35–55 s | + 간인, 반려 | 0.12–0.28 dw |
| 55–75 s | + 두 칸 | 0.10–0.24 dw |

Gaps are in document widths, so as the tray speeds up the documents also come more often: about one
every 2.5 s at the start, one a second at the end. Never two 반려 in a row.

**Fairness check.** `design/works/stamp/scripts/bot.js` plays a perfect round (stamps every open
target as it crosses the ring, leaves every 반려 alone) and reports: 0 놓침 and 0 빗나감 through
18:00 at 2.4배속; the shortest time between two targets is about 172 ms (a two-칸 결재 near the end,
a comfortable double tap); the windows at 18:00 are ±45 ms (정확) and ±79 ms (조금 비뚤).

## Lesson (teaches by doing)

Six documents at 0.36 doc widths/s, each with one marker line above the tray:
1. 담당 칸 only. The tray glides to a stop with the 칸 in the ring and waits: "지금 꾹!"
2. 담당 칸, no stop: "이번엔 멈추지 않아요. 칸이 점선 원에 겹칠 때 꾹."
3. 결재란 with 과장 circled: "동그라미 친 칸에만 찍어요."
4. 정정인: "숫자를 고친 서류엔 정정인. 두 줄 그은 숫자 한가운데에."
5. 간인: "계약서 두 장엔 간인. 겹친 이음매에 반씩 걸치게."
6. 반려: "반려 서류는 찍지 말고 그냥 보내요."
A miss shows why and sends the same kind of document again (at most twice, then moves on).
"연습 건너뛰기" is always visible during the lesson. Finishing it is remembered (try/catch). The
last line says what the round adds: "18시가 가까울수록 트레이가 빨라져요."

## The work log (result)

- Headline in marker, about how far up the speed ramp the longest clean run went:
  no slip at all "18:00 칼퇴!" ("2.4배속까지 한 장도 안 놓쳤어요."); a clean run of 6+ that lasted
  to 18:00 "2.4배속 완주!"; otherwise "1.9배속에서 끊김" with "최고 연속 23번, 17:59:12부터 17:59:41까지."
- The speed ramp of the round as a small chart (same wedge as the time rule): the longest clean
  run filled in carbon, each slip a small cross on the curve; 17:58:45 1.0배속 and 18:00 2.4배속 at
  its ends. The chart has a text label for screen readers.
- Score with 새 기록 or the best, 부장's comment after the 확인 stamp, and one line that points at the
  next round: a timing tip from the last 20 seconds when the slips lean one way ("마지막 20초에 늦게
  찍은 게 4번. 빨라질수록 한 박자 일찍 꾹."), else the gap to the record, else the next multiplier.
- The tally (결재 처리, 정확, 조금 비뚤, 빗나감, 놓침, 헛도장, 반려 지킴, 반려에 찍음, 최고 연속).

## Reduced motion and step mode

- `prefers-reduced-motion: reduce` changes nothing about the tray: it runs continuously along the
  same curve, and the seal still drops. Only non-essential effects get calmer: the marker words fade
  in instead of popping, the judgement word fades instead of nudging, the multiplier does not bump.
- Step mode (칸칸이 이동) is an opt-in setting only, never a default. The tray then jumps 0.1 doc
  widths per tick, 0.25 s a tick easing to about 0.18 s at 18:00; a target sits exactly in the ring
  for one whole tick. Tolerances: 정확 at 0, 조금 비뚤 one tick away. Settings live under the key
  `stamp.v2`; from an older `stamp.v1` only sound, pace and the finished lesson carry over, never
  a saved step setting (v1 switched it on by itself under reduced motion).
- No screen shake, ever, in any mode.

## Pause and focus

- P toggles pause; M toggles sound; Space/Enter stamp only while playing.
- Window blur and `visibilitychange` hidden pause automatically. Resume has a 0.7s grace hold, then
  the tray spins up over 0.5 s.
- HUD buttons keep pointer focus off (mousedown default prevented) so a following Space still
  stamps; keyboard users still tab to them normally.
- Dialogs (cover, pause, log) trap nothing permanently: Tab cycles inside the open sheet, Escape
  in pause resumes, focus returns to the 꾹 button when play resumes.

## Sound (WebAudio, synthesized, created on the first user gesture)

thump (sine 120→50Hz + low noise), paper tock on 정확, steel tick on 헛도장, a paper swish when a
document enters (brighter and shorter as the tray speeds up), pencil taps when the multiplier goes
up, a low double knock on a slip, the 퇴근 bell at 18:00. Off by the 소리 toggle (remembered). The
game never depends on sound.

## Smoothness (how the frame stays cheap)

- The documents sit still on the belt; the belt slides with one composited transform a frame, the
  rail ticks with another, the time rule with a third. No layout reads in the frame loop, and the
  Web Animations API restarts the judgement word and the flash (no forced reflow).
- Each sheet is painted once onto its own canvas (print, rules, pen and marker over the scanned
  paper) while it is still off to the right, 2.5 ms a frame at most; the ink impressions are drawn
  in a worker. Measured with a perfect-play round under 4x CPU throttling in headless Chrome: the
  game's frame callback takes 0.4 ms (p50), 1.1 ms (p95); see DESIGN.md for the run.

## Edge cases

- localStorage blocked: records exist only for the session; nothing breaks.
- Resize or rotate mid-round: layout recomputes and the sheets are painted again at the new size;
  world positions are in document widths, so the game state is unchanged.
- Very short screens (< 560px tall): documents shrink; the 꾹 button becomes a strip.
- Fonts late: the cover waits for `document.fonts.ready` (max 1.5s) before the first draw, and the
  sheets are painted again when the fonts arrive.
- No Worker or OffscreenCanvas: the ink is drawn on the main thread, as before.
