# 이슥 — 사진 (IMAGES.md)

모든 사진은 Gemini `gemini-3-pro-image` 로 만든 뒤 `scripts/grade.py` 로 다듬었다. 사람, 손, 얼굴, 글자, 실제 브랜드
표시는 없다(넷째 검토: 사물 중심). 날것은 작업 폴더(scratchpad `lamp/raw/`)에만 두고 페이지에는 다듬은 webp 만 넣었다.
생성 11번(그중 버린 것 1, 중간 단계 1).

## 같은 스탠드, 같은 책상을 유지한 방법

1. `hero-a` 로 스탠드를 정했다: 둥근 강철 받침과 그 앞의 널링 다이얼, 뒤에서 올라가는 가는 기둥, 위의 원통 이음,
   앞으로 뻗은 납작한 막대 머리(아래 젖빛 확산판), 회색 직물 케이블. 'ㄱ'자 모양. 이후 모든 컷은 `hero-a` 를 `--ref` 로 넣었다.
2. 책상 장면은 `scene-a`(방이 너무 고르게 밝음) → 편집으로 `scene-b`(스탠드만 켜진 방) → `scene-b` 를 기준으로
   편집 세 번(꺼짐, 2700 K, 5600 K). 네 장 모두 위상 상관으로 어긋남을 재 보니 전체와 12칸 모두 (0, 0) px:
   같은 화면을 그대로 유지했다(`align.py`, scratchpad).
3. 다이얼 컨트롤은 위에서 내려다본 다이얼 컷(`dial-a`)을 원으로 잘라 썼다. 둘레 받침(정지)과 다이얼(회전) 두 겹.

## 다듬기 (`scripts/grade.py`)

- 페이지 바탕 `#0B0C0E` 와 사진 검정을 정확히 맞췄다: 배경(왼쪽 띠의 행별 프로필 또는 어두운 평면에 맞춘 2차 곡면)을
  빼고 짧은 토로 0 까지 내린 뒤, 방 색과 screen 합성(0 → #0B0C0E, 밝은 곳은 그대로). 가장자리 4–10% 는 방 색으로 페더.
  그래서 사진에 테두리가 없다.
- 책상 장면은 빛을 층으로 나눴다. `off` = 꺼진 방(선형광 16%로 더 어둡게). `l2700/l4000/l5600` = 켜진 사진 − off
  (0 아래는 자름). 켜진 빛에는 위쪽 벽이 덜 밝도록 부드러운 감쇠(가운데 1, 가장자리 0.26)를 곱했다. 페이지는
  off + b × light(T) 를 canvas 'lighter' 로 더한다. b = 1 이면 다듬은 사진과 같다.
- 모두 webp q78–86. 장면 층 1600/1000 px 각 10–29 KB, 히어로 18 KB, 부품 52 KB. 첫 화면 이미지 18 KB.

## 최종 프롬프트

### hero-a

- Used: hero (desktop crop x 700–2528, phone 4:5 crop x 880–2237). Defines the lamp.
- Model gemini-3-pro-image, 3:2, 2K; refs: none

> Studio product photograph for a small Korean design studio's first desk lamp. The lamp is shaped like an upside-down letter L. A heavy round base, 15 cm across and 2 cm tall, of solid steel with a fine bead-blasted finish in a cool mid steel grey, its top edge softly rounded. Near the front of the base sits one knurled aluminium dial, 3.5 cm across and 1.5 cm tall, in the same steel grey, with a single small engraved dot as its index mark. From the back of the base rises one thin, perfectly straight solid steel rod, 1 cm thick and about 42 cm tall, the same grey. At its top a small cylindrical pivot joint, and from it a long flat rectangular head, 36 cm long, 3 cm wide and 1 cm thick, reaches forward horizontally like a blade, parallel to the table. The underside of the head is a frosted opal diffuser strip. A thin grey fabric cable leaves the back of the base. Every metal part is the same matte steel grey; no logo, no text, no switches other than the dial. The lamp is switched on with neutral white light: the diffuser glows evenly and casts a soft rectangular pool of light on the matte black table beneath the head, with a gentle falloff; everything else falls away into deep black. Seamless matte black backdrop. Three-quarter view from the front right, camera a little above table height, 90mm lens, medium-format digital, crisp and true in colour, the bead-blasted metal showing its fine texture and slight real-world imperfection. The whole lamp is in the right half of the frame, nothing cropped, with a large area of empty black on the left. No text anywhere in the image.

### scene-a

- Intermediate: the room was lit too evenly. Kept only as the reference for scene-b.
- Model gemini-3-pro-image, 3:2, 2K; refs: hero-a.jpg

> The same lamp as in the reference photograph, unchanged in every detail: the round bead-blasted steel-grey base with the knurled dial at its front, the thin straight steel rod rising from the back of the base, the cylindrical pivot at the top, and the long flat blade head reaching out horizontally with its opal diffuser underneath, plus the grey fabric cable. Now photograph it in use at night on a writer's desk in a dark room. The lamp stands at the back left of a plain desk of pale ash wood; its head reaches over the desk toward the right. Directly under the head: an open notebook with blank off-white pages, a wooden pencil and three coloured pencils (red, blue, green) lying across it; to its right a plain white ceramic cup, and behind the notebook two closed hardback books with plain cloth covers, one dark green and one grey, with blank spines. A pair of folded reading glasses near the cup. The lamp is the only light in the room and it is on at full brightness with neutral white light: a soft, wide pool of light on the paper and the desk that falls off gently; the plain plaster wall behind is lit only faintly near the lamp and goes dark; the edges and corners of the frame fall into near black. Camera at seated eye height, three-quarter view from the front right, 50mm lens, medium-format digital, crisp, natural colour, a quiet real photograph rather than an advertisement. Keep the objects tidy and few. No people, no hands. No text, letters or logos anywhere: the pages, books and cup are blank.

### scene-b

- Used: the 4000 K state of the desk scene (light layer l4000) and the still scene-1600.
- Model gemini-3-pro-image, 3:2, 2K; refs: scene-a.jpg

> Edit this photograph. Keep the camera, the lamp, the desk and every object exactly where they are, with the same shapes and sizes. Change only the light: it is late at night and the desk lamp is the only light source in an otherwise dark room. Its neutral white light falls in a soft pool on the notebook, the pencils, the books, the cup and the front of the desk, and drops off quickly with distance. The wall behind is lit only in a soft glow just above and around the lamp head and fades to near black toward the top and the right; the top corners, the right edge and the bottom of the frame (the desk legs and the floor) fall into deep near-black shadow. The underside of the lamp head glows brightly. Keep it a natural, crisp photograph with true colours. No text anywhere.

### scene-2700-a

- Used: light layer l2700.
- Model gemini-3-pro-image, 3:2, 2K; refs: scene-b.jpg

> Edit this photograph. Keep the camera, the lamp, the desk and every object exactly where they are, with exactly the same shapes, sizes, edges and the same brightness pattern of light and shadow. Change only the colour temperature of the lamp's light: from neutral white to a warm 2700 kelvin incandescent-like white, as a camera set to neutral daylight balance would record it. The paper, the cup and the wall take on that warm tone; the shadows stay neutral dark. Nothing else changes. No text anywhere.

### scene-off-a

- Used: the room with the lamp off (off), darkened to 16% in linear light.
- Model gemini-3-pro-image, 3:2, 2K; refs: scene-b.jpg

> Edit this photograph. Keep the camera, the lamp, the desk and every object exactly where they are, with exactly the same shapes, sizes and edges. Change only one thing: the desk lamp is now switched off. Its diffuser strip under the head is unlit, a dull pale grey. With the lamp off the room is almost dark: only a very faint, cool, indirect night light from somewhere out of frame lets you just make out the outlines of the lamp, the desk, the notebook, the books and the cup. Most of the frame is deep near-black; the paper of the notebook and the white cup are the brightest things, still dim. No pool of light on the desk, no glow on the wall. Same natural photograph, same lens. No text anywhere.

### scene-5600-a

- Used: light layer l5600.
- Model gemini-3-pro-image, 3:2, 2K; refs: scene-b.jpg

> Edit this photograph. Keep the camera, the lamp, the desk and every object exactly where they are, with exactly the same shapes, sizes, edges and the same brightness pattern of light and shadow. Change only the colour temperature of the lamp's light: from neutral white to a cool 5600 kelvin daylight white, slightly bluish, as a camera set to a neutral 4000 kelvin balance would record it. The paper, the cup and the wall take on that cool, clean tone; the shadows stay neutral dark. Nothing else changes. No text anywhere.

### dial-a

- Used: the dial control (base disc r 880 px, knob r 530 px, centre 1024,1023).
- Model gemini-3-pro-image, 1:1, 2K; refs: hero-a.jpg

> Macro photograph looking straight down from directly above onto the dial of the lamp in the reference photograph. The knurled aluminium dial is perfectly centred and perfectly circular in the frame and fills about 55% of the frame width. Seen from above, its fine straight knurling shows as a narrow textured ring around the edge, and its flat top is smooth bead-blasted steel grey with one small engraved dot near the edge at the 12 o'clock position. Around the dial, the bead-blasted steel-grey top surface of the lamp base fills the rest of the frame. Even, soft, shadowless light from all around, like a ring light around the lens, so there is no directional highlight and the dial looks the same at any rotation. Medium-format digital, crisp, true colour. No text, no numbers, no scale markings, no logo.

### parts-a

- Discarded: the adapter had US flat prongs. Reference for parts-b.
- Model gemini-3-pro-image, 3:2, 2K; refs: hero-a.jpg

> Top-down flat lay of the lamp in the reference photograph taken apart, on a matte charcoal-black surface. Its parts are laid out in a tidy arrangement with even spacing, nothing overlapping: the round steel-grey base seen from above with the hole for the rod, the knurled dial knob, the thin straight steel rod, the long flat head with its opal diffuser strip facing up, the small cylindrical pivot joint, a neatly coiled grey braided fabric cable with a USB-C plug, a small plain grey power adapter with no markings, a round grey felt pad the size of the base, two small hex screws and a small hex key. All metal parts the same matte bead-blasted steel grey. Soft, even top light from a large softbox, gentle short shadows. Medium-format digital, crisp, true colour. No text, no labels, no logos, no markings or symbols on any part.

### head-a

- Used: the lit head from below (light section).
- Model gemini-3-pro-image, 4:5, 2K; refs: hero-a.jpg

> Close-up of the lamp from the reference photograph, looking up from below at the underside of its long flat head while it is switched on: the frosted opal diffuser strip glows evenly with neutral white light along its whole length, without visible LED dots, framed by the crisp bead-blasted steel-grey edges of the head; the head runs diagonally across the frame from the lower left to the upper right, with the cylindrical pivot joint and the top of the thin rod at the upper right. Everything else is deep black. 100mm macro lens, medium-format digital, crisp, true colour, fine metal texture. No text, no logo.

### parts-b

- Used: parts flat lay (made section).
- Model gemini-3-pro-image, 3:2, 2K; refs: parts-a.jpg

> Edit this photograph. Keep everything exactly as it is, the same parts in the same places, the same light and the same black surface. Change only the small grey power adapter: replace its two flat blade prongs with two round cylindrical pins, as on a Korean or European wall plug, pointing to the left in the same place. No text, no markings.

### side-a

- Used: side elevation with dimension lines (size section).
- Model gemini-3-pro-image, 4:3, 2K; refs: hero-a.jpg

> The lamp from the reference photograph, unchanged in every detail, photographed exactly side-on as a clean side elevation with a long telephoto lens so it looks almost orthographic: the round base seen edge-on as a low slab with the knurled dial standing on its top near the front, the thin straight rod rising vertically from the back of the base, the cylindrical pivot at the top, and the long flat head reaching out horizontally to the left, parallel to the table, its diffuser underneath switched on with neutral white light and casting a soft glow on the table below the head. The fabric cable leaves the base to the right. The lamp stands on a matte black table that is barely visible, against a seamless black background, centred with generous black margins on every side; nothing is cropped. Medium-format digital, crisp, true colour. No text, no reflections, no logo.

