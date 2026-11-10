# 색모래 병 (sand) · interaction

Posture: transient and playful. One session is one to five minutes: watch, pour, tilt, shake,
fill, cork, keep the photo. Everything is on one screen; nothing navigates away.

## Revision 2026-11-10: what changed and why

The owner found the effect weak on first try. The payoff now has to land without learning anything:

| before | now | why |
|---|---|---|
| an empty drawn bottle; the visitor had to pour before anything happened | the bottle opens a quarter full of rocked waves and a short pour plays while it rocks, until the first touch | the first screen shows what the page does |
| 128 × 208 cells, 2.3 CSS px each; piles at a hard 45 degrees | 300 × 602 cells, under 1 CSS px each; piles at about 33 degrees that slip in avalanches | it reads as sand, not pixels |
| grains appeared at the mouth one by one (8 a frame) | a stream falls from the tipped jar: about 2,900 grains a second, accelerating, drawn as one-frame streaks | the pour itself is the spectacle |
| a drawn cup | the photographed jar you picked, lifted and tipped over the mouth | the jar is the colour picker you hold |
| silent | grain-click sound that follows the grains landing, duller as the bottle fills | pouring sand is half a sound |
| corking set the bottle on a drawn shelf | corking sets it on a sunlit windowsill (a photograph) lit by the sun, with its shadow; saved as a photo | a finish worth keeping |

## Usage story

| plot point | moment | design |
|---|---|---|
| exposition | a real glass bottle on black, a quarter full of wavy layers; a lime jar lifts, tips and pours while the bottle rocks; then a yellow one | the effect plays before any instruction; status: 모래가 흐르는 걸 보여 드릴게요. 화면을 누르면 바로 멈춰요. |
| inciting | the visitor touches: the demo stops at once; holding 붓기 tips their jar and the stream starts within 5 frames | the stream thickens over a third of a second as the jar tips |
| rising | change jar, drag the bottle sideways (or tilt the phone): the stream leans, the cone grows on one side, grains run down its flanks | tilt is live while pouring, so cause and effect is one gesture |
| crisis | the neck fills | pour stops by itself; 코르크 막기 replaces 붓기 |
| climax | the cork drops into the neck (420 ms, a knock), then the bottle appears on a sunlit windowsill with its shadow | the one choreographed moment; under reduced motion the cork fades in (240 ms) instead of dropping |
| end | 사진으로 저장 gives a 1080 × 1341 JPEG made on the phone; 새 병 starts over with an empty bottle | the status says the photo never left the device |

## State machine

```
[demo] --any touch or key--> [filling]
            ┌──────────── 새 병 ───────────────────────────────┐
            v                                                  │
[filling] --neck full--> [full] --코르크 막기--> [corked] -> [finished] --┘
   │  ^                     │  │                                │
   │  └ settling opens ─────┘  └ 비우기 (+되돌리기)              └─ 사진으로 저장 (+ status)
   └── 비우기 -> [filling, empty] (+ 되돌리기 for 6 s)
```

Inside filling: `pouring` (only while 붓기, Space, Enter or a pointer is held), `settling`
(grains still rolling), `asleep` (no grain moved and none can: the loop stops until the next input).
The loop also stops while the tab is hidden or the stage is off-screen.

## Inputs

| intent | touch with sensors | touch without sensors | mouse | keyboard |
|---|---|---|---|---|
| pick a jar | tap a jar | tap a jar | click a jar | 1–5, or Tab + Enter |
| pour | hold 붓기 | hold 붓기 | hold 붓기 | hold Space (unless another button has focus), or Enter on 붓기 |
| tilt | tilt the phone (±35°) | drag the bottle sideways, or the tilt buttons (7° a click, repeats when held) | drag, or tilt buttons | ← → (5° a press), ↑ straightens |
| shake | shake the phone | 흔들기, or a quick drag back and forth | 흔들기, or quick drag | S |
| settle a layer now | 바로 쌓기 | 바로 쌓기 | 바로 쌓기 | Tab to 바로 쌓기 |
| sound | 소리 켬/끔 | same | same | Tab to it |

## Physics (js/sim.js)

- **Grid**: 300 × 602 cells in the bottle's own frame; the walls are traced from the photograph.
  One byte per cell (colour × 32 + shade), one byte of momentum per grain.
- **Stream**: particles fall under gravity rotated by the tilt (0.42 cells/frame²), drawn as
  streaks covering the last 1/80 s (every other cell, so a thick stream keeps its grain). Where a
  particle meets sand or glass it becomes a grain and runs down the pile at once by the automaton's
  rules (up to 40 moves), so a heavy stream spreads over the cone instead of stacking a tower.
- **Angle of repose**: a grain slides diagonally down a 45° face; a rolling grain, or one resting
  where the pile cannot hold a steep face (half the cells, fixed and random), also takes 2-across
  steps, which a 26.6° face cannot hold. The mix stands at about 33° (measured by
  `scripts/pile_test.mjs`: 31–34° upright), with irregular, believable flanks.
- **Avalanches**: landing grains jostle the grain they hit, and rolling grains knock resting
  neighbours loose (14%), so a growing cone slips in bursts.
- **Tilt**: free fall follows the rotated gravity; grains roll on downhill across flat ground; on
  the uphill side a sticky cell may hold a steeper face (the world-frame angle stays about 33–39°).
  When the bottle straightens, the steep faces that are still on the surface slump.
- **Work**: 16 × 16 chunks; only chunks where something moved, or may move, are scanned; only the
  changed rectangle of the canvas is uploaded. Measured with Chrome's CPU throttled 4× (a mid-range
  phone): 3.8–5.2 ms of sand work per frame while pouring and dragging, worst frame 23 ms, 2 late
  frames in 700. Unthrottled desktop: 0.7 ms average.
- **Glints**: quartz specks each glint at their own angle; while the tilt changes, the few whose
  angle is within 0.45° of it flash white.
- **Shake** mixes the top 34 cells of each column (grains swap, never blend), some hop and fall back,
  and the band slumps.
- **Full**: when the sand in the neck stands within 3 rows of the mouth on average; it reopens only if
  settling or shaking opens more than 14 rows.

## Sensor permission

- Offered once, only on touch devices with `DeviceOrientationEvent`: when the opening pour ends by
  itself or after the visitor's first pour (never in the middle of one); a compact card over the top of the stage: what it does, what is read, that nothing
  is sent; 센서 켜기 / 버튼으로 할게요. iOS permission is asked inside the tap.
- Granted with readings within 1.5 s: sensor mode (the tilt buttons become 센서 끄기). Otherwise the
  card closes and the status explains the buttons. Remembered for the session (try/catch).

## Sound

Made in the page with Web Audio: a looped buffer of thousands of tiny clicks, band-passed; its level
follows the grains that actually landed this frame, its centre drops from 5.2 to 2.2 kHz as the
bottle fills (sand on glass, then sand on sand), a soft hiss follows rolling grains. A rattle for a
shake, a knock for the cork. It starts only inside the visitor's first touch, suspends after four
idle seconds, and 소리 켬/끔 turns it off (remembered for the session).

## Feedback and text alternative

- Every action answers on the bottle within a frame; the status line (`aria-live="polite"`) names
  the state changes: jar picked, tilt direction, full, corked, set on the windowsill, saved, emptied.
- The sand canvas (and the finish photo) carry a text alternative refreshed 0.8 s after the sand
  moves and when it rests: how full, and the colours from the bottom up.

## Reduced motion (revised 2026-11-10, BRIEF §000 "calmer, not still")

- The owner's Windows has animation effects off, so the browser reports `reduce`, and the still
  bottle this page showed there looked dead. Under `reduce` the page now behaves as with motion on:
  the same quarter-full bottle and opening pour (4.5 s, stops at the first touch), the jar lifts and
  tips, the bottle eases to its tilt, glints, hop and jiggle on shake, grains settle, and the bottle
  fades onto the windowsill photo.
- Dropped under `reduce`: only the cork's 420 ms drop, which becomes a 240 ms fade in place (the
  knock sounds when it ends). The page has no smooth scrolling, parallax or scroll-linked motion.
- 바로 쌓기 still builds a layer without watching it fall, for anyone who prefers that.

## Failure paths

| failure | response |
|---|---|
| no JavaScript | `<noscript>`: 모래를 부으려면 자바스크립트가 필요해요. |
| no canvas 2D context | one line says the browser can't draw sand |
| sensors denied or silent | button/drag mode, one status line, the card does not come back this session |
| storage blocked | everything works; the sensor card and sound choice are asked again on reload |
| windowsill photo fails to load | the corked bottle stays on black; the status says so; 사진으로 저장 loads it again |
| `toBlob` fails | 사진을 만들지 못했어요. 다시 눌러 주세요. |
| tab hidden mid-pour | pour stops (as if released), loop pauses, resumes asleep |
