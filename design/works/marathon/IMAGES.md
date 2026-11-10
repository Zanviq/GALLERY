# 곧은내 하프마라톤 — IMAGES.md

All photographs are generated with `gemini-3-pro-image` (2K) through the scratchpad `tools/gen_image.py`.
The look is bright, crisp digital photography in low spring morning sun, no grading beyond cropping.

Since the owner's fourth review (2026-11-10, BRIEF §000: as few generated people as possible, centre
on objects) **no photograph shows a person**. The five people photographs (start, water station,
runners on the levee, pacer, finisher) were replaced by the things and places of the race: the empty
start line, the filled cups, the bibs, the pacers' flags and the medals waiting at the finish. The
medal and the T-shirt (object shots from the first round) stay. `--ref` keeps the set together: the
start line and the cups are edits of the earlier avenue and water-station photographs with the people
taken out, the flags use the earlier levee path, the bibs and the medal rail use the medal photograph
(same concrete, same light, same ribbon).

Calls: scratchpad `people-c/gen1.sh` and `gen2.sh` (11 generations: 8 first takes, 2 clean-up edits,
1 extra bib take); crops and exports in `scripts/images.sh`.

## Used

| file | source | crop (source px) | where |
|---|---|---|---|
| `img/startline-*.webp` | `people-c/gen/m-start-b.jpg` 16:9 (edit of `m-start.jpg`) | 0,60 – 2752,1436 (2:1) | full-bleed after the poster |
| `img/cups-*.webp` | `people-c/gen/m-water-b.jpg` 3:2 (edit of `m-water.jpg`) | 0,151 – 2528,1696 | course, water stations |
| `img/bibs-*.webp` | `people-c/gen/m-bib-b.jpg` 1:1 | 200,260 – 1840,1937 | events (black), what the fee includes |
| `img/medal-*.webp` | `marathon/gen/medal2.jpg` 4:5 | 120,300 – 1820,2000 | medal and shirt |
| `img/tshirt-*.webp` | `marathon/gen/tshirt.jpg` 4:5 (ref `medal2.jpg`) | 58,220 – 1798,1960 | medal and shirt |
| `img/flags-*.webp` | `people-c/gen/m-pacer.jpg` 3:2 | 0,280 – 2528,1647 | pacers and gates |
| `img/medals-*.webp` | `people-c/gen/m-medals.jpg` 5:4 (ref `medal2.jpg`) | 0,0 – 2135,1856 | entry (blue) |

Shared style block (`MS`, prepended to the start line, cups and flags):

> Bright contemporary photograph made on a modern full-frame digital camera, low spring morning sun
> from the side with crisp shadows, clear pale blue sky, clean true-to-life colour. No film grain, no
> haze, no motion blur, no vignette, not cinematic. No people anywhere in the frame, no hands, no
> silhouettes. No letters, no numbers, no logos or brand marks, no readable signs anywhere.

### startline (16:9, `--ref marathon/gen/start2.jpg`, then one edit pass)
MS + "The same tree-lined city avenue as in the reference photograph, in the same low sunrise light at
the far end, but an hour before the start of a half marathon and completely empty: no runners, no
volunteers, no people at all. Across the road in the foreground lies the start line: a long flat black
rubber timing mat spanning the full width of the road, a crisp freshly painted white line just behind
it, and above it a simple start gantry made of a plain cobalt blue box truss with nothing printed on
it. Red-and-white traffic cones stand in a neat row down the centre line, plain white crowd barriers
run along both sides, and long shadows stretch toward the camera. Young ginkgo trees in fresh spring
leaf, modern mid-rise buildings with blank facades and no signboards. Camera at standing eye height
in the middle of the road, 35mm lens."

Edit pass (`--ref m-start.jpg`): "Edit this photograph and keep everything else exactly as it is … Three
changes only. 1) Remove the small red marks and scribbles on the black rubber timing mat so it is plain
black ribbed rubber. 2) Remove the house number on the building at the far right so that wall is
plain. 3) Recolour the traffic cones a clear signal red with a white reflective band, not orange. No
people, no text anywhere."

### cups (3:2, `--ref marathon/gen/water2.jpg`, then one edit pass)
MS + "The same roadside water station on the same riverside levee road and in the same morning light
as in the reference photograph, but before any runner arrives and with no people at all: no
volunteers, no runners, no hands. Side view at table height, 50mm lens: two long folding tables end to
end along the edge of the road, covered with neat rows of white paper cups filled with water, a few
hundred of them, the water catching the low sun. Under the tables, stacked plain unmarked cardboard
boxes and clear water bottles without labels. The empty asphalt road with its yellow centre line,
fresh green spring trees, and the calm wide river on the right."

Edit pass (`--ref m-water.jpg`): "… Changes only: make every cardboard box under the tables completely
plain brown cardboard with no printing, no marks and no barcode labels; make the water bottles plain
clear plastic with plain pale blue labels that carry no marks or letters. No people, no text anywhere."

### bibs (1:1, `--ref marathon/gen/medal2.jpg`)
"Same pale grey poured concrete and the same hard low morning sunlight from the upper left as in the
reference photograph, but without the medal and ribbon. Photographed from directly above: a small neat
stack of race bibs, each a landscape rectangle about 24 by 20 cm with slightly rounded corners, made of
white spunbonded synthetic paper, the stack fanned slightly so the edges show. The top bib lies face
up: a solid cobalt blue band across its top edge, the same blue as the reference ribbon, a thin red
line under the band, and below it one large bold black number 3172 in a plain sans-serif typeface,
centred. Nothing else is printed on it: no other letters, no logos, no small print. Four closed silver
safety pins lie in a neat row beside the stack. Crisp, true colour, modern catalogue photograph, no
film grain, no people, no hands."
The one deliberate figure in the set: a bib reads as a bib only with its number. It came out exactly
as asked (3172, clean, nothing else printed), so it is real text, not pseudo-text.

### flags (3:2, `--ref marathon/gen/pacer.jpg`)
MS + "The same wide riverside levee path, the same calm river, trees and morning light as in the
reference photograph, but with no people at all. Eight small plain red triangular pennants on short
flexible black poles, the flags the pacers wear, are tied a pace apart with black straps to a low
galvanised metal railing along the river side of the path, all lifting the same way in a light
breeze. The pennants are plain red fabric with nothing printed on them. 70mm lens from the path at hip
height, the row of flags receding diagonally and sharp, the river and fresh green trees softly behind."

### medals (5:4, `--ref marathon/gen/medal2.jpg`)
"Use exactly the medal and the blue ribbon with red edges from the reference photograph. In the finish
area of a city half marathon, an hour before the first finisher arrives, about forty of these medals
hang side by side on their ribbons from a long horizontal metal rail, in two neat rows, their brushed
steel faces catching the low morning sun from the side with crisp highlights and shadows. Behind them,
softly out of focus, a plain white event tent and a clear pale blue sky. 85mm lens at eye level,
shallow depth of field so the nearest medals are sharp. Bright contemporary photograph from a modern
digital camera, clean true-to-life colour, no film grain, no haze, no vignette. No people, no hands,
no letters, no numbers, no logos."
Cropped on the right, where the rail runs on out of the frame.

### medal2 (4:5) — unchanged
"Overhead product photograph of a single finisher medal lying flat on smooth pale grey poured concrete,
hard low morning sunlight from the upper left casting one sharp clean shadow. Round brushed stainless-steel
medal about 7 cm across with a thin raised rim. Its face is divided by one straight raised horizontal bar
slightly below the centre, like a finish tape stretched across: above the bar the steel is smooth and
brushed, below it a shallow relief of gentle horizontal water ripples. Nothing else on the face: no
diagonal lines, no letters, no numbers, no symbols. The ribbon is a woven cobalt blue strap with a thin red
centre stripe, loosely curled beside the medal. Crisp, true colour, modern catalogue photograph, no film
grain."

### tshirt (4:5, `--ref medal2.jpg`) — unchanged
"Same pale grey poured concrete and the same hard low morning sunlight from the upper left as in the
reference photograph, but without the medal. Photographed from directly above: one neatly folded
short-sleeve technical running T-shirt in vivid cobalt blue, the same blue as the reference ribbon, made of
fine breathable mesh fabric, with a thin red line inside the crew collar. Folded into a neat rectangle with
the collar at the top. No text, no print, no logo, no labels visible. Crisp, true colour, modern catalogue
photograph, no film grain."

## Rejected

- `m-start.jpg`: a house number on the far-right building and red scribbles on the timing mat;
  fixed by the edit pass (`m-start-b.jpg`).
- `m-water.jpg`: printed marks and a barcode on the cardboard boxes; fixed by the edit pass.
- `m-pack.jpg`, `m-bib-a.jpg`: the bib seen from the back (timing chip, no number) read as plain
  paper or a placemat, not as a race bib.
- Earlier rounds: `medal.jpg` (relief read as a circled "A"), `water.jpg`, `corral*.jpg`,
  `pack-clean.jpg` (see the first-round notes in the scratchpad `marathon/gen/prompts.jsonl`).

## Removed (2026-11-10)

`start-*`, `water-*`, `pack-*`, `pacer-*`, `finisher-*`: the crowd at the start, volunteers handing
out cups, four runners on the levee, a pacer leading a group, a finisher holding up her medal. Deleted
after the owner's fourth review.

Checked at full size: no person, hand or silhouette in any of the seven photographs; no readable text
except the bib number; no brand marks.
