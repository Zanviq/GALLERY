# Home: control panel revision (2026-11-10)

Owner feedback: the cabinet's joystick looked AI-made every time it moved (a CSS ball and shaft
nudged with `translate`). Follow-up: the first photo pass kept a patch of the photo's own panel
around each part, which read as pasted on. Both are fixed here.

## What changed

- **Joystick, A/B buttons, coin entry are photographs now**, cut out to true alpha with their own
  soft contact shadow, so they sit straight on the panel colour (`#2a2420` to `#1a1714`, unchanged).
  No panel texture, no box, no feathered patch. All CSS-drawn parts are gone (ball, base, shaft,
  button gradients, slot plate, the gradient coin and its drop animation).
- **Movement is a frame swap, not a transform.** Each part is one sprite sheet of the same shot in
  every state; input changes `background-position`, nothing slides or scales.
  - `assets/img/stick.webp` (820x256, 5 frames of 164x256): rest, up, down, left, right.
    The stick goes over while the key or finger is down and springs back on release
    (`keydown`/`keyup`, `pointerdown`/`pointerup`; Enter/Space on a focused direction and the
    attract-mode demo give a 150 ms tap). The selection moves on push, as on a real cabinet.
  - `assets/img/buttons.webp` (640x122, 4 frames of 160x122): A, A pressed, B, B pressed
    (`:active` and the existing `.is-down`).
  - `assets/img/slot.webp` (240x132, 2 frames of 120x132): lamp idle, lamp lit. Inserting a coin
    (click, tap, C, INSERT COIN) lights the lamp for 650 ms instead of dropping a drawn coin.
- Every part is sized from one `--deck` value (the panel height: 128 / 96 short desktop / 120 phone),
  so the old per-breakpoint pixel sizes and `transform: scale(.8)` are gone.
- Direction hit areas now cover the whole stick (top/bottom 34%, left/right halves), larger than the
  old 34px squares.
- **Tag tabs** read in two groups: what a work is (랜딩, 홍보, 브랜드, 게임, 인터랙션, 모바일, in a
  fixed order, any count) | how it was made (most used first, only tags shared by at least two
  works). A one-work technique tab was noise (데모, and 3D once works drop it). Built from
  `data/works.json` at load; no work list is hard-coded. On narrow screens the row fades at the edge
  that has more tabs, and the Q/E key hints are hidden (as the help row already was). Each tab's
  accessible name includes its count ("랜딩 9개").
- Kept: Galmuri11, the layout, the select behaviour, the tile grid, the palette, sound, CRT boot,
  attract mode, contact screen. No Gamepad API existed before and none was added.

## Images

Gemini `gemini-3-pro-image` via `<scratchpad>/tools/gen_image.py`, 13 generations, raw files and
`prompts.jsonl` in `<scratchpad>/home-rev/raw/`. One hero, everything else made from it with `--ref`
so camera, lens, light and panel match; the edits came back pixel-aligned (registration on the
washer rim: 0,0 for every frame).

1. Joystick hero: one stick in a matte black panel from the player's position (~50 degrees),
   red ball top, steel shaft, black dust washer, one overhead tube, 35mm colour negative.
2. Same photo, panel made near black and clean (fingerprints and smudge removed). This is the base.
3. Four tilts from the base ("same photograph, only the stick changes"). The model read
   "pushed forward / pulled back" as right / left on the first try, so those two are used as
   right and left; up and down were redone with the movement described in picture terms
   (ball higher by half its diameter and shaft longer / ball lower over the washer's front edge).
4. Red button from the base (same panel, stick removed, one button), pressed version from that
   (second try: plunger sunk inside the bezel), yellow from the red at rest, yellow pressed from
   the red pressed plus the yellow at rest.
5. Coin entry from the base (brushed steel plate, red lit insert, no text), lamp-bright version
   from that.

Retouch and cut-out (scripts in `<scratchpad>/home-rev/`: `build.py`, `matte.py`):
- a stub of shaft the model left on top of the pulled-back ball was painted out;
- every state is composited onto its part's rest frame where they differ, so only the moving
  part changes on a swap;
- the panel light was flattened and graded to the cabinet black, plastic colours untouched;
- mattes: the ball is a fitted circle, the washer a fitted ellipse, the shaft a rod from the
  washer hole to the ball centre, buttons and the plate the convex hull of their colour, eroded a
  few pixels so no rim of the old panel survives; the contact shadow is the darkening the photo
  shows, kept as black at that strength near the part and nothing elsewhere; the lit lamp's
  spill is kept as red light;
- exported premultiplied at 2x the display size, webp q86 with alpha.

## Weight

stick.webp 31.9 KB, buttons.webp 16.6 KB, slot.webp 10.0 KB: 58.5 KB for the whole panel.

## Checked

- No console errors or failed requests, no horizontal scroll at 360, 390, 768, 1024, 1440, 1920,
  with motion on (forced `no-preference`: headless Chrome on this machine reports reduced motion
  by default) and with reduced motion; also with storage blocked. Attract mode still starts after
  14 s idle with motion on and stays off with reduced motion.
- Keyboard: arrows/WASD tilt and move, held key keeps the stick over, release centres it;
  Q/E switch tabs; C lights the lamp and opens the contact screen; Escape closes it.
- Touch (emulated): tap on a stick side tilts while held and moves on push; slot tap opens contact;
  B closes it.
- Edges inspected at 1x and 2x on the panel and on a light grey test ground. The home has one
  theme (no light/dark variant), so there is nothing else to check against.

## Not done here

- `og/gallery.png` was not touched (outside this pass); if it shows the old cabinet it needs a retake.
- Not checked on a real phone or in Safari/Firefox (headless Chrome only).
