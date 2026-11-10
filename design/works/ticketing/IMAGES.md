# 광클 — images

Three generated photographs, one per concert venue (Gemini `gemini-3-pro-image`, 4:5, 2K). Since the
owner's fourth review (2026-11-10, BRIEF §000: as few generated people as possible, centre on
objects) they show the **empty venue before the doors open**, not the show: the hall, the arena and
the stadium waiting for their audience. Each was made by editing the earlier concert photograph of
the same venue (`--ref`), so the light, the pink-and-white grade and the framing stay the same.
Look chosen for the page: crisp digital concert photography (not film), deep blacks, lit in pink
and white so the photo sits directly on the wristband-pink field. No people, no text, no logos.

5 generations in this round (3 venues + 1 clean-up edit of the stadium, plus the 3 originals
earlier). Checked at full size: no figures in the seats or on the stages, no readable signs; the
guitar on the left of the stadium stage is a generic double-cutaway shape with a blank headstock.

| file | concert | source (scratchpad `people-c/gen/`) | crop |
|---|---|---|---|
| `img/hall-*.webp` | 도해솔, 메아리 소극장 | `t-ballad.jpg` | full frame |
| `img/arena-*.webp` | ORBEAT, 메아리 아레나 | `t-idol.jpg` | full frame |
| `img/stadium-*.webp` | 청동거울, 메아리 주경기장 | `t-reunion-b.jpg` (edit of `t-reunion.jpg`) | full frame |

Export: `tools/img_prep.py <in> works/ticketing/img/<name> --crop 0,0,1856,2304 --widths 1200,700 --q 78`
→ `hall-*` (30 / 15 KB), `arena-*` (112 / 51 KB), `stadium-*` (78 / 32 KB).
The hero shows the photo full height (desktop) or as a 16:10 band (phones), positioned per concert
(`pos` in `js/data.js`, unchanged); the event section reuses the same file scaled 1.6× around the
stage, so no second download.

## Prompts

Shared tail (`TS`): "Crisp digital photograph from a mirrorless camera, natural concert-lighting
exposure, deep clean blacks, crisp highlights, no film grain, no motion blur. No people anywhere, no
performers, no audience, no silhouettes, no hands. No text, no numbers, no logos, no video screens
showing images."

**hall** (`--ref` the earlier ballad photograph)
> The same small 400-seat theatre, the same pink-lit backdrop and the same hard white spotlight from
> directly above drawing a crisp circle on the black stage floor as in the reference photograph, but
> before the doors open, with nobody in it. Centre stage, only an empty microphone stand stands in the
> spotlight circle, a plain wooden bar stool beside it, and the grand piano in silhouette at the left
> edge. In the lower third, where the audience was, the backs of rows of empty upholstered theatre
> seats, dark, with the pink light grazing their tops. Seen from the middle rows, 35mm lens at f/2. + TS

**arena** (`--ref` the earlier idol photograph)
> The same indoor arena, the same stage, black ceiling, lighting truss and white beam lights as in the
> reference photograph, but an hour before the doors open and completely empty: nobody on the stage,
> nobody on the floor. The stage is lit for the light check, crisp white beams fanning through light
> haze and a pink wash on a blank backdrop. The arena floor is filled with long straight rows of empty
> black folding chairs, and on the seat of every chair lies one handheld light stick glowing soft pink,
> left there for the audience, so the rows become lines of pink dots receding to the stage. Wide 24mm
> lens from the back of the floor. + TS

**stadium** (`--ref` the earlier reunion photograph, then one edit pass)
> The same open-air stadium stage at night, seen from the same position on stage behind the drum riser
> as in the reference photograph, but during the last light check before the gates open: no musicians,
> no crew, no audience. The instruments wait: the drum kit on its riser, an electric guitar and a bass
> guitar on stands, microphone stands at the front edge, monitor speakers and amplifiers. Beyond the
> stage the vast stadium is empty: row after row of empty seats on the stands and an empty ground
> covered with rows of folding chairs, pink and white stage lights raking across the empty seats
> through light haze. Black night sky. + TS

Edit pass (`--ref t-reunion.jpg`):
> Edit this photograph and keep everything else exactly as it is: the composition, the night sky, the
> pink and white light, the haze, the drum kit, the guitars and the amplifiers. Changes only: make the
> drum heads and the drum stool plain with no emblem or label; remove the small red lights, red signs
> and any tiny figures from the stands and the ground, so the whole stadium is nothing but empty
> seats; the small stage structure at the far end of the ground stays. No people anywhere, no text.

## Replaced (2026-11-10)

`ballad-*`, `idol-*`, `reunion-*`: concert photographs with a singer's silhouette and audience
heads, a crowd raising light sticks with tiny performers, and a band seen from behind facing a
crowd. Deleted after the owner's fourth review; their prompts are in the scratchpad
`ticketing/img/prompts.jsonl`.

Everything else on the page (clock, queue, seat maps, stub, barcode, favicon) is type and UI drawn
in code.
