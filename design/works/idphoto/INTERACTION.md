# 정면사진관: interaction spec

The page's posture is transient: a visitor comes to learn which format they need, what to fix
before they sit, what it costs and how to get there. The one sovereign moment is the framing
screen, where they do the shop's job for a minute and see why the shop exists.

Usage story: pick today's format (exposition) → the drawn customer sits small and crooked in a
dark studio (inciting) → zoom, nudge and level until the head fills the band (rising action) → the
last check is the stubborn one, usually the eye line or the tilt (crisis) → 셔터, the flash
(climax, the peak) → the 4×6 print slides out and is trimmed into 8 cuts (ending) → "파일로 받기"
and the rest of the page (falling action).

## 1. Model

World units: the sitter's head, crown to chin, is 100 units. Each of three invented customers has
its own eye ratio (crown→eye ÷ crown→chin: 0.44, 0.47, 0.50), seat offset and body tilt, so the
right framing is different for each and cannot be memorised.

Camera state: `s` (mm of print per world unit), `c` (world point under the frame centre), `φ`
(image rotation in degrees). A world point p lands on the print at
`f(p) = (W/2, H/2) + s · R(φ) · (p − c)` in millimetres, origin top-left of the cut.

| format | cut (mm) | head (mm) | eye line from bottom (mm) | backdrop | cuts on 4×6 |
|---|---|---|---|---|---|
| 여권 | 35 × 45 | 32–36 | 23–27 | white (rule) | 8 (4 × 2) |
| 주민등록증 | 35 × 45 | 32–36 | 23–27 | white (recommended) | 8 |
| 운전면허 | 35 × 45 | 32–36 | 23–27 | blue (plain, single colour) | 8 |
| 비자 5×5 | 50 × 50 | 25–35 | 28–35 | white | 6 (3 × 2) |
| 취업용 반명함 | 30 × 40 | 24–28 (shop standard) | 22–26 | blue | 8 (4 × 2) |

Head sizes for 여권 and 5×5 are the commonly published rules; ID card and licence use the passport
numbers as the shop's practice; 반명함 has no rule, so it is labelled 저희 기준. The page says rules
change and to check with the issuing office.

Guide bands drawn on the cut (consistent with the table): crown band and chin band chosen so that a
crown inside its band and a chin inside its band always give a legal head size (여권: crown 3–5 mm
from the top, chin 37–39 mm), plus the eye band and a dashed centre line.

## 2. Checks (computed every render, never faked)

| item | rule | readout |
|---|---|---|
| 머리 크기 | `s × 100` inside the format's head range | "3.42 cm (3.2–3.6)" |
| 눈높이 | `H − f(eyeMid).y` inside the eye band | "아래에서 2.51 cm" |
| 좌우 중앙 | `|f(faceMid).x − W/2| ≤ 1.0 mm` | "가운데" / "오른쪽으로 2.4 mm" |
| 어깨 수평 | `|tilt + φ| ≤ 1.0°` | "수평" / "왼쪽 어깨가 1.5° 낮음" |
| 배경 균일 | all four cut corners, mapped back to the world, inside the backdrop roll | "배경지 안" / "배경지 밖이 보임" |

The summary line ("5개 중 3개 맞음") is the only live region, updated 400 ms after input settles.
Camera mode measures only 배경 균일, from pixels: the cut's top band and the two upper side bands
are sampled and the colour spread (standard deviation of luminance) must stay under 9 levels. The
other four rows say "직접 보세요": the page does not look for faces, and says so.

## 3. Inputs (every one has a visible alternative)

| input | effect |
|---|---|
| drag (mouse, pen, one finger) on the screen | pan; the picture follows the pointer |
| pinch (two fingers) | zoom anchored at the midpoint; twisting past 3° also rotates |
| ctrl + wheel (trackpad pinch) | zoom anchored at the cursor; plain wheel scrolls the page |
| arrow keys on the focused screen | pan 0.5 mm of print (Shift: 2 mm) |
| + / = and − | zoom 1.5 % (Shift: 6 %) |
| [ and ] | rotate 0.5° (Shift: 2°) |
| pad buttons 크기 −/+, 위치 ←↑↓→, 기울기 ↺↻ | same steps as the keys; holding repeats after 350 ms every 70 ms |
| 처음으로 | back to this customer's starting view |
| 다른 손님 | next of three customers, starting view |

Limits: head 8–60 mm; rotation ±15°; the frame centre cannot leave the studio. Hitting a limit stops
quietly (no error).

## 4. States

```
studio:   [drawn] --카메라 켜기--> [asking] --allowed--> [live] --카메라 끄기 / 그림 손님--> [drawn]
                                          --denied / none / insecure--> [drawn + message]
shutter:  [ready] --셔터--> [firing 380 ms | static frame 900 ms (reduced)] --> [printing]
          [printing] --sheet drawn--> [cutting ≈2.3 s | none (reduced)] --> [cut]
          [cut | cutting] --셔터--> [firing] (a new sheet replaces the old one)
```

- Firing: the shutter is `aria-disabled` for those 380 ms only. Nothing else blocks input.
- Flash: one full-screen white layer, opacity .95 → 0 over 380 ms, once per press (well under three
  flashes a second). Reduced motion: no flash; the screen holds the captured frame with an ink rim
  and the word 찍었습니다 for 900 ms.
- Printing: the 인화지 block (hidden until the first shot) gets the 4×6 sheet drawn from the capture
  at 300 dpi; the slip beside it states the format, the cut count and the check result in the shop's
  voice (5/5: "이대로 내셔도 됩니다." otherwise what is off and by how much, "가게에서는 다시
  찍습니다."). If the sheet is mostly off-screen it is scrolled into view (instant under reduced
  motion), and a live region says "인화지가 나왔습니다".
- Cutting: a trimmer wheel runs each horizontal trim line, then each vertical one; the margin strip
  drops away and the cuts part by a few pixels. Reduced motion: the parted cuts are shown at once.
- Format change: the backdrop roll rolls down in the new colour (420 ms; instant when reduced), the
  guides redraw, the checks re-run. Camera state is kept, so the visitor sees the same framing judged
  by another rule. The price section highlights the same format.

## 5. Camera (opt-in)

- Trigger: the secondary button 내 얼굴로 해 보기, with the plain explanation visible before pressing:
  the video stays inside this page, nothing is uploaded or stored, the shot exists only until the
  page closes.
- The preview is mirrored like a mirror; the print is not (the slip says so). The video replaces the
  sitter and studio as the world; zoom, pan and rotate still work.
- Denied, missing camera, insecure context or any error: back to the drawing with one sentence saying
  what happened. The page never asks twice on its own.
- Tracks stop on 카메라 끄기, on pagehide, and when the tab has been hidden for 60 s.

## 6. Loops, motion and performance

- The drawn studio renders on demand (one rAF per change). Camera mode runs one rAF loop, paused when
  the screen is off-screen (IntersectionObserver) or the tab is hidden.
- Motion only answers the visitor: roll change, flash, cutter. Nothing autoplays.
- Format choice is remembered in localStorage (`idphoto.v1`) inside try/catch; without storage the
  page starts on 여권.

## 7. Files (section 사진 파일 받기)

The latest capture (or, before any shot, customer 1 framed by the shop's own fitting) is shown as
the three files the shop hands over, with pixel sizes computed from the format at 300 and 600 dpi
and a third JPG squeezed under 100 KB by lowering quality step by step. Each has a save button that
builds the file in the browser (`canvas.toBlob`) and nothing else.

## 8. Added after review

- A status line inside the screen (top left, under the format name) repeats the five checks as
  small boxes, so a phone user sees them while adjusting; the full list stays below. In camera mode
  it shows only 배경 and "나머지는 직접 보기".
- Band words (정수리, 눈, 턱) sit on small guide-blue tags so they stay legible when a band is
  narrower than the text (passport bands on a 375 px phone are about 11 px tall).
- The shutter stays locked for 500 ms after a press (flash 380 ms), so it can never flash more than
  twice a second.
- Screen-reader announcements: silent on load; a customer change announces the customer's
  description instead of the check count; camera errors are not overwritten.
