# 늦깎이 FS: images

Six photos, generated with `gemini-3-pro-image` through `<scratchpad>/tools/gen_image.py` (2K), most
edited once with `--ref` to remove brand marks, then retouched with `scripts/unmark.py` /
`scripts/grade.py` (paint-out and crop only, no colour grade) and exported with
`<scratchpad>/tools/img_prep.py` (webp q80, no grain). Raw generations stay in the scratchpad
(`futsal-rev/raw2/`); only the webp files are in `works/futsal/img/`. Everyone pictured is invented,
and all clothing is plain (no kit brands, text or numbers).

An earlier set (35 mm film look, dim fluorescent light, grain, motion blur) was discarded after the
owner said it read like eerie spirit photos and did not match the page. Every generation prompt
below was sent with the shared style paragraph appended.

## Shared style paragraph

> Contemporary digital sports documentary photograph, shot on a full-frame mirrorless camera with a fast shutter: tack-sharp focus, clean white balance, natural lively colour, bright and evenly lit, crisp detail, everyone clearly present with faces visible and in focus. No film grain, no vignette, no motion blur, no haze, no dark corners, no heavy shadows. Plain clothing only: no logos, no text, no numbers, no stripes, no brand marks anywhere.

## Lead: the huddle after training

Files: `img/huddle-1600.webp, huddle-800.webp (2:1)`

Prompt:

> A women's amateur futsal club right after a weeknight training session in a modern municipal sports hall in Korea, brightly lit by even overhead LED panels, clean white walls, windows not in frame. Eight Korean women aged from late twenties to early fifties, varied heights and builds, wearing plain claret (deep wine red) t-shirts and plain navy shorts, white socks and plain white indoor shoes, stand in a loose circle on a bright royal blue indoor court floor with crisp white lines. They are laughing and talking; one holds a white and blue ball under her arm, one has her hands on her hips, one is laughing with her head tilted back. Eye-level shot with a 35mm lens from a few metres away, the group slightly off-centre, open friendly expressions.

Edit pass (`--ref` the generation):

> Edit this photograph and keep everything else the same (the room, the bright even light, the colours, the framing, the poses and the laughing expressions). Remove every brand mark: all socks become plain white socks with no logo, all shoes become plain white indoor shoes with gum soles and no logo, stripe or coloured mark, and the ball becomes a plain white ball with simple royal blue hexagon panels and no printing. Make two of the women clearly older, around fifty, with a little grey in their hair, and one in her forties with short hair, so the group spans late twenties to early fifties. Keep it sharp, bright and natural; no text or logos anywhere.

Retouch and crop: The edit pass left a small tick logo on every sock; `scripts/unmark.py --box 0,1040,2752,1460` painted them out (small dark marks on white cloth, filled from the surrounding sock). Cropped 2:1 from the bottom, which drops the ceiling vents.

## 처음 오는 날: stopping the ball on the first night

Files: `img/pass-1200.webp, pass-600.webp (4:5)`

Prompt:

> A pass-and-stop drill at a women's amateur futsal training night in a modern municipal sports hall in Korea, brightly lit by even overhead LED panels, clean pale walls. In the foreground a Korean woman in her forties on her first night, wearing a plain heather grey t-shirt, plain black track pants and plain white indoor shoes, stops a rolling white and royal blue futsal ball with the inside of her right foot, arms out for balance, concentrating with a small proud smile. A few metres behind her, in focus, an experienced Korean teammate in her thirties in a plain claret (deep wine red) t-shirt and navy shorts claps and smiles at her. Bright royal blue court floor with crisp white lines. Vertical frame, camera low at knee height, the ball and her foot sharp.

Edit pass (`--ref` the generation):

> Edit this photograph and keep everything else the same (both women, their faces, poses and hands, the room, the bright even light, the colours, the framing). Change only the ball and the socks: the ball becomes a plain white futsal ball with simple classic royal blue hexagon and pentagon panels, no swoosh or sweeping curves, no printing; the socks of the woman in claret become plain white with no logo. No text or logos anywhere.

Retouch and crop: None; 4:5 crop. The first generation had a swoosh-like curve printed on the ball; the edit pass replaced it with plain hexagon panels.

## 훈련 일정: the disc dribbling drill

Files: `img/drill-1600.webp, drill-800.webp (16:10)`

Prompt:

> A dribbling drill at a women's amateur futsal training night in a modern municipal sports hall in Korea, brightly lit by even overhead LED panels, clean pale walls. Five Korean women aged thirties to fifties in plain claret (deep wine red) t-shirts and plain navy shorts weave white and royal blue balls between a row of small flat white marker discs on a bright royal blue court floor with white lines. The nearest woman, in her fifties with short hair, is in sharp focus with the ball at her foot and a determined grin; the others follow in a line, faces visible, one laughing, waiting their turn. Shot from low at the front of the line with a 50mm lens.

Edit pass (`--ref` the generation):

> Edit this photograph and keep everything else the same (the women, their faces, expressions and poses, the room, the bright even light, the marker discs, the colours, the framing). Remove the partly hidden woman standing second from the back so four women remain, each fully visible. Make every shoe a plain white indoor shoe with a gum sole and no logo, stripe or coloured accent, every sock plain white, and the ball a plain white futsal ball with simple classic royal blue hexagon and pentagon panels, no swoosh or sweeping curves, no printing. No text or logos anywhere.

Retouch and crop: One sock mark at the back of the line painted out with `scripts/unmark.py --box 820,1110,1240,1230`. The edit did not remove the partly hidden woman second from the back; her face is visible, so she stays. 16:10 crop.

## 경기 기록: after the goal

Files: `img/goal-1600.webp, goal-800.webp (3:2)`

Prompt:

> A Saturday morning amateur women's futsal league match in a modern municipal sports hall in Korea, bright clean daylight from high windows plus even LED light, pale walls. The moment right after a goal: three Korean women from the same club in plain claret (deep wine red) t-shirts and plain navy shorts run toward the camera with arms around each other's shoulders, shouting and laughing with joy; one is in her fifties with short greying hair, the others in their thirties. Behind them, the white futsal goal and the other team's goalkeeper in a plain light grey long-sleeve top standing with hands on hips, a rueful smile. Bright royal blue court floor with white lines. Shot from the sideline at chest height with a 70mm lens, faces sharp, hands natural with five fingers.

Edit pass (`--ref` the generation):

> Edit this photograph and keep everything else the same (the three celebrating women, their faces, expressions, arms and hands, the goalkeeper, the goal, the hall, the bright daylight, the colours, the framing). Remove the two partly hidden players in the background behind and between the three women (the one in claret and the one in a teal top), filling the space with the empty royal blue court and the wall behind. Make the strip of floor around the court the same royal blue as the court instead of orange. Every shoe plain white with no logo or coloured accent. No text or logos anywhere.

Retouch and crop: `scripts/grade.py --crop 64,0,2464,1600` cuts the bottom 96 px, which held two faint shoe marks at the frame edge. The orange run-off strip by the goal stayed through the edit; it is small and behind the players.

## 회비: the kit bench

Files: `img/kit-1200.webp, kit-600.webp (4:5)`

Prompt:

> A bright, clean still life in the changing room of a modern municipal sports hall in Korea, lit evenly by daylight from a frosted window out of frame. On a light birch wooden bench against a clean white tiled wall: a neat pile of folded plain claret (deep wine red) cotton t-shirts, a mesh drawstring bag holding three white and royal blue futsal balls with no printing, a small stack of folded plain white mesh training bibs, a roll of white athletic tape, a plain stainless steel water bottle and a small plain white plastic first aid box with a simple green cross. Shot straight on at bench height with a 50mm lens, generous empty white wall above. Sharp, clean, natural colour, like an editorial photo for a sports club.

Retouch and crop: No edit pass needed; 4:5 as generated.

## 체육관: tidying the court

Files: `img/court-1600.webp, court-800.webp (16:9)`

Prompt:

> A wide view of the futsal court in a modern, brightly lit municipal sports hall in Korea after training, all overhead LED panels on, clean pale walls, a small white futsal goal at the far end. The whole bright royal blue court floor with crisp white lines and the centre circle fills the frame. In the middle, two Korean women from the club in plain claret (deep wine red) t-shirts and navy track pants tidy up together and chat with smiles: one pushes a wide flat dust mop across the floor, the other walks beside her carrying a mesh bag of balls over her shoulder. Shot from a corner at standing height with a 28mm lens, lots of clean open floor, both faces visible.

Edit pass (`--ref` the generation):

> Edit this photograph and keep everything else the same (the two women, their faces, smiles, hands and poses, the mop, the hall, the bright even light, the colours, the framing). Remove every brand mark: both pairs of navy track pants become completely plain navy with no logo and no side stripe, both pairs of shoes become plain white indoor shoes with gum soles and no logo, and the balls in the mesh bag become plain white balls with simple royal blue hexagon panels and no printing. Make the woman with the mop look about forty-five with short hair. No text or logos anywhere.

Retouch and crop: None; 16:9 as generated.

## Generation count

Discarded film-look set: 10 generations. Final set: 6 generations + 5 edit passes = 11.
