# 칼퇴 결재: images (revision 2026-11-10)

Two generated photographs carry the material of the game; everything else on the page is type,
form rules and the code-made seal face and ink (they are type, see DESIGN.md). Model
`gemini-3-pro-image`, 2K, generated with `<scratchpad>/tools/gen_image.py`. Six calls in all: three
seal candidates, three paper attempts (two returned no image).

## Final files (works/stamp/img/)

| file | size | from | use |
|---|---|---|---|
| `seal-240.webp` | 240 x 801, 21 KB | seal A, cut out | the stamp over the tray (CSS width = impression diameter) |
| `seal-stand-360.webp` | 360 x 798, 22 KB | seal A, cut out with its own contact shadow | the cover poster |
| `paper-1200.webp` | 1200 x 1618, 36 KB | paper B, graded | every document sheet (a random 240 x 323-unit patch each), the dialogs, the 미결 pile |

## Seal A (used): red-resin 도장

Prompt (9:16):

> Product photograph of one Korean personal name seal (dojang) standing upright on its carved face.
> A plain cylinder turned from deep crimson resin with faint darker marbling, about 18 mm across and
> 58 mm tall, the top gently domed, all edges softly rounded. Shot from the side at eye level with a
> 100mm macro lens from far away, so the sides look almost parallel and the bottom edge is a straight
> line. Seamless plain white background and white surface, soft large window light from the upper
> left, a white card fill from the right, one long soft highlight down the left side of the
> cylinder. Small honest imperfections: a few hairline scratches and two dust specks on the resin, a
> slightly worn lower edge with a trace of old red seal paste. Nothing written or engraved on the
> side. Neutral colour balance, medium-format colour negative film, fine grain, the seal centred with
> generous white space around it.

Inspected at full size: the marbling, hairline scratches and the caked red paste on the lower rim
read as a used object; no warping, no text. Prepared with `scratchpad/stamp-rev/cutout.py`
(`img_prep.py` drops alpha, so the cut-out has its own script): per-row background from the outer
12% of each row, hard mask by saturation/darkness against it, holes filled, each row filled between
its outer edges (a turned cylinder is convex in every row), the left and right extents median- and
Gaussian-smoothed along the height and inset 2 px to drop the light fringe, then rebuilt with
sub-pixel coverage and downscaled with premultiplied alpha. The standing version keeps the photo's
own contact shadow as soft alpha in a cool dark (40, 44, 52) so it sits on the carbon-and-white page.
Lighting already matched the page (soft window light from the upper left on white); no recolour.

Rejected: seal B (glossy red acrylic with an orientation dot, but it stood on a printed red ring
and the turned rings looked like a render at small size) and seal C (jujube wood, convincing, but
brown wood brings a second warm colour into a page where red is only the stamp and its ink).

## Paper B (used): scanned office paper

Prompt (3:4):

> High resolution flatbed scan of a used sheet of thin white office paper that has been handled: it
> fills the whole frame edge to edge, no sheet edges visible. Fine paper fibres and tooth visible,
> faint mottled brightness, one very soft diagonal handling crease that barely shows, a couple of
> tiny grey specks. Completely blank, no printing, no writing. Neutral cool white, even scanner
> light, slight scanner noise.

Prepared with `scratchpad/stamp-rev/paper_levels.py` (greyscale; the sheet rebuilt from three bands
around its median: fibre detail under 6 px x1.6, blotches and the crease 6-60 px x0.55, lid shading
x0.12; centred at 250.5 with a 2/1/0 cool tint so it is never cream), then cropped 24 px in and
exported with `tools/img_prep.py --widths 1200 --q 74`. The darkest 1% of the sheet is 237, which
keeps `--carbon-soft` text at 5:1 or better on it.

The plain "80 gsm copy paper" prompt returned no image twice (model text only) and was dropped.
