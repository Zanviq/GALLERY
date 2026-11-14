# 광클: detail audit (BRIEF §0000, 2026-11-14)

Checked the page at 360, 390, 768, 1024 and 1440 and every phase of a run (open before and after
20:00:00, the early-press lock, queue and its freeze, seats with a pending and a won seat, payment
with a wrong discount, paying, the stub) at 1440 and at 390 (2x), driven through `?test`.
Gameplay, odds, timers and speeds are untouched.

**Type and line breaks**
- Apjul Sans (Pretendard) ran at its default tracking; now -0.01em for text, 0 for 15 px notes. The
  display sizes already had their own tracking and keep it.
- No `text-wrap`. Headings and legends balance; paragraphs, list items and values pretty.
- At 1440 the event title broke inside the show title ("〈FIRST / ORBIT〉"). A `tidy()` helper in
  `data.js` now binds every 〈title〉 and every date or time from data (2027년 1월 23일, 오후 6시)
  with no-break spaces; the static names in the picker and the 예매 오픈 line do the same in HTML.
- Seat names keep "1열 5번" together (`venue.js`), and the stub's "1·2번" and the records' "…·5번"
  carry word joiners. "Enter나 Space로도" and "두 자리" no longer split.

**A booking page's small states**
- Payment now shows what Korean booking pages show beside the money: 수령 방법 (모바일 티켓, QR from
  three hours before) and 취소 마감 (the day before the show, 17:00, per concert, with "예매 당일
  밤 12시까지는 수수료 없음"). The event facts gained the same 티켓 수령 line.
- The consent line reads like the real ones: "[필수] 취소 수수료와 취소 기한을 확인했고 동의합니다"
  (it used to end in a dangling "(필수)" on its own line at 390).
- The −3초 penalty used to rise straight through the timer's border; the pay timer now clips it, so
  it leaves through the frame.
- Pressed states for every button (black: a thicker pink rim; line: grey fill), the concert picker,
  payment options, the sound switches and 그만하기; hover for the sound switches and the consent box.
  No transitions were added: a booking page answers a press at once, and so does the game.
- Focus ring 3 px / 3 px became 2 px / 2 px (white on the black bar). The giant 예매하기 keeps its
  4 px ring on the pink field.

**Fonts** unchanged (Apjul Sans = renamed Pretendard, Big Shoulders Display); the Apjul subsets were
rebuilt for the new words and checked (no missing glyphs).

Thumbnail and OG kept: neither shows anything that changed.
