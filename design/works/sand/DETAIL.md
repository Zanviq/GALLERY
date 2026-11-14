# 색모래 병: detail pass (BRIEF §0000, 2026-11-14)

Mobile-only interaction. Audited the phone column at 360 and 390 and the wide view (column + QR
note) at 768, 1024, 1440, 1920. Font (Black And White Picture), photos, sand simulation, sound and
every interaction are unchanged.

## Found
- The status line broke as "화면을 누르면 바로 / 멈춰요." at 360/390 with a two-syllable tail;
  no `text-wrap` anywhere.
- Focus ring 3px/3px (2px/2px in the rest of the gallery).
- Copy is already concrete and in one voice (해요체), status messages say exactly what happened
  ("비운 모래를 되돌렸어요."), the address-free page needs no place note.
- Tracking: the title is +0.01em on purpose. This brush face's strokes touch when tightened, so the
  §0000 display tracking does not apply here.

## Fixed
- `text-wrap: balance` on h1/h2, `pretty` on p/dd: the demo status now reads
  "화면을 누르면 / 바로 멈춰요." at 360/390.
- Focus 2px/2px.

## Left as is
- Buttons switch colour instantly: a press-and-hold pour button should answer on the frame it is
  pressed, so no transition was added.
- "숫자 1~5": the tilde is the ordinary Korean range mark.
- Thumbnail and OG not retaken: the first view did not change.
- Checked: the sand keeps falling under reduced motion (demo pour and canvas change both ways).
