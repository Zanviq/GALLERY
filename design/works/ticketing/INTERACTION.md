# 광클 — interaction

One run is about a minute: open → queue → seats → pay → stub. One `requestAnimationFrame` loop
drives a game clock `t`; the server clock in the bar is `20:00:00 − 8 s + t`. The loop stops on the
stub and pauses (with the audio context) while the tab is hidden, so hiding the tab never costs time.

## States

| phase | what the player sees | what they do | how it can go wrong |
|---|---|---|---|
| open | pink field, giant server clock with tenths, 예매하기 (outlined "오픈 전" until 20:00:00.0, then solid black "지금") | press at the open | pressing early: "아직 오픈 전입니다" and the button is rate-limited for 0.6 s (a drain line shows it); spamming across 20:00:00 can leave you locked at the open |
| queue | white room, giant 대기 순번, pink meter, 내 뒤 / 남은 좌석 / 예상 대기 | wait | once per run the number freezes ~2.6 s ("순번 갱신이 늦어지고 있습니다") and the 새로고침 button turns pink ("화면이 멈췄나요?"). Refresh (button, F5, Ctrl/⌘+R) puts you at `now × 1.55 + k`; waiting is rewarded with a jump. Seats sell while you wait |
| seats | venue overview (canvas) with every seat, block of seats (buttons), timer, 남은 좌석 and 초당 N석 | pick a block, click seats, 선택 완료 | each click is a race: after the level's latency (0.18–0.36 s) the seat is yours with the grade's visible odds, else "이미 선택된 좌석입니다 · 0.0N초 늦었습니다" (a near miss). Time out = lose everything. Sold out = lose |
| pay | order summary, profile ("만 27세 직장인, 앞줄카드와 다른 신용카드"), discount, method, consent, 결제하기, timer | choose and pay | wrong discount (청소년, 장애인) or 무통장입금 (오픈 당일 불가) costs 3 s; 앞줄카드 할인 with another card costs 4 s; checked when you press 결제하기 so arrow keys can browse. Time out = "결제 직전 탈락" |
| result | pink field, ticket stub (grade, seat, rank title, timeline, barcode from the booking number), time to payment as the poster numeral | 한 번 더 / 다른 공연 고르기 | best per concert saved (`gwangkeul:v1`, try/catch) |

## Numbers

| | 소극장 (쉬움) | 아레나 (보통) | 주경기장 (어려움) |
|---|---|---|---|
| seats on the map | 384 | 680 | 1,104 |
| queue `base + span·(1−e^(−rt/τ))` | 60 + 4,200, τ 3 | 900 + 70,000, τ 5 | 9,000 + 400,000, τ 5 |
| sold on entry `1−e^(−pos/Pf)` (cap 93 %) | Pf 1,800 | 16,000 | 70,000 |
| others buy (share of free weight / s) | 0.034 | 0.055 | 0.08 |
| odds VIP / R / S / A | 75 / 85 / 92 / 96 % | 45 / 60 / 75 / 85 % | 28 / 42 / 60 / 75 % |
| seat time / pay time | 50 s / 25 s | 40 s / 20 s | 32 s / 16 s |

Other buyers choose seats by weight: grade heat (VIP 3.2, R 1.9, S 1.1, A 0.65) × front rows ×1.7 ×
centre seats a little more; 72 % of them buy the free seat next to theirs too, which leaves the
singles that make a pair hard to find. The near stage empties first.

Rank: VIP 나란히 under the level's time → 광클의 신; VIP 나란히 → 성공한 덕후; R 나란히 → 피켓팅 생존자;
S/A 나란히 → 어디든 나란히; two apart → 따로 또 같이; one seat → 혼자라도 간다; fails → 취소표를 노리세요 /
결제 직전 탈락.

## Input

- Mouse acts on `pointerdown` (a click is too slow for 광클); touch and keyboard act on `click`, so a
  scrolling finger never books a seat.
- Overview: the canvas hit-tests the nearest block, so a phone tap needs no 44 px target on the tiny
  map; transparent block buttons over the canvas carry focus and labels for keyboard and readers.
- Block of seats: one tab stop, arrow keys move, Enter/Space pick, Esc returns to the block buttons.
  Seats are 44 px on phones, 46 px on desktop.
- Pay: native radios and a checkbox; Enter submits.
- Keyboard players land on the first free seat when the seat phase opens.

## Feedback

- Sound (WebAudio, created on the start press, switch in the bars, remembered): second ticks, faster
  ticks in the last 3 s, an open chime, a dry crackle for other buyers' clicks (rate-limited), win /
  lose blips, a warning tick in the last 10 s, a penalty buzz, a chord on payment.
- Visual: sold seats shrink away in their own colour (canvas) and in the block (CSS inset
  transition); pending seat = black ring; lost seat = ✕ for 0.9 s; last 10 s = timer inverts; toasts
  top centre (bottom-left on the desktop pay screen, away from the timer), mirrored to an
  `aria-live` region.
- Reduced motion (BRIEF §000, calmer, not still): the game runs exactly as with motion on. Every
  cue stays, gentler: the shake becomes a 3 px nudge over 0.4 s, the refresh blank becomes a 0.6 s
  fade, toasts and the penalty figure fade without sliding, the pending ring and the refresh glow
  pulse more slowly (0.5 s, 1.4 s), sold seats still shrink away (0.5 s on the canvas). Only smooth
  scrolling to the chosen block is dropped.

## Phones

Timers move into the black bar (the server clock hides there during seats and pay); the map is
capped at 200 px tall; the picked seats and 선택 완료 share one sticky row; result buttons are a fixed
row at the bottom.
