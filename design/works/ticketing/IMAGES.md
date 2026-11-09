# 광클 — images

Three generated photographs, one per concert (Gemini `gemini-3-pro-image`, 4:5, 2K, one take each,
3 generations of the ~20 budget). Look chosen for the page: crisp digital concert photography (not
film), deep blacks, lit in pink and white so the photo sits directly on the wristband-pink field.
No faces (silhouettes and crowds from behind), no text, no logos, no screens with images.

Checked at full size: ballad clean; arena performers are ten small silhouettes, light sticks are
generic glowing balls; stadium crowd faces are tiny and unreadable, drum kit plausible.

Export: `tools/img_prep.py <in> works/ticketing/img/<name> --widths 1200,700 --q 78` →
`ballad-*.webp` (25 / 11 KB), `idol-*.webp` (107 / 52 KB), `reunion-*.webp` (105 / 46 KB).
The hero shows the photo full height (desktop) or as a 16:10 band (phones), positioned per concert;
the event section reuses the same file scaled 1.6× around the stage, so no second download.

## Prompts

**ballad** (도해솔, 메아리 소극장)
> Concert photograph taken from the middle rows of a small 400-seat theatre during a quiet ballad. A
> lone singer stands at a microphone stand centre stage, seen from far behind the audience so the
> singer is only a dark silhouette. One hard white spotlight from directly above draws a crisp circle
> on the black stage floor. A grand piano in silhouette at the left edge. Soft pink haze in the
> backlight. The backs of audience heads, dark and slightly out of focus, fill the lower third. Sharp
> digital photograph from a mirrorless camera, 35mm lens at f/2, natural concert exposure, deep clean
> blacks, crisp highlights. No visible faces, no text, no logos, no screens.

**idol** (ORBEAT, 메아리 아레나)
> Concert photograph from the back of an indoor arena floor during a big pop show. A sea of raised
> handheld light sticks glowing soft pink fills the lower half of the frame, thousands of them,
> slightly out of focus. Far away the stage is a wall of crisp white beam lights and a pink wash, with
> tiny dancing performer silhouettes. Haze catches the beams. Black arena ceiling with lighting truss.
> Wide 24mm lens, sharp digital photograph, fast shutter, clean deep blacks. No visible faces, no
> text, no logos, no video screens showing images.

**reunion** (청동거울, 메아리 주경기장)
> Concert photograph taken on stage from behind a four-piece rock band playing an open-air stadium at
> night. The musicians are dark silhouettes seen from behind: a guitarist, a bassist, a drummer on a
> riser, and a singer with one arm raised. They face an enormous crowd that fills the stadium bowl,
> holding up thousands of small white phone lights. Pink and white stage lights rake across the crowd
> through light haze. Black night sky. Crisp digital photograph, 24mm lens, deep blacks, no motion
> blur. No visible faces, no text, no logos, no screens.

Everything else on the page (clock, queue, seat maps, stub, barcode, favicon) is type and UI drawn
in code.
