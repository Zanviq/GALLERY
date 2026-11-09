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
  - A 반려 document under the aim: `반려에 찍음`.
  - A target that slides past the aim by more than the outer tolerance without a stamp: `놓침`.
  - A 반려 document that leaves the aim clean: `반려 지킴`.
  - Success (정확, 조금 비뚤, 반려 지킴) adds to 연속; any other result resets it.
  - Multiplier: ×1, ×2 at 6 in a row, ×3 at 12, ×4 at 18 (counted per stamp, so a two-칸 document counts twice). Points: 정확 100, 조금 비뚤 40,
    반려 지킴 60, all times the multiplier.
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

All targets sit on one row of the document (the stamp row) so only timing matters, and every
target centre is at 0.08 + 0.1k document widths, which keeps step mode exact.

## Round timeline (75 s, normal pace)

| time | tray speed (doc widths/s) | documents |
|---|---|---|
| 0–15 s | 0.50 → 0.60 | 결재 one 칸 |
| 15–35 s | 0.60 → 0.72 | + 정정인 |
| 35–55 s | 0.72 → 0.86 | + 간인, 반려 |
| 55–75 s | 0.86 → 1.00 | + 두 칸, tighter gaps |

느긋하게 (slow pace) multiplies speed by 0.7. Best records are kept per pace.

## Lesson (teaches by doing)

Six documents at 0.32 doc widths/s, each with one marker line above the tray:
1. 담당 칸 only. The tray stops with the 칸 in the ring and waits: "지금 꾹!"
2. 담당 칸, no stop: "이번엔 멈추지 않아요. 칸이 동그라미에 들어올 때 꾹."
3. 결재란 with 과장 circled: "동그라미 친 칸에만 찍어요."
4. 정정인: "두 줄 그은 숫자 위에 정정인."
5. 간인: "두 장이 겹친 이음매에 반씩 걸치게."
6. 반려: "반려 서류는 찍지 말고 그냥 보내요."
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
a document enters, 퇴근 bell at 18:00. Off by the 소리 toggle (remembered). The game never depends
on sound.

## Edge cases

- localStorage blocked: records exist only for the session; nothing breaks.
- Resize or rotate mid-round: layout recomputes; world positions are in document widths, so the
  game state is unchanged.
- Very short screens (< 560px tall): documents shrink; the 꾹 button becomes a strip.
- Fonts late: the cover waits for `document.fonts.ready` (max 1.5s) before the first draw.
