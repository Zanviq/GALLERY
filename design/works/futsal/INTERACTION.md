# 늦깎이 FS: the tactics board (interaction spec)

The board is the club's locker-room magnet board, drawn on the court colour. Five claret magnets (the
goalkeeper is white with a claret number) and a ball lie on a futsal court drawn to the Laws of the
Game. The visitor draws run and pass arrows and presses play; the magnets move along the arrows in
order. Three of the club's set plays come preloaded.

Concept story: a visitor who has never played opens the page, sees "다들 헛발질부터 했어요", and a
second later the kick-in the club practises on Thursdays plays out on the board. Peak: the ball goes
into the net after a play they built or replayed. End: the move list reads the play back in words, and
the next section says what to bring on the first day.

## Court (model units are metres; we attack toward +x)

- Field 40 × 20. Halfway line x = 20, centre circle r 3, centre mark.
- Goals 3 m between posts (inner), posts 8 cm, so post outsides at y = 8.42 and 11.58; nets 1 m deep.
- Penalty area: quarter circles r 6 centred on the post outsides, joined by a 3.16 m line at x = 6
  (and x = 34).
- Penalty mark 6 m, second penalty mark 10 m, with the two marks 5 m either side of it.
- Corner arcs r 0.25; the 5 m corner-distance marks outside the goal line.
- Substitution zones on the bench touchline (y = 20): x 10–15 and 25–30 (5 m long, starting 5 m from
  the halfway line), each end marked by a 0.8 m line, 0.4 m in and 0.4 m out.
- Run-off strip 2 m wide in `--court-deep`.
- "Left/right" are as seen when attacking: left = small y.
- Orientation: horizontal when the board is 600 px wide or more. Narrower, the court is rotated so we
  attack up the phone: screen (X, Y) = (y, 40 − x). Digits stay upright.

## Pieces

| id | magnet | name | role |
|---|---|---|---|
| p1 | white, claret 1 | 해경 | 골키퍼 |
| p3 | claret, white 3 | 수진 | 픽소 (뒤를 지켜요) |
| p7 | claret, white 7 | 은채 | 오른쪽 알라 |
| p11 | claret, white 11 | 다온 | 왼쪽 알라 |
| p9 | claret, white 9 | 미란 | 피보 (앞에서 버텨요) |
| ball | white with ink patches | 공 | |

Visual radius 15 px (ball 8 px) whatever the scale; hit radius 22 px (44 px targets). The ball belongs
to the nearest player within 1.4 m at the start; a received ball sits 1 m in front of the receiver on
the side it came from.

## Model

- `setup`: start position of each piece.
- `moves`: ordered list of `{ kind: 'run' | 'pass', piece, to: {x,y}, target?: playerId, beat }`.
  A run moves a player from wherever their previous run ended. A pass always starts at the ball's
  position at that moment; if its end is within 1.6 m of a player's position at the end of that beat,
  it snaps to that player (`target`) and the ball becomes theirs. A pass ending between the posts
  past the goal line is a shot.
- Beats: every new arrow gets its own beat unless "앞 화살표와 같이" is on (or Shift is held while
  drawing), which puts it in the last beat. Rules per beat: one pass at most; one run per player.
  Breaking a rule refuses the arrow and says why.

## Timing (at 1×)

- Run: 5.5 m/s, at least 0.45 s, ease-in-out. Pass: 13 m/s, at least 0.3 s, ease-out (the ball slows).
- Beat length = longest run, or the pass if longer. A pass to a player who runs in the same beat
  leaves late enough to arrive with them (a through ball); otherwise it leaves at the start.
- A ball owner who runs in a beat without a pass dribbles: the ball keeps its offset.
- 0.2 s pause between beats. Speed 0.5× / 1× / 2× scales everything.
- Reduced motion: no tweening. Each beat jumps to its end positions and holds 1.1 s / speed; the
  current beat's arrows are drawn heavier, finished ones fade to 45 %.

## States

```
          load set play / undo / clear / edit
                 ┌──────────────┐
                 ▼              │
 [SETUP] ──press magnet──▶ [DRAWING] ──release ≥0.6 m──▶ commit arrow ──▶ [SETUP]
    │  ▲                       └──release <0.6 m──▶ [SELECTED]
    │  │                                             │ tap court / tap player (ball selected) → commit
    │  └──────── Esc / tap same magnet ──────────────┘
    │ play
    ▼
 [PLAYING] ──pause / tab hidden / board off-screen──▶ [PAUSED] ──play / back in view (auto-paused only)──▶ [PLAYING]
    │ last beat done
    ▼
 [ENDED] ──play──▶ [PLAYING from start]      any edit in PAUSED/ENDED → pieces back to setup, then edit
```

- "끌면" toggle: 화살표 (default) | 자리 옮기기. In 자리 옮기기, dragging moves the magnet's start spot
  and select-then-tap moves it to the tapped spot. Shift-drag on desktop also moves without switching.
- Play button text: 재생 → 멈춤 while playing → 다시 재생 at the end. 한 박자 advances one beat
  (animated, or a jump under reduced motion). 처음 자리 puts the magnets back without clearing.
- 되돌리기 undoes the last change (arrow, move, delete, set-play load, clear); 50 steps. Ctrl/Cmd+Z
  inside the board does the same. 화살표 지우기 removes all arrows (undoable, so no confirm dialog).
- Loading a set play replaces the board (undoable), shows its coaching note, and plays it once (normal
  motion). Under reduced motion it only loads.
- First view: the kick-in play is loaded; in normal motion it plays once when at least half the board
  is in view and the visitor has not touched it. Never again unless asked.

## Feedback

- Press: the magnet lifts (scale 1.08 + 1 px shadow). Drawing: a live arrow; a white ring appears on
  the player a pass would snap to.
- Commit: the arrow appears with its beat number in a small white disc at its midpoint; the move
  list gains a row; the status line says what was added ("2박자: 패스 7번 은채 → 9번 미란, 5 m").
- Refused: the status line says why ("한 박자에 패스는 하나만 돼요. '같이'를 끄고 그려 보세요.").
- Shot: when a shot reaches the net, the net lines thicken for 600 ms and the status says "골".
- Run arrows are dashed white with an open head; pass arrows are solid white with a filled head.
- Selected magnet: dashed white ring. Focus: white ring plus ink ring.

## Keyboard

- Tab order: 1, 3, 11, 7, 9, ball, then the tools. Each magnet is a `role="button"` with a name like
  "7번 은채, 오른쪽 알라. 지금 상대 진영 오른쪽."
- Arrow keys move the focused piece 0.5 m in the screen direction (Shift: 2 m), clamped to the court
  and run-off. Each move is one undo step per burst of key presses.
- Enter or Space starts an arrow from the focused piece (run for a player, pass for the ball). A
  target ring appears; arrow keys move it; Enter or Space commits; Esc cancels. Tab away cancels.
- Delete / Backspace on a magnet removes that piece's last arrow.
- The status line is `aria-live="polite"`.

## Move list (순서)

A visible ordered list next to (desktop) or under (phone) the board, in plain words, built from the
same model. Each row: beat number, sentence, a "같이" toggle (join the previous beat, `aria-pressed`)
from the second row on, and a 빼기 button. Empty state: "아직 화살표가 없어요. 선수 자석에서 끌면
뛰는 길, 공에서 끌면 패스예요." Start positions are listed in a collapsed `<details>`.

## Set plays (the club's own)

All with p1 해경 in goal at (2, 10).

**킥인 3번** — "킥인은 4초 안에 차요. 미란이 짧게 받으러 오는 순간 은채는 줄 따라 바로 뛰어요."
Setup: p7 (29, 20.4) with the ball on the line (29, 20); p9 (35, 12.5); p11 (31, 6); p3 (22, 11).
1. p9 runs to (31.5, 17); p11 runs to (36.5, 8).
2. pass → p9.
3. p7 runs to (35.5, 18.2); p3 runs to (26, 13); pass p9 → p7 (through ball).
4. p11 runs to (37.4, 10.6); pass p7 → p11.
5. shot p11 → (40.5, 9.4).

**코너 짧게** — "코너는 짧게 주고 뒤로 빼요. 다들 골대 앞에 몰리면 수진의 슛 길이 열려요."
Setup: p7 (40.4, 20.4), ball (39.8, 19.8); p11 (35, 15); p9 (37, 9); p3 (29, 10).
1. p11 runs to (37.6, 17.8); p9 runs to (38.4, 12).
2. pass → p11.
3. p3 runs to (31, 12.6); pass p11 → p3.
4. shot p3 → (40.5, 9.0).

**4-0 돌기** — "넷이 한 줄로 서서 돌아요. 공 주고 바로 앞으로 뛰고, 빈자리는 옆 사람이 채워요."
Setup: p11 (16, 2.5); p3 (15, 7.5) with the ball (15.9, 7.9); p7 (15, 12.5); p9 (16, 17.5).
1. pass p3 → p7.
2. p3 runs to (27, 3); p11 runs to (15.5, 7.5).
3. pass p7 → p11.
4. p7 runs to (28, 17); p9 runs to (15.5, 12.5).
5. p3 runs to (32.5, 6); pass p11 → p3.
6. shot p3 → (40.5, 9.6).

## Edge cases

- Arrow shorter than 0.6 m = a tap. Ends are clamped to x −1.5…41.5, y −1.5…21.5.
- 30 arrows at most ("화살표는 서른 개까지예요").
- Resize or rotation during a drag cancels the drag; the model does not depend on orientation.
- Editing while playing first stops playback and returns to setup.
- Pages without storage: the speed and the 끌면 toggle simply reset on reload.
