# 갈래터미널 유실물 보관소 (lostfound) — design system

A logic game set in the lost-property room on the second floor of 갈래터미널, the bus terminal of an
invented city (갈래시) run by an invented bus company (들락여객). The player works the counter: reads
paper tags, listens to the people in line, checks the desk notes, and ties each tag to its owner.

No UXKIN references were used (the tool is not connected here). The direction comes from the room
itself: steel lockers, white paper luggage tags on cotton string, a marker pen, and the fluorescent
green "찾아감" tags that some offices clip on when an item has gone home.

## Colour (tokens in `works/lostfound/css/site.css` `:root`)

| token | hex | role |
|---|---|---|
| `--steel` | `#5B6770` | page ground: the locker wall. White text only on it (5.80:1). |
| `--steel-deep` | `#47525A` | top bar, case drawer, locker seams and shadows (white text 8.01:1). |
| `--steel-lite` | `#76828B` | louvre slits, tag eyelets, pressed ridges. Decoration and UI parts only. |
| `--tag` | `#FFFFFF` | every piece of paper: tags, queue tickets, memo sheets, the grid. |
| `--marker` | `#171B1F` | a cool black for all writing on paper (17.3:1 on white). |
| `--pencil` | `#5F6970` | secondary text on paper, automatic X marks (5.61:1 on white). |
| `--rule` | `#AEB6BC` | grid lines and memo-paper lines (decorative). |
| `--shade` | `#EEF1F3` | shaded paper: grid headers, the selected row/column (marker 15.3:1). |
| `--glow` | `#39D98A` | fluorescent tag green, only for confirmed matches and solved cases. Marker text on it 9.45:1; as an edge on steel 3.17:1. |

Rules: no other hue appears. Item colours (노란 우산, 빨간 장갑) are written in words on the tags, the
way staff write them, never painted. Green never marks a tentative pairing; a tied but unchecked tag
stays white. Errors are said in words, not in a warning colour.
Contrast for every pair is checked by `scripts/contrast.py`.

## Typography

- **Poor Story** (Yoon Design, OFL, no Reserved Font Name): the interface and what visitors say at the
  counter. Body 17px/1.55, small 15px/1.45, buttons 17px, case title 30px/1.2 (desktop 38px).
- **Kkoripyo Pen** (renamed subset of Nanum Pen Script, Sandoll/NAVER, OFL with Reserved Font Names
  "Nanum", "NanumPen"…, so the subset carries its own name): everything written by hand by staff —
  tags, desk notes, marks in the grid, the handover line on each case. Never below 22px; tag item
  names 30px, tag details 22px, note text 24px/1.3.
- No Latin face. Numbers on queue tickets use Poor Story at 40px.
- Line length: statements and notes stay under ~34 Korean characters per line on desktop.

## Spacing and shape

- 4px base: 4, 8, 12, 16, 24, 32, 48. Page gutter 16px on phones, 24px from 768px, 32px from 1180px.
- Shapes come from the objects, not one radius: tags have two clipped corners on the eyelet end and a
  6px eyelet ring; queue tickets have a zig-zag tear edge; memo sheets are square with a 2px tape strip;
  buttons are pressed-steel plates with a 3px radius. No soft drop shadows: depth is a 2px steel-deep
  offset under paper, like paper resting on a shelf.

## Components

- **Tag** (`.tag`): white luggage tag, eyelet on the end that faces the counter, marker sketch of the
  item, number + name in large handwriting, details in smaller handwriting. In cross cases the tag has
  blank lines for 습득 장소 / 시각 that fill in as the grid settles them. Confirmed: the whole tag turns
  `--glow`.
- **String**: a 2px white cotton string from the eyelet. Untied it hangs as a short loop. Tied it runs
  to the visitor's clip with a sag. Confirmed it turns green.
- **Queue ticket** (`.ticket`): thermal-paper ticket with the queue number, the name, and a steel clip
  on the side where strings tie.
- **Statement** (`.say`): what a visitor said, in Poor Story, with the ticket number beside it.
- **Desk note** (`.note`): memo sheet with ruled lines and a tape strip, handwritten, with a heading
  such as 전화 메모 or 습득 기록.
- **Grid** (`.grid`): white sheet, marker O and X drawn as strokes, automatic X in `--pencil`.
- **Buttons**: steel plates (`.plate`) with white Poor Story text; the primary action (돌려드리기) is a
  white paper plate with marker text. Focus: 3px white outline on steel, 3px marker outline on paper.

## Imagery

Item sketches are inline SVG marker drawings made for this game (round caps, 2.4px strokes, no fill,
a little wobble). No icon set, no photos. The favicon is a white tag with a green string.

## Layout

- From 1180px: the board (tags | strings | tickets), actions, hints and the grid on the left; the
  clues in a sticky 400px column on the right. Tags are capped at 460px so the strings have room.
- Below 1180px everything stacks: case, board, actions, hint, clues, grid.
- Phones (under 720px): the board keeps two columns (tags 1fr, tickets 100–112px) with a 28px string
  gap; the four actions sit in a fixed steel bar at the bottom. On phones and touch screens a cross
  case shows one grid block at a time through a block picker, so every cell stays 44px.
- The page ground is a locker wall: an SVG tile with door seams, vent slots and a handle.
