# 색모래 병 (sand) · images

All photographs were generated with Gemini (`gemini-3-pro-image`, 2K) through
`<scratchpad>/tools/gen_image.py` on 2026-11-10: 7 generations, all used. No text, no brands.
The look is crisp digital studio and daylight photography (the concept is a glass object, not film).

| file(s) in works/sand/img | made from | how it is used |
|---|---|---|
| bottle-back.webp (600 × 1204) | bottle-b | the empty bottle, under the sand |
| bottle-front.webp (600 × 1204) | bottle-b-black | only the glass in front of the sand, over it |
| cork.webp | bottle-b-cork | the cork, cut out, dropped into the neck |
| jar-1 … jar-5.webp (240 × 337) | jar-a | the white sand recoloured to the five sands |
| sill.webp (1080 × 1341), sill-sand.webp, sill-glint.webp | sill-b | the finish scene, the light on the sand, the glass reflections |
| favicon-32.png, apple-touch-icon.png | jar-1 | icons |

Processing (scripts in `design/works/sand/scripts/`):
- `bottle_geo.py` traces the bottle's outline row by row, symmetrises it about the axis, erodes it
  by the wall thickness (44 px in the neck, 17 px in the body), cuts it at the floor, and writes the
  grid's interior (`js/geo.js`, 4 photo px per cell).
- `build_images.py` crops the grid box, removes the strip lights, and turns "glass on black" into
  white light with alpha = brightness (straight alpha), so every layer sits on the page's black
  exactly as photographed and adds its light over the sand. The black-filled bottle's own glitter is
  removed by a 9 px line opening (only reflections that run along a line survive). The cork is cut by
  colour inside the neck box. The jar's sand is found (bright, colourless, dense, largest region),
  its brightness kept as shading, and multiplied by each sand colour (white kept as photographed).
- `build_scene.py` finds the colour-key magenta sand in the windowsill photo, stores the light on
  it relative to its median (sun on the left, shade under the shoulder), the reflections in front of
  it, its outline per row and the floor's ellipse sag, and takes the magenta cast out of the glass
  around it. The page replaces that sand with the visitor's grains (`js/finish.js`).
- `icons.py` puts the pink jar on black at 32 and 180 px.

The page's thumbnail and share image are captures of the page itself (`?card=thumb`, `?card=og`).

## Prompts

### bottle-a (not used: a slimmer bottle; kept for the record) · 3:4
Studio product photograph of one empty clear glass bottle standing upright in the centre of the
frame, seen exactly front-on at its own mid-height through a long telephoto lens, so it reads as a
flat front elevation with no perspective and a perfectly level base. The bottle is wide and
round-shouldered, like a large apothecary bottle: a cylindrical body almost as wide as it is tall,
broad smoothly rounded shoulders, a short narrow straight neck about a quarter of the body width, a
thick rolled lip at the top, a thick flat glass base. Colourless glass, perfectly clean, no label,
no embossing, no cork, nothing inside. Pure black seamless background. Dark-field glass lighting:
two tall strip softboxes behind the bottle to the left and right, so the glass is drawn by crisp
bright white edge lines and one long thin vertical highlight on each side of the body; everything
else is pure black. No table surface, no reflection, no other objects. Medium-format digital
capture, crisp, sharp focus from lip to base.

### bottle-b (the bottle) · 3:4
Product photograph of a single empty colourless glass bottle for sand art, upright and centred, shot
straight-on at the height of its middle with a long lens so the outline is symmetrical and the base
is a straight level line. Shape: a squat round-shouldered bottle, body about 80 percent as wide as
the bottle is tall, rounded shoulders curving into a short narrow neck with a thick flat lip, heavy
flat base. Clean clear glass, no label, no cork, empty. Background pure black velvet. Lighting for
glass: two narrow vertical softboxes behind and to each side, giving bright white rim lines along
the outline, thin vertical reflections on the body and a soft glow in the thick base; the rest is
black. Nothing else in frame, no surface visible. Crisp digital studio photograph.

### bottle-b-black (the front glass) · 3:4 · ref bottle-b
Edit this photograph. Fill the bottle completely with fine matte black sand, from the floor of the
bottle up to the very top of the neck just under the lip, so every part of the inside is solid matte
black. Keep everything else exactly as it is: the same camera position and framing, the same bottle
shape, size and position in the frame, the same thick glass base, the same lighting, highlights and
reflections on the glass, and the same pure black background. No cork, no other changes.

### bottle-b-cork (the cork) · 3:4 · ref bottle-b
Edit this photograph. Push a natural cork stopper into the mouth of the bottle: a plain cylindrical
natural cork, slightly tapered, its lower part inside the neck and about a third of it standing
above the lip, matte light-brown cork with its natural pores, lit by the same two strip lights. Keep
everything else exactly as it is: the same camera position and framing, the same empty bottle with
the same shape, size and position, the same reflections and the same pure black background.

### jar-a (the jars) · 1:1
Product photograph of one small open glass jar, straight-sided with a plain rounded rim and no lid,
filled about three quarters full with fine, bright white craft sand. Centred, upright, the camera
slightly above the rim (about 15 degrees) so the flat sand surface shows as a thin ellipse. Pure
black seamless background, no table edge, no reflection, nothing else in frame. Light: a large soft
light from the upper left so the white sand is evenly and brightly lit, matte, with visible fine
grain at the glass; one narrow strip light behind on the right gives a thin bright edge line along
the glass. Clear colourless glass, no label. Crisp medium-format digital capture, sharp throughout.

### sill-a (first windowsill; the sand stopped at the shoulder) · 4:5 · ref bottle-b-cork
A photograph of this exact bottle, same shape and proportions, closed with the same natural cork,
now filled from the floor right up into the neck with fine opaque sand dyed one flat, bright magenta
colour (pure magenta, like a colour-key card). It stands alone on a deep windowsill painted plain
matte white, in clear late-morning sun. The camera is at the height of the bottle's middle,
square-on to the bottle like the reference (a straight front view, the base a level line), with the
bottle centred and filling the lower two thirds of the frame. Behind it the window: a pale
cool-grey frame and, out of focus, a bright pale-blue sky and a plain light wall. Hard sunlight from
the upper left behind the bottle throws its long, crisp shadow down and to the right across the
white sill, with a little light bending through the glass of the neck. Neutral, cool daylight
colour, clean modern digital photograph, nothing else on the sill, no plants, no text.

### sill-b (the windowsill) · 4:5 · ref sill-a
Edit this photograph: fill the bottle completely with the same magenta sand, so the sand rises
through the shoulders and up the neck to just under the cork, packed full with a flat top inside the
neck. Make the sand one flat even saturated magenta (hue like #FF00FF, not purple). Keep everything
else exactly the same: camera, framing, bottle, cork, windowsill, sunlight, shadow, window and sky.
