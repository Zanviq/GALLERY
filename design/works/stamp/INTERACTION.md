# 칼퇴 결재 — interaction spec

Posture: transient (a 75-second round), but replayed, so intermediates must be able to skip the
lesson and start in one press. One manual trigger does all the playing: **꾹** (tap anywhere on the
tray or the 꾹 button, Space, Enter).

## Concept story

17:58:45 at (주)한칸물산. 과장님 and 부장님 are at a workshop; 총무팀 구도담 대리 has the stamp
and 75 seconds of documents on the outgoing tray. Stamp each one in the right place and leave at
18:00 sharp. Peak: a long run of 정확 while the tray speeds up in the last 20 seconds. End: the
clock hits 18:00, the tray stops, and the 업무 일지 comes out as a carbon copy; the player gives it
the last stamp of the day and 부장's marker comment appears.

## State machine

```
[cover] --결재 시작 (first time)--> [lesson] --done/skip--> [ready] --1.2s--> [playing]
[cover] --결재 시작 (has played)--> [ready]
[cover] --연습부터--> [lesson]
[playing] --P / 멈춤 / blur / tab hidden--> [paused] --계속하기--> [resume-grace 0.7s] --> [playing]
[paused] --처음부터--> [ready]      [paused] --첫 화면--> [cover]
[playing] --clock 18:00--> [closing] --tray stops 0.6s--> [log]
[log] --확인 도장 꾹--> [log-signed] --다시 하기--> [ready] | --첫 화면--> [cover]
[lesson] behaves like [playing] with its own documents and no clock; pause works the same.
```
Impossible states: no stamping in cover/paused/log (except the single 확인 stamp), no pausing in
cover/log, no clock while in lesson.

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
  - Nothing under the aim: `헛도장` (stamp hits the steel tray).
  - A send-back document (반려, 서명 빠짐, 수정테이프) under the aim: `찍으면 안 돼요`, the mark
    on the paper names the flaw (반려인데! / 서명 빠짐! / 수정테이프!).
  - A target that slides past the aim by more than the outer tolerance without a stamp: `놓침`.
  - A send-back document that leaves the aim clean: `반려 지킴`.
  - Success (정확, 조금 비뚤, 반려 지킴) adds to 연속; any other result resets it.
  - Multiplier: ×1, ×2 at 5 in a row, ×3 at 10, ×4 at 15 (counted per stamp, so a two-칸
    document counts twice). Points: 정확 100, 조금 비뚤 40, 반려 지킴 60, all times the multiplier,
    doubled again on the 긴급 document.
  - **Penalty (revision)**: 빗나감, 엉뚱한 칸, 두 번 찍음 and 찍으면 안 돼요 spoil the paper: -50 points
    and the document is returned (반송): it lifts off the tray and lands on the 미결 pile. 놓침
    sends the document to the pile too (no point loss). 헛도장 only breaks the 연속.
- **Feedback**: the stamp drops (60ms) and lifts (160ms); the impression is generated on the
  paper at the real landing point (pressure tilt, partial rim, speckle, smear when the tray is fast);
  a thump; a marker word next to the impression (정확 / 조금 비뚤 / 빗나감 / 놓침 / 헛도장);
  the HUD 연속 and 점수 update; a polite live region reads the result.
- **Loops**: speed and document mix escalate over the round (below). Tolerances scale with speed
  so that the time window stays humane at the top speed.

## Document rules (what "correct" means)

| doc | target | how it is marked |
|---|---|---|
| 결재 (품의서, 기안서, 지출결의서…) | one 칸 of 담당 / 과장 / 부장 | that 칸 circled in marker, others signed or crossed |
| 두 칸 결재 (late) | two 칸, stamped one after the other | both circled |
| 정정인 | the struck-through figure | double strike line, new figure written above |
| 간인 | the seam where two sheets overlap | "간인" note with an arrow; after stamping, the sheets separate and each keeps half |
| 반려 | none; must stay clean | "반려" written across, 결재란 crossed |
| 서명 빠짐 (from 15 s) | none; must stay clean | looks like a normal 결재, but a 칸 before the circled one has no signature |
| 수정테이프 (from 30 s) | none; must stay clean | the 금액 row is covered by correction tape with a new figure written on it |

The two flawed documents are labelled like clean ones in the memo line on purpose: catching the
flaw is the check that makes speed cost something. They only ever sit one row below the stamp row
(결재란 and the 금액 row), so the check is a glance, not reading.

All targets sit on one row of the document (the stamp row) so only timing matters, and every
target centre is at 0.08 + 0.1k document widths, which keeps step mode exact.

## Round timeline (75 s on the clock, normal pace)

| clock | tray speed (doc widths/s) | documents |
|---|---|---|
| 0–15 s | 0.55 → 0.62 | 결재 one 칸 |
| 15–30 s | 0.62 → 0.71 | + 정정인, 서명 빠짐 |
| 30–45 s | 0.71 → 0.80 | + 간인, 반려, 수정테이프 |
| 45–75 s (crunch) | 0.80 → 1.04 | + 두 칸, gaps 8–20 units, the 긴급 document at 54 s |

느긋하게 (slow pace) multiplies speed by 0.7. Never two send-back documents in a row. Best records
are kept per pace.

## Tension (revision 2026-11-10, after "게임의 긴장감이 부족하다")

- **The clock speeds up.** From 17:59:30 the game clock runs 1.0x → 1.3x real time over 12 s and
  stays there, so the last 30 clock seconds pass in about 24 real seconds; the tray speed follows
  the clock. The HUD clock turns solid carbon, the time rule under the HUD thickens, the wall clock
  ticks every clock second (louder in the last 10), and the memo says "마지막 30초! 시계가 빨라져요."
- **The 미결 pile.** A stack at the left end of the stamp zone, sitting on the tray edge: one sheet
  per missed or returned document, up to 12 drawn, the count in marker beside it. Returned
  documents fly onto it (640 ms, lift then arc and shrink). While the pile is not empty, a share of
  new arrivals (20% + 8% per sheet, up to 55%) are clean copies from the pile marked 재상신; a sheet
  leaves the pile when its copy slides into view. A good run therefore clears the pile; a bad run
  feeds it.
- **The interruption.** At 54 s on the clock a 긴급 결재 (부장 칸) is slipped in: "잠깐만요! 긴급
  서류예요. 부장 칸, 점수 두 배." with two phone rings.
- **Mistake cue.** Every non-success: the tray knocks sideways (260 ms) and flashes a carbon frame
  (420 ms), the judgement word is struck through, and a low double knock plays (헛도장 keeps its
  steel clink only). Reduced motion: no knock, no flight (the returned sheet fades where it is), the
  carbon flash and the sound stay.
- **The end.** At 18:00 copies from the pile still on the tray count as 미결. The work log opens on
  the leaving time: "18:00 칼퇴!" with no 미결, otherwise "18:21 퇴근" with "미결 3장, 야근 21분" (7
  minutes per sheet). Each sheet left costs 100 points from the final score. Under the score one
  line points at the next round: what the 미결 cost, the gap to the best record, or the next
  multiplier step. The buttons (확인 도장, then 한 판 더) sit above the tally on phones.
- **Fairness check.** `design/works/stamp/scripts/bot.js` plays a perfect round (stamps every open
  target as it crosses the ring, leaves every send-back alone): 0 놓침 and an empty pile through
  the crunch, so every spawn sequence is playable at full speed.

## Lesson (teaches by doing)

Eight documents at 0.36 doc widths/s, each with one marker line above the tray (7 and 8 added in
the revision: 서명 빠짐, 수정테이프). The lesson has no clock and no pile.
1. 담당 칸 only. The tray stops with the 칸 in the ring and waits: "지금 꾹!"
2. 담당 칸, no stop: "이번엔 멈추지 않아요. 칸이 동그라미에 들어올 때 꾹."
3. 결재란 with 과장 circled: "동그라미 친 칸에만 찍어요."
4. 정정인: "두 줄 그은 숫자 위에 정정인."
5. 간인: "두 장이 겹친 이음매에 반씩 걸치게."
6. 반려: "반려 서류는 찍지 말고 그냥 보내요."
7. 서명 빠짐: "담당 칸 서명이 빠졌어요. 앞 칸이 비어 있으면 찍지 말고 보내요."
8. 수정테이프: "금액을 수정테이프로 고쳤어요. 이것도 찍지 말고 보내요."
A miss shows why and sends the same kind of document again (at most twice, then moves on).
"연습 건너뛰기" is always visible during the lesson. Finishing it is remembered (try/catch).

## Reduced motion and step mode

- `prefers-reduced-motion: reduce` turns on step mode by default (the player can turn it off in the
  menu, and anyone can turn it on). The tray jumps 0.1 doc widths per tick, 300ms → 220ms a tick
  over the round; a target sits exactly in the ring for one whole tick. Tolerances: 정확 at 0, 조금
  비뚤 one tick away.
- The stamp does not travel; it is shown pressed for 120ms. Marker words appear without movement.
- No screen shake, ever, in any mode.

## Pause and focus

- P toggles pause; M toggles sound; Space/Enter stamp only while playing.
- Window blur and `visibilitychange` hidden pause automatically. Resume has a 0.7s grace hold.
- HUD buttons keep pointer focus off (mousedown default prevented) so a following Space still
  stamps; keyboard users still tab to them normally.
- Dialogs (cover, pause, log) trap nothing permanently: Tab cycles inside the open sheet, Escape
  in pause resumes, focus returns to the 꾹 button when play resumes.

## Sound (WebAudio, synthesized, created on the first user gesture)

thump (sine 120→50Hz + low noise), paper tock on 정확, steel tick on 헛도장, soft paper slide when
a document enters, 퇴근 bell at 18:00. Revision: a low double knock on every mistake (buzz), two
short phone rings at the crunch and the 긴급 document (alarm), the wall clock's tick each clock
second in the last 30 (tock, louder in the last 10). Off by the 소리 toggle (remembered). The game never depends
on sound.

## Edge cases

- localStorage blocked: records exist only for the session; nothing breaks.
- Resize or rotate mid-round: layout recomputes; world positions are in document widths, so the
  game state is unchanged.
- Very short screens (< 560px tall): documents shrink; the 꾹 button becomes a strip.
- Fonts late: the cover waits for `document.fonts.ready` (max 1.5s) before the first draw.
