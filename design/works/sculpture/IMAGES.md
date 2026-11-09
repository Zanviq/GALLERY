# Images: 닳다 (works/sculpture)

All photographs are generated with Gemini (`gemini-3-pro-image`, 2K) through
`<scratchpad>/tools/gen_image.py`, then cropped and exported to webp with `tools/img_prep.py`
(q76, widths listed in index.html). No text, logos or real places in any image. 16 generations
in total, including three edit passes and two discards.

Look: crisp, even museum catalogue photography to match a poster page: white skylit gallery,
pale grey polished concrete floor, neutral white balance, no film grain, no dim light. The
documentary shots (survey, studio, glass) are overcast daylight, 35 mm, same neutral colour.
Consistency: the material and the room come from g02 via `--ref`; edits keep the frame and change
one thing.

Inspected at full size: block edges straight, no duplicated parts, no text-like marks. Known
quirks left in: the worn hollows are a little whiter and smoother than the rest of the stone
(read as finer polishing); the visitor in g13 shows part of a profile.

## g01-step.jpg

- Used as: (base for step, not used directly)
- What: first pass of 〈셋째 단〉; the hollow read as a basin
- Aspect 4:5, refs: none

```text
Museum installation photograph for an exhibition catalogue. A large, empty white-walled gallery with a high ceiling; even, soft daylight falls from a wide frosted skylight above; the floor is pale grey polished concrete with faint trowel marks. Alone on the floor, in the lower third of the frame and centred, sits one sculpture: a solid block the exact size and shape of a single stair step, about 128 cm long, 34 cm deep and 19 cm high, lying directly on the floor with no plinth. It is made of hand-ground white terrazzo: bright white cement densely set with small angular chips of crushed green bottle glass (2 to 8 mm), wet-ground flat to a matte satin finish so the green chips show as sharp translucent flecks. In the middle of its top surface there is a shallow, smooth, oval hollow, about 2 cm deep, worn in as if by fifty years of footsteps; the hollow is more polished and faintly glossy than the rest, and the front edge of the step is rounded and worn down where the hollow meets it. Camera at standing eye level, slight three-quarter view, perspective-corrected verticals, medium-format digital, neutral white balance, crisp focus from front to back, a soft contact shadow under the block, lots of empty white wall above it. No people, no wall text, no labels, no signage, no doors, no other objects.
```

## g02-step-edit.jpg

- Used as: img/step-*.webp (poster), img/stepclose-*.webp (plate 2, crop 180,1120,1680,2120)
- What: edit of g01: the wear made into a stair saddle
- Aspect 4:5, refs: g01-step.jpg

```text
Edit this photograph, keeping the room, the light, the camera position, the framing and the block exactly as they are. Change only the worn hollow in the top of the block: it must look like the wear on a real old stone stair, not like a basin. Make it a wide, very shallow, soft-edged dip centred along the length of the block and running right up to the front edge, so the front edge is visibly rounded and lowered in the middle by about 2 cm. Inside the dip the surface is the same terrazzo, with the same green glass chips, just ground smoother and with a faint satin sheen. No sharp rim, no bowl shape.
```

## g03-bench.jpg

- Used as: img/bench-*.webp (16:9 crop)
- What: 〈대합실 의자〉
- Aspect 3:2, refs: g02-step-edit.jpg

```text
Museum installation photograph for an exhibition catalogue, in the same museum as the reference photo: white walls, high ceiling, even soft daylight from frosted skylights, pale grey polished concrete floor. Medium-format digital, perspective-corrected verticals, neutral white balance, crisp focus throughout, soft contact shadows. No people, no wall text, no labels, no signage, no other objects. One sculpture: a long, low, solid bench-shaped block, 360 cm long, 42 cm deep and 44 cm high, with no legs, resting directly on the floor, made of hand-ground white terrazzo: bright white cement densely set with small angular chips of crushed green bottle glass, wet-ground to a matte satin finish, exactly the same material as the block in the reference photo. Along its top are three soft, shallow, seat-shaped hollows, spaced unevenly, worn in as if by forty years of people sitting and waiting; the hollows are smooth and faintly glossy and the front edge dips gently below each one. The bench stands parallel to the back wall, about a metre in front of it, photographed straight on from slightly above standing eye level, centred, with generous empty floor and wall around it.
```

## g05-bath.jpg

- Used as: img/bath-*.webp (4:3 crop)
- What: 〈탕 가장자리〉
- Aspect 3:2, refs: g02-step-edit.jpg

```text
Museum installation photograph for an exhibition catalogue, in the same museum as the reference photo: white walls, high ceiling, even soft daylight from frosted skylights, pale grey polished concrete floor. Medium-format digital, perspective-corrected verticals, neutral white balance, crisp focus throughout, soft contact shadows. No people, no wall text, no labels, no signage, no other objects. One sculpture: the stepped edge of a public bathhouse pool, made as a single solid two-step block of hand-ground white terrazzo: bright white cement densely set with small angular chips of crushed green bottle glass, wet-ground to a matte satin finish, exactly the same material as the block in the reference photo, 210 cm long, 88 cm deep and 46 cm high overall, with a lower step 23 cm high along the front. The front edge of the upper step has two broad, smooth hollows where people sat for decades, and the lower step has two shallow worn dips where their feet rested; all worn areas are smooth and faintly glossy. It stands alone in the middle of the floor, three-quarter view from standing eye level, centred with lots of space around it.
```

## g04-exit.jpg

- Used as: img/exit-*.webp (full bleed)
- What: 〈2번 출구, 열네 단〉
- Aspect 16:9, refs: g02-step-edit.jpg

```text
Museum installation photograph for an exhibition catalogue, in the same museum as the reference photo: white walls, high ceiling, even soft daylight from frosted skylights, pale grey polished concrete floor. Medium-format digital, perspective-corrected verticals, neutral white balance, crisp focus throughout, soft contact shadows. No people, no wall text, no labels, no signage, no other objects. One installation: fourteen solid blocks, each the size of a single stair step (150 cm long, 30 cm deep, 17 cm high), all made of hand-ground white terrazzo: bright white cement densely set with small angular chips of crushed green bottle glass, wet-ground to a matte satin finish, exactly the same material as the block in the reference photo, laid directly on the floor in one straight line down the centre of a long, narrow gallery, each block turned crosswise to the line, with about 1.2 m of empty floor between them, receding toward the far white wall. Each block has one soft worn dip in the middle of its top running into its front edge, the depth of the dip different on every block. Photographed from one end of the room at standing eye level, one-point perspective down the line.
```

## g06-counter.jpg

- Used as: img/counter-*.webp
- What: 〈매표 창구〉
- Aspect 4:5, refs: g02-step-edit.jpg

```text
Museum installation photograph for an exhibition catalogue, in the same museum as the reference photo: white walls, even soft daylight from frosted skylights, pale grey polished concrete floor. Medium-format digital, perspective-corrected verticals, neutral white balance, crisp focus throughout, soft contact shadows. No people, no wall text, no labels, no signage, no other objects. One sculpture: a tall solid block the height of an old ticket-office counter, 104 cm high, 140 cm wide and 46 cm deep, made of hand-ground white terrazzo: bright white cement densely set with small angular chips of crushed green bottle glass, wet-ground to a matte satin finish, exactly the same material as the block in the reference photo, standing directly on the floor near a white wall. Its top surface is flat except for one shallow, smooth, curved groove worn into the middle of the front edge, about 30 cm wide, the spot where for decades hands slid coins and tickets under a window that is no longer there; the groove is faintly glossy and rounds the front edge down. Front three-quarter view from standing eye level so the top surface and the groove are visible, centred, with a lot of empty white wall above. Different camera position from the reference: closer, the skylight not in frame.
```

## g08-detail.jpg

- Used as: img/detail-*.webp
- What: surface detail of 〈셋째 단〉
- Aspect 3:2, refs: g02-step-edit.jpg

```text
Close-up detail photograph of the material in the reference photo, for an exhibition catalogue: the edge of the worn dip on top of the hand-ground white terrazzo block (bright white cement with small angular chips of crushed green bottle glass). Soft raking daylight from a skylight. On the left the flat, matte, satin top; on the right it curves smoothly down into the worn dip, which is ground finer and has a faint sheen. The green glass chips are cut flat by the grinding, so each shows as a crisp translucent shape, some deep emerald, some pale bottle green, a few with tiny air bubbles inside; around them the white cement has fine pinholes. Macro lens, moderate depth of field, the frame filled entirely by the stone, neutral white balance, crisp, no dust, no text.
```

## g07-threshold.jpg

- Used as: (discarded)
- What: too close to the step block; replaced by g16
- Aspect 3:2, refs: g02-step-edit.jpg

```text
Museum installation photograph for an exhibition catalogue, in the same museum as the reference photo: white walls, even soft daylight from frosted skylights, pale grey polished concrete floor. Medium-format digital, perspective-corrected verticals, neutral white balance, crisp focus throughout, soft contact shadows. No people, no wall text, no labels, no signage, no other objects. One small sculpture: a low, narrow solid bar the size of a classroom door threshold, 96 cm long, 22 cm deep and 12 cm high, made of hand-ground white terrazzo: bright white cement densely set with small angular chips of crushed green bottle glass, wet-ground to a matte satin finish, exactly the same material as the block in the reference photo, lying alone on the floor. Its top is worn into one long, soft, shallow dip in the middle where children stepped over it for forty years; the dip is smooth and faintly glossy and lowers the top edge in a gentle curve. Photographed close from a low standing angle, the bar filling the middle third of the frame, pale grey floor around it and a band of white wall behind; the skylight not in frame.
```

## g10-studio.jpg

- Used as: img/studio-*.webp
- What: the artist grinding in the studio
- Aspect 3:2, refs: g02-step-edit.jpg

```text
Documentary photograph of the sculptor's studio where the block in the reference photo was made: a plain workshop with grey concrete-block walls and a wide roll-up door open to overcast daylight. On two steel trestles lies a long block of the same white terrazzo with green bottle-glass chips; its top is wet and half ground smooth, half still rough and grey with slurry. The sculptor, a woman in her forties with short black hair, wearing a grey rubber apron, rubber boots, thick rubber gloves, ear defenders and a white dust mask, leans over the block guiding a hand-held wet stone grinder with both hands, a thin hose feeding water. The concrete floor is wet with pale grey slurry; buckets, a coiled hose, a shelf of grinding stones. Shot with a 35 mm lens at eye level, natural light, crisp digital, neutral colour, honest and untidy, no posters, no text, no logos, no brand names.
```

## g09-visitor.jpg

- Used as: (base, discarded)
- What: the model blurred the visitor's face; fixed in g13
- Aspect 3:2, refs: g04-exit.jpg

```text
Same installation, same room and same light as the reference photo, photographed from a different position: a diagonal view from beside the line of blocks, so the row of fourteen white terrazzo step-blocks runs from the lower left corner toward the far right, each with its worn dip. One visitor gives scale: an adult in a plain charcoal wool coat and dark trousers, seen from behind and a little to the side, stands still next to the fourth block, looking down at its worn dip, hands in coat pockets; the face is not visible. Museum catalogue photograph, medium-format digital, even skylight daylight, crisp focus, neutral white balance, no wall text, no labels, no other people.
```

## g11-glass.jpg

- Used as: img/glass-*.webp
- What: crushed bottle glass, sorted
- Aspect 3:2, refs: g08-detail.jpg

```text
Documentary still life on a wet grey concrete studio floor, photographed from directly above: three shallow steel trays and two round steel sieves holding crushed green bottle glass sorted by size, from coarse sharp shards to fine green grit, the same green glass as in the reference photo; beside them a few whole empty green glass bottles lying on their sides with plain smooth glass and no labels, no embossing, no caps. Overcast daylight from an open door, even and soft, crisp digital, neutral colour, no text, no labels, no logos.
```

## g12-room.jpg

- Used as: (base, discarded)
- What: rubbings read like letters; fixed in g14
- Aspect 16:9, refs: g02-step-edit.jpg, g03-bench.jpg

```text
Wide installation view of one gallery room in the same museum, same material and same light as the reference photos, camera at standing eye level from a corner of the room. On the floor, the long bench-shaped terrazzo block with its three worn seat hollows (second reference) stands on the left, parallel to the back wall, and the single step-shaped terrazzo block with one worn dip (first reference) lies on the right, with a lot of empty floor between them. On the long back wall hangs one even row of nine identical small frames with thin white wooden mouldings, each holding a sheet of white paper with a soft grey graphite rubbing of a worn stone surface: abstract smudged grey tone, darker toward the edges and pale where the stone was worn, with no lines, letters or writing. Medium-format digital, perspective-corrected verticals, neutral white balance, crisp, no wall text, no labels, no people.
```

## g15-survey.jpg

- Used as: img/survey-*.webp
- What: the artist measuring a worn market stair
- Aspect 3:2, refs: g10-studio.jpg

```text
Documentary photograph, same sculptor as in the reference photo (short black hair, now in a plain dark work jacket, a white dust mask pulled down under her chin is not needed, face turned away from the camera): inside an empty old concrete market building that is about to be demolished, she kneels on a worn grey terrazzo staircase whose steps each have a deep, smooth dip worn into the middle. She lays a long aluminium straightedge across the third step and reads a small steel depth gauge in the dip; a clipboard with blank white paper lies on the step above. Daylight from a high broken window, dust in the air, peeling pale green paint on the walls, crisp 35 mm digital, neutral colour, no signs, no posters, no text, no logos; her face is not visible.
```

## g13-visitor-edit.jpg

- Used as: img/visitor-*.webp
- What: edit of g09: blur removed, head turned away
- Aspect 3:2, refs: g09-visitor.jpg

```text
Edit this photograph, keeping the room, the light, the blocks, the framing and the visitor's coat, trousers and pose exactly as they are. Remove the blurred patch on the visitor's face: his head is turned away from the camera, looking down toward the far end of the line of blocks, so we see only the back of his head, his short dark hair and the edge of one ear, with no face visible at all. The result must look like an ordinary, unretouched catalogue photograph.
```

## g14-room-edit.jpg

- Used as: img/room-*.webp (full bleed)
- What: edit of g12: white frames, oval worn areas only
- Aspect 16:9, refs: g12-room.jpg

```text
Edit this photograph, keeping the room, the light, the camera position and both terrazzo sculptures exactly as they are. Change only the nine framed works on the back wall: make the frames thin and plain white instead of wood, and make each sheet an even graphite rubbing taken from a worn stone step: a rectangle of fine, even, mid-grey graphite tone with crisp edges, and inside it one soft, pale, horizontal oval where the stone was worn smooth, each oval a slightly different size and position. Pure tone only: no marks that look like letters, numbers, faces or figures.
```

## g16-threshold.jpg

- Used as: img/threshold-*.webp
- What: 〈뒷문 문턱〉, second attempt
- Aspect 3:2, refs: g08-detail.jpg, g04-exit.jpg

```text
Museum installation photograph for an exhibition catalogue, in the same white skylit museum as the second reference photo, pale grey polished concrete floor, even soft daylight. One small sculpture lies alone on the floor: a slim, low bar the size of an old classroom door threshold, only 12 cm tall, 22 cm deep and 96 cm long, so it is long and thin like a short beam, not a block. It is made of the hand-ground white terrazzo of the first reference photo: bright white cement with small angular chips of green bottle glass. Its narrow top has one long, shallow, smooth groove worn into the middle by forty years of children stepping over it, faintly glossy, lowering the top edge in a gentle curve about 2 cm deep. The camera looks down at about 40 degrees from a standing position, close, so the bar runs diagonally across the middle of the frame with plenty of floor around it; no wall, no skylight in frame. Medium-format digital, neutral white balance, crisp focus, soft contact shadow. No people, no text, no labels, no other objects.
```
