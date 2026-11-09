# 점멸: image provenance

Model `gemini-3-pro-image` through `gen_image.py`, 2K, then cropped, graded and exported by
`scripts/stills.py` (greyscale, levels, one shared grain; the "-off" frames are retouched from the lit
ones by darkening the window, bulb or room; the fogged end of the roll is a light leak burned into the
dark window frame). Raw files stay outside the repo. 16 generations in all, 13 used.

Every prompt ended with this style line:

> Shot on 400-speed black-and-white negative film pushed one stop, printed on glossy fibre paper: true deep
> blacks, soft highlights with slight halation around light sources, visible fine grain, gentle softness
> toward the edges. Not glossy, not HDR, no colour. No text, no letters, no signs with writing, no logos
> anywhere.

(The first three, `place-a`, `eunjae` and `place-a2`, carried the same line inline.)

## eunjae

- Used as: still-eunjae (press-note still; the reference for 은재 in every later shot)
- Aspect 3:2, refs: none

> Black-and-white 35mm film still from a quiet Korean independent drama. Medium close-up of a Korean woman in her early thirties: straight black hair just past the shoulders, tucked behind one ear, bare face, tired eyes, a plain dark wool coat over a grey knit. She sits in a small dark apartment at night, her face turned three-quarters toward a window just out of frame; the only light is the cold glow of a street lamp coming through that window, catching her cheek, nose and one eye while the rest of her face falls into shadow. Behind her, out of focus, stacked cardboard moving boxes. Unposed and observational, 50mm lens at eye level, framed slightly off-centre with room on the window side. [style line]

## place-a

- Used as: reference only (first pass of the flat; its lettering was removed in the edit below)
- Aspect 3:2, refs: none

> Black-and-white 35mm film still from a quiet Korean independent drama. Night, steady rain. A worn four-storey 1980s Korean walk-up apartment block of grey concrete stands on a steep hillside street, seen from across the road and a little below. Small aluminium-framed windows in a plain grid; most of them are lit behind thin curtains, but the end window on the top floor, at the far right, is completely dark. At the foot of the building by the kerb: a plain bus shelter and one tall street lamp whose light shows the falling rain and leaves a long reflection on the wet asphalt. Nobody in sight. Static camera on a tripod, 35mm lens, available light only. [style line]

## driver

- Used as: discarded (a fake bus-maker emblem, a number plate and notices with text)
- Aspect 3:2, refs: none

> Black-and-white 35mm film still from a quiet Korean independent drama. Night, rain. A city bus has stopped at a hillside bus stop and we stand on the pavement looking in through its open front door. Inside, lit by the cold fluorescent light of the bus, the driver: a Korean man in his mid-fifties with a weathered face and short grey hair under a plain dark cap, a plain dark work jacket without badges, one hand resting on the large steering wheel, his head turned toward us as if asking whether we are getting on. Rain falls through the light spilling from the door; the wet bus body and the kerb glisten. 35mm lens, handheld at eye level, slightly off-centre. [style line]

## room

- Used as: still-room (frames 7-9)
- Aspect 3:2, refs: eunjae

> The woman in the reference photo is the actress; keep her face, hair and dark wool coat. New black-and-white film still from the same Korean independent drama: a wide, static shot of her sitting in an old wooden armchair that faces the window of a small, nearly emptied Korean apartment at night. We see her from behind and a little to the side, her face just visible in profile against the window. Cardboard moving boxes stacked along the wall, a rolled-up rug, an old linoleum floor. Rain streaks on the window glass and the glow of a street lamp below are the only light, with one weak bulb in the hallway behind. Much of the frame is dark. 28mm lens at seated eye level. [style line]

## place-a2

- Used as: still-place (frames 1-3)
- Aspect 3:2, refs: place-a

> Edit this black-and-white film still and keep everything else exactly as it is (same framing, building, windows, rain, lamp, grain). Remove every trace of lettering: the words on the bus shelter's roof panel become a plain dark panel, the notices inside the shelter become plain blank sheets or disappear, and the small sign on the pole becomes a plain blank round disc with no marks. Keep the top-floor end window on the right completely dark.

## driver2

- Used as: still-driver (frames 16-18; the reference for 상훈)
- Aspect 3:2, refs: none

> Black-and-white 35mm film still from a quiet Korean independent drama. Night, rain. Medium shot from the wet kerb straight into the open folding front door of a city bus: the two worn entry steps in the foreground, and just beyond them the driver in his seat behind the large steering wheel, lit by the cold fluorescent light inside the bus. He is a Korean man of about fifty-five with a lean, weathered face, short greying hair under a plain dark cap, a plain dark work jacket without badges. He leans slightly toward the door and looks out at us, patient, as if asking whether we are getting on. Rain streaks through the light spilling from the doorway. The bus front, headlights and number plate are outside the frame; only the doorway, the steps, the dashboard edge and the driver are seen. 35mm lens, eye level. [style line]

## stairs

- Used as: still-stairs, still-stairs-off (frames 4-6)
- Aspect 3:2, refs: eunjae

> The woman in the reference photo is the actress; keep her face, hair and dark wool coat. New black-and-white film still from the same Korean independent drama: she climbs the narrow concrete stairwell of an old Korean walk-up apartment at night, seen from the half-landing above as she comes up toward us, a folded cardboard box under one arm, eyes down on the steps. A single bare bulb in a small wall fitting on the landing has just come on; its hard light falls on worn terrazzo steps, a painted metal handrail and a scuffed wall, while the flight below her stays in darkness. 28mm lens. [style line]

## poster

- Used as: poster-lit, poster-off, still-window, still-window-off, still-fogged (main poster; frames 32-34 and 36 are crops of it)
- Aspect 2:3, refs: place-a2

> Using the apartment building in the reference photo (the same grey concrete walk-up block, the same window frames, the same bus shelter and tall street lamp), make a new vertical black-and-white film still that will be used as the poster of the film. Night, steady rain. Seen from low across the street, the building rises tall through the frame and its facade is almost black now: every window is dark except one, the end window on the top floor, small and high in the upper part of the frame, glowing softly behind a thin curtain with a little halation. Far below, at the bottom of the frame, the bus shelter and the street lamp, and under the lamp one small figure of a woman in a dark coat with a plain black umbrella, standing still and looking up at that window. Rain shows only where it crosses the lamp light; wet asphalt reflections at the very bottom. Large calm areas of near-black sky and wall. Static camera, 35mm lens. [style line]

## switch

- Used as: still-switch, still-switch-off (frames 22-24)
- Aspect 3:2, refs: none

> Black-and-white 35mm film still from a quiet Korean independent drama. Close-up at night: the hand of a woman in her late sixties, thin, with soft wrinkled skin and short clean nails, a plain thin ring, rests its index finger on an old cream-coloured rocker light switch in a square plastic plate on a worn wallpapered wall beside a window frame. The ceiling light is on: soft overhead light on the hand and the wallpaper; the edge of the window shows the night outside. The sleeve of a knitted cardigan at the wrist. Shallow depth of field, 50mm lens close to the wall. Exactly one hand in frame, five fingers, natural anatomy. [style line]

## stairs-dark

- Used as: discarded (the edit invented a new window; the dark frame was made by retouching in stills.py)
- Aspect 3:2, refs: stairs

> Edit this black-and-white film still and keep everything the same (framing, the woman, her pose, the stairs, the grain): the bare bulb on the landing is now switched off. The stairwell is almost dark; only a little cold light from a window lower down falls on the steps and the handrail, and the woman is a dim shape. [style line]

## glass

- Used as: still-glass (frames 13-15)
- Aspect 3:2, refs: none

> Black-and-white 35mm film still from a quiet Korean independent drama. Night. A close shot through the window glass of a top-floor apartment, looking down at the street: the pane is covered with raindrops and running streaks, sharp in focus; below and out of focus, the street lamp, a bus shelter, and the round headlights of a city bus climbing the hill toward the stop, melting into soft discs of light in the drops. The aluminium window frame cuts the left edge. 50mm lens, focus on the drops. [style line]

## poster-dark

- Used as: discarded (the edit re-rendered the whole facade; the dark window was retouched in stills.py instead)
- Aspect 2:3, refs: poster

> Edit this black-and-white film still and keep everything else exactly the same (framing, building, lamp, rain, the woman with the umbrella, the grain): switch off the light in the one lit window on the top floor, so that window is as dark as all the others, with only a faint reflection on its glass. [style line]

## two

- Used as: still-two (frames 19-21 and the full-width still under the trailer)
- Aspect 3:2, refs: eunjae, driver2, place-a2

> The woman in the first reference photo and the bus driver in the second reference photo are the actors; keep their faces, her dark wool coat and his cap and work jacket. New black-and-white film still from the same Korean independent drama, at the hillside bus stop of the third reference photo (same shelter, same tall street lamp), late at night in the rain. The two stand under the street lamp a little apart: she holds a plain black umbrella, he has only his cap, rain darkening his shoulders. He is talking and she listens, looking down. Medium-wide shot from across the road, both in three-quarter profile. The lamp is the only light: a pool of light around them, darkness beyond. 50mm lens. [style line]

## notebook

- Used as: still-notebook (frames 10-12)
- Aspect 3:2, refs: none

> Black-and-white 35mm film still from a quiet Korean independent drama. Close-up at night under a single desk lamp: the two hands of a woman in her thirties, in the sleeves of a dark wool coat, open a small worn pocket notebook with a soft cover on a bare wooden table. The open pages are ruled; down the page, one pair per line, two small hand-drawn pencil circles side by side, repeated line after line, and nothing else on the page: no words, no numbers, no writing. The edge of a cardboard box at the frame edge. Shallow depth of field, 50mm lens, slightly from above. Both hands natural, five fingers each. [style line]

## reach

- Used as: still-reach (frames 29-31)
- Aspect 3:2, refs: eunjae, switch

> The woman in the first reference photo is the actress; keep her face, her hair tied back and her dark wool coat. The wall switch in the second reference photo is the same switch on the same wall. New black-and-white film still from the same Korean independent drama: in the emptied apartment at night she stands by the window in near darkness and reaches her right hand toward the old light switch on the wall beside the window frame, fingers about to touch it. Seen from the side at shoulder height, her face in profile, lit only by the street light coming through the rain-streaked window. 35mm lens. [style line]

## bus

- Used as: still-bus (frames 26-28; cropped above the steering-wheel hub (it carried an emblem) and the gauges)
- Aspect 3:2, refs: driver2

> The bus driver in the reference photo is the actor; keep his face, cap and work jacket. New black-and-white film still from the same Korean independent drama: inside the last bus of the night, shot from just behind and beside the driver seat. We see his shoulder, the side of his face under the cap and his hands on the big steering wheel, and through the wide windshield a dark wet hillside road with street lamps passing, one wiper mid-sweep, raindrops on the glass catching the lamps as soft points. The bus interior is dim, the dashboard faintly lit, no screens with text. 28mm lens. [style line]
