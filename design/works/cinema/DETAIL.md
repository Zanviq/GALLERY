# 점멸: detail pass (BRIEF §0000, 2026-11-14)

Conservative: one of the owner's favourites. The poster, film stills, contact-sheet trailer, the
lit-window blink, fonts (Diphylleia, Jeommyeol Sans) and copy are unchanged. Audited at 360, 390,
768, 1024, 1440 (and 1920 for overflow).

## Found
- **The release spec squeezed at tablet widths.** Two spec columns inside 7/12 of the page left
  each answer about 54px wide at 768: "12세 / 이상 / 관람가. / … / 다룹니 / 다." and
  "제7회 / 늦별독 / 립영화 / 제". The worst careless spot in the five pages.
- `scroll-behavior: smooth` on `html` unconditionally (reduced motion should drop it).
- No `text-wrap` anywhere; section heads 48px at 0 tracking.
- Units and dates split: `12월 2일`, `밤 11시 40분`, `2026년 12월 2일`, `하루 2회`, `두 번`.
- The cut counter ("컷 7 / 36") twitched while scrubbing: the subset has no tabular figures, so
  `font-variant-numeric: tabular-nums` did nothing.
- Phone nav strip ran off the right edge mid-glyph ("출연과 제작진") with no sign it scrolls.
- Focus ring offset 3px (2px on the trailer controls); control colours switched with no easing;
  no way back to the top from the footer.

## Fixed
- Spec is one column under the date below 1280px, two above.
- Smooth scrolling only under `prefers-reduced-motion: no-preference`.
- `text-wrap: balance` on h1–h3, `pretty` on p/dd/li; h2 -0.03em, h3 -0.02em, body -0.01em at 1.75.
  The poster opts out of body tracking so it stays exactly as approved.
- No-break spaces for dates, times, counts and units; time-of-day words stay with their hour.
- Cut number sits in a fixed right-aligned slot (1.25em), so "/ 36" no longer moves.
- Phone nav fades out over its last 48px.
- Focus 2px/2px everywhere; trailer controls ease colour and border (180 ms, expo-out); footer
  "맨 위로" link.

## Left as is
- The blink (dark, lit, dark, lit, once, near the top) runs under reduced motion too: checked.
- Thumbnail and OG not retaken: the first view did not visibly change.
