"""Check every puzzle is solvable and list the syllables a player can reach in each one.

    <fontenv>/python -I design/works/jamo/scripts/check_puzzles.py [orbit.ttf]

A puzzle is solvable when the answer's basic jamo have the same stroke families (roots) as the
tiles, and the strokes the answer needs fit in the stroke pool (chalk + strokes already on tiles).
A syllable is reachable when its basic jamo can be taken from the tiles with the pool's strokes.
"""
import collections
import io
import itertools
import sys

sys.path.insert(0, __import__('os').path.dirname(__file__))
from hangul import CHO, JUNG, JONG, BASIC, load_puzzles, basics_of, root_level, split, compose  # noqa: E402

sys.stdout.reconfigure(encoding='utf-8')


def pool_of(p):
    tiles = list(p['tiles'])
    bad = [t for t in tiles if t not in BASIC]
    if bad:
        raise SystemExit(f"{p['id']}: tiles must be basic jamo, got {bad}")
    roots = collections.Counter(root_level(t)[0] for t in tiles)
    strokes = p['chalk'] + sum(root_level(t)[1] for t in tiles)
    return roots, strokes


def reachable(p):
    roots, strokes = pool_of(p)
    out = set()
    for cho, jung, jong in itertools.product(CHO, JUNG, JONG):
        parts = split(cho) + split(jung) + (split(jong) if jong else [])
        need = collections.Counter(root_level(j)[0] for j in parts)
        if any(roots[r] < n for r, n in need.items()):
            continue
        if sum(root_level(j)[1] for j in parts) > strokes:
            continue
        out.add(compose(cho, jung, jong))
    return out


def main():
    data = load_puzzles()
    cmap = None
    if len(sys.argv) > 1:
        from fontTools.ttLib import TTFont
        cmap = TTFont(sys.argv[1]).getBestCmap()
    everything = set()
    ok = True
    for p in data['LESSONS'] + data['PUZZLES']:
        roots, strokes = pool_of(p)
        need = basics_of(p['answer'])
        need_roots = collections.Counter(root_level(j)[0] for j in need)
        need_strokes = sum(root_level(j)[1] for j in need)
        tile_strokes = strokes - p['chalk']
        good = need_roots == roots and need_strokes <= strokes
        ok &= good
        reach = reachable(p)
        everything |= reach
        infont = len([s for s in reach if cmap and ord(s) in cmap])
        print(f"{p['id']:12} {p['answer']:5} tiles {len(p['tiles']):2}  strokes on tiles {tile_strokes} + chalk {p['chalk']}"
              f" = {strokes}, answer needs {need_strokes}, spare {strokes - need_strokes}"
              f"  reachable {len(reach)} (in font {infont})  {'OK' if good else 'BROKEN'}")
        if not good:
            print('   roots tiles', dict(roots), 'answer', dict(need_roots))
        if cmap:
            miss = [s for s in p['answer'] if ord(s) not in cmap]
            if miss:
                print('   answer syllable missing from font:', miss)
                ok = False
    print('all reachable', len(everything), 'in font', len([s for s in everything if cmap and ord(s) in cmap]))
    if not ok:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
