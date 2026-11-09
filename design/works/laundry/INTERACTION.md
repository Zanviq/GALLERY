# 뽀득 — INTERACTION.md

Posture: **transient**. Someone glances at the page for seconds, at home ("is there a free
washer?") or at the machine ("how long is left?"). Everything important is readable without
tapping; tapping only adds detail.

## 1. Live machine board (simulated)

**Model.** Each machine `{ kind: washer | dryer | shoe, num, state, endsAt, course }`.
`state ∈ free → run → done → free`. Time is a simulated clock (`sim.now`) that advances with
real time × speed (1 or 30). All state is derived from timestamps, so a hidden tab or a
throttled timer never drifts: on return the board recomputes.

**Rules.**
- Initial state is seeded per branch and per day (same view on reload): about 40 % free,
  45 % running with 1–46 min left, 15 % done. One running machine always finishes within
  about 90 s so the first visit shows a change.
- Customers arrive per branch (Poisson, mean 70 s of sim time at the busy branch, 160 s at
  the quiet one) and take a free machine with a course (washer 25–48 min, dryer 30–60 min,
  shoe 30 min).
- A finished machine waits 2–16 min (sim) for its owner, then becomes free.
- Speed toggle "빨리 감기" switches 1× / 30× (one hour in two minutes). It is a mode, so it is
  a visible pressed toggle with its state in words.

**Feedback.**
- Tile: LED dot + seven-segment minutes + porthole contents (empty / tumbling / clothes at
  rest) + the state in words for screen readers in the button label.
- `run`: red LED steady, minutes ("12"; "1" for under a minute is shown as "01").
- `done`: red LED blinking 1 Hz and "End" on the display, words "끝남 · 꺼내 주세요".
- `free`: green LED, display shows "--".
- Headline sentence (h1 + one line under it) is rewritten from the counts:
  "느릅마루점에 빈 세탁기 2대, 빈 건조기 1대가 있어요." + "다음 세탁기는 4분 뒤에 끝나요."
  `aria-live="polite"` on the second line only, updated on state *changes*, never every second.

**Loops.** Display refresh 1 s, only while the board is on screen and the tab is visible.
Porthole tumbling (CSS) pauses with the same observer.

## 2. Machine sheet + "끝나면 알려 주기"

Trigger: tap/Enter on a tile. `<dialog>` (native focus trap, Esc closes, focus returns to the
tile). Bottom sheet on phones, panel on desktop.

Content: kind + number, big mm:ss display, course and capacity, a state sentence.
- `run`: toggle button "끝나면 알려 주기" (`aria-pressed`). When on, the tile gets a "내 빨래"
  tag. When the machine finishes: toast "3번 세탁기가 끝났어요. 꺼내 주세요." (`role="status"`),
  `navigator.vibrate(200)` if available, page title prefixed with "끝남 ·" until the page is
  focused again. Only while the page is open; the sheet says so in one sentence.
- `free`: "지금 쓸 수 있어요. 키오스크에서 3번을 고르세요."
- `done`: "끝난 지 5분 됐어요. 주인이 곧 꺼내 갈 거예요."
- Hint under the toggle when speed is 1× and more than 3 min left: "빨리 감기를 켜면 금방 볼 수 있어요."

## 3. Washer front: keypad + drum

**State machine (one washer).**
```
[open/idle] --start--> [running: fill → wash → drain → rinse → spin → brake] --end--> [done]
[running] --pause--> [paused] --start--> [running]
[paused]  --stop-->  [open/idle]
[done]    --open door / add item / start--> [open/idle | running]
```
- Course keys (radio group): changing course while running is not allowed (keys disabled,
  sentence explains "돌아가는 동안은 코스를 바꿀 수 없어요"), exactly like the real machine.
- Basket keys (양말 · 수건 · 셔츠 · 바지) only work while the door is open (idle, paused,
  done). Each item has a load value; the drum takes 10 units. Over 7 units the display line
  says "3분의 2를 넘었어요. 덜 빨려요." At 10 the key is disabled with the reason.
- "모두 꺼내기" empties the drum (door open only).
- The run is the real course compressed to about 45–60 s. The seven-segment display counts
  the *real* course minutes down proportionally; a line says the demo is shortened.

**Drum physics (Canvas 2D, js/drum.js).**
- Units: metres and seconds. Drum radius 0.26 m, g = 9.8. Tumble at 40–50 rpm keeps
  ω²R < g so clothes are lifted by three lifters and fall; spin ramps through 90 rpm
  (distribution, clothes stick) to a visual maximum of 190 rpm (≈ 10 g), then brakes.
  The real spin (about 1,000 rpm) is stated in words, not drawn.
- Each garment is a small verlet body: sock = chain of 5 points, towel = 3×3 grid,
  shirt = 3×3 grid with sleeve points, trousers = two 4-point legs joined at a waist bar.
  Distance constraints (6 iterations), point-vs-point repulsion between garments,
  drum wall as a circle constraint with friction toward the wall's tangential speed,
  lifters as rotating segments.
- Water: during fill/wash/rinse a level rises; points under the surface get drag and a little
  buoyancy. The surface tilts with drum speed. Drains before spin.
- Rendering: drum perforation dots rotate; at spin speed they smear into rings (drawn as arcs,
  not motion blur). Garments are filled smooth paths in white / graphite / steel / deep mint,
  2px graphite outline.

**Direct manipulation (door open only).** Drag a garment to move or toss it. Drag on empty
glass to turn the drum by hand. Keyboard: the canvas is focusable; ← → turn the drum,
Space tosses everything up. While running the glass shows "문이 잠겨 있어요" on press.

**Feedback.** Machine LED: green when idle, red steady while running, red blinking at "End".
Display shows phase name under the digits (급수, 세탁, 배수, 헹굼, 탈수, 끝).

## 4. Motion, reduced motion, pausing

- No motion starts on its own except state indicators on the board (porthole tumbling,
  done-blink). Under `prefers-reduced-motion: reduce` both are static and the words carry
  the state; the drum caps at 24 rpm, spin places clothes on the wall instead of flinging.
- Drum loop runs only while started or while something is still moving, only when the
  drum is ≥ 10 % visible, and never while `document.hidden`. It sleeps when all points rest.

## 5. Keyboard

Tab order: skip link → header nav → branch keys (radio, arrows) → speed toggle → machine
tiles (each a button, in machine-number order) → steps → course keys (radio) → start /
pause → basket keys → canvas → notices → lost items → branches → footer.
Focus ring: 3px graphite (white on graphite panels), never removed.

## 6. Storage

`localStorage` remembers the chosen branch only, wrapped in try/catch. Without it the page
starts at the first branch.
