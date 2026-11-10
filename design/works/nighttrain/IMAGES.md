# 밤차 — IMAGES.md

2026-11-10: 사람이 나오는 사진 여덟 장(플랫폼, 독서, 찻잔을 든 손, 승무원, 도착, 창업자 셋)을 사물 사진으로 바꿨다 (BRIEF §000). 새 사진과 프롬프트는 맨 아래 "사람 대신 사물" 에 있다.

모델 `gemini-3-pro-image`, `<scratchpad>/tools/gen_image.py`. 생성 14회, 사용 13장. 원본은 스크래치패드
`nighttrain/gen/`, 보정과 내보내기는 `scripts/grade.py` (주황·노랑 채도 줄임, 약하게 차갑게, 가장 어두운 그림자를 `#1B2F6E` 쪽으로).
모든 이미지를 원본 크기로 확인했다: 얼굴, 손가락(찻잔·책·담요를 든 손), 글자 같은 낙서. 플랫폼 사진의 객차 아래쪽에 읽을 수 없는
작은 표기 두 군데가 남아 있지만 실제 문자나 로고는 아니다.

## 1. A-cabin-night → `img/cabin-night-*.webp`

- 쓰인 곳: 첫 화면 (1인실 밤, 기준 이미지)
- 비율 4:5, 크기 2K, 참조: 없음

```
Interior photograph of a compact private sleeper-train cabin at night, for a young rail company's website. One single bed runs along the window, made with crisp white cotton sheets and a plump white pillow; a deep blue wool blanket (a clear night blue, close to #1B3170) is folded neatly in thirds at the foot of the bed. The walls are lined in light grey wool felt, there is a narrow pale ash-wood ledge under the window with a folded white towel on it, and a small matte black reading lamp on a short swing arm throws a soft pool of neutral warm-white light onto the pillow. The large window shows the night outside as a deep blue darkness with two or three distant lights softly smeared by the train's motion. Photographed from the open doorway at eye level with a 35mm lens on a medium-format digital camera: clean, well exposed, soft light with gentle shadows, true colours, calm and inviting, the way an architectural photographer shoots a small hotel room. No people. No text, no signs, no logos, no numbers, no branding anywhere.
```

## 2. C-platform → `img/platform-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 하룻밤 22:40 (밤 플랫폼)
- 비율 3:2, 크기 2K, 참조: 없음

```
Photograph of a modern sleeper train standing at a quiet station platform at night, about twenty to eleven, for a young rail company's website. The coaches are painted a clear deep night blue (close to #1B3170) with one thin white line running under the windows; every window glows softly from inside and through them you can make out white bedding and light grey felt walls. Two travellers carrying small overnight bags walk along the platform toward an open coach door, where a train attendant in a deep blue uniform stands waiting. A clean, plain concrete platform under a simple flat canopy with evenly spaced neutral lights; clear dark sky above the far end. Photographed at eye level looking along the platform with a 35mm lens, clean digital photograph, well exposed so the platform and the people are clearly visible, crisp and calm, true colours, not moody, not foggy. No text, no signs, no station names, no numbers, no logos, no advertising anywhere.
```

## 3. B-cabin-dawn → `img/dawn-*.webp`

- 쓰인 곳: 하룻밤 06:10 (새벽 창)
- 비율 3:2, 크기 2K, 참조: A-cabin-night.jpg

```
The same sleeper cabin as in the reference photograph (same grey felt walls, same pale ash ledge, same black swing-arm lamp, same window, same white bed and deep blue wool blanket), photographed at dawn from a slightly different angle, standing just inside the doorway. The window blind is fully raised: outside, flat open countryside at first light, harvested rice paddies with a thin frost, a line of bare poplar trees, low hills in a pale morning mist, a clear pale sky just brightening. Soft cool daylight fills the cabin and the reading lamp is switched off. The bed has been slept in: the white duvet folded back, the pillow dented, the deep blue blanket pushed aside, and a plain white ceramic cup of tea stands on the ledge by the window. Same camera and lens as the reference: clean, bright, natural exposure, true colours, fresh and calm. No people. No text, no signs, no logos, no numbers.
```

## 4. E-attendant → `img/attendant-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 하룻밤 06:30 (승무원)
- 비율 4:5, 크기 2K, 참조: C-platform.jpg

```
Portrait photograph of a sleeper-train attendant at work, for a young rail company's website. A Korean woman in her early thirties with short black hair, wearing a neat deep blue uniform jacket (the same deep blue as the train in the reference photograph) over a white collarless shirt, no hat, no badge text, stands in the narrow corridor of the sleeper coach holding a small stack of folded white towels and a deep blue wool blanket, with a calm, friendly half-smile, looking slightly off camera. The corridor has light grey felt walls, a row of cabin doors and a long window; soft even neutral light. Natural face with real skin texture, natural hands with five fingers each. Photographed with an 50mm lens at chest height on a medium-format digital camera, clean, well exposed, true colours, shallow depth of field. No text, no name tag, no signs, no logos, no numbers anywhere.
```

## 5. H-double

- 쓰인 곳: 버림: 침대가 셋이라 2인실이 아니었다. H2 의 --ref 로만 썼다
- 비율 3:2, 크기 2K, 참조: A-cabin-night.jpg

```
The same sleeper train interior design as in the reference photograph (same light grey wool felt walls, same pale ash-wood ledge, same matte black swing-arm reading lamps, same white bed linen and deep blue wool blankets), but this is the two-berth cabin: two beds stacked as bunks on the left wall, the upper bunk with a slim white safety rail and a short black ladder, both beds made with white sheets and pillows and a deep blue blanket folded at the foot of each, a reading lamp at each bunk, a small fold-down table under the window. Night outside the window, deep blue. Photographed from the doorway at eye level with a 35mm lens on a medium-format digital camera, clean, well exposed with soft warm-white lamp light and gentle shadows, true colours, calm and inviting. No people. No text, no signs, no logos, no numbers.
```

## 6. G-arrival → `img/arrival-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 하룻밤 07:05 (아침 도착)
- 비율 3:2, 크기 2K, 참조: C-platform.jpg

```
Photograph of passengers stepping off a sleeper train onto a station platform at seven in the morning, for a young rail company's website. The coaches are the same deep blue with one thin white line as in the reference photograph. Bright, low, clear morning sunlight from the side; a few travellers with small overnight bags and coats walk away from the open doors toward the exit, one stretches, one holds a paper cup; an attendant in a deep blue uniform stands by a door. Beyond the end of the platform canopy, the edge of a quiet modern city: a few mid-rise buildings and a bridge in soft morning haze. Photographed at eye level along the platform with a 35mm lens, clean digital photograph, fresh and bright, true colours, crisp. Faces small or turned away. No text, no signs, no station names, no numbers, no logos, no advertising anywhere.
```

## 7. D-tea → `img/tea-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 하룻밤 23:30 (차 한 잔)
- 비율 4:5, 크기 2K, 참조: A-cabin-night.jpg

```
Close photograph of a passenger's two hands holding a plain white ceramic cup of hot barley tea, resting on the pale ash-wood window ledge of the same sleeper cabin as in the reference photograph, at night. The person wears a soft grey knit sweater; only the hands and forearms are in frame, no face. Behind the cup, the dark window shows the deep blue night with one distant light softly streaked; at the edge of the frame, a corner of the white pillow and the deep blue wool blanket. The black reading lamp lights the scene with soft neutral warm-white light. Natural, relaxed hands with exactly five fingers each, short clean nails, real skin texture. Photographed with a 50mm lens on a medium-format digital camera, shallow depth of field, clean, well exposed, true colours, calm. No text, no logos, no pattern on the cup.
```

## 8. P1-founder → `img/founder-yoon-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 회사: 윤도경
- 비율 4:5, 크기 1K, 참조: C-platform.jpg

```
Environmental portrait of a co-founder of a small sleeper-train company, for the team page of its website. A Korean man around fifty, short black hair greying at the temples, clean-shaven, plain dark grey work jacket over a white t-shirt, standing relaxed with arms at his sides in front of the flat side of a deep blue railway coach (the same deep blue with one thin white line as in the reference photograph), the coach side filling the background, slightly out of focus. Soft, even overcast daylight in a rail depot, chest-up framing, looking straight at the camera with a calm, quiet expression, a hint of a smile. Natural skin texture, real face, nothing retouched to plastic. Photographed with an 85mm lens on a medium-format digital camera, clean, well exposed, true colours. No text, no logos, no name tag, no numbers anywhere.
```

## 9. P2-founder → `img/founder-seo-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 회사: 서하린
- 비율 4:5, 크기 1K, 참조: P1-founder.jpg

```
Environmental portrait in exactly the same setting, light, framing, lens and colour as the reference portrait (standing in front of the same deep blue railway coach side, soft overcast depot daylight, chest-up, looking at the camera), but a different person: a Korean woman in her late thirties, black hair tied back low, small plain earrings, white collared shirt under a light grey knit cardigan, calm warm expression, slight smile. Natural skin texture, real face. No text, no logos, no name tag, no numbers anywhere.
```

## 10. I-couchette → `img/cabin-four-*.webp`

- 쓰인 곳: 객실: 4인 침대칸
- 비율 3:2, 크기 2K, 참조: H-double.jpg

```
The same sleeper train interior design as in the reference photograph (same light grey wool felt walls, same pale ash-wood ledges, same matte black swing-arm reading lamps, same white bed linen and deep blue wool blankets), but this is the four-berth couchette compartment: two bunk beds facing each other across a narrow floor, two berths on each side, lower and upper, all four made with white sheets and white pillows and a deep blue blanket folded at the foot; each berth has its own reading lamp and a light grey privacy curtain drawn back to the end; a small fold-down table under the window at the far end; a slim black ladder to the upper berths. Night outside the window, deep blue. Photographed from the doorway looking straight in toward the window, at eye level, with a 28mm lens on a medium-format digital camera, clean, well exposed with soft warm-white light, gentle shadows, true colours, calm and orderly. No people. No text, no signs, no logos, no numbers.
```

## 11. P3-founder → `img/founder-ma-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 회사: 마준우
- 비율 4:5, 크기 1K, 참조: P1-founder.jpg

```
Environmental portrait in exactly the same setting, light, framing, lens and colour as the reference portrait (standing in front of the same deep blue railway coach side, soft overcast depot daylight, chest-up, looking at the camera), but a different person: a Korean man in his mid-thirties, short black hair, thin black-rimmed glasses, plain black crew-neck sweater, relaxed and slightly amused expression. Natural skin texture, real face. No text, no logos, no name tag, no numbers anywhere.
```

## 12. H2-double → `img/cabin-double-*.webp`

- 쓰인 곳: 객실: 2인실
- 비율 3:2, 크기 2K, 참조: H-double.jpg

```
The same sleeper train interior design as in the reference photograph (same light grey wool felt walls, pale ash-wood ledge, matte black swing-arm reading lamps, white bed linen and deep blue wool blankets), but this is the two-berth cabin and it has exactly two beds: one lower bed and one upper bunk directly above it on the same wall, the upper bunk with a slim white safety rail and a short black ladder. There is no third bed. Opposite the beds, a narrow strip of floor, a small grey felt wardrobe door and a fold-down ash table under the window. Both beds made with white sheets, white pillows and a deep blue blanket folded at the foot; a reading lamp at each bed. Night outside the window, deep blue. Photographed from the doorway at eye level with a 28mm lens on a medium-format digital camera, clean, well exposed, soft warm-white lamp light, gentle shadows, true colours, calm and inviting. No people. No text, no signs, no logos, no numbers.
```

## 13. F-reading → `img/reading-*.webp`

- 쓰인 곳: 버림 (2026-11-10 사람 사진 → 사물 사진, 아래 "사람 대신 사물" 참고). 원래 자리: 하룻밤 23:05 (독서등 아래)
- 비율 4:5, 크기 2K, 참조: H2-double.jpg

```
Photograph inside the same two-berth sleeper cabin as in the reference photograph, at night: a Korean woman in her twenties in a soft grey sweatshirt lies on the lower bed under the white duvet and the deep blue wool blanket, propped on the white pillow, reading a paperback book (blank plain cover, no title) by the light of the black swing-arm reading lamp; the window blind is half down and the night outside is deep blue. Relaxed, sleepy, content expression, eyes on the book. Natural face and natural hands with five fingers each, real skin texture. Photographed from the doorway at eye level with a 35mm lens on a medium-format digital camera, clean, well exposed, soft neutral warm-white lamp light with gentle shadows, true colours, calm and inviting. No text anywhere, no logos, no numbers.
```

## 14. A2-single → `img/cabin-single-*.webp`

- 쓰인 곳: 객실: 1인실 (문 쪽)
- 비율 3:2, 크기 2K, 참조: A-cabin-night.jpg

```
The same single sleeper cabin as in the reference photograph (same light grey wool felt walls, same pale ash-wood ledge, same matte black swing-arm reading lamp, same white bed linen and deep blue wool blanket), photographed from the other end: standing at the window end and looking back toward the cabin door. We see the made bed running along the wall on one side, and beside the door a small built-in corner washbasin cabinet in pale grey with a round white basin, a small mirror and a hook with a folded white towel; the sliding door is closed. Evening, the reading lamp is on and gives soft neutral warm-white light, the cabin is clean and well lit. Photographed at eye level with a 28mm lens on a medium-format digital camera, clean, well exposed, true colours, calm and inviting, like an architectural photograph of a small hotel room. No people. No text, no signs, no logos, no numbers.
```

## 사람 대신 사물 (2026-11-10)

생성 9회(편집 2회 포함). 원본은 스크래치패드 `people-a/`, 보정과 내보내기는 같은 `scripts/grade.py`. 사람이 있던 사진은 원래 사진을 `--ref` 로 넣고 사람만 지우는 편집으로 만들어 빛과 색을 그대로 두었다. 창업자 셋은 같은 파란 객차 옆면과 철제 수레 위에 각자 맡은 일의 물건을 놓은 정물 세 장이다. 모두 원본 크기로 확인했다: 사람·손 없음, 글자나 눈금처럼 읽히는 표시 없음(윤도경 도구와 마준우 쇠자·스톱워치의 눈금은 편집으로 지웠다). 도착 사진의 객차 아래쪽 작은 표기는 예전 사진과 같은 수준이며 읽히지 않는다.

### nt-platform.jpg → `img/platform-door-*.webp` (하룻밤 22:40)

- 빈 밤 플랫폼, 열린 객차 문과 발판. C-platform 에서 사람 셋을 지운 편집
- 비율 3:2, 크기 2K, 참조: C-platform.jpg

```
Edit this photograph, keeping the train, the coaches, the lit windows, the platform, the canopy, the lights, the camera position, the framing and the colour exactly as they are. Remove all three people: the two travellers with bags and the uniformed attendant by the door, together with their shadows, and fill in the clean concrete platform, the white edge line and the blue coach side behind them so nothing of them remains. The platform is now empty. The coach door stays open with warm-white light from inside falling on the platform, and a small black folding boarding step stands on the platform right below the open door, ready for the first passengers. The result must look like an ordinary, unretouched photograph. No people anywhere, no text, no signs, no numbers, no logos.
```

### nt-reading.jpg → `img/bunk-book-*.webp` (하룻밤 23:05)

- 2인실 아래 침대, 켜진 독서등과 엎어 둔 책. F-reading 에서 사람을 지운 편집
- 비율 4:5, 크기 2K, 참조: F-reading.jpg

```
Edit this photograph, keeping the cabin, the bunk above, the window, the reading lamp and its light, the table, the bedding colours, the camera position, the framing and the colour exactly as they are. Remove the woman completely: nobody is in the bed. The white duvet and the deep blue wool blanket are folded back diagonally from the pillow, the white pillow keeps a soft dent where a head rested, and an open paperback book lies face down on the white sheet under the lamp light, its plain pale grey cover blank with no title, no letters and no picture. The black reading lamp stays on. The result must look like an ordinary, unretouched photograph of the cabin a moment after someone stepped out. No people, no hands, no text, no logos, no numbers.
```

### nt-tea.jpg → `img/tea-cup-*.webp` (하룻밤 23:30)

- 창가 선반의 김 나는 찻잔과 티백 접시. D-tea 에서 손과 소매를 지운 편집
- 비율 4:5, 크기 2K, 참조: D-tea.jpg

```
Edit this photograph, keeping the window, the night outside, the ash-wood window ledge, the black reading lamp and its light, the pillow, the deep blue blanket, the camera position, the framing and the colour exactly as they are. Remove the two hands, the arm and the grey knit sleeve completely, so no part of a person remains. The plain white ceramic cup of hot barley tea now stands alone on the ledge in the same place, with thin steam rising from it; next to it a small round white saucer holding a used tea bag folded in a white paper napkin. Where the sleeve was, we see the white pillow and the soft deep blue wool blanket on the bed. The result must look like an ordinary, unretouched photograph. No people, no hands, no text, no logos, no pattern on the cup.
```

### nt-morning.jpg → `img/morning-tray-*.webp` (하룻밤 06:30)

- 새벽 창가 선반의 아침 차와 빵, 수건, 세면도구 주머니 (승무원 사진 대신)
- 비율 4:5, 크기 2K, 참조: B-cabin-dawn.jpg

```
Photograph in the same sleeper cabin as the reference photograph (same light grey felt walls, same pale ash-wood ledge, same window with the frosted fields outside at first light, same white bedding and deep blue wool blanket), at half past six in the morning, for a young rail company's website. A closer view, standing beside the bed and looking down at the pale ash-wood ledge under the window: the morning service set out on it. A plain white ceramic teapot and a plain white cup of tea, two small round plain bread rolls on a small white plate, a neatly folded white hand towel, and a small light grey felt pouch with a white toothbrush and a small plain white tube. At the lower edge of the frame, a corner of the white duvet and the deep blue blanket. Soft cool daylight from the window, the reading lamp switched off. Photographed with a 50mm lens on a medium-format digital camera, clean, well exposed, natural colours, crisp, calm. No people, no hands. No text, no labels, no logos, no numbers, no pattern anywhere.
```

### nt-arrival.jpg → `img/arrival-empty-*.webp` (하룻밤 07:05)

- 아침 햇빛의 빈 플랫폼과 열린 문. G-arrival 에서 사람과 그림자, 표지판을 지운 편집
- 비율 3:2, 크기 2K, 참조: G-arrival.jpg

```
Edit this photograph, keeping the train, the open coach doors, the platform, the canopy, the morning sunlight, the city in the distance, the camera position, the framing and the colour exactly as they are. Remove every person: the uniformed attendant, the man stretching, the man with the paper cup and the two men walking with bags, together with all of their shadows, and fill in the sunlit concrete platform, the white edge line and the blue coach behind them so nothing of them remains. Remove the person visible through the coach window as well. The platform is now empty in the low morning light, the coach doors still open. Also remove the blue sign board on the right post so it is a plain grey post. The result must look like an ordinary, unretouched photograph. No people anywhere, no text, no signs, no numbers, no logos.
```

### nt-yoon.jpg → (nt-yoon2 의 바탕, 세 정물의 --ref)

- 윤도경의 정비 도구 첫 판. 게이지 판에 글자 같은 각인이 있어 편집했다
- 비율 4:5, 크기 1K, 참조: P1-founder.jpg

```
Still-life photograph in the same place, light, lens and colour as the reference photograph: the flat side of the same deep blue railway coach with one thin white line fills the whole background, slightly out of focus, in soft even overcast daylight in a rail depot. There is no person in this photograph. In the foreground, filling the lower half of the frame, the flat top of a plain grey steel workshop trolley, and on it the tools of the man who keeps the coaches running: a neatly folded dark grey cotton work jacket, a pair of worn tan leather work gloves laid on the jacket, a long steel torque wrench, a flat steel wheel-profile gauge plate, and a small steel tape measure. Arranged simply, slightly off centre, seen from standing height at a gentle downward angle. Medium-format digital, 85mm lens, crisp, well exposed, true colours, calm. No people, no hands. No text, no engraving, no logos, no numbers, no scale markings readable as digits.
```

### nt-yoon2.jpg → `img/kit-yoon-*.webp` (회사: 윤도경)

- 회색 작업복, 작업 장갑, 토크 렌치, 바퀴 게이지, 줄자
- 비율 4:5, 크기 1K, 참조: nt-yoon.jpg

```
Edit this photograph, keeping the blue coach background, the light, the grey steel trolley, the folded grey work jacket, the camera position, the framing and the colour exactly as they are. Change only these things: the leather work gloves become worn dark grey canvas work gloves; the flat steel gauge plate becomes completely plain brushed steel with two holes and no engraving, no stamped marks, no letters and no numbers at all; the torque wrench handle is plain polished steel with no markings or scale; the small tape measure case is plain brushed steel with no label. The result must look like an ordinary, unretouched photograph. No people, no hands, no text, no logos, no numbers.
```

### nt-seo.jpg → `img/kit-seo-*.webp` (회사: 서하린)

- 흰 시트와 베갯잇, 파란 담요, 개어 놓은 제복, 찻주전자와 찻잔
- 비율 4:5, 크기 1K, 참조: nt-yoon.jpg

```
Still-life photograph in exactly the same place, light, lens, framing and colour as the reference photograph: the same flat deep blue railway coach side with one thin white line in the background, slightly out of focus, soft even overcast daylight, and the same grey steel workshop trolley in the foreground. Only the objects on the trolley change. Now on it lie the things of the woman who runs the cabins: a neat stack of folded crisp white bed sheets and two white pillowcases, topped by a folded deep blue wool blanket, the same deep blue as the coach; beside the stack a folded deep blue uniform jacket with plain dark buttons, and a plain white ceramic teapot with one plain white cup. Arranged simply, slightly off centre, seen from standing height at a gentle downward angle. Medium-format digital, crisp, well exposed, true colours, calm. No people, no hands. No text, no labels, no badges, no embroidery, no logos, no numbers.
```

### nt-ma.jpg → (nt-ma2 의 바탕)

- 마준우의 시각표 작업 첫 판. 쇠자·연필·스톱워치에 숫자와 글자가 있어 편집했다
- 비율 4:5, 크기 1K, 참조: nt-yoon.jpg

```
Still-life photograph in exactly the same place, light, lens, framing and colour as the reference photograph: the same flat deep blue railway coach side with one thin white line in the background, slightly out of focus, soft even overcast daylight, and the same grey steel workshop trolley in the foreground. Only the objects on the trolley change. Now on it lie the things of the man who plans the timetable: a few loose sheets of pale graph paper with a hand-drawn train diagram in pencil, only straight diagonal pencil lines crossing the faint grid, with no numbers, no letters and no writing anywhere; a plain steel ruler with no markings; a mechanical pencil and an eraser; a pair of thin black-rimmed glasses folded on top of the sheets; and a plain round steel stopwatch with a blank white face and no numerals. Arranged simply, slightly off centre, seen from standing height at a gentle downward angle. Medium-format digital, crisp, well exposed, true colours, calm. No people, no hands. No text, no digits, no labels, no logos.
```

### nt-ma2.jpg → `img/kit-ma-*.webp` (회사: 마준우)

- 연필 운행선을 그린 모눈종이, 안경, 연필, 쇠자, 지우개, 스톱워치
- 비율 4:5, 크기 1K, 참조: nt-ma.jpg

```
Edit this photograph, keeping the blue coach background, the light, the grey steel trolley, the black-rimmed glasses, the eraser, the camera position, the framing and the colour exactly as they are. Change only these things: the sheets become plain white paper with a faint pale grey grid, and on the top sheet a hand-drawn train timetable diagram in soft pencil: about a dozen thin straight diagonal pencil lines running in two directions and crossing each other in a regular pattern across the grid, with no numbers, no letters and no writing at all. The steel ruler becomes completely plain brushed steel with no scale marks and no numbers. The wooden pencil and the mechanical pencil are plain, with no printing. The stopwatch face is plain white with only two thin black hands, no numerals, no tick marks, no printing. The result must look like an ordinary, unretouched photograph. No people, no hands, no text, no digits, no logos.
```
