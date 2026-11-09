# 곧은내 하프마라톤 — INTERACTION.md

The page is a promo poster plus a race booklet. It shows; it does not play (BRIEF §0.1). The only
behaviour beyond links and `details`:

## 참가 신청 확인 (the only script, `js/entry.js`)

- Two radio groups: 종목 (하프 / 10km / 5km 걷기, each with its fee) and 셔츠 크기 (XS–3XL). Native
  radios, visually drawn as square tiles (48px high), so arrow keys move inside a group and Tab moves
  between groups and the button.
- "신청 내용 확인" writes one sentence into a `role="status"` line: event, size, fee, start time, and
  "가상 대회라 신청서는 어디에도 보내지 않았습니다." Missing a choice gives a short prompt and moves
  focus to the first radio of the missing group. Changing a choice clears the sentence.
- Above the button: "이름이나 연락처를 묻지 않고, 아무것도 보내지 않습니다." No personal data fields,
  no network request, no storage. Without JavaScript the form submits to `#entry` on the same page
  with only the two choices in the query string.

## Everything else

- Navigation: in-page anchors; smooth scroll only when reduced motion is not requested.
- 묻고 답하기: native `details/summary`, + turns into − when open.
- No scroll effects, no reveal animations, no autoplay, no loops. Hover/focus transitions are 150ms.
- The course map, elevation profile and race-time bars are static drawings generated at build time
  (`scripts/course.py`) or plain CSS; nothing on them is interactive, so nothing is hidden behind
  hover or drag.
- Focus: 3px solid outline, offset 3px, black on white sections and white on blue/black sections.
