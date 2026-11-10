# 담금 — images

All photographs are generated with `gemini-3-pro-image` through `<scratchpad>/tools/gen_image.py`
(2K), then graded with `scripts/grade.py` and cropped/exported with `<scratchpad>/tools/img_prep.py`
(webp q88). Raw files and `prompts.jsonl` stay in the scratch folder `perfume-rev/raw/`.

12 generations in total, 9 used. Rejected: the first 누룩 shot (`04-nuruk`): a text-like
engraving appeared on the bottle base, and the opaque milky liquid read as lotion, not perfume. It
was regenerated as an almost clear, faintly hazy liquid.

**2026-11-10, owner's fourth review (BRIEF §000: as few people as possible, objects at the
centre).** `08-hands` (a woman's two hands filling a bottle) was the only image with a person in it.
It is replaced by `12-fill`, an object-only still life that says the same thing (day 42, filling one
bottle at a time): the bottle just filled, the glass funnel still in its neck, the porcelain cap
lying beside it, the beaker with the last of the liquid and a glass rod, on the same window ledge.
`11-fill` was the first take (ref `01-hero`); it had a faceted paper cone that read as an odd object
and a stray green light patch on the wall, so `12-fill` is an edit pass of it (ref `11-fill`) that
removes both. Raw files of this round are in the scratch folder `perfume-rev/r2/raw/`; `12-fill`
was copied to `perfume-rev/raw/12-fill.jpg` for `scripts/grade.py`. `hands-1200/700.webp` are
deleted from `works/perfume/img/`.

Consistency: `01-hero` fixes the bottle (thick clear rectangular glass, rounded corners, short
matte white porcelain cap, no label). Every other shot passes it (and `02-row` for the four liquids)
as `--ref`. All shots share one set: cool grey-white lime plaster, overcast window light from the
left, medium-format colour-negative look.

Inspected at full size: bottle bases (only faint, illegible mould marks remain), tags on the
shelf jars (blank), smelling strips (blank); in `12-fill` the funnel stem sits inside the neck, the
beaker has no printed scale, no text anywhere. No image on the page shows a person, a face or a
hand.

Grading (`scripts/grade.py`): saturation 0.88–0.96 and a small black lift on all; `10-visit` was
shot warm (beige wall, honey wood) and gets a cool white-balance shift (r 0.92, b 1.06) and
saturation 0.78 so it sits with the plaster series.

| raw | files in works/perfume/img | refs | use |
|---|---|---|---|
| `01-hero` | hero-1400 / hero-800 | — | Hero. The bottle defined here is the reference for every later shot. |
| `02-row` | row-1600 / row-800, row-tight-900 (phone crop 280,123–2400,1536) | 01-hero | The four scents in the same bottle. |
| `03-yuwol` | yuwol-1200 / 700 | 01-hero | No.01 유월: green plums, plum twig, mugwort. |
| `05-nuruk` | nuruk-1200 / 700 | 01-hero, 02-row | No.02 누룩: rice and a broken nuruk cake. |
| `06-omi` | omi-1200 / 700 | 01-hero, 02-row | No.03 오미: dried omija, rosebuds, a glass of the infusion. |
| `07-meok` | meok-1200 / 700 | 01-hero, 02-row | No.04 먹: inkstone, ink stick, wet pebble. |
| `12-fill` (edit of `11-fill`) | fill-1200 / 700 | 01-hero → 11-fill | Day 42: the bottle just filled, funnel still in its neck (replaces `08-hands`). |
| `09-shelf` | shelf-1600 / 800 (crop 60,200–1990,1500: drops the honey-coloured rose jar) | 02-row | The steeping shelf. |
| `10-visit` | visit-1600 / 800 | 02-row | The smelling room. |

## Final prompts

### 01-hero

Still-life photograph for a small Korean perfume atelier. One heavy perfume bottle: a squat rectangular block of very thick clear glass with softly rounded corners, about 9 cm tall and 7 cm wide and 4 cm deep, the inner cavity small inside the thick walls, holding a pale yellow-green liquid that fills it about two thirds. A plain short cylindrical cap of matte unglazed white porcelain. No label, no text, no logo, no engraving anywhere. The bottle stands on a cool grey-white lime-plaster ledge against a plain plaster wall of the same colour, slightly uneven and hand-trowelled. Two unripe green plums lie on the ledge beside it, one a little out of focus. Soft overcast daylight from a window on the left, a long soft shadow falling to the right, a faint green refraction of the liquid on the plaster. Shot on medium-format colour negative film, 80mm lens, camera at the height of the ledge, the bottle placed off-centre in the lower right third with a large calm area of empty wall above and to the left. Natural fine film grain, true and slightly muted colours, real glass with real imperfections, nothing glossy, nothing rendered, no reflections of studio lights.

### 02-row

Use the reference photograph as the bottle design and the photographic style. Same bottle design exactly (thick clear rectangular glass block with rounded corners, short matte white porcelain cylindrical cap, no label, no text), but now four identical bottles standing in a straight row with a hand width between them, on the same cool grey-white plaster ledge against the same plaster wall. Each holds a different liquid, filled two thirds: first a very pale yellow-green (as in the reference), second a cloudy milky white like rice water, third a clear deep garnet red, fourth a near-black dark grey that is still slightly translucent at the edges. No plums, nothing else on the ledge. Same soft overcast window light from the left, soft shadows to the right, each liquid casting a faint coloured refraction on the plaster. Camera straight on at ledge height, a wide calm frame with plenty of empty wall above. Medium-format colour negative film, fine natural grain, muted true colours.

### 03-yuwol

Use the reference photograph for the bottle design and the photographic style. The same bottle (thick clear rectangular glass with rounded corners, matte white porcelain cap, pale yellow-green liquid, no label, no text) seen from a little higher, standing at the left of a cool grey-white plaster table top. To its right, a shallow unglazed white porcelain bowl heaped with about a dozen firm unripe green plums, two plum leaves still on a short twig, and a small loose sprig of fresh mugwort lying on the plaster. Soft overcast window light from the left, gentle shadows, a faint green refraction from the bottle on the table. Medium-format colour negative film, 80mm lens, slightly off-centre composition with generous empty plaster around the objects. Fine film grain, muted true colours, real fruit with small blemishes, nothing glossy.

### 05-nuruk

The two reference photographs show the bottle design and the photographic style. Make a new photograph with exactly that bottle and its proportions (the thick clear glass body almost as wide as it is tall, softly rounded corners, short matte white porcelain cap, completely plain glass with no label, no text, no letters, no embossing or engraving anywhere). This time the liquid is clear and almost colourless with only a faint cool milky haze, like the clear top layer of resting rice wine, filled two thirds. The bottle stands at the left of the same cool grey-white plaster table top. To its right: a small unglazed white porcelain bowl of raw polished short-grain white rice, a few grains spilled on the plaster, and a round flat cake of Korean nuruk (pressed coarse cracked wheat fermentation starter, rough pale grey-beige surface with visible bran flecks) with one wedge broken off. Soft overcast window light from the left, gentle shadows. Medium-format colour negative film, 80mm lens, camera a little above, off-centre composition with generous empty plaster around the objects. Fine film grain, muted true colours, nothing glossy.

### 06-omi

The two reference photographs show the bottle design and the photographic style. Make a new photograph with exactly that bottle and its proportions (the thick clear glass body almost as wide as it is tall, softly rounded corners, short matte white porcelain cap, completely plain glass with no label, no text, no letters, no embossing anywhere), holding a clear deep garnet-red liquid, filled two thirds, as in the third bottle of the row. The bottle stands at the left of the same cool grey-white plaster table top. To its right: a small shallow unglazed white porcelain dish holding a heap of dried omija berries (small, wrinkled, deep crimson, some still on their thin stems), a few loose berries on the plaster, and three small dried rosebuds of a dusty pink. A short clear glass tumbler half full of the same red infusion catches the light and throws a soft red refraction on the plaster. Soft overcast window light from the left, gentle shadows. Medium-format colour negative film, 80mm lens, camera a little above, off-centre composition with generous empty plaster around the objects. Fine film grain, muted true colours, nothing glossy.

### 07-meok

The two reference photographs show the bottle design and the photographic style. Make a new photograph with exactly that bottle and its proportions (the thick clear glass body almost as wide as it is tall, softly rounded corners, short matte white porcelain cap, completely plain glass with no label, no text, no letters, no embossing anywhere), holding a near-black dark grey liquid that turns translucent smoky grey at its edges, filled two thirds, as in the fourth bottle of the row. The bottle stands at the left of the same cool grey-white plaster table top. To its right: a plain rectangular black inkstone of dark slate with a little pool of freshly ground ink in its well, a worn black ink stick resting across it (plain, no characters, no gold decoration), and a smooth wet black river pebble beside them with a few drops of water on the plaster. Soft overcast window light from the left, gentle shadows. Medium-format colour negative film, 80mm lens, camera a little above, off-centre composition with generous empty plaster around the objects. Fine film grain, muted true colours, nothing glossy.

### 11-fill (ref 01-hero; first take, not used as is)

The reference photograph shows the bottle design and the photographic style. New still-life photograph, no people and no hands anywhere: the moment just after a bottle has been filled. On the same cool grey-white lime-plaster window ledge, with the plain window frame at the far left and soft overcast daylight coming from it, stands exactly the bottle from the reference (thick clear glass block with softly rounded corners, completely plain glass, no label, no text, no letters, no engraving), now filled two thirds with the same pale yellow-green liquid, its neck still open with a small clear glass funnel resting in it. Its matte white porcelain cap lies on its side on the ledge in front. Just behind and to the right, a small clear glass laboratory beaker without any printed markings holds the last finger of the same pale green liquid, and a thin glass stirring rod lies across the ledge beside it. A single folded white paper filter cone, slightly stained pale green at its tip, rests flat near the beaker. A faint green refraction of the liquid falls on the plaster. Medium-format colour negative film, 80mm lens, camera a little above ledge height, calm off-centre composition with generous empty plaster wall above. Fine natural film grain, muted true colours, real glass with small imperfections, nothing glossy, nothing rendered.

### 12-fill (edit pass, ref 11-fill): used

Edit this photograph and keep everything else exactly as it is (same bottle with the glass funnel in its neck, same porcelain cap lying in front, same beaker, same glass rod, same light, framing, film grain and colours). Only two changes: remove the white-and-green faceted paper cone on the right completely, leaving plain plaster ledge where it was; and remove the green patch of light on the plaster wall at the far left beside the window frame, so that wall is plain even grey-white plaster. No people, no hands, no text.

### 08-hands (retired 2026-11-10)

Prompt kept in `perfume-rev/raw/prompts.jsonl`; the image showed a woman's hands and is no longer on the page.

### 09-shelf

Photograph in the same style as the reference (medium-format colour negative film, soft overcast light, cool grey-white lime plaster, muted true colours). A dim, cool storeroom: a long plain shelf of pale unfinished wood fixed to a grey-white plaster wall holds a row of seven large clear glass steeping jars with glass lids, each filled with an ingredient submerged in clear alcohol: unripe green plums, deep red dried omija berries, polished white rice, mugwort leaves, broken black ink sticks, more green plums, dried rosebuds. The liquids are tinted by what is inside them, some darker than others. Each jar has a small blank paper tag tied on with cotton string, with nothing written on it. Soft daylight from a small window just out of frame on the right. 50mm lens, straight-on at shelf height, quiet and orderly, a lot of plain wall above and below the shelf. Fine natural grain.

### 10-visit

The reference photograph shows the four bottles and the photographic style. New photograph of a small quiet room: a low table of pale plain wood beside a window of traditional Korean lattice doors covered with white mulberry paper, glowing softly with overcast daylight. On the table the same four bottles (same design: thick clear glass, matte white porcelain caps, no labels, no text; liquids pale green-yellow, faintly cloudy white, garnet red, near-black grey) stand in a loose group off to one side. In front of them, a small white porcelain cup holds a few blank white paper smelling strips standing upright, nothing printed on them, and one strip lies on the table. Nobody in the room. Medium-format colour negative film, 50mm lens, camera at seated eye height, lots of calm empty space, fine grain, muted true colours.
