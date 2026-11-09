# 색모래 병 (sand) · interaction

Posture: transient and playful. One session is two to five minutes: pick, pour, tilt, shake, fill,
cork, save. Everything is on one screen; nothing navigates away.

## Usage story

| plot point | moment | design |
|---|---|---|
| exposition | an empty bottle on black, five jars under it, one line: 모래를 골라 붓고, 병을 기울여 물결을 만들어요. | the bottle is the biggest thing; the first jar is already picked so 붓기 works at once |
| inciting | first hold of 붓기: grains run from the cup into the neck and pile into a cone | sound-free, immediate (< 100 ms), the stream is visible against black |
| rising | change jar, tilt, pour again: the pile leans, layers become slopes and waves | tilt is live while pouring, so the visitor learns cause and effect in one gesture |
| crisis | the bottle gets full; the neck is narrow and the top is fiddly | pour stops on its own when the mouth is blocked; 코르크 막기 appears |
| climax | the cork goes in and the bottle is set on the black glass shelf with its striped reflection | the one choreographed moment (500 ms); instant under reduced motion |
| end | 그림으로 저장 gives a PNG made on the phone; 새 병 starts over | status says the picture never left the device |

## State machine

```
            ┌──────────── 새 병 ───────────────────────────────┐
            v                                                  │
[filling] --neck full--> [full] --코르크 막기--> [corked] --┘
   │  ^                     │  │                    │
   │  └ tilt/shake opens ───┘  └ 비우기 (+되돌리기)   └─ 그림으로 저장 -> [corked] (+ status)
   └── 비우기 -> [filling, empty] (+ 되돌리기 for 6 s)
```

Inside filling, the simulation has its own sub-state: `pouring` (spring-loaded: only while 붓기,
Space or a pointer is held), `settling` (grains still moving), `asleep` (nothing moved for a full
scan: the animation loop stops until the next input). The loop also stops while the tab is hidden or
the stage is off-screen.

Impossible states are blocked: no pouring or 바로 쌓기 when full or corked; tilt, shake and jar
picking are gone after the cork goes in; 코르크 막기 only exists while full. A full bottle can still
be tilted and shaken: if that lets sand slump into the shoulders and the neck opens, the bottle goes
back to filling and 붓기 returns.

## Inputs

| intent | touch with sensors | touch without sensors | mouse | keyboard |
|---|---|---|---|---|
| pick a jar | tap a jar | tap a jar | click a jar | 1–5, or Tab + Enter |
| pour | hold 붓기 | hold 붓기 | hold 붓기 | hold Space (unless another button has focus) |
| tilt | tilt the phone (gravity in the screen plane, ±35°) | drag the bottle sideways, or the tilt buttons (7° a click, keeps tilting when held) | drag the bottle, or tilt buttons | ← → (5° a press, repeats), ↑ straightens |
| shake | shake the phone | 흔들기, or a quick drag back and forth | 흔들기, or quick drag | S |
| settle now | 바로 쌓기 | 바로 쌓기 | 바로 쌓기 | Tab to 바로 쌓기 |

### Rules

- **Tilt** is gravity in the bottle's frame. Grains fall along it, so the stream leans relative to the
  glass and piles climb the low wall. When the visitor tilts the phone (sensor mode) the bottle stays
  fixed to the screen and the stream leans on screen, which is upright in the real world. Without
  sensors the bottle itself rotates on screen about its middle and the stream stays vertical; the cup
  follows the mouth. Range ±35°, with a 2° dead zone so a resting phone does not creep.
- **Sand physics**: falling-sand automaton, 128 × 208 cells, typed arrays, only the rows where
  something moved are rescanned. A grain tries its gravity direction, then the two neighbouring
  directions; grains still moving may roll one cell further (so slopes come out uneven) and fall two
  cells a step in free fall. Under a strong tilt (18° or more) grains walk off steep low-side edges and
  never roll toward the high side, so the high face can stand steeper and slumps to 45° when the bottle
  is straightened. Each grain keeps its colour and shade for life.
- **Pour**: about 480 grains a second at 60 fps. When the pile reaches the mouth, grains run down its
  flanks into the rest of the neck; the bottle counts as full only when the neck is filled to the brim.
  If the shoulders still have gaps, the status says so: 목까지 찼어요. 기울이거나 흔들면 빈자리로
  모래가 내려가요. 이대로 막아도 돼요.
- **Shake** mixes the top band (16 cells under the surface in each column): grains in the band
  swap places at random and some hop up a few cells and fall back. Sand never turns into a
  gradient; it turns speckled. Under reduced motion the hop and the bottle jiggle are skipped, the
  mixing still happens. After a shake the surface may slump to a lower angle for 48 steps.
  Phone shake = three acceleration swings above 12 m/s² within 700 ms;
  drag shake = three direction reversals of 18 px or more within 600 ms; at most one shake per 450 ms.
- **바로 쌓기** pours one layer (1/14 of the bottle) of the picked sand at the current tilt and runs the
  simulation to rest off-screen, then draws the result once. It also settles any grains still in the
  air. This is the full path for reduced motion and for anyone who cannot hold a button.
- **비우기** empties the bottle at once and offers 되돌리기 for 6 seconds (no confirm dialog).
- **Cork** is allowed only when full. After corking the bottle straightens, the cork drops into the
  neck and the bottle rises 14 cells onto the shelf line with its striped reflection (520 ms; at once
  under reduced motion).
- **Save** draws a 1080 × 1440 PNG in the page (bottle, cork, shelf, title, date), hands it to the
  browser as a download and revokes the URL. Nothing is uploaded.

## Sensor permission

- Shown only on touch devices that have `DeviceOrientationEvent`. A card over the lower stage:
  "휴대폰을 기울여서 부을까요?" + why + what is read + that nothing is sent, with 센서 켜기 and
  버튼으로 할게요. The bottle and jars stay usable behind it; the card never blocks pouring.
- 센서 켜기 runs `DeviceOrientationEvent.requestPermission()` and
  `DeviceMotionEvent.requestPermission()` inside the click (iOS); elsewhere it just starts listening.
- Granted and real readings arrive within 1.5 s: sensor mode; the tilt buttons are replaced by
  센서 끄기. Denied, thrown, or no readings: the card closes, status says
  "센서를 켜지 못했어요. 병을 옆으로 끌거나 기울이기 버튼을 써요.", buttons stay.
- The choice is remembered for the session in `sessionStorage` (try/catch; works without it).
- Desktop (fine pointer): no card at all; the hint line names drag, arrow keys and Space.

## Feedback

- Every action answers on the bottle itself within one frame: grains appear, the bottle leans, the
  band speckles. The status line (`aria-live="polite"`) names the state changes that are not visible
  to a screen reader: jar picked, tilt direction, full, corked, saved, emptied.
- The canvas has a text alternative, refreshed every 0.8 s while sand moves and once more when it rests: how full the bottle
  is and the colours of its layers from the bottom up (e.g. "반쯤 찼어요. 아래부터 진분홍, 노랑, 파랑.").
- Pressed states invert ink and ground; holding 붓기 keeps it inverted for as long as sand runs.

## Reduced motion

- Grains still fall: they are the content, and they only move while the visitor pours.
- No bottle jiggle on shake, no hop; no cork/shelf animation (the end state appears at once); tilt
  changes apply instantly instead of easing.
- Nothing ever moves on its own: there is no auto-shake, no idle animation, no camera.
- 바로 쌓기 builds layers without watching them fall.

## Failure paths

| failure | response |
|---|---|
| no JavaScript | `<noscript>` line: 모래를 부으려면 자바스크립트가 필요해요. |
| no canvas 2D context | the stage shows a white line drawing of the bottle and one line saying the browser can't draw sand |
| sensors denied or silent | button/drag mode, one status line, the card does not come back this session |
| storage blocked | everything works; the sensor card may show again on reload |
| `toBlob` fails | status: 그림을 만들지 못했어요. 다시 눌러 주세요. |
| tab hidden mid-pour | pour stops (as if released), loop pauses, resumes asleep |
