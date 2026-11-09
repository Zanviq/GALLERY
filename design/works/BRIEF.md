# Production brief for gallery works (read fully before starting)

Every work in `works/<slug>/` is built by one agent working alone, in parallel with four others.
This file holds the rules that apply to all of them. `design/works/REGISTRY.md` holds each work's
concept, palette, fonts and signature interaction, and lists what is already taken.

## 1. Where things go

- The site: `works/<slug>/` only, with its own `index.html`. Served at `gallery.zanviq.dev/<slug>/`.
  Every path inside it is relative (`./css/site.css`). The single exception is the gallery badge:
  `<script src="/shared/back.js" defer></script>` (`data-position`, `data-theme` options).
- Also yours: `thumbnails/<slug>.webp` (1200x900, webp q82, a real capture),
  `og/<slug>.png` (1200x630), and `design/works/<slug>/` for notes and build scripts.
- Scratch files: `<scratchpad>/<slug>/`. Never write anywhere else in the repo. Never run git.
- No build step at runtime: vanilla HTML/CSS/JS (ES modules are fine). Vendored libraries go in
  `works/<slug>/vendor/` with their licence. No CDN or other network request at runtime.
- Local server: `http://127.0.0.1:8000/<slug>/` (already running; `python tools/serve.py` if not).
- Budget: first view under ~1.2 MB uncompressed, fonts subset to the glyphs used.

## 2. What the owner means by "AI 티" (this is the main quality bar)

The owner reviewed the first four works and said they still look AI-made. In their words:

- **Colour is the biggest giveaway.** The model has a palette it likes and keeps returning to it.
  Leave it. But do not pick colours at random either: choose, as a designer would, the palette that
  makes this subject read best and gives the interaction its strongest effect. Every palette needs a
  reason that comes from the subject (a material, a tool, a sign, a print process, a uniform).
- **3D made with the usual tool and left as-is looks AI.** The keyboard and perfume sites used
  Three.js with default physical materials and no post-processing, so they read as stock product
  renders. If a work uses 3D, it must be restyled into the work's own look (custom shader, toon ramp
  + ink outlines, halftone, ordered dither, hatching, posterisation, print grain...). Prefer other
  techniques unless 3D is truly the point.
- **Fonts must not be similar between works.** Each work has its own Korean family (REGISTRY).

### Banned palettes (these are the model's defaults)
- cream / ivory / beige / "paper" / sand backgrounds; warm near-black "ink" (#1a1714 family)
- orange, vermilion, terracotta, rust, amber, honey, mustard, gold as accents or grounds
- sage / olive with cream; navy + orange; teal + coral
- purple / indigo / violet, blue-to-purple gradients, gradient meshes, blurred colour blobs
- neon cyan/magenta glows on dark; "muted earthy" everything
Use the palette given in REGISTRY. You may tune hex values for contrast; keep the idea and the reason.

### Banned fonts
Inter, Pretendard, Roboto, Poppins, Montserrat, Manrope, DM Sans, Space Grotesk, Plus Jakarta Sans,
Outfit, Syne, Clash Display, Satoshi, Geist, Playfair Display, Fraunces, Instrument Serif, Cormorant,
Bebas Neue, and every family already used in another work (see REGISTRY "Fonts in use").
Use the Korean family assigned to you. A Latin face only if the Korean family's Latin is weak; it must
not be banned or already used; report it.

### Banned layouts and tropes
- centred hero + two buttons; eyebrow caps labels over headings; "01 / 02" section numbers
- uniform rounded 3-column feature cards; bento grids; logo walls; testimonial cards with avatars;
  pricing tables with a "most popular" ribbon; stat counters that count up
- glassmorphism, grain overlay on everything, hairline-rule "editorial" layouts, oversized italic serif
  headline + mono labels combo, fade-in-up on every block, emoji as icons, generic icon sets everywhere
- the same section order as every landing page (hero, features, about, FAQ, contact)
- signature mechanisms already used (do not reuse as your main idea): pinned scrollytelling with a
  sticky canvas, kinetic variable-font lineup, WebGL liquid hero, product colourway configurator,
  "sound on" dock, timetable + ticket stubs, booking form as the centrepiece
- template copy ("Welcome", "Discover", "Explore", "혁신적인", "최고의 경험") and vague claims

## 3. Content rules

- Everything is fictional: brand, people, prices, numbers. Web-search the brand name and key names
  so they don't collide with a real business. Footer line: "가상 ○○입니다. zanviq gallery 작품."
- No real addresses, neighbourhoods (동/읍/리), stations, landmarks or venues. Invent the place, and
  put a small note right beside every address: "가상 서비스입니다. 실제 주소가 아닙니다."
  (해요체 sites: "가상 서비스예요. 실제 주소가 아니에요."). City-level words (서울) and broad regions are OK.
- No real people, brands, logos, trademarks; no copyrighted text, music or images.
- Korean copy written like a real business would write it, one consistent register, concrete facts.
- Games must be original designs; a genre is fine, a recreation of a specific game is not.
- Forms never send anything; say so in the UI. No real payment or personal data fields.

## 4. Platform

- Each work is marked desktop+mobile, mobile-first, or mobile-only in REGISTRY.
- Mobile-only works: the experience is a phone-width column (max ~430px). On wide screens show that
  column centred with a side note ("휴대폰에서 보는 페이지예요") and a QR code for
  `https://gallery.zanviq.dev/<slug>/` (generate it at build time as an inline SVG; no runtime lib).
  The column must still be fully usable with a mouse.
- Touch and pointer both work; tap targets at least 44px; no hover-only features.

## 5. Quality gates (all must pass before you report)

- Zero console errors and warnings from your code, no failed requests, in normal,
  `prefers-reduced-motion: reduce`, and (if WebGL/canvas) the fallback path.
- No horizontal scroll at 360, 390, 768, 1024, 1440, 1920 widths; nothing clipped or overlapping.
- Keyboard: logical tab order, visible focus, every interaction has a keyboard path or a clear
  alternative. Text contrast at least 4.5:1 (3:1 for large text and UI parts).
- Reduced motion: no autoplaying motion; the page still explains itself.
- Animation loops pause when off-screen or when the tab is hidden.
- `localStorage`/`sessionStorage` wrapped in try/catch; the page works without them.
- Font check: every character on the page (HTML + JS strings) exists in the subset fonts.
- Works at `/<slug>/` and `/works/<slug>/`.
- Look at your own phone captures at 2x zoom before reporting. A past work passed every script
  check but had a margin label sitting on top of the first letter of a line at 390px wide.
- Each work invents its own town/place names. Already taken: 여울시, 초롱골, 돋보기길 (optician);
  새물시, 느릅마루, 종달샘, 빗물터, 솔바위 (laundry); 미리내구, 등사로 (riso).
- Font licences: if a family's OFL declares a Reserved Font Name (NAVER's NanumSquare/Round/Neo,
  some foundry builds), a subset counts as a modified version, so rename the subset family in the
  font file and CSS (laundry did this). Google Fonts builds usually have no RFN; check the OFL text.

## 6. Tools that already exist

- Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe`. The in-app browser pane is often
  hidden and its screenshots lag; use headless Chrome for visual checks.
- puppeteer-core: `<scratchpad>/perfume/pp/node_modules/puppeteer-core`. Capture script you can copy:
  `design/works/perfume/pp-shots.mjs` (viewports, scrolling, clicks, console capture).
  Launch args that work here: `--enable-unsafe-swiftshader --use-angle=swiftshader`.
- Faster captures: `design/works/jamo/scripts/cdp.mjs` drives Chrome over CDP with no dependencies
  (about 10 s a run here, against about 30 s just to load puppeteer-core). Copy it into your own
  `design/works/<slug>/scripts/` and adapt.
- Python with fontTools + brotli: `<scratchpad>/fontenv/Scripts/python.exe`.
- Google Fonts subset download by text: see `design/works/startup/scripts/fonts.py`.
- Run Python with `-I`. Multi-line `python -c` breaks in this shell: write a script file instead.

## 7. Process

Work autonomously; do not stop to ask. Use these skills in order, applying what they find without
waiting for approval: frontend-design, website-design:web-design-system (write
`design/works/<slug>/DESIGN.md`), design-skills:interaction-design (`INTERACTION.md`),
anthropic-skills:canvas-design (key visual / favicon / philosophy note), design:ux-copy,
design-skills:design-elevation, design:accessibility-review, website-design:web-review (fix every
must-fix and should-fix). Homepages and promo pages also start with website-design:landing-page.
Before reporting, compare your result once more against section 2 with fresh eyes and fix what
still looks like a default.
The machine runs five agents and their headless Chrome at once, so it is slow: keep capture rounds
lean (one viewport while iterating, the full set once at the end) and avoid PIL/Python work in tight
loops. Expect a command to take minutes; wait for it rather than starting duplicates.

## 8. Report (keep it short and factual)

1. What it is, and the signature interaction in two or three sentences.
2. Palette with hex values and the reason; fonts (Korean + Latin if any) with licence.
3. Files and total size; thumbnail and OG produced.
4. The `data/works.json` entry, e.g.
   `{"slug":"x","title":"…","type":"internal","url":"x/","tags":[…],"thumbnail":"thumbnails/x.webp","year":2026}`
   Tags from: landing, promo, office, game, interaction, mobile, canvas, svg, webgl, 3d, audio,
   typography, animation, physics, brand, demo.
5. What you could not verify, honestly.
