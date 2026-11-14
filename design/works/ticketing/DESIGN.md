# 광클 — design system

A tense, funny ticketing game on a fictional booking site, 앞줄티켓. Three invented concerts are
the three difficulty levels: 도해솔's small-hall ballad concert, ORBEAT's arena world tour and the
one-night reunion of the 90s band 청동거울. One run: watch the server clock to 20:00:00, press
예매하기, survive the queue, grab two seats side by side on a seat map that empties in real time,
pay before the timer runs out, keep the stub.

UXKIN was not connected, so the direction is not drawn from reference sites; it comes from the
subject: the Korean ticketing ritual (server clock, 대기 순번, seat grades, 이선좌) and the Tyvek
wristband you get at the gate.

## Idea in one line

A printed event poster that turns into a booking machine. One flat wristband pink, pure black,
pure white; the numerals are the image.

## Colour

| token | hex | role | why |
|---|---|---|---|
| `--pink` | `#FF4F9A` | flat poster field (hero, open phase, result), VIP seats, the progress fill | the hi-vis Tyvek wristband (형광 핑크 팔찌) swapped for your ticket at the gate; fan colour |
| `--black` | `#000000` | all text, primary buttons, the stage block, *your* seats | print black; the one thing on the map that is yours |
| `--white` | `#FFFFFF` | page, queue room, payment form, ticket stock | a booking site's working surface |
| `--ash` | `#E4E4E7` | sold seats, rules, empty meters | what is left when a seat is gone |
| `--mute` | `#5C5C63` | secondary text on white (6.6:1) | |

Grade scale (seat fills) is the same pink at falling strength, so price reads as "more ink":
VIP `#FF4F9A` (solid) · R `#FF97C2` · S `#FFCFE3` · A white with a 2px pink rim. Taken = `--ash`
dot, half size. Yours = black with a white numeral. Distinguishable in greyscale (luminance steps
plus rim and size), and every block is labelled with its grade.

Contrast: black on pink 6.9:1, black on white 21:1, mute on white 6.6:1, black on R tint 11:1.
No pink text on white (3.0:1), no extra alarm colour: warnings invert (black field, white type).

Rejected on the way: acid lime on black (the commonest generated "bold" look), Kakao yellow +
black (reads as a real Korean brand), green (a real ticketing brand), red (너울 2027's vermilion).

## Type

- **Apjul Sans** = Pretendard 1.3.9 (OFL, orioncactus), subset and renamed because the licence
  reserves "Pretendard". 400 body, 600 UI, 800 headings and the 광클 wordmark. Korean booking
  sites are set in exactly this kind of neutral grotesk; it lets the numerals shout.
- **Big Shoulders Display** (OFL, Google Fonts), 600–900 variable: every numeral that matters
  (server clock, 대기 순번, timers, prices, seat codes, grades, stub). A condensed arena-scoreboard
  face: 20:00:00 can fill a screen width at 900. Digits sit in fixed-width cells (`.num i`) so the
  clock never jitters.
- No monospace, no all-caps labels; Latin appears only in grade letters and seat codes.

Scale (px): 13 · 15 · 17 · 20 · 26 · 34 · 48 · 72, plus fluid display sizes:
clock `clamp(88px, 16vw, 300px)`, queue number `clamp(96px, 18vw, 320px)`, timers 72–120.
Korean line-height 1.5 body, 1.15 headings; Big Shoulders line-height 0.82 at display sizes.

## Grid and space

12 columns, outer margin 40px (≥1200), 24px (768–1199), 16px (phones); gutter 24 / 16 / 12.
Spacing scale 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Baseline 8px.
Everything is left-aligned. The hero is a poster: pink field across columns 1–7, photograph on
8–12 full height; the clock is set to the field's width.

```
desktop hero                                   phone hero
┌ 앞줄티켓 ─────────────── 예매 오픈 20:00 ┐     ┌ 앞줄티켓        소리 ┐
│ 광클                    │ photo        │     │ photo 16:10          │
│ lead                    │ (selected    │     │ 광클                 │
│ 20:00:00  (giant)       │  concert)    │     │ 20:00:00             │
│ [concert 1][2][3]       │              │     │ lead                 │
│ [시작하기]               │              │     │ concerts (stacked)   │
└─────────────────────────┴──────────────┘     │ [시작하기]            │
                                               └──────────────────────┘
```

Game stage (fixed, full viewport) per phase: open = pink field, giant clock, 예매하기;
queue = white room, giant 대기 순번, thick meter; seats = white, venue overview (cols 1–7) +
block of seats (cols 8–12); pay = white form in two columns; result = pink field + stub.

## Shape and depth

Square corners on panels, fields and seats (printed matter); buttons 2px radius. No shadows,
no blur, no gradients. The stub is the only object with depth: notched corners and a perforation
(CSS masks) and a 2px offset black edge, like a ticket lying on the poster.

## Components

- **Primary button**: black fill, white Apjul Sans 600, 56px tall (72px for 예매하기). Hover:
  pink inset 4px rim. Pressed: a 7px rim. Focus-visible: 2px black outline offset 2px (white on black fields; the giant 예매하기 keeps 4px). Detail pass notes: DETAIL.md.
  Disabled (rate-limited): ash fill with a draining black line.
- **Secondary button**: 2px black border, transparent fill.
- **Concert picker**: radio group as three stacked rows (grade of difficulty, seats, queue size).
- **Seat**: 44px hit area on touch (40 visual), 40–48px on desktop. States: free (grade fill),
  pending (black ring), yours (black + 1/2), taken (ash dot), lost (black ✕ for 900ms).
- **Toast**: black bar, white text, at the top of the stage, `role="status"`.
- **Stub**: white ticket on the pink field, Big Shoulders seat code, barcode drawn from the booking
  number, tear-off part.

## Imagery

Three generated photographs of the empty venues before doors open (Gemini; the owner's fourth
review asked for objects, not people): the small hall with a microphone stand in the spotlight,
the arena floor with a light stick on every folding chair, the stadium seen from behind the drum
riser. Crisp digital concert photography, no people, no text, lit in pink and white so they sit on
the pink field without a frame. Used once each: the hero photo and the event section. See IMAGES.md.
