# 칼퇴 결재 — design system

A timing game set in the fictional (주)한칸물산. Everyone senior is away at a workshop; 총무팀
구도담 대리 has 75 seconds before 18:00 to stamp the day's 결재 documents as they slide past on the
outgoing tray. Built without UXKIN references (not connected); the direction comes from the
subject itself: a Korean 결재 document is blue-black print on white with one red seal.

## Revision 2 (2026-11-10, owner's fourth review)

The owner: "이전의 연속성이 사라지고 뚝뚝 끊기는 느낌이 너무 싫다. 내가 말한 긴장감은 속도를 점점
올리라는 의미였다." Their Windows reports `prefers-reduced-motion: reduce`, and the game turned its
step mode on by itself under that, so the tray ticked in jumps; the revision's extra rules (미결
pile, flawed documents, a clock that jumped to 1.3x, phone rings, a tray that knocked on mistakes)
interrupted the flow on top.

- **The flow and the rules are the original ones again**: 결재, 두 칸, 정정인, 간인, 반려; 6 in a
  row raises the multiplier. No pile, no send-back flaws, no clock jump, no crunch events.
- **Tension is the speed.** The tray runs 0.50 → 1.20 document widths a second along a geometric
  curve (`0.5 x 2.4^(t/75)`): the same share faster every second, no steps, clearly fast at the end.
  It spins up from rest over 0.5 s and glides to a stop at 18:00. Shown as 배속 (1.0 → 2.4) beside
  the time rule, which is now a wedge drawn from the same curve (thin to thick) that fills towards
  18:00. The clock turns solid carbon in the last ten seconds.
- **Slips** get one quick carbon flash over the tray (opacity, 300 ms), a struck-through word and a
  low knock. The tray never moves sideways.
- **Never a step mode by default**, also not under reduced motion; 칸칸이 이동 stays as a setting.
  The storage key moved to `stamp.v2`, so a step setting saved by the old default is dropped.
  Reduced motion keeps the tray and the seal exactly as they are and only calms the marker words.
- **Kept from the first revision**: the photographed seal, the paper scan, the time rule (now the
  ramp), the poster cover, the contrast fixes and the work log, whose lines are rewritten for the
  old rules plus the speed (headline: how far up the ramp the longest clean run went; the round's
  ramp as a small chart with that run filled and each slip crossed; a timing tip from the last 20
  seconds).
- **Smoothness.** Each sheet is painted once onto its own canvas (form, print, pen, marker) over
  the paper while still off to the right, at most 2.5 ms a frame; the belt slides as one composited
  layer; ink impressions are drawn in a worker; the frame loop reads no layout. Full perfect-play
  rounds with 4x CPU throttling in headless Chrome (scripts/bot.js): 1440 px, motion on: frame
  callback 0.4 ms p50 / 1.1 ms p95, rAF interval p95 8.5 ms, 15 of 13,181 frames over 34 ms;
  390 px phone, reduced motion: 0.4 / 0.9 ms, p95 8.4 ms, 5 of 15,309 over 34 ms (the machine is
  shared with other agents' Chromes). Before the change the same check had document builds of
  ~13 ms and impressions of 17–32 ms on the main thread, and a long frame every second.

## Revision 1 (2026-11-10, owner's third review)

What changed and why (the tension items in the last bullet were replaced by Revision 2):

- **The stamp is a photograph.** The owner pointed at the red SVG stamp over the tray as an
  AI-looking 3D object. It is now a generated photograph of a real red-resin 도장 with dark
  marbling, hairline scratches and old seal paste on its rim, cut out to alpha (IMAGES.md). Its
  width is the impression's diameter, so it is 3.34 times as tall as wide (a real 인감 proportion);
  the stage layout reserves 0.5 document widths for it. It no longer squashes when it lands (a
  resin seal is rigid): it travels down, rests a beat and lifts.
- **The paper is paper.** Every document sheet, the cover, the pause sheet, the work log and the
  미결 pile use one scanned sheet of office paper, graded neutral-cool (never cream). Each document
  shows its own random patch, so a few carry the soft handling crease. Impressions are drawn with
  `mix-blend-mode: multiply`, so the fibre shows through the ink. `--carbon-soft` went from 75% to
  80% so secondary text stays above 5:1 on the darkest paper.
- **The cover is a poster.** The settings and keys used to fill the cover sheet. Now: the title
  stacked huge in marker, the real seal standing beside it, its impression pressed over the end
  of 결재 the way a seal covers a name, then the 부장's note, two sentences, two buttons. Settings
  fold into a `<details>` whose summary states the current choice ("보통 속도, 소리 켬"); the key
  line shows only with a fine pointer. From 900 px the sheet opens to two columns (poster left,
  instructions right) with 52/56 px padding.
- **The play screen breathes.** The rules column lost the key line (the 꾹 button states its keys),
  gained spacing, and drops its mini diagrams below 840 px of height. The work log is a landscape
  carbon form from 900 px, and on phones it opens on the result and the buttons, with the tally
  below.
- **Tension** (owner: "게임의 긴장감이 부족하다"): a time rule under the HUD, a clock that speeds up
  in the last 30 seconds, a 미결 pile that rises with every miss or spoiled stamp, two flawed
  documents to catch, a 긴급 interruption and a result that tells you what time you leave.
  All but the time rule and the result were removed again in Revision 2.

## Idea in one line

The whole interface is a printed office form. Everything is carbon blue on white; the only red on
the page is the stamp and the ink it leaves. When the red appears, something was decided.

## Colour (four, no more)

| token | hex | role | why |
|---|---|---|---|
| `--paper` | `#FFFFFF` | page, documents, dialogs, button fill | office copy paper |
| `--carbon` | `#1F3A93` | all text, form rules, focus ring, icons, carbon-copy log | 먹지 / ballpoint / printed form blue |
| `--inju` | `#C8102E` | the stamp object and its impressions, nothing else | 인주 (seal ink) |
| `--tray` | `#DDE2E9` | the steel document tray and the desk band under it | cool grey of a metal 결재판 tray |

Derived tints are the same carbon pigment at lower strength, like a weaker carbon copy:
`--carbon-soft` (75 %, secondary text, contrast 4.7:1 on white), `--carbon-line` (40 %, form rules
inside documents), `--carbon-faint` (14 %, paper shadow on the tray, tray rail ticks).
No red tint, no red text, no red buttons. Errors and misses are written in blue marker.

Contrast: carbon on paper 10.1:1, carbon on tray 7.7:1, inju on paper 5.9:1 (impressions only).
On the scanned paper (darkest 1% = #EBECED): carbon 8.5:1, carbon-soft 5.2:1; carbon-soft on the tray 4.9:1.

## Type

- **Hi Melody** (OFL, Google Fonts): UI and the printed text of every form. Its x-height is small,
  so body never goes below 18px.
- **East Sea Dokdo** (OFL, Google Fonts): the hand of whoever wrote on the paper with a marker:
  the title, the circled 칸 notes, judgements (정확 / 조금 비뚤 / 빗나감), the 부장 comment on the log.
- No Latin face: both cover digits and the few Latin keys shown (Space, Enter, P, M).

Scale (px): 15 · 18 · 21 · 25 · 32 · 44 · 64 · 88. Hi Melody line-height 1.35; Dokdo 1.0–1.1.
Dokdo never sets more than one line of running text.

## Space and layout

4px base: 4 · 8 · 12 · 16 · 24 · 32 · 48. Content gutters 16px on phones, 24px from 768px.

Phone (portrait, the primary target): one column sized to the viewport height.
```
┌ HUD: clock 17:59:12 | 연속 ×2 | 점수 | 소리 멈춤 ┐
│ memo line (Dokdo): "다음: 과장 칸에 대결"        │
│            [red stamp hovering]                 │
│ ═════════════▼══════════════════ tray rail      │
│  docs slide ← ← (aim ring is a dashed blue O)   │
│ ═════════════▲══════════════════                │
│ judgement + tally strip                         │
└ big 꾹 button (whole tray is also a tap zone)   ┘
```
Desktop (≥ 960px): the tray becomes a wide landscape band so the player reads further ahead; a
left column holds the printed "오늘의 서류" rule sheet and keys; the tally sits under the tray.
Not a stretched phone: docs are a little larger, the aim sits at 28 % of the tray width.

Alignment: left-aligned text everywhere (forms are left-aligned); the title block on the start
sheet is left-aligned too.

## Shape and depth

- Documents and dialogs: square corners (paper). Buttons: 3px radius, 2px carbon border, like a
  ruled cell that has been cut out. The 꾹 button is larger with a doubled rule (form total box).
- Paper on the tray: `0 1px 0 var(--carbon-faint), 0 .6em 0 -.3em var(--carbon-faint)` (a sheet lifted
  a millimetre). Dialog sheets show the copy underneath instead of a shadow: a second sheet's
  outline in `--carbon-line`, offset 7px, as in a carbon-copy form set. No blur shadows, no glass.

## Components

- **Button**: paper fill, carbon text and 2px border. Hover: carbon fill, paper text.
  Focus-visible: 3px carbon outline offset 3px. Pressed: translateY(1px). Disabled: 40 % carbon.
- **Toggle (소리, 느긋하게)**: same button with `aria-pressed`; a ruled check box drawn in CSS shows state.
- **Form table**: 2px outer rule, 1px inner rules in `--carbon-line`; headers in Hi Melody 15–18px.
- **결재란**: 3 columns 담당 / 과장 / 부장, header row 22 % of height. Done boxes carry a blue
  scribbled signature; the box to stamp is circled by a Dokdo marker ellipse.
- **Memo / judgement**: Dokdo, carbon, rotated −2° to 2°, appears where it applies, fades in 120ms.
- **업무 일지**: a carbon copy: carbon text with a 0.6px blur + slight offset double, ruled grid,
  the player's own seal stamped in the 확인 box.

## Imagery

Two photographs (generated, see IMAGES.md): the red-resin seal, cut out to alpha, used over the
tray and standing on the cover; and a scanned sheet of office paper under every document and
dialog. No icon set. Code draws only what is type or form: the seal face carved as SVG paths
(구도담, round), form rules, marker circles and scribbles,
the time rule as a speed ramp, the speed chart on the work log. Favicon is the seal face.
Impressions are generated on canvas per stamp (pressure, partial rim, speckle, smear) in a worker
and multiplied into the paper.

## Motion

- The tray moves continuously along the speed curve (spin-up 0.5 s, glide to a stop at 18:00); the
  stamp drops in 60ms, rests 30ms and lifts in 140ms.
- A slip: one carbon flash over the tray (300 ms, opacity only). No knock, no shake, ever.
- Reduced motion: the same tray, the same seal drop; marker words fade in instead of popping. The
  stepped tray exists only as the opt-in setting 칸칸이 이동.
- Everything stops on pause, blur and hidden tab.
