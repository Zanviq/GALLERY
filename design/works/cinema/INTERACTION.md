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
   - Release: loupe glides 160ms to the centre of the current frame (reduced motion too).
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
[idle] --key / button / row--> [idle on frame m]            (loupe glides; reduced: glides one frame, fades in for longer seeks)
[idle] --넘겨 보기--> [playing] --last frame | any input | off-screen | tab hidden--> [idle]
[any] --resize across 900px--> same frame, other layout
```
Loading: the poster is preloaded and shown lit straight away. Frames are crops of photographs
(revision 2026-11-09): when the trailer comes within 600px the sheet asks for every still at 400px
(about 100 KB in all); until one arrives its frame is a dark cell inside the drawn rebate. The screen
and loupe ask for the size that covers them (800 or 1600) and show the smaller one meanwhile; the next
shots are prefetched at screen size.
No-JS: the sheet is replaced by a note and the transcript list (plain text) stays readable.

## Motion

- Loupe glide 160ms ease-out; screen frame change is a cut (film does not crossfade inside a shot).
- Poster: on first view, once the dark version has decoded and the page is still at the top, the
  lit window goes dark (900ms), then on 260ms, off 220ms, on. Once only. Same under reduced motion
  (at most three changes in any second, one small window: under the 3-flashes-per-second limit).
- Grain on the screen: 12fps overlay, only while frames are changing or playing; stops when the
  section is off-screen or the tab is hidden. Reduced motion: 8fps.
- Reduced motion overall (revised 2026-11-10, BRIEF §000 "calmer, not still"; the owner's machine has
  animation effects off and singled out the blink): the blink, the grain, the one-frame loupe glide
  and the small transcript transitions stay. Dropped: smooth scrolling (page and phone strip) and the
  loupe's long slide across the sheet on a seek or a new strip, which becomes a 200ms fade-in at the
  new frame.

## Edge cases

- Fonts are loaded before any canvas text (title cards, edge print, roll note) is drawn; the sheet is
  redrawn whenever a still arrives.
- Resize / DPR change: strips re-rendered at the new size, current frame kept.
- Very narrow (360px): strip frames 132px wide, loupe ring 120px, screen full width.
- Canvas missing: sheet and screen hidden, transcript shown with scene descriptions (the transcript
  is a closed disclosure, "예고편 자막 전문", one click or Enter away).
- Storage is not used.
