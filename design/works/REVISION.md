# Revision pass after the owner's 2026-11-09 review

Read BRIEF.md §0 first. Each remaining work is revised in place by one agent. The shared goals:

- Replace every picture drawn with code (SVG/Canvas/CSS figures, objects, rooms, people, products)
  and every 3D render with Gemini-generated images that are refined, cropped and graded (BRIEF §0).
- Cut interaction back to what the page genuinely needs. Promo pages and homepages may have none.
- Open the layouts up: whitespace, hierarchy, fewer things per screen. Poster/editorial feel, with
  `works/festival/` (너울 2027) as the reference the owner likes.
- Keep each work's fonts unless noted. Re-colour only where the row says so (banned palettes).
- Re-take `thumbnails/<slug>.webp` (1200x900) and `og/<slug>.png` (1200x630) from the new page.
- Update `design/works/<slug>/DESIGN.md` (what changed and why) and add `IMAGES.md` (final prompts).
- BRIEF §5 gates still apply (no console errors, no horizontal scroll 360–1920, keyboard, contrast,
  reduced motion, font coverage, both URLs). Remove code, assets and fonts that are no longer used.

Festival (02, 너울 2027) is not revised: it is the reference.

## Per work

### keyboard: 가락 65 (home 01)
Drop three.js and the 3D keyboard entirely, and the sound dock. Make it a keyboard brand launch page
built on product photography: one consistent keyboard design generated as a hero, then the same
board via `--ref` as a top-down flat lay, keycap macros, side profile, on a real desk, and a flat
lay of its parts (case, plate, PCB, switches) instead of the exploded 3D view. Re-colour: mustard is
banned; derive one confident flat colour field from the board's own colourway, with a reason.
Colourways may be three photos side by side; no configurator. Keep Wanted Sans + Archivo.

### perfume: 담금 (home 03)
Drop WebGL (liquid pool and 3D bottle) and the notes cylinder. Make it a perfume brand page with
still-life photography: one consistent bottle (generate the hero, then the same bottle via `--ref`),
ingredient still lifes for each scent (the infusion idea: 조청, 매실, 유자청…), hands, a shelf.
Re-colour: honey/amber/gold are banned; choose a palette from the scents' own materials with a
reason. Editorial, quiet, lots of space. Keep Hahmlet, Newsreader, Damgeum Sans.

### startup: 물길 (home 04)
Startups are what the owner wants more of, so make this a convincing startup homepage. Drop the
pinned scrollytelling and the drawn boat. Documentary photography (generated) of the cleanup boat,
crew, collected debris, harbour; one strong typographic hero; product, how it works, numbers (no
count-up), team (generated portraits of invented people), investors/partners as plain text (no
logo wall), careers. The nautical chart may stay as a static data map (lines are fine). Re-colour:
navy+orange and sand are banned; derive a palette from the subject with a reason. Keep Hahmlet +
Mulgil Sans.

### optician: 또렷안경 (home 05)
Reposition from a neighbourhood shop to an eyewear brand with its own lens lab and a few stores
(still invented). Keep the eye-chart typography and the white/black/duochrome palette: they are
good. Remove the lens wheel, the line-drawn face, frame fitting and the lens bench. Use generated
photography: frames on faces (invented people), frames as product shots, the lens lab. A small
typographic eye-chart touch may stay if it is CSS/type, not a toy. Keep Gothic A1.

### riso: 겹 리소 인쇄실 (home 08)
Turn the overprint toy into a secondary element or remove it. Lead with photography of real
risograph prints, zines and the studio (generated, honest paper texture, ink misregistration),
plus the ink chart and price list as clean typography. Poster-like and spacious. Keep palette and
fonts.

### curtain: 남겨 둔 불 (home 09, 인터랙션)
The CG velvet reads as 3D. Keep the interaction (pulling the curtain open) but make it look
photographic: generate a real velvet curtain texture and a real empty stage with a single ghost
light, and render the cloth with the photo texture (or switch to a 2D displacement/mask approach
if that looks more real). No CG sheen. Keep the font.

### futsal: 늦깎이 FS (home 10)
The owner asked whether the tactics board is needed at all, and said the page is crammed. Remove
the tactics board. Make a spacious club page with generated documentary photos of an amateur
women's futsal team (invented people, no real kit brands), a typographic hero, and the essential
info (first visit, training times, fees, gym) with plenty of room. Keep palette and fonts.

### stamp: 칼퇴 결재 (home 11, 게임)
The game stays. Replace the drawn/3D-looking stamp object with a generated photograph of a real
wooden or red-resin 도장 (cut out, alpha), and give the documents a real paper texture from a
generated scan. The carved seal face and ink impression may stay code-made (they are type). Check
the game screen has room to breathe. Keep fonts and palette.

### quiet-floors: 사뿐 (home 12)
Make it a poster-like public campaign. Replace the drawn apartment cross-section with generated
imagery (apartment interiors, a child jumping, slippers on a mat, a neighbour's note on a door)
and reduce or remove the interactive simulation. A simple data diagram (impact vs airborne) drawn
as a chart is fine. Spacious layout. Keep palette and fonts.

### observatory: 부엉재천문대 (home 13)
Keep the red-light concept and the planisphere (it is a data chart), but reduce its controls and
the page's density. Replace the drawn telescopes and other pictures with generated photographs
graded to the red duotone (the dome at dusk, the big telescope, a kids' class with paper
planispheres, the road up the hill). Keep fonts (Bueongjae Serif/Mono).

### sand: 색모래 병 (home 14, 인터랙션)
The sand simulation stays. Replace the drawn bottle, cork and jars with generated photographs
(clear glass bottle on black, jars of dyed sand) used as frame/overlay, so the grains fall inside a
real-looking bottle. Keep the rest.

### idphoto: 정면사진관 (home 15)
ID-photo studios are something people know; position it as a popular studio brand (invented).
Replace the drawn sitters with generated photographs of invented people in each format. Keep the
format guides as a light overlay on those photos (static examples, or one simple drag at most);
drop the trimming animation. Spacious. Keep palette and fonts.

### cinema: 점멸 (home 17)
The drawn frames are what the owner called AI-looking (the light-switch frame). Replace them with
generated black-and-white film stills: generate key characters/places once and keep them
consistent with `--ref`; about 12–16 distinct shots, reused with slight crops for neighbouring
frames on the contact sheet. Add a proper film poster (generated key art + HTML type). Keep the
contact sheet, the yellow subtitles, fonts and palette, but give the page more room.

### shadowplay: 집채만 한 그림자 (home 19, 인터랙션)
The shape-built puppets look AI-made. Generate photographs of real cut-paper puppets on rods
(fox, lantern-bearer, house, pine, boat, moon) on a plain background, cut them out to alpha, and
cast shadows from the alpha silhouettes (a flat puppet parallel to the screen projects as a scaled
copy of its silhouette about the light). Keep the blueprint layout, palette and fonts.

### home: the gallery's arcade select screen (index.html, assets/)
The joystick (and any other part of the cabinet drawn in code) moves in a way that looks AI-made.
Replace it with generated photographs of a real arcade joystick: a neutral shot plus the same stick
tilted in the directions used (via `--ref`), swapped on input, so movement looks real. Check the
rest of the cabinet for code-drawn objects and treat them the same way. Keep Galmuri11 and the
layout; do not touch any work's folder.
