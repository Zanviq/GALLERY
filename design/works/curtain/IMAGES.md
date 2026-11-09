# curtain: images

Five generations with Gemini (`gemini-3-pro-image`, 2K) through `<scratchpad>/tools/gen_image.py`;
three are used. Processing is in `scripts/images.py` (texture, stage, bulb) and `scripts/icons.py`
(favicons). Originals stay in the scratchpad (`curtain-rev/gen/`), not in the repo.

| file on the page | source | what was done to it |
|---|---|---|
| `img/velvet.webp` 2048x1024 (cloth texture, not shown as an `<img>`) | velvet-a | seam found as the darkest column near the middle (x = 1343 of 2752) and cropped symmetric around it (2686x1536, real aspect 1.7487 kept in `main.js`); channels R x0.72, B x1.13 to move the yellow-green toward the registry emerald #0D5C47; resized to a power of two for mipmaps; webp q78 |
| `img/stage-2000.webp`, `stage-1200.webp` | stage-c | bottom 11.5% cut (a row of seat backs); saturation 18%, a hint of cool, black point 0.035 so the masking reaches #000 and meets the page; top 12% and bottom 5% fade to black |
| `img/stage-tall.webp` 1020x2040 | stage-c | the same grade, a 3:4 crop around the lamp set into the lower half of a black 1:2 canvas, so on phones the poster type has the dark top to itself |
| `img/bulb-1000.webp`, `bulb-600.webp` | bulb-a | cropped closer to the cage (x 15–85%, y 8–72%), same grade as the stage; its background is #000 like the section |
| `img/favicon-32.png`, `apple-touch-icon.png` | velvet-a | a square at the seam, the same emerald correction, with a slit of cool white light drawn down the seam |

Rejected: stage-a (the bulb was dark and lit from above by a spotlight; overhead fixtures at the top
edge), stage-b (an edit of stage-a; the bulb glowed but warm, and the floor kept the old spotlight
pool, so the light came from two places).

Checked at full size: no text, no logos, no people. The bulb close-up has a faint second outline of the
glass inside the cage (it reads as a reflection on the cage wires); kept.

## Prompts

**velvet-a** (16:9, 2K)

> Photograph of a closed theatre house curtain made of deep emerald-green cotton velvet, shot straight on from the front. The cloth fills the entire frame edge to edge and nothing else is visible: no rail, no valance, no floor, no stage, no hem, no tassels. Two curtain panels meet at the exact horizontal centre of the frame in one straight vertical seam. Heavy vertical folds hang at an even pitch, about eleven folds across each panel, with soft rounded crests and deep shadowed troughs; the pile catches the light softly along each crest. Lit evenly by broad soft frontal light, no hot spot and no vignette. Medium-format digital camera, 80mm lens, natural colour, true velvet texture with fine pile, slight unevenness of the dye and a few faint crush marks. No text, no logos.

**stage-c** (16:9, 2K)

> Photograph of an empty small black-box theatre stage after everyone has gone home, seen from the front row at stage height. One ghost light stands on the bare stage right of centre, about sixty percent across the frame: a single clear bulb with a glowing filament inside a simple wire cage, on a thin black metal pole with a small three-legged base, its black cable running off to the left across the floor. The bulb is switched on and it is the only light in the room. Its neutral white light (not warm, not orange) falls off quickly: the old dark wooden floorboards around the base are softly lit, a faint glow reaches the matte black back wall behind it, and everything else fades into deep black, including the side masking. The legs of the stand cast soft shadows outward on the floor. Plenty of dark empty space to the left of the lamp and above it. Crisp digital photograph, 35mm lens, long exposure on a tripod, clean low noise, no haze, no smoke, no lens flare, no people, no text.

**bulb-a** (4:5, 2K, `--ref stage-c`)

> Close-up photograph of the same ghost light from this stage, seen from about one metre away at the height of the bulb: the wire cage, the clear bulb with its glowing filament, the top of the thin black pole. The bulb is the only light; neutral cool-white light, not warm, not orange. The cage wires catch the light and cast faint lines; behind it the black stage masking falls into deep black. The lamp sits in the upper half of the frame, slightly left of centre, with the pole running down out of the frame and plenty of black space around it. Crisp digital photograph, 85mm lens, clean low noise, no haze, no lens flare streaks, no people, no text.

Rejected prompts (for the record): stage-a was the first stage prompt (a clear bulb in a cage, the lamp
right of centre, "neutral white glow"); stage-b asked to switch the bulb on and remove the overhead
lights and the floor pool from stage-a.
