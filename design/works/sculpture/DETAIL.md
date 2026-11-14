# 닳다: detail pass (BRIEF §0000, 2026-11-14)

Audited at 360, 390, 768, 1024, 1440 (and 1920 for overflow). Noto Serif KR stays: its 200 vs 900
contrast (닳 vs 다) is the concept. Layout, green, photos and copy are unchanged apart from below.

## Found
- Tracking -0.01em on 48px section heads and 64px artist line; nothing on h3s; body 1.8.
- Deck ended on an orphan "여섯 점." at 1440 and 1920, and broke "새 / 돌을" at 360.
- "워크숍 〈닳은 / 자리 찾기〉" split inside the title brackets at 1024 and 1440.
- Separator middots with spaces (`미술관 강당 · 80명 · 사전 신청`, `12.5 · 12.19`) could start a
  line with "·"; `1·2전시실` could break at the dot.
- Dimensions `16 × 96 × 26` could break between figures; `2021년 3월`, `1월 1일` could split.
- Focus ring 3px/3px; no hover/press transitions; no way back to the top from the footer.

## Fixed
- Tracking tokens: heads -0.035em (section titles, artist, bio name, about lead), small heads
  -0.025em (list title, works, programme names), body -0.01em at 1.75. Grotesk figures reset to 0.
- `text-wrap: balance` on h1–h3 and the deck, `pretty` on paragraphs.
- No-break spaces in dimensions, dates, counts and "새 돌을"; the workshop title is kept whole so it
  breaks as "워크숍 / 〈닳은 자리 찾기〉". Spaced middots keep the dot with the word before;
  `1·2` has word joiners.
- `tabular-nums` only in the works list (years, sizes, depths line up). Tried on hours too, but
  Schibsted's tabular 1 and colon open gaps ("10 : 00"), so running text keeps proportional figures.
- Focus 2px/2px; number links ease their underline colour (180 ms, expo-out) and turn green when
  pressed; footer "맨 위로" link (44px target). Thumbnail and OG retaken (artist tracking and deck
  breaks changed in the first view).

## Left as is
- "〈셋째 단〉, 2021": the full-width bracket leaves a gap before the comma; the subset has no
  `halt`/`chws` feature to close it, and the label convention is right.
- No motion: a printed exhibition poster, approved still.
