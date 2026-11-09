# 정면사진관: images

All photographs are Gemini generations (`gemini-3-pro-image`, 2K) made with `<scratchpad>/tools/gen_image.py`.
Raw files stay in the scratch folder (`<scratchpad>/idphoto-rev/raw/`); only the webp exports are in `works/idphoto/img/`.
Every person is invented. 14 generations: 5 sitters, 4 edits of those sitters with `--ref`, 2 retouch passes, 3 studio shots.

## How they were finished

- Each sitter was inspected at full size (eyes, ears, hairline, collar, glasses). Landmarks (crown, pupil line, chin, face
  centre) were read off the full-size image and are listed in `scripts/photos.py`.
- `scripts/photos.py <raw dir>` cuts every format photo the way the shop would: it searches head size and crown margin inside
  the format bands so crown, eye line and chin all land inside theirs, then crops. The numbers it settled on are in
  `photos.json`, and they are the ones printed under each photo on the page ("이 사진 3.40 cm") and drawn as the head bracket.
- Grading is deliberately small, because an ID photo must keep true colour: the backdrop is pulled flat towards one shared
  target (brand blue #B9D3EA, or paper white #F4F5F6) through a colour-distance mask, so the set reads as one studio; skin,
  hair and clothes are untouched. Every export gets the same fine monochrome grain. The studio shot is only cropped to 16:9.
- The 촬영 전 준비 pairs use a looser cut (head 25.5 mm in 35 x 45) so collars and shoulders show. Bad and good are the same
  person in the same framing, made with `--ref`.

## Prompts

### p3-license.jpg
used: license-400/700 (운전면허, the hero sheet, OG), ready-fringe-ok. ref: -. aspect 3:4.

> Driving licence photograph of an invented Korean man about twenty-three years old with short black hair cut above the eyebrows so the whole forehead shows, wearing a plain black crew-neck sweater. Seamless pale sky-blue paper backdrop (a soft powder blue, close to #B9D3EA), evenly lit and flat. Shot in a small ID-photo studio on a medium-format digital camera with a 100mm lens at f/8, one large softbox straight in front at eye level plus a white reflector below the chin, a separate light on the backdrop so there is no shadow behind the sitter. Strictly frontal and centred, shoulders square to the camera, head level, eyes looking straight into the lens, mouth closed, both ears visible. Framed loosely: generous empty space above the head, the shoulders and upper chest fully in frame. True-to-life colour, natural skin with pores, fine flyaway hairs and small asymmetries, no beauty retouching, no jewellery, no text, no logo, no watermark.

### p2-idcard.jpg
used: idcard-400/700 (주민등록증). ref: -. aspect 3:4.

> Resident ID card photograph of an invented Korean man in his early sixties with short grey hair combed to the side, a slightly weathered face and laugh lines, wearing a dark navy jacket over a light blue collared shirt with no tie. Seamless pure white paper backdrop, evenly lit. Shot in a small ID-photo studio on a medium-format digital camera with a 100mm lens at f/8, one large softbox straight in front at eye level plus a white reflector below the chin, a separate light on the backdrop so there is no shadow behind the sitter. Strictly frontal and centred, shoulders square to the camera, head level, eyes looking straight into the lens, mouth closed, both ears visible. Framed loosely: generous empty space above the head, the shoulders and upper chest fully in frame. True-to-life colour, natural skin with pores, fine flyaway hairs and small asymmetries, no beauty retouching, no jewellery, no text, no logo, no watermark.

### p1-passport.jpg
used: passport-400/700 (여권), ready-clothes-ok. ref: -. aspect 3:4.

> Passport photograph of an invented Korean woman in her mid thirties with a chin-length black bob tucked behind both ears, wearing a dark charcoal wool blazer over a plain white crew-neck top. Seamless pure white paper backdrop, evenly lit. Shot in a small ID-photo studio on a medium-format digital camera with a 100mm lens at f/8, one large softbox straight in front at eye level plus a white reflector below the chin, a separate light on the backdrop so there is no shadow behind the sitter. Strictly frontal and centred, shoulders square to the camera, head level, eyes looking straight into the lens, mouth closed, both ears visible. Framed loosely: generous empty space above the head, the shoulders and upper chest fully in frame. True-to-life colour, natural skin with pores, fine flyaway hairs and small asymmetries, no beauty retouching, no jewellery, no text, no logo, no watermark.

### p5-job.jpg
used: job-before-340/600 (보정 전). ref: -. aspect 3:4.

> Korean job-application photograph of an invented Korean woman about twenty-six years old with long black hair tied back in a low ponytail, a few strands neatly behind the ears, wearing a black tailored blazer over a white blouse with a small rounded collar, a calm closed-mouth smile with the corners of the mouth slightly lifted. Seamless pale sky-blue paper backdrop (a soft powder blue, close to #B9D3EA), evenly lit and flat. Slightly more polished than a passport photo but still natural skin texture. Shot in a small ID-photo studio on a medium-format digital camera with a 100mm lens at f/8, one large softbox straight in front at eye level plus a white reflector below the chin, a separate light on the backdrop so there is no shadow behind the sitter. Strictly frontal and centred, shoulders square to the camera, head level, eyes looking straight into the lens, mouth closed, both ears visible. Framed loosely: generous empty space above the head, the shoulders and upper chest fully in frame. True-to-life colour, natural skin with pores, fine flyaway hairs and small asymmetries, no beauty retouching, no jewellery, no text, no logo, no watermark.

### p4-visa.jpg
used: visa-560/1000 (비자), ready-glasses-ok. ref: -. aspect 3:4.

> Visa application photograph of an invented Korean woman in her mid forties with shoulder-length straight hair pulled behind her ears, wearing thin dark metal-rimmed glasses with clear lenses and no reflections on the lenses, a dark grey knit cardigan over a black top. Seamless pure white paper backdrop, evenly lit. Shot in a small ID-photo studio on a medium-format digital camera with a 100mm lens at f/8, one large softbox straight in front at eye level plus a white reflector below the chin, a separate light on the backdrop so there is no shadow behind the sitter. Strictly frontal and centred, shoulders square to the camera, head level, eyes looking straight into the lens, mouth closed, both ears visible. Framed loosely: generous empty space above the head, the shoulders and upper chest fully in frame. True-to-life colour, natural skin with pores, fine flyaway hairs and small asymmetries, no beauty retouching, no jewellery, no text, no logo, no watermark.

### b2-glare.jpg
discarded: the glare came out as two flat white rectangles pasted on the lenses. ref: p4-visa.jpg. aspect 3:4.

> Edit this visa photograph: the studio softbox now reflects in both lenses of her glasses as bright white rectangular glare patches that cover most of each eye, so her pupils cannot be seen. Keep everything else exactly as in the reference: the same person and face, the same expression, pose, framing, camera distance, light and backdrop, the same skin texture and photographic grain. No text, no logo.

### b3-fringe.jpg
used: ready-fringe-no. ref: p3-license.jpg. aspect 3:4.

> Edit this driving licence photograph: his black fringe is now longer and falls straight down over his forehead, covering both eyebrows completely and touching his upper eyelashes. Keep everything else exactly as in the reference: the same person and face, the same expression, pose, framing, camera distance, light and backdrop, the same skin texture and photographic grain. No text, no logo.

### b1-whitetop.jpg
used: ready-clothes-no. ref: p1-passport.jpg. aspect 3:4.

> Edit this passport photograph: she is no longer wearing the charcoal blazer. She wears only the plain white crew-neck top with short sleeves, so her white shoulders sit against the white backdrop and the outline of her shoulders almost disappears. Keep everything else exactly as in the reference: the same person and face, the same expression, pose, framing, camera distance, light and backdrop, the same skin texture and photographic grain. No text, no logo.

### s1-studio.jpg
discarded: peeling walls and scuffed floor (not a well-kept brand studio), lettering on the softbox and lights. ref: -. aspect 3:2.

> Documentary photograph of the shooting corner of a busy small ID-photo studio in a Korean city, seen from just behind the photographer's position. A plain wooden stool stands in front of a seamless pale powder-blue paper backdrop roll (close to #B9D3EA) that curves down onto the floor; one large square softbox on a black stand to the left at head height and a smaller light aimed at the backdrop from the floor; a camera on a tripod in the near foreground, slightly out of focus. White walls, a light grey vinyl floor, a small mirror and a comb on a shelf by the wall. Nobody in the room. Overcast daylight from an unseen window mixed with the modelling lamps. Shot on 35mm colour negative film, 35mm lens at eye level, slightly off-centre, visible film grain, honest and a little worn: scuffs on the floor, a crease at the bottom of the paper roll. No text, no signs, no logos, no posters on the walls.

### r1-job-retouched.jpg
intermediate: removed only some of the spots, edited again as r2. ref: p5-job.jpg. aspect 3:4.

> Retouch this job-application photograph the way a careful Korean photo studio does: remove only the small red spots and blemishes on her cheeks, chin and forehead and the few stray flyaway hairs on top of her head. Do not change the shape of her face, eyes, nose or jaw, do not smooth or brighten the skin, keep any moles, keep pores and natural skin texture. Keep everything else exactly as in the reference: the same person and face, the same expression, pose, framing, camera distance, light and backdrop, the same skin texture and photographic grain. No text, no logo.

### s2-studio.jpg
intermediate: good room, but lettering on the softbox edge, flash head and floor light, cleaned as s3. ref: -. aspect 3:2.

> Documentary photograph of the shooting room of a busy, well-kept ID-photo studio in a Korean city, photographed on a quiet morning before opening. A plain wooden stool stands in front of a seamless pale powder-blue paper backdrop roll (close to #B9D3EA) that curves down onto the floor, freshly pulled down and clean. One large square softbox on a black stand to the left at head height, a small background light on the floor behind the stool aimed at the paper. Clean white walls, light grey floor, a small round mirror and a comb on a narrow shelf by the wall. All equipment plain and unbranded. Nobody in the room. Soft overcast daylight from an unseen window mixed with the modelling lamps. Shot on 35mm colour negative film with a 35mm lens at standing eye level from the photographer's position, slightly off-centre, fine film grain, true colours, calm and tidy. Absolutely no text, lettering, signs, logos or posters anywhere.

### b2b-glare.jpg
used: ready-glasses-no. ref: p4-visa.jpg. aspect 3:4.

> Edit this visa photograph so it shows the common mistake of glare on glasses: the large square softbox in front of her now reflects in both lenses of her glasses. Each reflection is a soft-edged, slightly curved bright patch that follows the curve of the lens, strongest in the upper half of the lens and fading towards its edges, washing out most of each eye so the pupils are barely visible. It must look like a real optical reflection photographed in a studio, not a pasted shape. Keep everything else exactly as in the reference: the same person and face, the same expression, pose, framing, camera distance, light and backdrop, the same skin texture and photographic grain. No text, no logo.

### r2-job-retouched.jpg
used: job-340/600 (취업용 반명함, 보정 후). ref: r1-job-retouched.jpg. aspect 3:4.

> Finish the retouch of this job-application photograph: remove the few remaining small red spots on both cheeks, beside the nose and on the chin. Keep the small dark brown moles, keep the pores and natural skin texture, do not smooth, brighten or reshape anything. Keep everything else exactly as in the reference: the same person and face, expression, pose, framing, camera distance, light, backdrop and grain. No text, no logo.

### s3-studio.jpg
used: studio-800/1600 (지점 세 곳). ref: s2-studio.jpg. aspect 3:2.

> Clean up this photograph without changing anything else: remove every bit of lettering, logo and label from the black edge of the softbox, from the flash head behind it and from the small light on the floor under the stool, so those surfaces are plain matte black or plain grey. Keep the composition, the stool, the powder-blue paper, the mirror and comb, the light, colours and film grain exactly as they are. No text anywhere.
