# curtain — interaction

Posture: transient. One screen, one material, a minute or two of play. The user is the stagehand;
the bulb is the performer. Everything below is direct manipulation first, buttons second.

## Usage story (peak-end)

| plot point | what happens |
|---|---|
| exposition | Closed emerald curtain, front-lit, still. A thin line of cool light leaks under the hem: something is lit back there. One hint line: drag sideways to open, pull down hard to tear. |
| inciting | First grab. The pile under the hand brightens (crushed velvet keeps a mark). |
| rising | Pulling sideways slides the rings along the rail; the cloth bunches into deeper folds at the side and swings with weight. |
| climax | Past about half open, the stage is visible: a bare bulb on a stand, standing on a spike mark, and the card 〈남겨 둔 불〉. The bulb flickers twice the first time (its bow). |
| crisis (optional) | Pull down hard: links strain and the velvet rips; light from the bulb shows through the tear; a scrap can come away in the hand and drop to the floor. |
| falling | 꿰매기: silver threads pull the pieces back together, rest lengths shrink back, the curtain hangs whole again. |
| end | The mends stay, drawn as silver stitches across the repaired links. The curtain remembers what you did to it. |

## Microinteractions

### Drag the cloth (pointer, mouse or touch)
- Trigger: pointerdown on the cloth canvas within 36px (mouse) / 52px (touch) of a particle.
- Rules: the nearest particle and its neighbours (about 1.7 cells) are held and follow the hand,
  keeping their offsets. The hand itself moves at most 10px per 60Hz step, so a flick drags the heavy
  cloth instead of teleporting it. A sideways pull carries the rings between hand and lead edge (opening)
  or behind it (closing) by part of the hand's travel, because velvet barely stretches. Top-row particles
  that sit on a ring are constrained to the rail line (y = rail, z = 0) but slide freely in x with
  friction, so sideways pulls open the curtain instead of tearing it. Rings keep a minimum gap and
  cannot pass each other; the outermost ring of each panel is fixed at the wall.
- Each pointerId grabs independently (two fingers can pull both panels).
- Feedback: the cloth moves under the hand every frame; the pile under the grab is crushed
  (shader: more sheen, lighter), and the mark fades over about half a minute.
- Release: grabbed particles keep their last velocity; the hem is three times heavier than the
  body, so the curtain swings, then settles.

### Tear
- Trigger: a link stretched beyond its limit (1.75x down the warp, 1.95x across, 3.4x at the
  rings) for five steps in a row, while a hand is pulling or within 1.5s of letting go. Solver spikes
  from fast sideways drags never last five steps; a hard pull down does. The rope never tears.
- Rules: the link is removed; any triangle using it stops rendering; the stage behind shows
  through. A region cut off from the rail falls and rests on the stage floor. A grabbed region that
  tears free stays in the hand until release.
- Feedback: the hole itself, plus the hint line: "막이 찢어졌습니다. 꿰매기를 누르면 은실로 꿰맵니다."
- Button 찢기: a virtual hand grabs the lower half of one panel (alternating left/right) and yanks
  it down and outward until links fail; it uses the same rule as a pointer tear.

### 열기 / 닫기
- Rules: the lead ring of each panel is pulled along the rail (2.6s ease-in-out, like a traveller
  rope); other rings are pushed by the minimum gap (open) or dragged by the cloth (close). When no
  hand or rope works a panel its rings are pinned (rail friction), so the curtain stays where it is left.
- Interruptible: grabbing the cloth during the travel cancels it.

### 꿰매기
- With tears: every broken link is restored with its rest length set to the current distance,
  then shrunk back to the original length over 1.2s; while longer than 1.15x, the link is drawn as
  a silver thread. Restored structural links get a permanent stitch mark.
- Without tears: hint "찢어진 곳이 없습니다." (no dialog, nothing else changes).

## States

```
[still] --grab--> [held] --release--> [settling] --energy < ε for 0.5s--> [asleep]
[still] --열기/닫기--> [travelling] --done--> [settling]
[held]  --link > 1.75 rest--> [held, torn]
[torn]  --꿰매기--> [mending] --1.2s--> [settling]
[any]   --tab hidden--> [paused] --visible--> previous
```

The rAF loop only runs in held, travelling, mending and settling. Asleep and paused draw nothing.

## Reduced motion

- No autoplay: the page starts still (it always does), the bulb never flickers.
- Dragging still works (it is the user's own motion), but velocity damping goes from 0.988 to
  0.80 per step, so the cloth follows the hand without swing and stops when let go.
- 열기 / 닫기 / 찢기 / 꿰매기 compute the settled end state off-screen (up to 400 solver steps)
  and show only that frame.

## Keyboard

- Tab order: 열기 → 닫기 → 찢기 → 꿰매기 → gallery badge (appended by /shared/back.js). Enter/Space activate.
- Every pointer action has a button: open, close, tear, mend. The cloth canvas is not a tab stop
  (it is a picture of the result; the buttons are the controls).
- Focus ring: 2px silver-hi, 3px offset, visible on black.

## Fallbacks

- No WebGL: the same simulation drawn with Canvas2D, flat-shaded triangles using the same velvet
  function per triangle, coarser grid. Force with `?nogl`.
- No JS: the stage, card and note show without a curtain; a one-line notice says the curtain needs
  JavaScript.
- Storage is not used.

## Density

- Particle budget: 3,000 (fine pointer, large screen), 1,400 (coarse pointer or small screen),
  1,000 / 700 for the Canvas2D fallback. Columns come in multiples of three (a ring every third).
  Fixed 60 Hz step, at most 3 steps per frame, 10 solver passes (8 on phones); bending links run
  every other pass and barely resist compression (folding is easy, stretching is not). If a step
  costs more than 7ms the page drops passes, never below six, and takes them back when it can.
- The loop stops when the cloth has been still for half a second, and on a hidden tab.
