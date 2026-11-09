# 획 하나 차이 · interaction

Posture: transient-to-sovereign game. A visit is 2–10 minutes; the player is focused, so the board
shows only what the current puzzle needs, and everything is reversible (no confirm dialogs).

## The rules the player learns (three, introduced one at a time)
1. **모아 쓰기** — put jamo into a 칸. Top half: 첫소리 and 가운뎃소리. Bottom half: 받침.
   Same consonants stack into a double (ㄱ+ㄱ=ㄲ); vowels stack into compounds (ㅗ+ㅏ=ㅘ, ㅏ+ㅣ=ㅐ);
   two consonants in a 받침 make a cluster (ㄹ+ㅂ=ㄼ). Anything that cannot stack swaps.
2. **획 더하기** — the chalk adds one stroke along the 훈민정음 가획 families:
   ㄱ→ㅋ · ㄴ→ㄷ→ㅌ · ㅁ→ㅂ→ㅍ · ㅅ→ㅈ→ㅊ · ㅏ→ㅑ · ㅓ→ㅕ · ㅗ→ㅛ · ㅜ→ㅠ.
   The stick has a fixed number of strokes per puzzle.
3. **획 옮기기** — the eraser removes one stroke and gives it back to the chalk. Strokes are
   conserved, so a puzzle with no chalk is a matchstick problem: which letter gives up a stroke,
   and which one takes it. Every puzzle uses its strokes exactly; nothing is a decoy.
The answer is checked when every 칸 holds a full syllable and no jamo is left on the board.

## One thing in hand (the only mode)
The player holds at most one thing: a tile, the chalk or the eraser. The held thing is drawn in
yellow and the ledge says what is held. It is one-off: it is released after it is used, by tapping
it again, by Esc, or by tapping empty board (which moves a held tile there).

| holding | tap a 칸 half | tap a tile | tap chalk | tap eraser | tap board |
|---|---|---|---|---|---|
| nothing | take out the last jamo put there | hold that tile | hold chalk | hold eraser | — |
| tile | place it (stack or swap) | hold the other tile | add a stroke to the held tile | remove one | move the tile there |
| chalk | "꺼낸 다음 고쳐요" | add a stroke | release | hold eraser | release |
| eraser | "꺼낸 다음 고쳐요" | remove a stroke | hold chalk | release | release |

Drag does the same without the hold step: drag a tile to a 칸 half (the half under the finger lights
up) or to open board; drag the chalk or eraser onto a tile; drag out of a 칸 to take a jamo back.
A drag starts after 6px of movement, so a tap is never mistaken for a drag.

## Keyboard (cursor between tiles and 칸)
- Tab order: header (낱말 공책, 규칙) → 칸 group → tile group → ledge (chalk, eraser, 힌트, 무르기,
  처음부터, 다음 낱말 when shown) → rail list on wide screens. Each group is one tab stop.
- Tile group: arrows move the cursor to the nearest tile in that direction. Enter/Space holds the
  tile and moves the cursor to the 칸 group. `+` or `=` adds a stroke, `-` erases one.
- 칸 group: ←/→ between 칸, ↑/↓ between top half and 받침. Enter/Space places the held tile there
  and sends the cursor back to the tile group; with nothing held it takes the last jamo out.
  Backspace/Delete also takes it out. Esc releases what is held and returns to the tile.
- Anywhere: Ctrl/⌘+Z undoes one move.
- Every placement, stroke, wrong answer and solve is announced in a polite live region in plain
  Korean ("ㄱ을 첫째 칸 위쪽에 놓았어요. 첫째 칸: 가").

## State machine (one puzzle)
```
[arriving] --wipe done (0ms when reduced)--> [playing]
[playing] --place / stroke / move / undo--> [playing]
[playing] --all 칸 full, board empty, word = answer--> [solved]
[playing] --all 칸 full, board empty, word ≠ answer--> [wrong] --any move--> [playing]
[solved] --다음 낱말 / pick from 공책--> [arriving]
[playing] --처음부터--> [arriving] (same puzzle, tiles back home)
```
`wrong` is not a failure state; it only shows a note in pink ("단서와 다른 낱말이에요") and stays
playable. Undo crosses every state except `solved`.

## Feedback (match intensity to importance)
| event | feedback |
|---|---|
| tile lifted | ghost smudge left on the board; tile scales 1.06 with the one shadow |
| tile lands in a 칸 | small dust puff below the 칸; pieces sit in their 초/중/종 places |
| syllable completes | pieces snap into the real Orbit glyph (or the assembled block when Orbit lacks it) |
| stroke added | a yellow chalk line is drawn where the new stroke is, then the letter changes; the tile keeps a yellow underline while it differs from where it started |
| stroke erased | a short rub of haze over the letter; the stick grows by one |
| no chalk left | stick shows a stub; "분필이 없어요. 다른 글자에서 획을 지워 오세요." |
| wrong word | 칸 shudder 2px once; pink note |
| solved | the peak: a pink chalk 동그라미 drawn round the answer (꽃동그라미 if no hint was used), dust falls off the circle, the ledge offers 다음 낱말 and focus moves there |
| new puzzle | the end/next beat: one eraser wipe across the board; the clue appears |

Repetition: the dust puff is small and silent; the wipe is 450ms; the solve circle is 900ms and
never blocks input.

## Hints (two steps on one button)
1. 첫소리: each 칸 shows its 첫소리 faintly.
2. 고칠 글자: tiles that need strokes changed get a yellow `+n` or `−n`.
A puzzle solved with no hint earns 꽃동그라미, otherwise 동그라미. Both count as solved.

## Progress
`localStorage` key `jamo.v1`: solved marks per puzzle, lessons done, last puzzle. All access in
try/catch; without storage the game still plays and simply forgets on reload.
First visit starts lesson 1 at once (no title screen). Later visits open the next unsolved puzzle.
