# 담금 — interaction spec

Posture: transient. A visitor stays a few minutes, touches the pool, picks a scent, maybe books.
Peak moment: **choosing a scent pours it into the pool**. End moment: **the booking confirmation**.
Everything else is calm so those two land.

## 1. The pool (hero liquid)

| | |
|---|---|
| Trigger | pointer move / touch drag over the hero; tap or click drops a single ring |
| Rules | a height-field wave simulation (ping-pong targets). Each scent sets `damping`, `spread` (viscous smoothing), `brush` radius, `flow` speed and `steps` per frame. Watery Yuwol rings travel far and crisp; Jocheong bulges slowly and closes up. Strength scales with pointer speed, clamped so a flick never whites out the highlight. |
| Feedback | ripples bend the reflected softbox light and the caustics on the floor; the bottle tilts ≤ 6° toward the pointer (eased, 0.06/frame). |
| Touch | `touch-action: pan-y` on the canvas: vertical swipes still scroll the page, taps and sideways drags stir. |
| Idle | after 2.5 s without input the flow continues alone (slow domain-warped noise). Frame rate halves to ~30 fps while idle and nothing is pouring. |
| Off-screen / hidden tab | render loop stops (IntersectionObserver + `visibilitychange`); resumes on return, time is not advanced while paused. |
| Hint | "표면을 손끝으로 저어 보세요" under the selector; fades out after the first stir and stays gone for the session. |

## 2. Choosing a scent (the pour)

State machine (one per page; hero selector, notes switcher, collection, finder all call `selectScent`):

```
[Settled A] --select B--> [Pouring A→B] --2100ms--> [Settled B]
[Pouring A→B] --select C--> (queue C; current pour hurries to finish within 220ms, the queued pour takes 1000ms) --> [Pouring B→C]
[Pouring A→B] --select A or B--> ignored (already the target / will land there)
```

- Feedback, in order: radio state updates instantly (0 ms) → a ring impulse at the selector's side of the
  pool → the new liquid spreads from that point with a noisy viscous front (shader mix by distance) →
  bottle liquid colour, label and environment cross over in the same 2100 ms → page colour
  variables transition over 900 ms → `aria-live` announces "조청을 골랐습니다. 볶은 보리, 조청, 안식향."
- The notes section, collection preview and URL hash (`#scent=jocheong`, via `history.replaceState`)
  update at the start of the pour, so nothing lags behind the click.
- Keyboard: the selector is a native radio group. Arrow keys move and select (each step pours);
  Tab leaves the group. Focus ring 2px `--glow`.
- Remembered: the last scent is kept in `sessionStorage` (try/catch); a shared link with `#scent=` wins.

## 3. The bottle

- Built in code: rounded-square glass lathe (thick base, superellipse cross-section), inner liquid
  (opaque shader that refracts the pool texture and darkens by path length, so it reads as tinted
  liquid), porcelain cap, paper label drawn on a canvas with the page fonts.
- Idle: slow yaw oscillation ±14° over 14 s and a 1.2% vertical float. Pointer adds tilt.
- During a pour: a 6° slosh on the liquid surface that settles with the scent's viscosity.

## 4. Notes vessel (scroll)

- The section is `400vh` tall with a sticky stage. Scroll progress `p` 0 → 3 drives three pours:
  top (light) pours first and sits at the bottom; heart pours next, falls through and settles under it;
  base pours last, sinks through both and settles at the bottom. Order in the cylinder ends as
  base / heart / top, which is the point: heavy notes last longest.
- Text column: three note blocks; the one being poured is full contrast, others at muted colour.
  Each block is a real heading + paragraph, all in the DOM (screen readers read all three).
- Render on demand: frames only while `p` changes or the stream / interface waves are still settling
  (≤ 1.4 s after the last scroll).
- Keyboard users scrolling with Page Down / Space get the same sequence. Nothing is hidden.

## 5. Finder

```
[Q1] --choose--> (Next enabled) --next--> [Q2] --next--> [Q3] --see result--> [Result]
[Qn] --back--> [Qn-1]  (answers kept)
[Result] --"이 향 맡아 보기"--> selectScent + scroll to hero
[Result] --"다시 고르기"--> [Q1] with answers cleared
```
- Each question is a fieldset of native radios; "다음" is disabled until one is chosen.
- Moving between steps moves focus to the next question's legend (tabindex -1); the result heading
  gets focus and is announced. Progress "질문 2 / 3" is text, not only a bar.
- Ties resolve toward the visitor's first answer.

## 6. Booking (visit)

```
[Empty] --pick day + time--> [Ready] --submit--> [Confirmed]
[Empty/partial] --submit--> [Error: names what's missing, focus on first missing group]
[Confirmed] --"다른 시간 고르기"--> [Ready] (previous choices kept)
```
- Days: the next 8 open days (Tue–Sat) computed from today. Times: 12:00–18:00 hourly; a few slots
  are deterministically "마감" per day so the grid looks real (disabled radios with text, not colour only).
- Nothing is sent anywhere. Confirmed state says so in one plain line.

## 7. Fallbacks

| Situation | Hero | Notes vessel |
|---|---|---|
| Loading (before first frame) | still image of the current scent is the hero background; canvas fades in over 600 ms when the first frame is drawn | CSS layers |
| `prefers-reduced-motion` | one still render per scent change (time frozen, no ripples, no float); colour switch is a 300 ms cross-fade, no pour | settled layers, no stream, all notes at full contrast, no sticky |
| No WebGL / context lost | static image per scent (`img/still-<scent>.webp`), swapped on select | CSS layers coloured per scent |
| Weak device | sim 192², liquid render scale 0.6, DPR ≤ 1.5; if the first 90 frames average > 24 ms, scale drops one step | — |
| `?capture` | intro skipped, hint hidden, fixed time; `?capture=bare` also hides text (used for stills) | — |
