# 가락 65 — 사진 (IMAGES.md)

모든 사진은 Gemini `gemini-3-pro-image` 로 만든 뒤 다듬었다. 실제 제품, 실제 브랜드 표시, 글자는 없다.
날것은 작업 폴더(scratchpad `keyboard-rev/raw/`)에만 두고, 페이지에는 다듬은 webp 만 넣었다.

## 같은 키보드를 유지한 방법

1. `hero-a` 로 재질(진분홍 아노다이징 케이스, 연분홍 무각 PBT 키캡, 분홍 배경지, 필름 질감)을 잡았다.
2. 생성기는 키 배열을 지어내므로, 65% 68키 배열을 위에서 본 평면도(`layout-ref.png`, PIL 로 그린 입력 전용
   그림, 페이지에는 쓰지 않음)를 만들어 `hero-a` 와 함께 넣고 `top-a`(위에서 본 사진)를 얻었다.
   행마다 키 수, 넓은 키 위치, 오른쪽 세로 한 줄, 스페이스바와 방향키 사이 베젤 홈이 평면도와 같다.
3. 이후 모든 컷은 `top-a` 를 `--ref` 로 넣어 같은 배열과 재질을 따르게 했다(모서리, 옆모습, 부품, 색, 매크로, 책상).
4. 고친 것: `corner-a` 의 방향키 화살표 인쇄를 편집 패스로 지움(`corner-b`), 책상 컷에 USB 케이블을 편집으로 추가
   (`desk-b`), 부품 컷 기판의 실크 인쇄 글자 "k9.1" 을 옆 패턴으로 덮음.

## 다듬기

- `design/works/keyboard/scripts/grade.py`: 스튜디오 컷 넷(hero, top, parts, side)의 배경지를 2차 다항식으로
  맞춘 뒤 전체에 곱해, 종이 색을 페이지 바탕 `#F6A3C2` 한 값으로 평평하게 했다(조명 떨어짐 제거, 그림자와 제품의
  빛은 유지). 그래서 사진과 페이지 사이에 경계가 없다. 캡처에서 잰 차이는 RGB 1 이하.
- 히어로는 위쪽 9% 를 CSS mask 로 흐려 제목 아래로 밀어 넣었다. 휴대폰은 4:5 로 모서리를 잘라 따로 냈다.
- 색 세 장(진달래, 은, 먹)은 같은 상자(114,98–2414,1631)로 잘라 크기와 위치를 맞췄다.
- webp q78–80, 크기 960–2400. 첫 화면 이미지는 35–63 KB.

## 최종 프롬프트

### hero-a

- Use: reference only (materials, light, film look); its right end had an invented layout, so not used
- Model gemini-3-pro-image, 3:2, 2K; refs: none

> Studio product photograph for a small Korean keyboard maker's launch. A compact 65% mechanical keyboard (68 keys: number row, alpha rows, a short right-hand column of four keys, and an inverted-T arrow cluster tucked into the bottom right). The case is CNC-machined aluminium, bead-blasted and anodised a vivid cool azalea pink, with a thick flat bezel around the keys, a crisp chamfer on the top edge, and a low wedge profile that rises gently toward the back. The keycaps are matte PBT with a cylindrical profile, dyed the same azalea pink as the case, a shade lighter, and completely blank: no letters, no symbols, no legends on any key. No logo, no badge, no lights, no cable. The keyboard sits on a seamless paper backdrop of the same pink, so the photograph is tone-on-tone. Three-quarter view from the front left, camera low and close to table height, 80mm lens on a medium-format camera. One hard flash from the upper left makes a clean, soft-edged shadow to the right; the backdrop stays perfectly even. The keyboard sits in the lower left third, with a large empty area of pink backdrop above and to the right. Shot on colour negative film, fine grain, true colours, slight natural imperfection in the anodising. No text anywhere in the image.

### hero-b

- Use: discarded: key rows warped
- Model gemini-3-pro-image, 3:2, 2K; refs: hero-a

> Same keyboard, same pink anodised aluminium case with the chamfered top edge, same blank light-pink PBT keycaps, same pink seamless paper backdrop and the same colour-negative film look. This time show the whole keyboard, nothing cropped: a three-quarter view from the front, camera about 35 degrees above the table, 80mm lens. The layout is a standard 65%: top row Esc, 1 to 0, minus, equals, a wide Backspace and one key at the far right; second row Tab, twelve keys, a 1.5-wide backslash and one key at the far right; third row a wide Caps key, eleven keys, a wide Enter and one key at the far right; fourth row a wide left Shift, ten keys, a shorter right Shift, the Up arrow and one key at the far right; bottom row three modifiers, a long spacebar, three small modifiers, then Left, Down and Right arrows, forming an inverted T with the Up arrow. Every keycap blank. The keyboard sits slightly below the centre and to the left, about half the frame width, with generous empty pink backdrop above it. One hard flash from the upper left, a soft-edged shadow falling right. No text, no logo, no cable.

### top-a

- Use: top-down shot -> img/top-*, colourway 진달래 -> img/cw-top-*; master reference for every later shot
- Model gemini-3-pro-image, 3:2, 2K; refs: layout-ref, hero-a

> Image 1 is a flat plan of the key layout. Image 2 is a photograph of the real keyboard. Make a real photograph, shot straight down from directly above, of the keyboard in image 2 with exactly the key layout of image 1: five rows, the same number of keys in each row, the same wide keys (Backspace, Tab, Caps, Enter, both Shifts, the long spacebar) in the same places, the single column of keys down the right edge, and the arrow keys at the bottom right. Materials exactly as image 2: bead-blasted aluminium case anodised the same vivid cool pink, thick flat bezel, matte light-pink PBT keycaps with a cylindrical scoop, every keycap blank with no letters or symbols. The keyboard lies square to the frame, centred, on the same pink seamless paper. Soft overhead light with a gentle shadow along the lower edge of the case, colour negative film, fine grain, faint dust and tiny machining marks on the bezel. No text, no logo, no cable.

### hero-c

- Use: reference only (three-quarter body); rows slightly tangled, not used on the page
- Model gemini-3-pro-image, 3:2, 2K; refs: top-a, hero-a

> Image 1 shows the keyboard from above: keep its exact key layout (five rows, the long spacebar, the notch in the bezel before the three arrow keys at the bottom right, the single right-hand column) and its exact materials. Image 2 shows the lighting, film look and side profile of the same keyboard. Make a new photograph of this same keyboard: the whole board visible, three-quarter view from the front left, camera about 25 degrees above the table and fairly close, 90mm lens on a medium-format camera, so the front bezel, the chamfered edge and the slight wedge (lower at the front, higher at the back) are visible. The keyboard fills about 70 percent of the frame width and sits a little below the centre. Same pink seamless paper backdrop, perfectly plain. One hard flash from the upper left, a clean shadow falling to the right. Every keycap blank, no legends. Colour negative film, fine grain, true colours. No text, no logo, no cable.

### side-a

- Use: side profile -> img/side-*
- Model gemini-3-pro-image, 21:9, 2K; refs: top-a, hero-c

> The same pink keyboard as in both images (same vivid pink bead-blasted anodised aluminium case, same blank light-pink keycaps). New photograph: an exact side elevation of the keyboard from its left end, camera at table height and perfectly level, long lens so there is almost no perspective. The case is a low wedge, lower at the front and rising toward the back at a gentle 6.5 degree angle; the keycap rows step up in a cylindrical profile, each row a slightly different height and tilt. We see the left end face of the case, flat and machined, with a crisp chamfer along the top edge, and the profiles of the five keycap rows above it. Keyboard centred, small in the frame with lots of empty space on both sides, on the same plain pink seamless paper, soft even light from above with a thin contact shadow under the case. Colour negative film, fine grain. No text, no logo, no cable.

### corner-a

- Use: first pass of the hero; arrow keys came back with printed arrows
- Model gemini-3-pro-image, 3:2, 2K; refs: top-a, hero-a

> Image 1 is the keyboard seen from above; keep its exact key layout, especially the right end: the single column of keys down the right edge, the Up arrow beside the short right Shift, and in the bottom row two small modifiers after the spacebar, then a small notch in the bezel, then the Left, Down and Right arrows forming an inverted T. Image 2 shows the camera position, lighting and film look to copy. Make the photograph of image 2 again with this layout: a low close view of the right front corner of the same pink keyboard, camera just above table height, 90mm lens, the right end of the board and the arrow keys sharp, the left part of the board running out of frame on the left and softly out of focus. Same vivid pink anodised case with chamfered top edge, same blank light-pink PBT keycaps with no letters, same plain pink seamless paper, one hard flash from upper left with a soft-edged shadow to the right. Large empty pink backdrop in the upper half. Colour negative film, fine grain. No text, no logo, no cable.

### corner-b

- Use: hero -> img/hero-*, img/hero-m-* (edit of corner-a)
- Model gemini-3-pro-image, 3:2, 2K; refs: corner-a

> Edit this photograph. Remove the small printed arrow symbols from the four arrow keys so that every keycap is completely blank, the same smooth matte light-pink PBT as the other keys. Change nothing else: same framing, same keyboard, same light, same grain.

### parts-a

- Use: parts flat lay -> img/parts-* (PCB silkscreen text "k9.1" cloned out by hand)
- Model gemini-3-pro-image, 4:3, 2K; refs: top-a

> The keyboard in the reference image, taken apart and laid out flat for a knolling photograph, shot straight down from directly above on the same plain pink seamless paper. Arrange the parts in a neat, calm grid with even gaps, all square to the frame: the pink anodised aluminium top case (an empty rectangular frame with the bezel); the pink anodised bottom case (a shallow tray); a flat brushed brass weight plate the size of a large phone that sits inside the bottom case; a thin bare aluminium switch plate with a grid of square cut-outs; a dark green printed circuit board with rows of small solder pads and black hot-swap sockets, with no printed text or logos; a thin grey foam sheet; a small neat group of about twenty mechanical key switches with clear housings and pink stems arranged in rows; the blank light-pink keycaps in tidy rows including the long spacebar; twelve small grey silicone gasket strips in a row; a few small screws and a hex key. Nothing overlaps. Soft overhead light with gentle shadows, colour negative film, fine grain. No text, no labels, no logos, no hands, no cable.

### cw-silver-a

- Use: colourway 은 -> img/cw-silver-*
- Model gemini-3-pro-image, 3:2, 2K; refs: top-a

> The exact same photograph, same keyboard, same layout, same top-down framing, same position in the frame, same soft overhead light and film grain, but a different colourway: the case is clear-anodised raw aluminium, a cool pale silver with a fine bead-blasted texture; the keycaps are blank PBT in a pale cool grey, a little lighter than the case. The seamless paper backdrop is a plain cool light grey to match. No text, no logo, no cable.

### cw-black-a

- Use: colourway 먹 -> img/cw-black-*
- Model gemini-3-pro-image, 3:2, 2K; refs: top-a

> The exact same photograph, same keyboard, same layout, same top-down framing, same position in the frame, same soft overhead light and film grain, but a different colourway: the case is anodised a deep charcoal black with a fine bead-blasted texture that catches the light along the chamfer; the keycaps are blank PBT in a soft dark graphite grey, slightly lighter than the case. The seamless paper backdrop is a plain dark charcoal grey to match. No text, no logo, no cable.

### macro-a

- Use: keycap macro -> img/macro-*
- Model gemini-3-pro-image, 4:5, 2K; refs: top-a, corner-b

> Macro photograph of the same keyboard's keycaps (same blank light-pink matte PBT keycaps, same vivid pink anodised case). Very close, about a hand's width of the home row fills the frame, camera low and looking across the tops of the keys. The keycap in sharp focus has a small raised homing bar near its front edge; the keys around it fall softly out of focus. Raking light from the left shows the fine sandy texture of the PBT, the gentle cylindrical scoop in each keycap top and the slightly rounded edges; between the keys we see a sliver of the pink case far below. Every keycap blank, no letters or symbols. Colour negative film, fine grain, true colours, macro lens at f/4. No text, no logo.

### desk-a

- Use: desk shot without a cable (a wired board with no cable looked wrong)
- Model gemini-3-pro-image, 3:2, 2K; refs: top-a, hero-c

> The same pink keyboard (exact same layout, blank light-pink keycaps, vivid pink anodised aluminium case) photographed in use at home, not in a studio. It sits on a plain pale grey laminate desk near a window on an overcast morning, slightly angled, seen from the front and a little above as if by the person sitting there. Around it, sparingly: a white ceramic mug, a closed plain grey notebook with a pencil, and the dark base of a monitor stand at the top edge of the frame. Plain white wall behind. Soft daylight from the left, real shadows, a few crumbs of everyday life. Shot on 35mm colour film, slight grain, natural colours, a little off-centre framing. No people, no hands, no screen content, no text, no logos, no brand marks.

### desk-b

- Use: desk shot -> img/desk-* (edit of desk-a)
- Model gemini-3-pro-image, 3:2, 2K; refs: desk-a

> Edit this photograph. Add one plain white USB cable plugged into the middle of the back edge of the pink keyboard, running back across the desk in a loose natural curve and disappearing behind the monitor stand. Change nothing else: same framing, same keyboard, same mug, notebook, pencil and crumbs, same light and film grain.

## 3차 (2026-11-10, 넷째 검토 뒤): 쳐 보기 키캡

'쳐 보기' 칸의 키캡 아홉 개와 스페이스바. 한 장을 생성해 잘라 썼다(생성 1회).

- 배경지를 회색으로 찍게 했다. 분홍 키캡을 분홍 종이에서 떼어 내기는 어렵지만 회색에서는 채도(R − (G+B)/2)로 갈린다:
  종이 약 2, 키캡 29–65. 종이에 진 그림자는 분홍 반사로 11–26 이라 '채도 > 31 또는 (밝고 채도 > 20)'으로 키캡만
  잡고, 그 볼록 껍질을 안티에일리어싱으로 그린 뒤 부드러운 채도 알파와 겹쳤다(윗면의 오목한 뒤 가장자리가 회색으로
  메워지지 않게). 가장자리에서 회색을 빼냈다. 스크립트: `scripts/caps_cut.py`.
- 회색 조명 아래라 옆면이 갈색으로 나와서, 밝기를 히어로 키캡 윗면(#EEA6C6 부근)에 맞춘 뒤 히어로 사진의 키캡 영역에서
  만든 '밝기 → 색' 표로 다시 칠했다. 윗면은 연분홍, 옆면은 히어로처럼 진분홍이 된다. 필름 입자는 35% 남겼다.
- 사진 속 돌기는 넷째와 여섯째 키캡에 있어, 잘라 낸 뒤 순서를 바꿔 F 와 J 자리에 오게 했다.
- 키캡 아홉 장은 같은 232×213 캔버스에 바닥을 맞춰 넣었다(페이지가 한 숫자로 크기를 정한다). 스페이스바 1420×200.
  webp(알파) 4–5 KB씩, 모두 합쳐 약 50 KB. 그림자는 사진에서 버리고 페이지가 그린다(누르면 바뀌어야 해서).
- 사람과 손: 기존 사진 9컷과 새 키캡 사진 모두 사람·손이 없다(넷째 검토 확인).

### caps-a

- Use: try-block keycaps -> img/cap-{a,s,d,f,g,h,j,k,l,space}.webp (cut to alpha, regraded)
- Model gemini-3-pro-image, 16:9, 2K; refs: macro-a, corner-b

> Image 1 is a macro photograph of this keyboard's keycaps; image 2 shows the whole keyboard, its pink colour and the studio light. New studio photograph for a cut-out: loose keycaps taken off this same keyboard, standing upright on a plain neutral mid-grey seamless paper backdrop. Exactly nine identical 1u keycaps in one straight horizontal row, evenly spaced with a clear gap of about a third of a key between neighbours, every keycap fully separate, none touching or overlapping. The fourth and the seventh keycap each have one small raised homing bar near the front edge of the top; all others are plain. Centred below the row, with a clear gap, one long spacebar keycap about six keys long. Same material as image 1: matte sandy light-pink PBT, dyed through, with a gentle cylindrical scoop on top and slightly rounded edges, completely blank, no letters or symbols. Camera in front and above, about 35 degrees above the table, a long telephoto lens from far away so there is almost no perspective and every keycap has exactly the same shape. Soft large light from the upper left, gentle shading on the front skirts, very soft small shadows. The grey backdrop is perfectly even and plain. Colour negative film look as in image 2, fine grain, true colours. No text, no logo, no hands, no other objects.
