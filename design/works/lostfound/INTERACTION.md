# lostfound — interaction spec

Posture: a sovereign puzzle with a calm pace. One case takes 2–15 minutes. No timer, no score, no
failure state. The player's story per case: read the handover line (exposition) → look at the tags and
the people in line (inciting) → mark the grid and tie strings (rising action) → the last two or three
tags that will not settle (crisis) → **돌려드리기**: the tags turn fluorescent green one by one and each
ticket is marked 받아 감 (climax) → a short closing line and the next case (end).

## 1. Tie a tag to a person (the signature)

States of a tag: `free` (short string loop hangs from the eyelet) → `held` (lifted, string follows) →
`tied` (string runs to a ticket clip) → `confirmed` (green, after a correct 돌려드리기; locked).

| Trigger | Rule | Feedback |
|---|---|---|
| Drag from a tag (pointer down, moves 6px) | The string's free end follows the pointer. | Tag tilts 4° toward the pointer; string sags with distance; the ticket under the pointer gets a white outline and "여기에 묶기". |
| Release over a ticket | Tie: it is the same as an O in the 물건 × 찾는 분 grid block, so the row and column fill with automatic X. A tag already tied elsewhere moves; a person who already held a tag gets that tag back as `free`. | String snaps to the clip (120 ms). Live region: "3번 돋보기안경 꼬리표를 문덕배 님께 묶었어요." |
| Release anywhere else | Nothing changes. | String slides back (160 ms). |
| Tap a tag | `held`, a one-off mode. Tap a ticket to tie, tap the tag again or press Esc to put it down. Tapping the ticket it is already tied to unties it. | Tag lifts; every ticket shows "여기에 묶기" (the current one "풀기"). |
| Keyboard: Tab to a tag, Enter or Space | `held`; focus moves to the tickets (↑ ↓ ← → between them), Enter ties, Esc returns focus to the tag. | Same as tap, plus the live region reads the instruction once. |

Rules that prevent errors: a tag can only hang from one ticket; a ticket holds one tag. Confirmed tags
cannot be moved. Nothing is checked while the player ties: wrong pairs are allowed until 돌려드리기.

## 2. The deduction grid (solver aid)

- Cells cycle with a tap: empty → X → O → empty. Long rows are 44px on phones.
- An O fills its row and column in that block with automatic X (drawn in `--pencil`, lighter than the
  player's own X). They are not stored; clearing the O clears them.
- An O in the 물건 × 찾는 분 block *is* a tied tag (one truth, two views). In cross cases an O in
  물건 × 장소 / 물건 × 시각 writes the place or time onto the tag's blank line.
- Keyboard: the grid is one tab stop with a roving cursor. Arrows move, skipping gaps between blocks;
  `O` sets O, `X` sets X, Space cycles, Delete/Backspace clears, Enter pairs (toggles O). The
  live region reads "1번 우산, 문덕배 님: X".
- 표 숨기기 hides the grid (aria-expanded); the tag view still works on its own.
- Phones, cross cases: a block picker (물건×찾는 분, 물건×장소 …) shows one block at a time.

## 3. Hints

힌트 never solves silently. Order:
1. If any mark contradicts the answer: "이 칸은 다시 보세요" and that cell is outlined; button "그 칸 지우기".
2. Otherwise the engine (js/logic.js, the same one the solver proves the cases with) finds the easiest
   next deduction: a clue read against the tags → a row or column with one cell left → either/or and
   links between blocks → comparisons (time, queue number, same place). The hint names the clue card,
   outlines it and the cells, and says why in one or two sentences. Button "표시 넣기" applies it
   (undoable).
3. When the 물건 × 찾는 분 block is complete: "다 묶었어요. 돌려드리기를 눌러 보세요."

## 4. Check, solved, next

- 돌려드리기 is always available until the case is solved; with untied tags it says how many are left ("아직 묶지 않은 꼬리표가 2개 있어요. 모두 묶은 다음 눌러 주세요."). Correct: tags turn green left to right 140 ms apart
  (reduced motion: all at once), each ticket gets a handwritten 받아 감, the case is saved as solved
  and the closing panel offers 다음 사건. Wrong: no cell is revealed; the message says how to recover
  ("아직 맞지 않는 짝이 있어요. 힌트로 어디서 막혔는지 볼 수 있어요.").

## 5. Undo, reset, progress

- 되돌리기 (Ctrl+Z) steps back one action: a tie, a mark, a hint applied, a reset. 처음부터 clears
  the case and is itself undoable, so neither needs a confirmation dialog.
- localStorage `lostfound.v1` (wrapped in try/catch): current case, marks per case, solved flags,
  grid hidden. Without storage the game runs the same and forgets on reload.
- 사건철 (case drawer): ten cases with solved green tag marks, open any case at any time.

## 6. Announcements and motion

- One polite live region for actions, one for hints. The solved line is announced once.
- Motion only answers the player: tag lift, string follow and snap, green flip. No idle animation, no
  loop while nothing is touched (the string loop runs only while dragging or settling, and stops on
  `visibilitychange`). `prefers-reduced-motion`: no tilt, no sag animation, instant colour change.
