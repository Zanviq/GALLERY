# 정면사진관: detail pass (BRIEF §0000, 2026-11-14)

Audited at 360, 390, 768, 1024 and 1440 (line breaks of every heading, lead and caption; tracking;
spacing; control states). Portraits, layout, colours and the sheet are unchanged.

## Found
- Text face was Noto Sans KR, the most typical AI default.
- Tracking flat: body 0, sans heads 0, Song Myung display only -0.01/-0.02 at 40–280 px.
- No `text-wrap` anywhere. Breaks seen: "두 벌(95, 105) / 은" (particle alone after a bracket, 360),
  "(여권, 주민등록증, 비자) / 에" (360/390), "다섯 / 분", "취업용 / 반명함" in the hero lead.
- Numbers and units joined by plain spaces: "3.5 × 4.5 cm", "9만 2천 명", "300 dpi", "약 280 m".
- `tabular-nums` set on spec lines, but no face on the page had tabular figures to switch to.
- Focus ring 3 px / 3 px offset; buttons had no pressed or disabled state and no transitions.
- Copy: "증명사진은 당신을 알아보려고 쓰는 사진" (translated tone), "같은 배경지, 같은 조명, 같은 값"
  (slogan rhythm, no detail).
- No way back to the top from the footer of a long page.

## Fixed
- Text face → NanumSquare Neo, subset and renamed **Jeongmyeon Sans** (NAVER reserves Nanum names),
  three weights cut from the variable font (Regular 300 / 400 / Bold 500 → CSS 400/500/700), with a
  real `tnum` feature, a no-break space and a word joiner added. Song Myung stays as display face.
  Licence: `works/idphoto/fonts/OFL-JeongmyeonSans.txt`. Build: `scripts/fonts.py`.
- Tracking scale: hero -0.04, section titles -0.035, format and tip names -0.03, store names and
  prices -0.02/-0.025, sans h3 -0.025, lead -0.015/-0.02, body -0.01. Headings `balance`, text
  `pretty`, body line height 1.7.
- 48 text nodes given `&nbsp;` between number and unit/counter; `&#x2060;` after the bracket in
  "(12:30–13:30)과"; hero binds "취업용 반명함" and "손에 쥐기까지".
- Copy: ready lead "95와 105 치수의 검은 재킷"; clothes tip reordered so no particle follows a
  bracket; retouch lead "창구에서 사진과 얼굴을 번갈아 보며 같은 사람인지 확인하는 사진";
  stores lead "하늘색 배경지에 얼굴 조명 하나, 배경 조명 하나". Facts, prices, hours unchanged.
- Tokens: one easing `cubic-bezier(.16,1,.3,1)`, 180 ms colour/transform transitions; buttons and
  menu get `:active` and `:disabled`; focus ring 2 px / 2 px.
- Guide labels ("3.40 cm") on phones under 480 px set at 12 px so they sit inside the 16 px gutter
  (the wider face had pushed them to 6 px from the edge).
- Footer: "맨 위로" link; font credit updated.
- Thumbnail and OG retaken (the first view's text face changed); `og.html` uses the new face.
