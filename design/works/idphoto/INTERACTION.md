# 정면사진관: interaction spec (revision 2026-11-10)

The page is transient and informational: which format, what to fix before sitting, what the shop
retouches, what it costs, where the stores are. After the owner's review it has no toy. The earlier
framing screen, shutter, flash, print-and-trim animation, file builder and opt-in camera were removed.

## What is left

| control | behaviour |
|---|---|
| 차례 (phones, < 768 px) | `aria-expanded` disclosure for the section links. Closes on a link, on Escape (focus returns to the button) |
| 가이드 숨기기 | toggle button with a fixed label and `aria-pressed`. Pressed: the guide bands, centre lines and head brackets on the five format photos are hidden (`visibility: hidden`, so nothing moves); press again to show them. Hidden without JS, where the guides simply stay on |
| skip link | jumps to the format section |

No motion, no timers, no storage, no network beyond the page's own files. `scroll-behavior: smooth`
only when reduced motion is not requested.

## Guide overlay (static)

Each format photo carries its format's bands, as percentages of the cut:

| format | cut (mm) | crown band | eye band (from top) | chin band | this photo's head |
|---|---|---|---|---|---|
| 여권, 주민등록증, 운전면허 | 35 × 45 | 3–5 | 18–22 | 37–39 | 34.0 mm |
| 비자 | 50 × 50 | 3–7 | 15–22 | 32–38 | 31.4 mm |
| 취업용 반명함 | 30 × 40 | 3–5 | 14–18 | 29–31 | 26.0 mm |

The crops were computed so the real crown, eye line and chin fall inside these bands (`scripts/photos.py`,
`photos.json`), so the overlay and the printed numbers describe the actual photographs.
