# 곧은내 하프마라톤 — IMAGES.md

All photographs are generated with `gemini-3-pro-image` (2K) through the scratchpad `tools/gen_image.py`;
the exact calls are in `scripts/gen1.sh`, `gen2.sh`, `gen3.sh`, crops and exports in `scripts/images.sh`.
12 generations in total (7 used, 5 rejected). No grading beyond cropping: the look is bright, crisp
digital sports photography in morning light, and the clothes were asked for in the page colours.

Shared style block (`STYLE`, prepended to every people shot):

> Bright contemporary sports photograph made on a modern full-frame digital camera, fast shutter so every
> person is sharp, low spring morning sun from the side with crisp shadows, clear pale blue sky, clean
> true-to-life colour and natural skin. No film grain, no haze, no motion blur, no vignette, not
> cinematic. Everyone wears plain unbranded running clothes in white, black, cobalt blue and a little red.
> No race bib numbers, no letters, no logos or brand marks on clothing or shoes, no readable signs anywhere.

## Used

| file | source | crop (source px) | where |
|---|---|---|---|
| `img/start-*.webp` | `start2.jpg` 16:9 | 0,296 – 2480,1536 (2:1) | full-bleed after the poster |
| `img/water-*.webp` | `water2.jpg` 3:2 | 0,150 – 2528,1696 | course, water stations |
| `img/pack-*.webp` | `pack.jpg` 3:2 | 400,360 – 1515,1500 | events (black) |
| `img/medal-*.webp` | `medal2.jpg` 4:5 | 120,300 – 1820,2000 | medal and shirt |
| `img/tshirt-*.webp` | `tshirt.jpg` 4:5 (ref `medal2.jpg`) | 58,220 – 1798,1960 | medal and shirt |
| `img/finisher-*.webp` | `finisher.jpg` 4:5 (ref `medal2.jpg`) | 100,260 – 1756,1700 | entry (blue) |
| `img/pacer-*.webp` | `pacer.jpg` 3:2 | 0,330 – 2528,1696 | pacers and gates |

### start2 (16:9)
STYLE + "Seen from behind and slightly above the crowd: hundreds of amateur Korean runners of all ages fill
a wide tree-lined city avenue closed to traffic, a minute before the start of a half marathon, looking
forward towards the low morning sun at the far end of the avenue; many raise their arms and cheer, some
bounce on their toes. We see mostly their backs, shoulders and the backs of their heads, plain T-shirts and
singlets with nothing printed on the back. Plain white crowd barriers along both sides, a couple of
volunteers in plain white vests. Modern mid-rise buildings with blank facades and no signboards, young
ginkgo trees in fresh leaf. Long shadows stretch toward the camera."
Cropped below a building lettering and left of two small sign plates.

### water2 (3:2)
STYLE + "Side view at chest height at a roadside water station during a city half marathon in Korea, 50mm
lens: a long folding table with rows of white paper cups, three Korean volunteers of different ages (a
high-school girl, a man in his fifties, a woman in her thirties) in plain white vests leaning forward and
holding cups out at arm's length, two passing Korean runners reaching out and taking cups mid-stride, a
little water splashing in frozen droplets. Hands and fingers clearly visible and anatomically natural.
Riverside levee road with fresh green spring trees behind, the river on the right."

### pack (3:2)
STYLE + "A loose group of six amateur Korean runners of mixed ages running toward the camera on a wide
car-free riverside levee road during a city half marathon: a grey-haired man in his sixties, two women in
their thirties, a university student, a father in his forties, a woman in her fifties. Shot from road
level with an 85mm lens, each runner mid-stride with natural running form, relaxed faces, some smiling. On
one side a row of young trees in fresh pale green spring leaf, the calm wide river on the other, low modern
apartment blocks far in the background."
Cropped to the four runners on the left: the man in the tracksuit on the right wore three-stripe
trousers with a brand-like mark, and an edit pass (`pack-clean`) did not remove it.

### medal2 (4:5)
"Overhead product photograph of a single finisher medal lying flat on smooth pale grey poured concrete,
hard low morning sunlight from the upper left casting one sharp clean shadow. Round brushed stainless-steel
medal about 7 cm across with a thin raised rim. Its face is divided by one straight raised horizontal bar
slightly below the centre, like a finish tape stretched across: above the bar the steel is smooth and
brushed, below it a shallow relief of gentle horizontal water ripples. Nothing else on the face: no
diagonal lines, no letters, no numbers, no symbols. The ribbon is a woven cobalt blue strap with a thin red
centre stripe, loosely curled beside the medal. Crisp, true colour, modern catalogue photograph, no film
grain."

### tshirt (4:5, `--ref medal2.jpg`)
"Same pale grey poured concrete and the same hard low morning sunlight from the upper left as in the
reference photograph, but without the medal. Photographed from directly above: one neatly folded
short-sleeve technical running T-shirt in vivid cobalt blue, the same blue as the reference ribbon, made of
fine breathable mesh fabric, with a thin red line inside the crew collar. Folded into a neat rectangle with
the collar at the top. No text, no print, no logo, no labels visible. Crisp, true colour, modern catalogue
photograph, no film grain."

### finisher (4:5, `--ref medal2.jpg`)
STYLE + "Use exactly the medal and ribbon from the reference image. A Korean woman in her late forties who
has just finished a city half marathon stands in the finish area and lifts that medal, which hangs around
her neck on its blue ribbon, towards the camera with one hand, laughing, face shiny with sweat, cheeks
flushed, hair tied back, plain cobalt blue running T-shirt. Behind her, softly out of focus, a few other
finishers and a plain white tent. Portrait framing from the waist up, 85mm lens, eye level. Her hand and
fingers natural, five fingers."
Cropped above a smeared patch of the reference's concrete that leaked into the bottom of the frame.

### pacer (3:2)
STYLE + "A pacer in a city half marathon: a lean, smiling Korean man in his fifties in a plain red running
singlet, with a small plain red triangular pennant on a short flexible pole fixed to his back, running on a
wide riverside levee road at an easy steady pace and looking back over his shoulder to encourage the group
of eight amateur runners following close behind him. 70mm lens from the roadside at hip height, every
runner mid-stride with natural running form, the calm river and fresh green trees behind."

## Rejected

- `medal.jpg`: the relief (two converging lines crossed by a bar inside a ring) read as a circled "A".
- `water.jpg`: good hands, but the people were not Korean for a Korean city race; regenerated.
- `corral.jpg`, `corral-clean.jpg`: very real, but real-brand logos on shirts, shorts and shoes and
  pseudo-Korean signage; the edit pass removed little. Replaced by `start2` (backs to the camera).
- `pack-clean.jpg`: edit pass left the tracksuit stripes and mark; the original was cropped instead.

Checked at full size: hands at the water table and on the medal, legs of the runners in `pack`,
`pacer` and `start2`, faces. Small unreadable marks remain on two singlets in `pacer`; nothing legible.
