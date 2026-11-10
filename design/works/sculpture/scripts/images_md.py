"""Write design/works/sculpture/IMAGES.md from the scratch prompts.jsonl (which image file each prompt made).

    python -I design/works/sculpture/scripts/images_md.py <scratch>/sculpture/gen/prompts.jsonl
Note: the "Objects instead of people (2026-11-10)" section of IMAGES.md was appended separately
(from <scratch>/people-a/prompts.jsonl); a re-run of this script drops it.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'design' / 'works' / 'sculpture' / 'IMAGES.md'

USED = {
    'g01-step.jpg': ('(base for step, not used directly)', 'first pass of 〈셋째 단〉; the hollow read as a basin'),
    'g02-step-edit.jpg': ('img/step-*.webp (poster), img/stepclose-*.webp (plate 2, crop 180,1120,1680,2120)', 'edit of g01: the wear made into a stair saddle'),
    'g03-bench.jpg': ('img/bench-*.webp (16:9 crop)', '〈대합실 의자〉'),
    'g04-exit.jpg': ('img/exit-*.webp (full bleed)', '〈2번 출구, 열네 단〉'),
    'g05-bath.jpg': ('img/bath-*.webp (4:3 crop)', '〈탕 가장자리〉'),
    'g06-counter.jpg': ('img/counter-*.webp', '〈매표 창구〉'),
    'g07-threshold.jpg': ('(discarded)', 'too close to the step block; replaced by g16'),
    'g08-detail.jpg': ('img/detail-*.webp', 'surface detail of 〈셋째 단〉'),
    'g09-visitor.jpg': ('(base, discarded)', 'the model blurred the visitor\'s face; fixed in g13'),
    'g10-studio.jpg': ('replaced 2026-11-10 by img/workshop-*.webp (people-a/sc-studio.jpg)', 'the artist grinding in the studio'),
    'g11-glass.jpg': ('img/glass-*.webp', 'crushed bottle glass, sorted'),
    'g12-room.jpg': ('(base, discarded)', 'rubbings read like letters; fixed in g14'),
    'g13-visitor-edit.jpg': ('replaced 2026-11-10 by img/line-*.webp (people-a/sc-line.jpg)', 'edit of g09: blur removed, head turned away'),
    'g14-room-edit.jpg': ('img/room-*.webp (full bleed)', 'edit of g12: white frames, oval worn areas only'),
    'g15-survey.jpg': ('replaced 2026-11-10 by img/stair-*.webp (people-a/sc-survey3.jpg)', 'the artist measuring a worn market stair'),
    'g16-threshold.jpg': ('img/threshold-*.webp', '〈뒷문 문턱〉, second attempt'),
}

lines = [
    '# Images: 닳다 (works/sculpture)',
    '',
    'All photographs are generated with Gemini (`gemini-3-pro-image`, 2K) through',
    '`<scratchpad>/tools/gen_image.py`, then cropped and exported to webp with `tools/img_prep.py`',
    '(q76, widths listed in index.html). No text, logos or real places in any image. 16 generations',
    'in total, including three edit passes and two discards.',
    '',
    'Look: crisp, even museum catalogue photography to match a poster page: white skylit gallery,',
    'pale grey polished concrete floor, neutral white balance, no film grain, no dim light. The',
    'documentary shots (survey, studio, glass) are overcast daylight, 35 mm, same neutral colour.',
    'Consistency: the material and the room come from g02 via `--ref`; edits keep the frame and change',
    'one thing.',
    '',
    'Inspected at full size: block edges straight, no duplicated parts, no text-like marks. Known',
    'quirks left in: the worn hollows are a little whiter and smoother than the rest of the stone',
    '(read as finer polishing); the visitor in g13 shows part of a profile.',
    '',
]
recs = [json.loads(l) for l in open(sys.argv[1], encoding='utf-8') if l.strip()]
for r in recs:
    name = pathlib.Path(r['out'] or '').name
    if name not in USED:
        continue
    use, note = USED[name]
    refs = ', '.join(pathlib.Path(x).name for x in r.get('refs') or []) or 'none'
    lines += [f'## {name}', '', f'- Used as: {use}', f'- What: {note}',
              f'- Aspect {r.get("aspect")}, refs: {refs}', '', '```text', r['prompt'], '```', '']
OUT.write_text('\n'.join(lines), encoding='utf-8')
print('wrote', OUT, len(recs), 'records')
