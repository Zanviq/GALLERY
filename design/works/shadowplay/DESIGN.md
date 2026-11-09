# shadowplay · DESIGN.md

종이 그림자극 무대를 공방 청사진(blueprint)으로 그린 인터랙션 작품. 화면 전체가 한 장의 도면이다.
위에는 평면도(위에서 내려다본 무대: 빛, 인형, 레일, 막), 아래에는 같은 축척의 정면도(관객이 보는 흰 종이 막)가
제3각법대로 x축을 맞춰 놓여 있다. 평면도에서 빛과 인형을 움직이면 정면도의 막에 그림자가 생긴다.

Direction note: UXKIN was not connected, so this is not based on compared websites. It is based on the
brief (REGISTRY row 21) and on real drafting conventions: third-angle projection, hidden edges as dashed
lines, construction (projection) rays, dimension lines with values, a parts list above a title block, and
the electrical lamp symbol (circle with an X) for the light.

## Colour

One hue. Prussian blue is the cyanotype ground of a workshop blueprint; white is the drawn line and the
paper screen; the shadows are the same deep blue falling on that paper. Everything else is a tint
(blue mixed with white). No shades, no second hue, no glow. The light is drawn as white line art.

| token | hex | role | contrast |
|---|---|---|---|
| `--blue` | #10335A | sheet ground; shadow colour on the screen (umbra) | white on it 12.8:1 |
| `--blue-06` | #1E3F64 | pressed/hover fill of controls, rail plate fill | decorative |
| `--blue-14` | #315071 | hatching, sheet zone ticks, inactive rail slots | decorative |
| `--blue-30` | #58708C | construction rays and hidden (dashed) lines drawn on the white screen | 5.1:1 on white |
| `--blue-60` | #9FADBD | secondary text and dimension lines on the blue sheet | 5.6:1 on blue |
| `--white` | #FFFFFF | primary lines and text, the paper screen, the light symbol | 12.8:1 on blue |

Penumbra and double shadows produce in-between tints by themselves (a shadow blocked from one of two
lights is 50% blue on white). Those are results of the light model, not extra tokens.

Banned here: amber/warm lamp glow, any glow or blur on dark, gradients.

## Typography

| role | family | size (desktop / phone) | line height |
|---|---|---|---|
| title (h1, title block only) | Moirai One 400 | 52 / 36 px | 1.1 |
| scene caption | Gamja Flower 400 | 30 / 24 px | 1.3 |
| lead line, button labels, parts list names | Gamja Flower 400 | 21 / 20 px | 1.35 |
| secondary notes (keyboard hint, footer) | Gamja Flower 400 | 18 / 17 px | 1.4 |
| canvas annotations (view titles, labels, dimensions) | Gamja Flower 400 | 18 / 15 px | n/a |

Gamja Flower is a hand-lettered face: it plays the draughtsman's pencil notes on the drawing. Its small
x-height means nothing below 15 px. Moirai One appears once, in the title block, like a stencilled
drawing title. Both are OFL with no Reserved Font Name (copyright lines checked) and are subset to the
glyphs on the page and in every caption.

## Spacing and layout

4 px base: 4, 8, 12, 16, 24, 32, 48.

- Desktop (>= 1024 px): a sheet border (double white line) inset 16 px. Left: the drawing (plan above,
  elevation below, sized by a single scale so x lines up). Right column 300–360 px: title block on top,
  then controls, the parts list (the puppet tray), then the footer line. Everything is left aligned.
- Below 1024 px: one column: title block, drawing, caption, controls, parts list, footer.
- World: stage 120 cm wide, screen 60 cm tall, plan depth 52 cm. One px-per-cm scale for both views.

## Shape and depth

Square corners everywhere (drafting). Lines 1.5 px for primary, 1 px for construction, dashed 6/4 for
hidden edges. No box shadows, no radius, no blur. Hatching at 45 degrees for sectioned parts (screen
posts, rail ends, floor).

## Components

- Button: 44 px min height, 1.5 px white outline, Gamja Flower label, transparent. Hover: `--blue-06`
  fill. Pressed (aria-pressed=true): white fill, blue text. Focus: 2 px white outline, 3 px offset.
  Disabled: `--blue-30` outline, `--blue-60` text.
- Parts list row: a toggle button with the puppet drawn from the same polygon data (white outline when
  off stage, solid white when on stage) and a text state, so state is never colour only.
- Title block: ruled cells in white 1 px lines, as on a drawing sheet.
- Canvas focus targets: invisible DOM buttons laid over each light and puppet in the plan; their focus
  ring is the same 2 px white outline.

## Imagery and icons

No photos and no icon set. The puppets are original cut-paper polygons with cut-out holes; icons (rotate,
flip) are drawn in the same line weight as the drawing. The favicon is the lamp symbol over a small
shadow.
