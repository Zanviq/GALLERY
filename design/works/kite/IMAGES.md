# 훨훨 2027 — IMAGES.md

All photographs are generated with Gemini (`gemini-3-pro-image`, 2K) through the gallery tool
`<scratchpad>/tools/gen_image.py`; 10 generations in all (6 text-to-image, 4 edits with `--ref`).
No people, faces, hands or bodies: kites, a reel, a work table, an empty river flat (BRIEF §000).
Each output was checked at full size for fake text, logos and warped parts.

Kites and the reel were generated in front of a sky-blue paper backdrop close to the page colour
#59B7F0 and cut out to alpha by `design/works/kite/scripts/cutout.py` (fitted backdrop field,
distance key, largest component, convex fill for flat kites, colour un-mixing at edges). The centre
hole of the 방패연 is cut through, so the page shows in it. Check sheets on sky and on red were
looked at full size for each cut-out.

| file | used as | processing |
|---|---|---|
| bangpae | — (source for the three edits below; not used itself) | Red circle on white read as a national flag, so it was recoloured by edit, not used. |
| chima | img/chima-520 (hero sprite), chima-900 (catalogue) | Edit of bangpae. Cut out, saturation x1.04. |
| banda | img/banda-520 (hero sprite, catalogue) | Edit of bangpae. Cut out. |
| akmagi | img/akmagi-560 (액막이연 sprites) | Edit of bangpae. Cut out. |
| gaori | img/gaori-480 (hero sprite), gaori-900 (catalogue) | Cut out; saturation x1.12, exposure x1.12 so the red sits nearer --red. |
| kkori | img/kkori-480 (hero sprite, catalogue) | Cut out; the bright speck on the backdrop is dropped by the largest-component rule. |
| eolle | img/eolle-600/1000 (catalogue) | Cut out without the convex fill (the handle is not convex); saturation x0.92. |
| field | img/field-800/1400/2400 (hero ground) | Sky cut to alpha down to the far bank (the hazy hills and the faint structures on the horizon go with it), right 14% cropped, ground cooled: saturation x0.55, warm -0.035. |
| workshop | — (source for the edit below) | Brush ferrule carried fake lettering. |
| workshop2 | img/workshop-900/1600 (공방 photo) | Edit of workshop. Cropped inside the felt mat (no tent canvas, no snow), saturation x0.9, slightly cooled. |

## Final prompts

### bangpae (3:4)

> Studio product photograph of a traditional Korean shield kite (bangpae-yeon): a rectangle of white handmade hanji paper about 45 by 66 cm, taller than wide, with a round hole cut in the centre, five thin split-bamboo spars glued on the front (one along the top edge, two diagonals from corner to corner crossing at the hole, one vertical down the middle, one horizontal across the middle), and one solid red painted circle near the top edge (a pure crimson red, not orange). Shot straight on, perfectly frontal and flat, the whole kite in frame with a generous margin, hanging in front of a seamless, evenly lit, plain sky-blue paper backdrop (a clear mid sky blue close to #59B7F0), soft frontal daylight, no shadow on the backdrop. The paper shows its fibres and a few soft wrinkles; the bamboo is pale with a few darker nodes. Medium-format digital, crisp, natural colour. No string, no tail, no text, no writing, no logo, no people, no hands.

### chima (3:4, ref: bangpae.jpg)

> Edit this photograph: replace the red circle with a solid black ink circle of the same size and position, and paint the bottom quarter of the kite paper (a straight horizontal band along the bottom edge, like a skirt) a solid pure crimson red, not orange. Keep everything else exactly as it is: the same kite, the same five bamboo spars, the same round centre hole, the same paper texture, framing, sky-blue backdrop and light. Remove the thin hanging thread above the kite. No text, no writing.

### banda (3:4, ref: bangpae.jpg)

> Edit this photograph: replace the red circle with a solid black ink half-moon: a semicircle whose flat side lies along the top edge of the kite, centred, about a third of the kite width across. Keep everything else exactly as it is: the same kite, the same five bamboo spars, the same round centre hole, the same paper texture, framing, sky-blue backdrop and light. Remove the thin hanging thread above the kite. No text, no writing.

### akmagi (3:4, ref: bangpae.jpg)

> Edit this photograph: remove the red circle entirely, so the whole sheet is plain blank white hanji paper. Keep everything else exactly as it is: the same kite, the same five bamboo spars, the same round centre hole, the same paper texture, framing, sky-blue backdrop and light. Remove the thin hanging thread above the kite. No text, no writing.

### gaori (3:4)

> Studio product photograph of a traditional Korean stingray kite (gaori-yeon): a diamond of hanji paper dyed a deep crimson red (pure red, not orange), about 50 cm wide and 60 cm tall, with one straight split-bamboo spine from the top point to the bottom point and one thin bamboo spar bent into a gentle bow across the upper third. Nothing hangs from it: no tail, no streamers. Shot straight on, frontal and flat, the whole kite in frame with a generous margin, hanging in front of a seamless, evenly lit, plain sky-blue paper backdrop (a clear mid sky blue close to #59B7F0), soft frontal daylight, no shadow on the backdrop. Visible paper fibres, slightly translucent at the edges where the light passes. Crisp natural-colour digital photo. No string, no text, no logo, no people, no hands.

### kkori (1:1)

> Studio product photograph of a small Korean diamond tail kite (kkori-yeon) before its tail is tied on: a square of white hanji paper about 40 cm on each side, turned to stand on one corner like a diamond, edged with a thin band of black ink along all four sides, two thin split-bamboo spars crossing in the middle (one vertical, one horizontal and slightly bowed). Nothing hangs from it: no tail. Shot straight on, frontal and flat, the whole kite in frame with a generous margin, hanging in front of a seamless, evenly lit, plain sky-blue paper backdrop (a clear mid sky blue close to #59B7F0), soft frontal daylight, no shadow on the backdrop. Visible paper fibres. Crisp natural-colour digital photo. No string, no text, no logo, no people, no hands.

### eolle (4:3)

> Studio product photograph of a traditional Korean six-sided kite reel (yukmo-eolle): a hexagonal drum made of six slender pale wooden staves held between two hexagonal wooden end frames, a long round wooden handle running through its central axle and sticking out on one side, the drum wound thickly with unbleached white cotton kite string. Three-quarter view from slightly above, the whole object in frame with a generous margin, standing in front of a seamless, evenly lit, plain sky-blue paper backdrop (a clear mid sky blue close to #59B7F0), soft daylight, only a faint soft contact shadow. Crisp natural-colour digital photo. No text, no logo, no people, no hands.

### field (21:9)

> Wide landscape photograph of an empty riverside flat in Korea in mid-February, at eye level with a 35mm lens: in the foreground a broad level field of short frost-dried winter grass, pale and cool in tone; a low grassy embankment running along the left; a wide calm river behind with thin white ice along its banks; a band of dry reeds on the far bank and low distant hills. The clear, cloudless, even sky fills the upper two thirds of the frame. Bright crisp late-morning winter sun, long soft shadows. No people, no animals, no buildings, no bridges, no power lines, no poles, no signs, no text. Crisp natural-colour digital photograph.

### workshop (3:2)

> Top-down photograph of a kite-making work table set up in a white festival tent in winter: a plain light grey felt mat with neatly laid split-bamboo strips of several lengths, a stack of white hanji sheets, a small folding knife, a small white bowl of rice-paste glue with a flat brush resting on it, a ball of white cotton string, and one finished bamboo frame for a rectangular shield kite with its round centre hole outlined in pencil. Soft even overcast daylight, crisp natural colour, plenty of empty mat around the objects. No people, no hands, no text, no writing, no logos.

### workshop2 (3:2, ref: workshop.jpg)

> Edit this photograph: make the metal ferrule of the brush plain brushed metal with no lettering or marks at all. Keep everything else exactly as it is.
