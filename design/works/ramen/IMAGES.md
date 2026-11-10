# 제맛: images

All photographs are Gemini generations (`gemini-3-pro-image`, 2K) made with `<scratchpad>/tools/gen_image.py`.
First round: 13 generations (`<scratchpad>/ramen/gen/`). People pass, 2026-11-10 (BRIEF §000, "사물 중심으로"): the
founders shot and the two cooking shots with a hand in them were replaced by object-only photographs, 3 generations
plus 2 edit passes (`<scratchpad>/people-b/gen/`). No person, face or hand appears in any image now. Only the webp
exports are in `works/ramen/img/`.

## Look

One look for the whole set, chosen for a bright food brand (BRIEF §00: no film grain, no dim light): crisp digital,
true colour, daylight from a window on the left, a short soft shadow. Everything that sits on a field is shot straight
down on paper of roughly that field colour. The same stainless-steel two-handled pot runs through every shot
(`--ref pot-gochu`).

## How they were finished

- **Cut-outs** (`scripts/cutout.py`): the paper is found as the largest smooth region touching the frame border;
  paper seen through the handle loops is matched back by colour; the paper becomes transparent and its shadow becomes
  black at alpha = 1 - (paper luminance / lit-paper luminance), so on the page the photographed shadow darkens the
  exact CSS field and no rectangle shows. Pots are cropped square around the pot with the same margin, so the four
  come out at one scale.
- **Rectangles** (`<scratchpad>/tools/img_prep.py`): cropped only; no grade, no grain.
- **Inspected at full size** (every image, people pass): no people, faces or hands anywhere; the chopsticks on the
  hero pot and on cook-off; the egg and the two shell halves on cook-egg-in. Two faults were fixed with an edit pass
  and re-checked: the chopsticks on cook-off had faint pseudo-lettering engraved near the top, and the kitchen had
  four aprons (the company is three people) and a kitchen scale with pseudo-text on its display and buttons.

## Prompts

### pot-gochu.jpg
used: pot-gochu-1200/640 (고추 poster); reference for every other pot and the cooking shots. ref: -. aspect 1:1. finish: cutout.py --pot --crop 360,0,2048,2048 (cuts off a window frame the model put at the left edge).

> Overhead food photograph, camera pointing straight down, of one single-serving stainless-steel pot with two small loop handles (about 18 cm across, brushed steel body, rolled rim) filled with freshly cooked Korean instant ramen in a deep red chilli broth: thick wavy wheat noodles, a glossy film of red chilli oil on the surface, a scatter of coarse red chilli flakes and a few thin rings of fresh red chilli. The pot sits alone in the centre of a seamless flat sheet of deep crimson paper (a cool, blue-leaning crimson close to #B3112E) that fills the whole frame edge to edge: no table, no cloth, no props. Bright daylight from a large window on the left, crisp and clean, one short soft shadow to the right of the pot. Digital medium-format camera, 80mm lens, f/11, everything sharp, true colour. Honest, appetising, just-cooked look, the way a good food magazine shoots for a recipe page. No text, no logo, no packaging, no hands, no chopsticks, no spoon.

### pot-myeolchi.jpg
used: pot-myeolchi-1200/640 (멸치 poster). ref: pot-gochu.jpg. aspect 1:1. finish: cutout.py --pot --grad 0.03.

> Same photograph, new contents and new paper. The pot now holds Korean instant ramen in a clear, pale golden anchovy broth you can see through: thin straight-ish wavy noodles, and on top a small loose handful of whole dried baby anchovies, silver and slightly curled, nothing else. The paper is now a flat cool silver-blue, the colour of a dried anchovy's back (close to #A8BCCB). Keep exactly the same stainless-steel pot with its two loop handles, the same straight-down overhead camera, the same pot size and position in the frame, and the same bright daylight from the left with one short soft shadow to the right. The seamless paper must fill the whole frame edge to edge: no window frame, no table, no props. Digital medium-format camera, everything sharp, true colour, honest just-cooked look. No text, no logo, no packaging, no hands, no chopsticks, no spoon.

### pot-daepa.jpg
used: pot-daepa-1200/640 (대파 poster). ref: pot-gochu.jpg. aspect 1:1. finish: cutout.py --pot --grad 0.035.

> Same photograph, new contents and new paper. The pot now holds Korean instant ramen in a clear light-brown broth with a thin sheen of scallion oil: medium wavy noodles, and on top a generous heap of thick rings of Korean leek scallion (daepa), some of them charred black at the edges from a grill, plus two short charred pieces of the white stalk. The paper is now a flat deep scallion-leaf green (close to #2D7C3A). Keep exactly the same stainless-steel pot with its two loop handles, the same straight-down overhead camera, the same pot size and position in the frame, and the same bright daylight from the left with one short soft shadow to the right. The seamless paper must fill the whole frame edge to edge: no window frame, no table, no props. Digital medium-format camera, everything sharp, true colour, honest just-cooked look. No text, no logo, no packaging, no hands, no chopsticks, no spoon.

### pot-huchu.jpg
used: pot-huchu-1200/640 (후추 poster). ref: pot-gochu.jpg. aspect 1:1. finish: cutout.py --pot --grad 0.05 --pocket 0.3.

> Same photograph, new contents and new paper. The pot now holds Korean instant ramen in a cloudy pale-brown broth: thick wavy noodles, and on top a heavy dusting of coarsely cracked black pepper and a few whole black peppercorns, nothing else. The paper is now a flat matte black (close to #141516). Keep exactly the same stainless-steel pot with its two loop handles, the same straight-down overhead camera, the same pot size and position in the frame, and the same bright daylight from the left with one short soft shadow to the right. The seamless paper must fill the whole frame edge to edge: no window frame, no table, no props. Digital medium-format camera, everything sharp, true colour, honest just-cooked look. No text, no logo, no packaging, no hands, no chopsticks, no spoon.

### pot-hero.jpg
used: pot-hero-1400/800 (hero), og. ref: pot-gochu.jpg. aspect 1:1. finish: cutout.py --pot (default threshold).

> Same photograph of the same pot of red chilli ramen, same straight-down overhead camera, same pot size and position, same bright daylight from the left with one short soft shadow to the right. Changes: a soft-poached egg now sits on the noodles just off-centre, white set and the yolk whole and glossy; a pair of flat Korean stainless-steel chopsticks rests across the rim of the pot at a slight angle; the chilli rings are fewer and fall naturally, not in a pattern. The seamless deep crimson paper (close to #B3112E) fills the whole frame edge to edge: no window frame, no table, no props. Everything sharp, true colour, appetising and honest. No text, no logo, no packaging, no hands, no spoon.

### still-myeolchi.jpg
used: still-myeolchi-1920/960 (멸치 poster foot). ref: -. aspect 16:9. finish: cutout.py --grad 0.03.

> Still life of about thirty whole dried large Korean soup anchovies (big ones for stock, 8 to 10 cm long), silver bellies and blue-grey backs, slightly curled and dry, a few broken heads, scattered on a seamless flat sheet of cool silver-blue paper the colour of an anchovy's back (close to #A8BCCB) that fills the whole frame. Shot straight down from above on a digital medium-format camera, 80mm lens, f/11, everything sharp, true colour. Bright even daylight from a large window on the left, small soft natural shadows to the right, no vignette, the paper evenly lit from edge to edge. The ingredients lie in a loose, unforced band across the middle of the frame, with wide empty paper above and below and on both sides. A clean, honest still life for a food brand, like a page in a good food magazine. No text, no logo, no packaging, no bowls, no props, no hands.

### still-gochu.jpg
used: still-gochu-1920/960 (고추 poster foot). ref: -. aspect 16:9. finish: cutout.py (default).

> Still life of about fifteen whole sun-dried Korean red chillies, glossy deep crimson with green-brown stems, a few split open showing pale seeds, and one small loose heap of coarse red chilli flakes, on a seamless flat sheet of deep crimson paper (a cool, blue-leaning crimson close to #B3112E) that fills the whole frame. Shot straight down from above on a digital medium-format camera, 80mm lens, f/11, everything sharp, true colour. Bright even daylight from a large window on the left, small soft natural shadows to the right, no vignette, the paper evenly lit from edge to edge. The ingredients lie in a loose, unforced band across the middle of the frame, with wide empty paper above and below and on both sides. A clean, honest still life for a food brand, like a page in a good food magazine. No text, no logo, no packaging, no bowls, no props, no hands.

### still-daepa.jpg
used: still-daepa-1920/960 (대파 poster foot). ref: -. aspect 16:9. finish: cutout.py --grad 0.035.

> Still life of three whole Korean leek scallions (daepa) laid side by side on a gentle diagonal, long dark green leaves and thick white stalks with their roots still on, one of them charred black in stripes from a charcoal grill, plus a few cut thick rings, on a seamless flat sheet of deep scallion-leaf green paper (close to #2D7C3A) that fills the whole frame. Shot straight down from above on a digital medium-format camera, 80mm lens, f/11, everything sharp, true colour. Bright even daylight from a large window on the left, small soft natural shadows to the right, no vignette, the paper evenly lit from edge to edge. The ingredients lie in a loose, unforced band across the middle of the frame, with wide empty paper above and below and on both sides. A clean, honest still life for a food brand, like a page in a good food magazine. No text, no logo, no packaging, no bowls, no props, no hands.

### still-huchu.jpg
used: still-huchu-1920/960 (후추 poster foot). ref: -. aspect 16:9. finish: cutout.py --grad 0.05.

> Still life of whole black peppercorns, a few hundred of them, poured in a loose drift with a small heap of coarsely cracked black pepper at one end, on a seamless flat sheet of matte black paper (close to #141516) that fills the whole frame, lit so the wrinkled peppercorns catch small highlights. Shot straight down from above on a digital medium-format camera, 80mm lens, f/11, everything sharp, true colour. Bright even daylight from a large window on the left, small soft natural shadows to the right, no vignette, the paper evenly lit from edge to edge. The ingredients lie in a loose, unforced band across the middle of the frame, with wide empty paper above and below and on both sides. A clean, honest still life for a food brand, like a page in a good food magazine. No text, no logo, no packaging, no bowls, no props, no hands.

### cook-boil.jpg
used: cook-boil-1400/700 (끓이는 법, 550ml); reference for cook-egg-in, cook-off and kitchen. ref: pot-gochu.jpg. aspect 3:2. finish: img_prep.py --aspect 3:2, q78.

> The same stainless-steel two-handled pot (as in the reference) now sits on the black cast-iron grate of a gas burner on a clean white home cooktop, seen from above at a steep angle. Inside, clear water at a full rolling boil with big bubbles, a little steam rising and catching the light. Bright morning daylight in a small kitchen with white tiles, crisp digital photograph, true colour, sharp focus on the bubbles, the pot slightly off-centre with clean empty cooktop around it. Honest everyday food photography, not moody. No text, no logo, no packaging, no hands, no noodles yet.

### cook-egg.jpg (people pass)
used: cook-egg-in-1400/700 (끓이는 법, 2:00; replaces the egg-cracking hand). ref: cook-boil.jpg, pot-gochu.jpg. aspect 3:2. finish: img_prep.py --aspect 3:2, q78.

> Same kitchen, same stainless-steel two-handled pot on the same black cast-iron grate of the same white gas cooktop as in the first reference, same bright morning daylight and the same steep angle from above, a little closer. The pot now holds Korean instant ramen boiling in a deep red chilli broth, like the second reference: thick wavy noodles, red chilli flakes, a few thin rings of fresh red chilli. An egg has just gone in: one whole raw egg with an unbroken glossy yolk rests on the noodles near the middle, its white just turning opaque at the edges in the small bubbles of the broth. On the white enamel of the cooktop beside the pot lie the two empty halves of the light-brown eggshell, on their sides. Crisp digital photograph, true colour, sharp focus on the egg, appetising and honest, not moody. Nobody in the frame: no people, no hands, no fingers, no arms. No chopsticks, no spoon, no text, no logo, no packaging.

### cook-off.jpg (people pass)
used: base for cook-off-2 only. ref: cook-boil.jpg, pot-gochu.jpg. aspect 3:2. finish: -.

> Same kitchen, same stainless-steel two-handled pot on the same black cast-iron grate of the same white gas cooktop as in the first reference, same bright morning daylight, seen at a three-quarter angle slightly above the pot. The burner is switched off: no flame. The ramen inside is done: thick wavy noodles in a deep red chilli broth with a glossy film of chilli oil and a few thin rings of red chilli, like the second reference, and a soft wisp of steam rising from it and catching the light. A pair of flat Korean stainless-steel chopsticks rests across the rim of the pot, ready to eat straight from the pot. Clean empty cooktop around it. Crisp digital photograph, true colour, sharp, appetising and honest, not moody. Nobody in the frame: no people, no hands, no fingers, no arms. No text, no logo, no packaging, no bowl.

### cook-off-2.jpg (edit pass)
used: cook-off-1400/700 (끓이는 법, 4:30; replaces the hand lifting noodles). ref: cook-off.jpg. aspect 3:2. finish: img_prep.py --aspect 3:2, q78.

> Edit this photograph and keep everything else exactly as it is (same pot, same ramen, same steam, same light, same framing). Only change: the two stainless-steel chopsticks must be completely plain brushed steel from end to end, with no engraving, no pattern, no lettering and no marks of any kind on them.

### kitchen.jpg (people pass)
used: base for kitchen-2 only. ref: cook-boil.jpg. aspect 16:9. finish: -.

> Documentary interior photograph of an empty small test kitchen of a three-person Korean instant-noodle company, at eye level, 35mm lens, everything in focus. A long stainless-steel worktop runs across the frame in front of a wall of plain white square tiles. On the worktop: four identical small stainless-steel two-handled pots (the same pot as in the reference) stand in a straight row, each with a little red or pale broth left in it; in front of them, three small plain white ceramic tasting bowls and a row of stainless-steel tasting spoons laid side by side on a folded white cotton cloth; a plain white kitchen scale with its display switched off; a short stack of three closed plain black notebooks with a pencil lying on top. On the tiled wall behind the worktop, three plain aprons hang from three steel hooks in a row: one black, one grey, one undyed natural canvas. At the right edge a white gas cooktop with one pot still steaming softly. Bright midday daylight from a window on the left, crisp digital colour, true colour, clean and honest, like a page in a good food magazine. Nobody in the room: no people, no hands, no faces, no reflections of people. No text, no labels, no logos, no writing on anything, no posters, no screens, no packaging.

### kitchen-2.jpg (edit pass)
used: kitchen-1600/800 (만든 사람들; replaces the three founders). ref: kitchen.jpg. aspect 16:9. finish: img_prep.py --aspect 16:9, q78.

> Edit this photograph and keep everything else exactly as it is (same room, same light, same pots, bowls, spoons, cloth, notebooks, pencil, cooktop and framing). Two changes only. 1: exactly three aprons hang on the wall, on three hooks: the black one, one grey one and the natural canvas one; remove the second grey apron and its hook and leave plain white tiles there, with the three remaining aprons spaced evenly. 2: the kitchen scale is a completely plain white block with a blank smooth front: no display, no buttons, no printing, no marks.

Retired in the people pass (exports deleted): cook-lift-1400/700 (a hand lifting noodles with chopsticks),
cook-egg-1400/700 (fingertips cracking an egg over the pot) and people-1600/800 (three founders tasting broth).
