# shadowplay · INTERACTION.md

Posture: transient toy. A visitor stays one to three minutes, so everything works on first touch, the
default arrangement already looks like a scene, and nothing needs explaining beyond one line.

## The model (what the rules are)

World units are cm. The screen is the plane z = 0, 120 wide and 60 tall. Puppets are flat cut-paper
sheets parallel to the screen on a rod rail at depth z 3–14. Lights are small white discs (radius 1 cm)
at depth z 20–42, so a light can never pass the rail.

A puppet point P = (x, y) at depth zp seen from a light at L = (lx, ly, lz) lands on the screen at

    S = L.xy + k · (P - L.xy),   k = lz / (lz - zp)

so a shadow is the outline scaled about the light's foot. Light close to the puppet: k grows, the
shadow is large. Light far: k tends to 1, the shadow is the puppet's own size. Moving the light sideways
slides the shadow the other way by (k - 1) times the move.

Penumbra: each light is sampled at N points on its disc (Vogel spiral). Each sample's shadows are filled
as one path (nonzero, outlines counter-clockwise, cut-outs clockwise, so overlapping puppets union and
cut-outs stay open) with additive alpha 1/N. N grows with the widest penumbra on screen, 4 to 14.
Penumbra width = (k - 1) · 2r, so far light = sharp edge, close light = soft stepped edge. No blur.

Two lights: each light carries half the illumination. Blocked from one light = half tint, blocked from
both = full Prussian blue. That is the double shadow.

Rods are part of the geometry and cast shadows too; they stay vertical while the sheet rotates.

## Objects and states

| object | states | feedback |
|---|---|---|
| light 1 / light 2 | idle, hover (cursor grab), dragging, focused | lamp symbol thickens; dimension line shows depth; live region on key moves |
| puppet | in box, on stage, selected, dragging, focused | plan: sheet line thickens, label turns white; elevation: hidden (dashed) outline of the real puppet and projection rays |
| tray row (부품표) | in box / on stage, disabled during the show | outline vs solid drawing plus a text state |
| show button | ready / playing | label 공연 보기 ↔ 공연 멈추기 |
| second light button | off / on | label 빛 하나 더 켜기 ↔ 빛 2 끄기 |
| puppet tools | hidden when nothing selected | name of the selected puppet in the tool row |

App state machine:

    [editing] --공연 보기--> [playing] --공연 멈추기 / Esc / last caption--> [restoring] --done--> [editing]
    [playing] --tab hidden or drawing off-screen--> [paused] --visible again--> [playing]

While playing: dragging, tray and tools are disabled; key moves announce that the show is on. Restoring
puts back the visitor's own arrangement (both lights and which puppets were on stage).

## Pointer and touch

- Plan view: drag a lamp symbol to move the light in x and depth. Drag a puppet (sheet line or rod) to
  slide it along the rail and between front and back of the rail.
- Elevation (the screen): drag a shadow to slide its puppet along the rail (pointer x divided by k so the
  shadow follows the finger). Drag the dashed light marker to move the light in x and height.
- Hit priority: lights, then the selected puppet, then the nearest puppet. Touch slop 22 px.
- The canvas uses touch-action: none; the page still scrolls from the gutters and panels.
- Rotation and flip have buttons (돌리기 left / right in 15 degree steps, 뒤집기, 내리기), so there is
  no gesture-only feature.

## Keyboard

Tab order: lights, then puppets on stage (tray order), then show / light buttons, puppet tools, tray.
Focus targets are real buttons laid over the plan view.

| key | light | puppet |
|---|---|---|
| ← → | x ± 2 cm (Shift ± 8) | along the rail ± 2 cm (Shift ± 8) |
| ↑ ↓ | farther / nearer the screen ± 2 cm | back / front of the rail ± 1 cm |
| PageUp / PageDown | height ± 2 cm | n/a |
| R / Shift+R | n/a | rotate 15° clockwise / anticlockwise |
| F | n/a | flip to face the other way |
| Delete / Backspace | remove light 2 (light 1 stays, says so) | take off the stage; focus moves on |
| Esc | stops the show | stops the show |

Live region (polite, 400 ms debounce so held keys do not flood): what moved and the result, for example
"여우, 막에서 10cm, 그림자 1.3배". Scene captions use their own polite region.

## The show (공연)

Ten captions, 42 s. Original story: a fox walks past a small house by a pine; a person with a
lantern steps out; as the lantern comes near, the fox's shadow grows as big as the house and scares the
lantern-bearer, who backs away; the light moves off and the fox shrinks to its own size; they bow to
each other, row a little boat towards the moon, and the moonlight adds a second shadow to each of them.

Each caption is a step with tweens inside it (ease in-out). Reduced motion: no tweening; each step
jumps to its end state when its caption appears, then holds. The show never starts by itself.

## Loop and performance

Render on demand. A frame is requested only when something changed (drag, key, tween, show). When no
tween or show is running the loop stops. The show clock advances from frame deltas clamped to 50 ms, so
a hidden tab pauses it; an IntersectionObserver also pauses the show when the drawing scrolls away.
Polygons stay under about 60 vertices per puppet; at most 2 lights × 14 samples × one path per sample.

## Edge cases

- Empty stage: the caption line says to pick puppets from the parts list.
- Removing the selected puppet clears the tools and moves focus to the next object or to its tray row.
- Window resize recomputes the scale; world positions do not change.
- Fonts load before the first canvas draw (labels use Gamja Flower).
