# 점멸 — contact-sheet trailer (interaction spec)

Posture: transient. A visitor spends one or two minutes here, so the sheet must be readable at a glance
and usable without instruction: the loupe already sits on frame 1 and the screen already shows it.

## Concept story (usage)

- Exposition: a printed contact sheet of the trailer, 36 frames on six strips, five frames circled in
  white wax pencil. A loupe rests on frame 1. The screen beside it shows frame 1 with its subtitle.
- Rising action: the visitor drags the loupe along a strip. Frames change under it; the screen follows
  cut by cut and the yellow subtitle changes with each shot. The story assembles from subtitles:
  a daughter clearing her late mother's flat, a notebook of circles, the last bus at 11:40.
- Peak: frames 32–34, the window seen from the bus stop: dark, lit, dark. The light switch shot just
  before it explains why. Circled frame 34 says 내일도 켤게요.
- End: title card, release date card, then the fogged end of the roll with a wax-pencil X. The
  transcript row for each shot sits under the screen, so the story can also be read as text.

## Elements

| element | role | notes |
|---|---|---|
| `.sheet` (desktop ≥ 900px) | paper + 6 strip canvases | `role="slider"`, focusable, aria-valuemin 1, max 36 |
| loupe | circle over the sheet, 2.3× magnification | follows the pointer, settles on the nearest frame |
| `.strip-scroll` (< 900px) | the six strips laid end to end | native horizontal scroll, snap to frame centres; same slider role |
| loupe ring (< 900px) | fixed ring at the centre of the scroller | shows which frame is current; no magnification |
| screen | the current frame large + subtitle | canvas (aria-hidden) + DOM subtitle line |
| 이전 / 다음 / 넘겨 보기 | buttons under the screen | 44px |
| 자막 전문 | ordered list of shots, each a button | seeks to the shot's first frame; current shot marked |

## Trigger → rules → feedback

1. **Drag on the sheet** (pointerdown anywhere on the sheet, mouse or touch).
   - Rules: the loupe centre jumps to the pointer (touch: 56px above the finger so the finger does not
     cover what is being read). Current frame = the frame whose cell contains the loupe centre, or the
     nearest cell when the centre is on a gap. Pointer capture keeps the drag alive outside the sheet.
   - Feedback: magnified frames inside the loupe, live. Screen swaps to the new frame the moment the
     index changes (no tween), subtitle swaps with it. Grain on the screen moves while the frame
     changes and settles 0.8s after the last change.
   - Release: loupe glides 160ms to the centre of the current frame (reduced motion: jumps).
2. **Scroll the strip** (< 900px): native scroll (finger, trackpad, wheel, scrollbar).
   - Rules: current frame = frame nearest the scroller centre; `scroll-snap-type: x mandatory`, one
     snap point per frame.
   - Feedback: screen and subtitle update during the scroll, not only at rest.
3. **Keyboard** on the focused sheet / strip: ← ↑ previous frame, → ↓ next, Home frame 1, End frame
   36, PageUp / PageDown one strip (6 frames). Moves the loupe (or scrolls the strip) to that frame.
   `aria-valuetext` = "컷 14 / 36. 빗방울 맺힌 창, 아래로 버스 불빛. 자막: 열한 시 사십 분. 막차가 여기 서요."
4. **Buttons**: 이전 컷 / 다음 컷 step one frame. 넘겨 보기 advances on its own at the trailer's
   pace (picture frames 650ms, title cards 1400ms), becomes 멈춤 while running, stops at frame 36 and
   reads 처음부터 넘겨 보기. Any drag, scroll or key press stops it.
5. **Transcript row**: seeks to the first frame of that shot; on phones the strip scrolls there.

## States

```
[idle on frame n] --drag start--> [dragging] --pointer up--> [settling 160ms] --> [idle on frame m]
[idle] --key / button / row--> [idle on frame m]            (loupe glides; reduced: jumps)
[idle] --넘겨 보기--> [playing] --last frame | any input | off-screen | tab hidden--> [idle]
[any] --resize across 900px--> same frame, other layout
```
Loading: the hero picture renders first; strips render when the sheet comes within one viewport of the
screen; until a strip is drawn its rebate and frame numbers are already visible.
No-JS: the sheet is replaced by a note and the transcript list (plain text) stays readable.

## Motion

- Loupe glide 160ms ease-out; screen frame change is a cut (film does not crossfade inside a shot).
- Hero: on first view the window in the picture blinks twice (on 260ms, off 220ms, on 260ms, off,
  then on) and the subtitle appears. Once only. Reduced motion: picture already lit, subtitle shown.
- Grain on the screen: 12fps, only while frames are changing or playing; stops when the section is
  off-screen or the tab is hidden; never under reduced motion (static grain is baked into frames).
- Reduced motion overall: no glide, no grain movement, no hero blink. Frames step as cuts.

## Edge cases

- Fonts are loaded before any canvas text (stop sign, title cards, edge print) is drawn; frames are
  redrawn if fonts arrive late.
- Resize / DPR change: strips re-rendered at the new size, current frame kept.
- Very narrow (360px): strip frames 132px wide, loupe ring 120px, screen full width.
- Canvas missing: sheet and screen hidden, transcript shown with scene descriptions.
- Storage is not used.
