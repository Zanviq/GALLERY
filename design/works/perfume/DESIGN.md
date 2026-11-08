# 담금 DAMGEUM — design system

A fictional Seoul perfume house that steeps every scent for forty days before bottling it by hand.
The site is its homepage (gallery.zanviq.dev/perfume/). Everything below is mirrored as CSS custom
properties at the top of `works/perfume/css/site.css`; pages use the names, never raw values.

Direction was chosen without UXKIN (not connected). It leans on the conventions of independent
perfume houses in general — product as the only image, lots of air, hairline rules, a serif that
does the talking — not on any one site. Nothing is copied.

## 1. Idea

- **Weight and time.** The brand name means "steeping". The page is about liquid that moves slowly
  and settles: heavy notes sink, light ones float. Motion is viscous, never bouncy.
- **One signature.** The hero is a pool of the selected scent, lit like a product shot, with a glass
  bottle hovering over it. Everything else is quiet paper, type and rules.
- **Each scent owns the page.** Choosing a scent re-tints the whole page: liquid, dark ground, paper,
  accent. Four restrained palettes, one structure.

## 2. Color

Two grounds alternate, and both come from the liquid, not from a stock neutral:

- **night** = the deepest tone of the selected liquid, as if looking down into the bottle
  (hero, notes, visit, footer). Visibly coloured, never a generic tinted black.
- **paper** = the colour of light that has passed through the bottle onto white paper
  (collection, atelier, finder).

Every scent defines the same roles; `data-scent` on `<html>` switches them, with a 900ms
transition so the whole page "takes on" the new liquid.

| Role | Use | 유월 Yuwol | 조청 Jocheong (default) | 오미 Omi | 먹 Meok |
|---|---|---|---|---|---|
| `--night` | dark ground | `#18200f` | `#231206` | `#240a10` | `#101215` |
| `--night-2` | raised panel on night | `#222b17` | `#30190a` | `#321019` | `#191c20` |
| `--on-night` | text on night | `#eef1e2` | `#f6ead8` | `#f7e6e6` | `#e9ecef` |
| `--on-night-mute` | secondary text on night | `#b4bb9c` | `#c7ae8f` | `#cba3a8` | `#a7adb4` |
| `--glow` | selected state + focus ring on night | `#cdd78f` | `#f0b85e` | `#eb9fae` | `#bfcad6` |
| `--paper` | light ground | `#e3e7d2` | `#ecdcb6` | `#efdcdc` | `#e0e2e4` |
| `--paper-2` | recessed panel on paper | `#d6dcc2` | `#e2cda3` | `#e6cccd` | `#d3d6d9` |
| `--ink` | text on paper | `#1a2010` | `#2a1708` | `#2a0f15` | `#15181c` |
| `--ink-mute` | secondary text on paper | `#4f573d` | `#6a4a2a` | `#6a4249` | `#4d545c` |
| `--accent` | links + selected state on paper | `#4a5a12` | `#7a3f06` | `#8c1f36` | `#2f3a46` |

Measured contrast (design/works/perfume/contrast.py): body pairs 13–16:1, muted pairs ≥ 5.2:1,
accent on paper ≥ 5.3:1, glow on night ≥ 8.2:1.

Liquid colours (WebGL only, never for text): each scent has `deep / body / light / key light`.
Yuwol is pale celadon, Jocheong deep amber, Omi garnet, Meok carbon ink with silver light.

Rules: no gradients on type, no glow halos, no purple or blue. Accent marks one thing per view.
Text on the liquid sits on the shaded side of the pool plus a soft scrim, checked at ≥ 4.5:1.

## 3. Typography

| Token | Family | Use |
|---|---|---|
| `--f-display` | **Newsreader** (Latin, opsz, roman + italic) → **Hahmlet** (Hangul) | headings, scent names, numerals |
| `--f-text` | **Hahmlet** | body copy, note descriptions |
| `--f-ui` | **IBM Plex Sans KR** | nav, labels, buttons, prices, form fields |

All three are OFL, self-hosted as woff2 subsets of the glyphs the page uses (`fonts/`).
Hahmlet's thin weights give Korean headlines the same hairline contrast as Newsreader's light italic.
Plex is the "label printed on the bottle" voice: small, upright, plain.

Scale (fluid, `clamp`):

| Token | Size | Line | Weight |
|---|---|---|---|
| `--t-hero` | 44 → 104px | 1.04 | 250 |
| `--t-h2` | 34 → 64px | 1.1 | 280 |
| `--t-h3` | 23 → 30px | 1.3 | 350 |
| `--t-lead` | 18 → 21px | 1.75 | 350 |
| `--t-body` | 16.5 → 17px | 1.8 | 400 |
| `--t-ui` | 14px | 1.5 | 400 / 500 |
| `--t-micro` | 12.5px | 1.4 | 500 |

- Korean measure 30–34em. `word-break: keep-all` everywhere; `text-wrap: balance` on headings.
- Numerals in Newsreader italic (`No. 02`, `40일`). No tracked all-caps eyebrows; a section is
  introduced by its heading alone. Latin in caps only in the wordmark.

## 4. Space and layout

- 4px base: `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 24 · `--s-6` 32 · `--s-7` 48 ·
  `--s-8` 64 · `--s-9` 96 · `--s-10` 128 · `--s-11` 192.
- Section padding `--sec`: clamp(96px, 13vw, 192px) vertical.
- Page gutter `--gut`: clamp(16px, 4.5vw, 64px). Max content width 1360px on a 12-column grid.
- Layouts are asymmetric: text blocks start on column 2 or 7, never everything centered.

## 5. Shape and depth

- The brand shape is the bottle's cross-section: a **squircle** (superellipse, n≈4). It is used only
  for things that are vessels — the bottle, the notes cylinder, the liquid swatch dots, the product
  image frames (`--r-vessel`: 28px at desktop, 18px at phone).
- Controls are almost square: `--r-ctl` 2px for buttons, inputs, choice rows.
- No drop shadows in the UI. Depth comes from the rendered glass.
- Rules are rare. Space separates sections; a hairline (`--rule`, ink at 14%) appears only where it
  carries meaning: between rows of a list you compare, and as the graduations on the vessel.

## 6. Components

- **Button primary**: 52px tall, ink fill on paper (on-night fill on night), Plex 14/500. Text says
  what happens; no appended arrows. Hover: fill becomes `--accent` (`--glow` on night) over 240ms.
  Focus: 2px outline in `--accent`/`--glow`, offset 3px. Disabled: 40% opacity, no hover.
- **Button quiet**: text + 1px underline offset 6px; underline thickens on hover.
- **Scent selector**: native radio group, four items: number, Korean name, liquid dot. Arrow keys
  move, selection pours the new scent. Selected: dot fills, a 1px line beneath grows to full width.
- **Choice rows** (finder, booking): radio inputs styled as bordered rows, 56px min height; the
  checked one inverts. Never a 3-column card grid.
- **Inputs**: 52px, 1px ink-mute border, 2px radius, label above in Plex 13px.
- **Nav**: wordmark left, five text links right; on phones one "메뉴" button opens a full-height
  sheet. Transparent over the hero; on paper sections it takes the paper ground.
- **Footer**: night ground, wordmark, in-page links, one plain line about the brand being fictional.

## 7. Imagery and icons

- No photos. Visuals are rendered: the WebGL pool and bottle, stills captured from the same renderer
  (fallback and collection), a canvas-made steeping chart, an SVG map.
- Icons: one inline SVG set, 1.25px stroke, 20px box: arrow, plus, check, pin, clock. No emoji.
- Bottle: thick rounded-square glass, porcelain (백자) cap, a small paper label with the scent number.

## 8. Motion

- Easing `--ease-visc`: cubic-bezier(.22,.7,.12,1). UI 240ms; scent pour 2100ms; layer settle 900ms.
- Only the hero liquid, the notes vessel and state changes move. No fade-in-up on sections.
- `prefers-reduced-motion`: the pool is a still render (no flow, no cursor ripples), scent changes
  cross-fade, the notes vessel shows settled layers with all three notes listed.
- No WebGL: per-scent still images in the hero, CSS layers in the notes vessel.

## 9. Page plan

| # | Section | Ground | Its one job |
|---|---|---|---|
| 1 | Hero: the pool and the bottle | night | Show the product and let the visitor touch it; choose a scent |
| 2 | Notes: three layers settling in a cylinder | night | Explain what the selected scent smells like, in order |
| 3 | Collection: four scents, one preview frame | paper | Compare the four and their prices; pick one |
| 4 | Atelier: forty days, day by day | paper | Make the name and the price believable |
| 5 | Finder: three questions | paper-2 | Help someone who can't choose |
| 6 | Visit: address, hours, booking | night | The one action: book a smelling visit (sold only at the atelier) |
| 7 | Footer | night | Links back, fictional-brand line |

```
HERO (desktop)                                   HERO (phone)
[담금 DAMGEUM]          향 노트 작업실 향찾기 방문   [담금]            [메뉴]
                              ╭─╮                          ╭─╮
                            ┌─────┐                      ┌────┐
마흔 날을                    │     │                      │    │
담가 둔 향                   │  ▒  │  ← pool fills         └────┘
two-line paragraph          └─────┘    the background    마흔 날을 담가 둔 향
                                                         paragraph
No.01 유월  No.02 조청  No.03 오미  No.04 먹               [유월][조청][오미][먹]

NOTES (sticky)                                   COLLECTION
 ┌──────┐  첫 향      볶은 보리, 생강   ← active    ┌───────────┐  No.01 유월 ............ 168,000원
 │ ~~~  │  중간 향    조청, 대추                    │  bottle    │  No.02 조청 ............ 168,000원
 │ ~~~  │  잔향      안식향, 송진                   │  preview   │  No.03 오미 ............ 168,000원
 │ ~~~  │                                          └───────────┘  No.04 먹  ............ 176,000원
 └──────┘ ml graduations
```

Alignment: left-aligned throughout; text columns start on grid column 2 or 7. Nothing centered except
the bottle itself.

## 10. Review against the brief (what changed before coding)

- Dark grounds were generic tinted blacks (#110b07). Now they are the liquid's own deep colour, so
  the page visibly changes with the scent.
- Paper was a cream close to #F4F1EA with an amber accent (the cream + terracotta tell). Now paper is
  the light passed through the liquid, and Jocheong's accent is a dark caramel, not clay.
- Hairlines + zero radius everywhere read as the broadsheet default. Rules now appear only where they
  mean something (list rows, graduations) and the vessel squircle is the one brand shape.
- Buttons had arrows appended; removed. No eyebrow labels; numbers only where the content is a real
  sequence (scent No., days of steeping, finder steps).

## 11. Files and rebuilding

- `works/perfume/js/hero.js` pool sim + shading + bottle; `vessel.js` notes cylinder (raw WebGL1);
  `plate.js` the forty-day plate (canvas 2D); `main.js` UI, finder, booking; `scents.js` copy and palettes.
- `vendor/three.min.js` is three@0.187.0 tree-shaken to the classes hero.js imports
  (`vendor-build/build-three.sh`). Add an export to `vendor-build/three-entry.js` before using a new class.
- Fonts: `subset_fonts.py` (re-run after any copy change; it collects every character in index.html + js).
- Rendered images: `make_stills.sh` (hero stills per scent, bottle shots, thumbnail, OG) via headless Chrome
  using the page's `?capture`, `?capture=bare`, `?capture=bottle`, `?capture=og` modes.
- Review tooling (not deployed): `shot.sh`, `pp-shots.mjs` (puppeteer-core), `hero_contrast.py` (measures
  hero text against the live liquid), `contrast.py`, `tile.py`, `crop.py`, `to_webp.py`.
