# Prompts for the camera work (kept here so they can be copied into IMAGES.md).
CAM = ("an original instant film camera that does not resemble any existing brand or model. "
       "The camera is an upright rectangular block, taller than wide (about 10 cm wide, 14 cm tall, 6 cm deep), "
       "flat front and flat sides, small rounded corners of about 8 mm radius, made of smooth matte lemon-yellow plastic, "
       "a clean cool lemon yellow like #FFE14D (not mustard, not gold, not orange). Front face: a large round black lens barrel, "
       "about 6 cm across, protruding 1.5 cm, centred horizontally in the upper half, with a thin satin black ring and dark glass "
       "with a soft reflection; above the lens on the left, a small horizontal rectangular flash window with a frosted milky-white "
       "ribbed cover; in the top right corner a small square black viewfinder window; on the lower right of the front face a large "
       "round flat black shutter button about 2.4 cm across, slightly raised; the bottom 2 cm of the body is a matte black band "
       "wrapping all the way around. No text, no logo, no numbers, no symbols, no markings anywhere on the camera.")

PROMPTS = {
    'cam-hero2': ("Edit this photograph: remove the dark grey area at the top right so that the same lemon-yellow paper backdrop "
                  "continues smoothly across the whole background, with the same soft light falloff. Keep the camera, its shadow, "
                  "the light and the framing exactly as they are."),
    'cam-front': ("Studio product photograph of the same camera exactly as in the reference (same body, lens, flash window, "
                  "viewfinder, shutter button and black base band, no text, no logo). Seen perfectly straight from the front, the lens "
                  "of the photographing camera at the height of the camera's lens, so the bottom edge of the black band is a straight "
                  "horizontal line and the sides are not visible. The camera floats in the air in the centre of the frame against a "
                  "seamless pure black background: no surface, no shadow, no reflection under it. A large soft light from the upper left "
                  "and a thin soft rim light along its outline keep the black lens barrel and the black band separate from the black "
                  "background. Generous black space around the camera, especially below it. Crisp, natural, true colours."),
    'cam-trio': ("Studio product photograph of three of the same camera exactly as in the reference (same body, lens, flash window, "
                 "viewfinder, shutter button and black base band, no text, no logo), standing side by side in a straight row with a "
                 "hand's width between them on the same seamless lemon-yellow paper. Left: the lemon-yellow body as in the reference. "
                 "Middle: an all matte black body with the black band. Right: a matte pure cool white body (not cream, not ivory) with "
                 "the black band. All three face the camera at the same slight three-quarter angle from the front-left, slightly from "
                 "above. Same soft light from the upper left, soft shadows to the right. Calm empty yellow paper above them. "
                 "Medium-format digital camera, crisp, natural, true colours."),
    'film': ("Studio photograph from directly above, on seamless lemon-yellow paper the same colour as in the reference. "
             "A film pack for this instant camera: a flat matte black plastic cartridge, about 9 by 11 cm and 1.5 cm thick, with a "
             "rectangular window on its face, lying at a slight angle; beside it five unexposed instant prints fanned out slightly, "
             "each 76 by 102 mm with a plain white border that is thicker at the bottom and a dark grey-green undeveloped image area. "
             "No text, no logo, no numbers, no arrows, no markings on anything. Soft light from the upper left, soft small shadows. "
             "Crisp, natural, true colours, generous empty paper around the objects."),
    'cam-back': ("Studio product photograph of the same camera exactly as in the reference (same lemon-yellow body, same "
                 "black base band, same proportions), now seen from the back at a three-quarter angle from the back-right, "
                 "slightly from above, standing on the same seamless lemon-yellow paper. The whole back is a flat lemon-yellow "
                 "film door with a thin seam around its edge and a small black sliding latch on the right side. Near the top "
                 "right of the back, a small square black rubber viewfinder eyepiece. Below it, a small round black dial with fine "
                 "knurling on its edge and three tiny raised dots beside it, and a small black two-position slide switch. On the right "
                 "side face, a small USB-C port. No text, no letters, no numbers, no symbols, no icons, no logo anywhere. One large soft "
                 "light from the upper left, a soft natural shadow on the paper. Medium-format digital camera, 100mm lens, crisp, "
                 "natural, true colours. The camera centred with generous empty yellow paper all around it."),
    'cam-hero': ("Studio product photograph of " + CAM +
                 " The camera stands on a seamless sheet of lemon-yellow paper of the same colour that curves up to form the background, "
                 "so the camera is tone on tone with the backdrop. Seen from the front-left at a three-quarter angle, slightly from above, "
                 "so its left side is visible. One large soft light from the upper left, a soft natural shadow falling to the right on the paper. "
                 "Medium-format digital camera, 100mm lens, crisp but natural, true colours, real plastic with faint moulding seams, "
                 "not glossy, not rendered. The camera centred with generous empty yellow paper all around it."),
}
PRINT_STYLE = (" A full-bleed photograph that fills the entire frame edge to edge. Photographed with a simple plastic instant camera with a fixed wide-normal lens, as it looks on the developed "
               "instant print (image area only, no white border, no frame, no print edge): slightly soft corners, gentle highlight roll-off, "
               "rich but natural colours, very fine grain, a faint vignette. No people, no hands, no animals, no text, no signs, no letters, "
               "no logos, no numbers anywhere.")
PRINTS = {
    'p-rooftop': "A blue plastic washbasin full of water on a green-painted concrete rooftop in Korea, half a watermelon floating in it, a coiled garden hose beside it, hard bright afternoon summer sun and crisp shadows, seen from standing height.",
    'p-cake': "A small round strawberry cream cake with one lit thin candle on a plain kitchen table at night, lit by the camera's direct on-camera flash: bright frontal light, hard small shadow behind, the room behind falling off into darkness.",
    'p-lighthouse': "A small red lighthouse at the end of a long concrete breakwater lined with grey concrete tetrapods, calm blue sea, clear sky, bright late morning light, seen from along the breakwater.",
    'p-gate': "A sky-blue painted steel gate set in a white-washed alley wall, a white styrofoam box with green chili pepper plants in front of it on the ground, warm afternoon sun casting the shadow of an unseen wire across the wall.",
    'p-tangerine': "A shallow woven bamboo basket of tangerines with a few green leaves, on a thick quilted floor blanket with a small faded flower pattern, beside a window, soft winter morning light.",
    'p-snow': "A red plastic stool covered with a soft cap of fresh snow, standing alone in a small snowy yard against a grey brick wall, quiet overcast winter light.",
    'p-laundry': "White shirts and white towels drying on a thin clothes line on a rooftop, pegged with wooden clothes pegs, against a deep clear blue sky, a light breeze moving them, bright midday sun.",
    'p-ramyeon': "A dented golden aluminium pot of ramyeon noodles on a small folding table at night, the pot lid upside down beside it used as a plate with a few noodles on it, wooden chopsticks resting across the pot, lit by the camera's direct on-camera flash, the background falling off into darkness.",
}
for k, v in PRINTS.items():
    PROMPTS[k] = v + PRINT_STYLE

if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print(PROMPTS[sys.argv[1]])
