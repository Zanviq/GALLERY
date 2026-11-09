# Interaction: 닳다 (works/sculpture)

The page shows; it does not play. There is no script of its own (only the gallery badge,
`/shared/back.js`).

## The one touch: numbers that point both ways

- Every photograph's caption starts with the catalogue number of the work it shows (`6`, `3`...).
  The number is a link to that work's row in 출품작 목록.
- Every row of the list starts with the same number, linking back to the photograph of the work.
  The poster photograph links to row 2.
- The arrival point is marked in the identity green: an 8px green frame round the photograph
  (`.plate:target img`) or a green band on the row (`.row:target`). It stays until another link is
  followed, so the reader can see where they landed.
- Purpose: a catalogue reader moves between plates and the list all the time; here it is one tap.

## States

- Hover: underline thickens / turns green on the numbers; nav links underline.
- Focus: 3px black outline, offset 3px (white in the black footer). Tab order follows the page:
  skip link, museum mark, four section links, poster photo, then numbers in reading order.
- Targets: numbers are small figures with a pseudo-element hit area of at least 44×44px.
- Reduced motion: smooth scrolling is off; nothing else moves anywhere on the page.
- No storage, no forms. The programme says plainly that this fictional page takes no bookings.
