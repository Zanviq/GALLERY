# 골과 본: design system

Homepage of an invented bespoke shoe workshop in the invented city 숫돌시. Three makers share one
bench on the second floor of 밀랍길 14. The name is the two things they make for every customer before
any shoe exists: a last (골, 구두골) and a pattern (본). The page is written in 합니다체, short and
exact, the way a maker talks across the bench ("발은 오후에 잽니다. 저녁이 가까울수록 조금 붓기
때문입니다.").

Direction: the page is the workshop's two surfaces. Oxblood is leather and the polish rubbed into it;
the bench, the hide and the price board are oxblood. Chalk grey is tailor's chalk and the pattern card;
every place where something is read slowly (the steps, the repair notes, the address) is that card.
White is the chalk line. Nothing else is coloured. The one loud thing is the tracing sheet in the first
screen, which turns into a hide with pattern pieces chalked on it. Everything after it follows the
order a commission really goes: measure, last, fitting shoe, weeks, repairs, price, address.

UXKIN was not connected, so no reference sites were compared. The direction comes from the subject: a
cutting bench, a calf hide, white tailor's chalk, the grey card patterns are cut from, oxblood polish.

## Colour (two oxbloods, chalk grey, white, two greys for small text)

| token | hex | role |
|---|---|---|
| `--polish` | `#3D0C17` | shoe polish. Ground of the header, bench (hero), weeks band, price board, footer. Body text on chalk |
| `--leather` | `#6B1A2A` | the hide. Ground of the hide in the pattern state, primary buttons on chalk, secondary text and line drawings on chalk |
| `--chalk` | `#E3E6E8` | tailor's chalk grey, the pattern card. Ground of the tracing paper and every reading section; text on oxblood |
| `--white` | `#FFFFFF` | chalk lines. Pattern pieces, dimension lines and headlines on oxblood |
| `--dust` | `#B4BBC0` | chalk dust. Secondary text and fine lines on oxblood only |
| `--graphite` | `#5E666B` | pencil grey. Ruler ticks, small notes on chalk only |

Contrast (WCAG 2.x):

| pair | ratio | used for |
|---|---|---|
| white on polish | 16.62 | headlines, chalk lines |
| chalk on polish | 13.26 | body on the bench |
| dust on polish | 8.56 | secondary text on the bench |
| white on leather | 11.63 | button text, hide labels |
| chalk on leather | 9.27 | text on the hide |
| dust on leather | 5.98 | small hide notes |
| polish on chalk | 13.26 | body on paper |
| leather on chalk | 9.27 | secondary text, drawings on paper |
| graphite on chalk | 4.67 | ruler numbers, small notes (never below 13 px) |
| leather on polish | 1.43 | surfaces only, never text; a hide on the bench always has a chalk outline |

No brown, tan, cream, gold or orange anywhere: oxblood is a red, kept dark, and every neutral is a cool
grey. No gradients, no shadows that pretend to be light; the only depth is a 1 px chalk edge.

## Typography

- **Gowun Batang** 400 / 700 (SIL OFL 1.1, Google Fonts, no Reserved Font Name): the voice. Headings,
  body, buttons. A brush-built Batang with a calm stroke, close to a handwritten order card.
- **Golbon Gothic** 400 / 700: a renamed subset of NAVER **NanumBarunGothic** (SIL OFL 1.1).
  "NanumBarunGothic" is a Reserved Font Name, so the subset is renamed in its name table and CSS.
  Data only: measurements, millimetres, weeks, prices, hours, the ruler and the hide labels.
- No Latin face is added; both families carry their own Latin and figures.
- Both subset by `scripts/fonts.py` to the characters in index.html and js/*.js.

Scale (rem at 16 px root; fluid sizes clamp between 360 and 1440):

| step | size | line-height | font | use |
|---|---|---|---|---|
| display | clamp(2.125rem, 4.4vw, 3.875rem) | 1.22 | Batang 700 | h1 on the bench |
| h2 | clamp(1.75rem, 3vw, 2.5rem) | 1.3 | Batang 700 | step titles |
| h3 | 1.3125rem | 1.45 | Batang 700 | sub-heads, piece names |
| body | 1.0625rem | 1.85 | Batang 400 | paragraphs |
| small | 0.9375rem | 1.75 | Batang 400 | notes, form help |
| figure | clamp(1.875rem, 3vw, 2.5rem) | 1 | Gothic 700, tabular | measurement numbers, prices |
| data | 1rem | 1.5 | Gothic 400, tabular | labels, units, weeks, hours |
| micro | 0.8125rem | 1.4 | Gothic 400 | ruler numbers, sheet and hide labels |

Body measure 34rem (about 32 Korean characters). No all-caps, no letter-spaced labels, no eyebrow above
headings. Units are written after the number with a thin space ("258 mm"). Estimated values carry
"약" in front, never a ± sign.

## Spacing and layout

- 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Gutter clamp(16px, 4vw, 56px). Content width 1240 px.
- Section padding clamp(64px, 8vw, 120px).
- Everything left-aligned.
- Bench (hero) ≥ 1024: grid of 5/12 (headline, intro, measurement card) and 7/12 (sheet and controls).
  < 1024: one column; headline, sheet, controls, card.
- Steps (≥ 900): a 12rem left gutter holding the week ("0주", "1–2주") and the maker who does it,
  then the text column, then a line drawing. The week is information, not decoration: the steps are
  a real sequence in time. < 900: gutter becomes one line above the title.
- Weeks band and price board run full width on polish; the steps sit on chalk.

## Shape and depth

- Radius: 2 px on paper (sheet, card), 4 px on buttons and fields. The hide has no box at all: it is
  an irregular outline.
- Lines: chalk lines are 1.5–2 px with a rough SVG filter (feTurbulence + displacement), never a plain
  hairline. Dimension lines use end ticks like a pattern drawing. Stitch lines (4 px dash, 3 px gap)
  appear only where there is a seam or allowance to show.
- No box shadows.

## Components

- **Buttons** (≥ 44 px tall): on polish/leather the primary is a chalk fill with polish text, hover
  white fill. On chalk the primary is a leather fill with white text, hover polish fill. Secondary is
  a 2 px outline in the current text colour; hover fills it lightly (chalk at 10 % on oxblood,
  leather at 8 % on chalk). Quiet is an underlined text button. Disabled: 45 % opacity plus
  `aria-disabled`.
- **Eyelet choices**: radio and toggle groups (sample feet, booking choices) show a ring like a lace
  eyelet before the label; the ring fills when chosen. 44 px rows.
- **Ruler slider**: native range input, track drawn as a ruler with 5 mm ticks, thumb a 6 × 28 px
  chalk bar; the value is printed beside it in Golbon Gothic.
- **Measurement card**: a chalk-grey paper card with a punched hole and string mark at the top, like
  the tag that hangs on a customer's last. Rows of label + figure.
- **Focus**: 3 px outline, offset 3 px; white on oxblood, polish on chalk.
- **Links**: underlined, 1 px, offset 0.2em, current colour; hover thickens to 2 px.
- **Nav**: wordmark left, the seven steps as anchors, one "첫 방문 잡기" link. < 900: steps collapse
  into a `details` list.
- **Footer**: polish ground; workshop line, the fiction note, font licences.

## Imagery

No photographs, no icon set, no emoji. All pictures are line drawings in SVG, drawn the way a maker
draws on the bench: leather lines on chalk, white chalk lines on oxblood. Each drawing shows something
specific (a last with added leather, a fitting shoe with chalk marks, a welted sole in section, the
street to the door). Favicon: the outline of a last seen from below, white chalk on polish.
