# 밤차 — IMAGES.md

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

- 쓰인 곳: 하룻밤 22:40 (밤 플랫폼)
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

- 쓰인 곳: 하룻밤 06:30 (승무원)
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

- 쓰인 곳: 하룻밤 07:05 (아침 도착)
- 비율 3:2, 크기 2K, 참조: C-platform.jpg

```
Photograph of passengers stepping off a sleeper train onto a station platform at seven in the morning, for a young rail company's website. The coaches are the same deep blue with one thin white line as in the reference photograph. Bright, low, clear morning sunlight from the side; a few travellers with small overnight bags and coats walk away from the open doors toward the exit, one stretches, one holds a paper cup; an attendant in a deep blue uniform stands by a door. Beyond the end of the platform canopy, the edge of a quiet modern city: a few mid-rise buildings and a bridge in soft morning haze. Photographed at eye level along the platform with a 35mm lens, clean digital photograph, fresh and bright, true colours, crisp. Faces small or turned away. No text, no signs, no station names, no numbers, no logos, no advertising anywhere.
```

## 7. D-tea → `img/tea-*.webp`

- 쓰인 곳: 하룻밤 23:30 (차 한 잔)
- 비율 4:5, 크기 2K, 참조: A-cabin-night.jpg

```
Close photograph of a passenger's two hands holding a plain white ceramic cup of hot barley tea, resting on the pale ash-wood window ledge of the same sleeper cabin as in the reference photograph, at night. The person wears a soft grey knit sweater; only the hands and forearms are in frame, no face. Behind the cup, the dark window shows the deep blue night with one distant light softly streaked; at the edge of the frame, a corner of the white pillow and the deep blue wool blanket. The black reading lamp lights the scene with soft neutral warm-white light. Natural, relaxed hands with exactly five fingers each, short clean nails, real skin texture. Photographed with a 50mm lens on a medium-format digital camera, shallow depth of field, clean, well exposed, true colours, calm. No text, no logos, no pattern on the cup.
```

## 8. P1-founder → `img/founder-yoon-*.webp`

- 쓰인 곳: 회사: 윤도경
- 비율 4:5, 크기 1K, 참조: C-platform.jpg

```
Environmental portrait of a co-founder of a small sleeper-train company, for the team page of its website. A Korean man around fifty, short black hair greying at the temples, clean-shaven, plain dark grey work jacket over a white t-shirt, standing relaxed with arms at his sides in front of the flat side of a deep blue railway coach (the same deep blue with one thin white line as in the reference photograph), the coach side filling the background, slightly out of focus. Soft, even overcast daylight in a rail depot, chest-up framing, looking straight at the camera with a calm, quiet expression, a hint of a smile. Natural skin texture, real face, nothing retouched to plastic. Photographed with an 85mm lens on a medium-format digital camera, clean, well exposed, true colours. No text, no logos, no name tag, no numbers anywhere.
```

## 9. P2-founder → `img/founder-seo-*.webp`

- 쓰인 곳: 회사: 서하린
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

- 쓰인 곳: 회사: 마준우
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

- 쓰인 곳: 하룻밤 23:05 (독서등 아래)
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
