# Production brief for gallery works (read fully before starting)

Every work in `works/<slug>/` is built by one agent working alone, in parallel with others.
This file holds the rules that apply to all of them. `design/works/REGISTRY.md` holds each work's
concept, palette and fonts, and lists what is already taken.

## 000. The owner's fourth review (2026-11-10, later). Read this first; it refines §00 and §0.

- **The right amount of interaction.** The owner liked the earlier 키보드 (keycaps that click and
  sound), 너울 2027 ("화면의 생동감"), 향수 (a gently moving background), 사뿐 and 부엉재 천문대
  (sound and animation "적당해서"), and 점멸's single blink of a lit window ("깜박거림 하나만으로도
  주는 느낌이 강했다"). Earlier interactions failed because they **hid the information and became
  the main thing**. Aim for: the information reads first, and a moderate, lively touch (motion,
  sound, a hover or click that answers) lets the visitor feel it. Do not strip a page to stills.
- **Reduced motion means calmer, not still.** The owner's Windows has animation effects off, so
  every browser on that machine reports `prefers-reduced-motion: reduce`, and pages that stop all
  motion under it looked dead to the owner (너울's liveliness, 칼퇴 결재's step mode "뚝뚝 끊기는",
  남겨 둔 불's curtain, 색모래 병's still bottle). Under `reduce` keep the signature and ambient
  motion (slow loops, a flicker under 3 per second, a conveyor's continuous movement, sound after
  a user gesture), at the same or a slower speed. Drop only smooth scrolling, parallax,
  scroll-linked motion and large slides or zooms (use a fade instead). Never default a game to a
  step mode; offer it as a setting. Check every capture with motion both on and off.
- **Game tension = speed that rises gradually and smoothly**, with continuous movement. Not extra
  rules, piles or jolts. The previous 칼퇴 결재 flow felt continuous; the revision felt choppy.
- **Generate as few people as possible; centre images on objects.** Small groups and full-body
  shots came out awkward, so 늦깎이 FS was deleted. Show the thing, the tool, the place, the trace
  a person left (an empty chair, a bib on a table, a cup), not the person. No crowds, no groups, no
  full bodies, no faces; avoid hands unless one close-up is essential and checked at full size.
  Exceptions the owner approved: 정면사진관's ID portraits and 점멸's film stills.

## 00. The owner's third review (2026-11-10). Read this first; it adds to §0.

The generated-image direction works: "대체로 이미지와 디자인이 매우 잘 뽑혔다". What the owner liked
and disliked, and what it means for every work from now on:

- **Liked most:** 너울 2027 (`works/festival/`) for its feel, and as homepages 물길
  (`works/startup/`), 사뿐 (`works/quiet-floors/`) and 정면사진관 (`works/idphoto/`). The film
  stills of 점멸 (`works/cinema/`) were singled out as well made. Study these before designing.
- **Deleted for having no clear message:** 겹 리소 인쇄실 and 집채만 한 그림자 ("전달력이 부족하고
  필요가 없어 보인다"). So: **the first view must say what this is, for whom, and why, at a glance.**
  A visitor who reads only the hero must be able to say what the page is selling or announcing.
- **Games need tension** (칼퇴 결재 lacked it): time pressure that is visible, stakes, escalation,
  a cost for mistakes, a final crunch, a result that invites one more round.
- **Interactions need a payoff** (색모래 병 "효과가 별로 없다"): the effect must be striking on the
  first try, not after learning it.
- **Images must match the design, not just be good photos.** 늦깎이 FS's film-look photos clashed with
  the page and read like eerie "spirit photos". Choose the photographic look (film or crisp digital,
  light, colour, grain) for the page's concept. Film grain, faded stock, dim light and motion blur
  are not a default; use them only when the concept is film.
- **Generated images sitting on a page colour must match it exactly or be cut out to alpha.** On the
  home, photos of the joystick and buttons kept their own background and looked pasted on.
- **Always re-take the thumbnail and OG image from the finished page.** The owner checks the home.
- **Think as a designer.** Set the grid first (columns, margins, baseline), then hierarchy, UI and
  UX. When design is the purpose the page need not be practical: a sculpture exhibition poster,
  a type specimen, a manifesto are all welcome. Poster-like and editorial beats app-like.

## 0. The owner's second review (2026-11-09). Read this first; it overrides anything below.

After seeing the first batch, the owner said:

1. **Too much of it is "experience" design.** Most pages were built around an interactive toy. A
   promo page or homepage can simply *show*: a strong poster, good photographs, clear information.
   Interaction is optional and small. Never build a toy just to have one. Games and pieces whose
   category is "인터랙션" keep their interaction, but it must look right (point 2).
2. **Drawings made by assembling shapes in code look AI-made.** SVG/Canvas/CSS pictures of people,
   hands, objects, rooms, animals, products or scenes built from primitives read as AI output, and
   so does 3D (three.js/WebGL renders of products, a stamp, a bottle, a joystick). Do not draw
   pictures with code. Use **generated images** instead (§6: Gemini), then refine, retouch, crop and
   grade them so they belong to the page. Code may still draw what is naturally code: type,
   rules, grids, charts and data diagrams, maps made of lines, UI.
3. **Crammed screens.** A lot of content is fine, but not squeezed in. Give every screen generous
   whitespace and a clear hierarchy; fewer things per view, larger margins, room around images.
4. **The model the owner likes is 너울 2027 (`works/festival/`).** It works like a printed poster:
   one flat, confident colour field, huge display type used as the image, a strict grid, very few
   gimmicks. That is the "designer feel" they want: editorial and poster-like, not app-like.
5. **Homepages should be about things people know and care about, or startups.** Brands, products,
   services and startups with something real to show. Avoid niche shops with little to say.

### Images from Gemini: how to make them not look AI

- Tool: `<scratchpad>/tools/gen_image.py` (key is read from a file; never print, copy or commit it).
  Model `gemini-3-pro-image`. Use `--ref` to keep one product, person or place consistent across
  shots (generate a hero first, then "the same … from another angle / in another setting"), and to
  edit or clean up an image ("remove the extra finger", "make the wall plain").
- Art-direct like a photographer or illustrator, not like a prompt: name the medium (35mm film,
  medium-format colour negative, risograph print, linocut, gouache), the light (overcast window,
  one bare bulb), lens and framing, imperfection (grain, slight blur, off-centre). Avoid "8k,
  ultra detailed, cinematic, hyperrealistic, octane": that is the AI look.
- No text inside images (set all text in HTML). No logos of real brands, no real people or places.
- Inspect every image at full size before using it: hands, faces, eyes, text-like scribbles,
  warped objects, duplicated parts. Fix with an edit pass or crop them out; discard if in doubt.
- Make them belong: crop deliberately (`<scratchpad>/tools/img_prep.py`), grade to the page's
  palette (greyscale, duotone, levels), match grain across the set.
- Export webp at the sizes you need (`img_prep.py` writes 1600/800 by default), set width/height,
  `loading="lazy"` below the fold. Image budget: first view under ~1.5 MB, whole page under ~4 MB.
- Keep provenance: `gen_image.py` appends each prompt to `prompts.jsonl` next to the output; copy
  the final prompts into `design/works/<slug>/IMAGES.md`.
- Budget about 20 generations per work; stop and use what works rather than rolling forever.

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
  새물시, 느릅마루, 종달샘, 빗물터, 솔바위 (laundry); 미리내구, 등사로 (riso);
  물굽이시, 모래뜸 (futsal); 겹뜰시, 나란히마을, 볕뉘로 (quiet-floors); 솔메시, 부엉재 (observatory); 볕드리시, 맞바라기길 (idphoto); 숫돌시, 밀랍길, 숫돌천 (shoemaker); 소리개시, 은막로, 영사실길, 필름통길, 나무의자길 (cinema); 갈래시, 들락여객, 너머들, 옹달내 (lostfound); 모롱시, 모롱역, 너덜샘로, 모롱중앙시장, 모롱초등학교, 모롱시외버스터미널, 모롱동부목욕탕 (sculpture); 높바람시, 마파람시, 달무리, 고요목, 이슬재, 차고지길 (nighttrain); 김오름시, 냄비골길 (ramen); 메아리시, 앞줄티켓 (ticketing); 곧은내시, 곧은내, 남둑길, 북둑길, 시청로, 시민광장, 시청다리, 둑머리다리, 갈대숲다리, 물레다리, 새벽다리 (marathon); 백열극장, 빈터시, 쪽문길, 극단 백열, 극단 낮은지붕, 몸짓모임 아홉걸음 (curtain); 잔물시, 잔물역, 물받이로, 옛 잔물시립 실내수영장, 회전구, 바늘길, 줄눈구, 타일길, 소리골 레코드, 깊은쪽 (record); 사흘 커피 로스터스, 뭉근시, 불땀길, 뭉근시장, 사흘 블렌드 (coffee); 곁방, 곁방 작업실, 이슥, 어둑시, 등갓길 (lamp).
- Font licences: if a family's OFL declares a Reserved Font Name, a subset counts as a modified
  version, so rename the subset family in the font file's name table AND in every CSS/JS/canvas
  reference (laundry did this). This applies to EVERY Nanum family including the Google Fonts builds
  (Nanum Gothic, Myeongjo, Gothic Coding, Brush Script, Pen Script, Barun Gothic, Square*, and
  MaruBuri: NAVER reserves all those names), and to IBM Plex ("Plex"). Copy the licence's real
  copyright line (with its RFN list) into your licence file. Renamer:
  `<scratchpad>/fontenv/Scripts/python.exe -I <scratchpad>/tools/rename_font.py <file> "New Name"`.

## 6. Tools that already exist

- Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe`. The in-app browser pane is often
  hidden and its screenshots lag; use headless Chrome for visual checks.
- puppeteer-core: `<scratchpad>/perfume/pp/node_modules/puppeteer-core`. Capture script you can copy:
  `design/works/perfume/pp-shots.mjs` (viewports, scrolling, clicks, console capture).
  Launch args that work here: `--enable-unsafe-swiftshader --use-angle=swiftshader`.
- Faster captures: `<scratchpad>/tools/cdp.mjs` drives Chrome over CDP with no dependencies
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
