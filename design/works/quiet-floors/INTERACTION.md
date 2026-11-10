# 사뿐 interaction spec

Posture: transient. A visitor spends two to five minutes. The story follows a real conflict:
a thump (hero section drawing) → what it is like below → cheap fixes → a note to the neighbour →
the association when talking is not enough → a pledge. The peak is the replay after a fix, when the
slab barely moves and the meter drops. The ending is the pledge, which stays on this device only.

## 1. Section drawing (the signature)

### Model
- Block 103동 of the invented 나란히마을, four lived-in floors (2–5층), two units each (x01 left, x02 right),
  1층 필로티 (open, no unit), roof on top. Slabs and walls are concrete; rooms are drawn interiors.
- State: `source` (unit, default 401호), `activity` (one of five, default 아이가 뛰기),
  `fixes` (set, default empty), `sound` (off), `phase` (idle | playing | done).
- Each activity has: an illustrative level at the unit directly below (dB), a kind (heavy impact,
  light impact, wall impact, continuous vibration), an airborne share, a hit pattern in time,
  a spot inside the room, and how much each fix takes off.

| activity | below (dB, 예시) | kind | hits | fixes that help (dB off) |
|---|---|---|---|---|
| 아이가 뛰기 | 50 | heavy impact | 6 thumps, 0.34 s apart | 매트 −9, 실내화 −4 |
| 의자 끌기 | 45 | light impact (scrape) | 1.3 s scrape | 의자 다리 패드 −13, 매트 −4 |
| 문 쾅 닫기 | 47 | wall impact + airborne | 1 bang | 방문 완충재 −14 |
| 밤 세탁기 | 39 | continuous vibration + hum | 3 s spin | 시간 바꾸기 (see below) |
| 운동 기구 내려놓기 | 56 | heavy impact | 1 drop + 1 bounce | 매트 −13 |

- Spread from the unit directly below (offsets): two floors down −8, diagonal below −7,
  side unit −9 (door −2, washer −5), above −11 (door −6, washer −8). Floor at the background level.
- 시간 바꾸기 does not make the sound smaller. It moves the clock from 밤 10:40 to 낮 2:00, which raises
  the background from 28 to 42 dB (예시). The meter shows the background band, so the red bar visibly
  stops sticking out. The readout says this plainly: same sound, buried in daytime noise.
- All numbers are illustrative; the page says so beside the meter and in the notes. No legal standard
  is quoted.

### Triggers
- Tap/click a room: that room becomes the source and the current activity plays there.
- Activity chips (native radios): choose and play.
- Fix chips (native checkboxes): toggle, the readout updates at once and the scene replays.
- "다시 듣기" button: replay the current setup.
- Links in the "아랫집에서는" section: set the activity, scroll the drawing into view, play.
- One demonstration thump (about 3 s) plays once, the first time the drawing is on screen, without
  announcing anything to screen readers. It plays under reduced motion too (see below).

### Feedback
- Impact: the slab under the source bends (a decaying travelling wave, exaggerated, max ~8 px), the
  bend travels into the walls and, smaller, into the slabs below, beside and above. The ceiling of each
  affected room radiates solid arcs downward: the ceiling becomes a speaker. This is impact noise.
- Airborne: dotted rings spread from the spot inside the source room and stop at its walls, with a
  small leak at the door. This is airborne noise. A legend under the drawing names both line styles.
- The meter sits in the room directly below (beside if there is no room below). Big 7-segment digits
  follow the live level (fast weighting), a "최대" figure holds the peak, a 20-step bar shows the level
  against a hatched background band. The zoomed meter panel beside the drawing shows the same numbers.
- "고치기 전 / 지금" line: the peak with no fixes against the peak now, as two bars and numbers.
- A table lists every affected unit and its level, so nothing depends on the drawing.
- `aria-live="polite"` sentence after each user-started play, for example:
  "401호에서 아이가 뛰었어요. 바로 아래 301호 소음계 최대 41 dB(예시). 고친 것: 매트. 고치기 전보다 9 dB 작아요."

### Keyboard
- The building is one tab stop (roving tabindex over eight room buttons). Arrow keys move between rooms
  (up/down floors, left/right units), Enter or Space plays there. Each room button is labelled
  "401호에서 소리 내기", and the current source is marked `aria-pressed="true"`.
- Activities: one radio group (arrows inside). Fixes: five checkboxes. Then 다시 듣기, then sound.
- Focus ring: 3px ink, 3px offset; white on the dark meter.

### Reduced motion (revised 2026-11-10, BRIEF §000 "calmer, not still")
- The owner's Windows has animation effects off, so the browser reports `reduce`, and the still
  peak-frame diagram this page used to show there looked dead. Under `reduce` the page now behaves as
  with motion on: the slab bends, arcs and rings spread, the meter digits and bar follow the level, and
  the demonstration thump plays once. Sound is unchanged (opt-in checkbox).
- Dropped under `reduce`: only the smooth scroll when a link in "아랫집에서는" jumps to the drawing
  (instant, and the play starts at once instead of after 450 ms). The blanket CSS rule that killed every
  transition and animation is gone; the page had no CSS motion besides a 1px button press.

### Sound
- Off by default. A checkbox "아랫집에서 들리는 소리도 듣기" sits after the controls. Checking it creates
  the AudioContext (a click, so autoplay rules are met). Sounds are synthesised, low-passed as if heard
  through a slab, with gain from the level, so a fix makes them quieter too. Unchecking stops them.

### Loops
- The animation frame loop runs only while a play is active, stops when it ends, and pauses when the
  drawing is off screen or the tab is hidden (the play then skips to its end state).

## 2. Neighbour note

- "나는 아랫집 / 나는 윗집" radios switch the template (asking vs. telling ahead).
- Fields: 우리 집, 상대 집 (selects of units), 소리 or 일정 (select), 언제 (select), 부탁 or 약속 (select),
  한마디 (optional, 80 characters, counter shown), 서명 (prefilled "301호 드림").
- The note preview updates as you type. "쪽지 복사하기" copies the text (Clipboard API, fallback
  `execCommand('copy')` on a hidden textarea). Status: "복사했어요. 어디로도 보내지 않았어요."
  On failure: "복사가 막혀 있어요. 쪽지 글을 길게 눌러 직접 복사하세요." with the text selected.
- Nothing is sent or stored; the UI says so above the button.

## 3. Pledge

- Five pledge checkboxes. "약속 걸기" is disabled until one is chosen (helper text says why).
- On submit: saved to `localStorage` (try/catch), the counter shows the number of pledges made on this
  device, in Dongle, set directly with no count-up. A line lists today's pledge.
- "이 기기에서 지우기" clears it. Without storage the counter still works for this visit and says so.
- Copy beside the counter: this number counts only this browser and is never sent anywhere.
