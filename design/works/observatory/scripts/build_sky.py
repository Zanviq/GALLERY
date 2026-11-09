"""Build works/observatory/js/sky-data.js from the Yale Bright Star Catalogue (5th rev. ed.).

    <fontenv>/python.exe -I design/works/observatory/scripts/build_sky.py <path to bsc5.dat>

The catalogue (Hoffleit & Warren 1991, public domain) is downloaded separately into a scratch
folder: http://tdc-www.harvard.edu/catalogs/bsc5.dat.gz. Only J2000 positions, V magnitudes
and Bayer/Flamsteed names are used. Stars to V 4.5 north of dec -62 are kept, plus every
fainter star that a constellation line needs. The stick figures below are drawn for this page
(simplified, in the spirit of printed planispheres), not copied from another chart.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'works' / 'observatory' / 'js' / 'sky-data.js'
MAG_LIMIT = 4.5
DEC_LIMIT = -62.0

# abbr: (Korean name, [polyline, ...]); a polyline is a list of designations inside that
# constellation ('Alp', 'Gam2', '58'), or 'Xxx Abc' for a star borrowed from another one.
FIGURES = {
    'UMa': ('큰곰자리', [['Eta', 'Zet', 'Eps', 'Del', 'Gam', 'Bet', 'Alp', 'Del'],
                        ['Alp', '23', 'Omi'], ['23', 'Ups', 'The', 'Iot'], ['The', 'Kap'],
                        ['Gam', 'Chi', 'Psi', 'Mu', 'Lam'], ['Chi', 'Nu', 'Xi']]),
    'UMi': ('작은곰자리', [['Alp', 'Del', 'Eps', 'Zet', 'Bet', 'Gam', 'Eta', 'Zet']]),
    'Cas': ('카시오페이아자리', [['Eps', 'Del', 'Gam', 'Alp', 'Bet']]),
    'Cep': ('케페우스자리', [['Alp', 'Bet', 'Gam', 'Iot', 'Zet', 'Alp'], ['Bet', 'Iot']]),
    'Dra': ('용자리', [['Lam', 'Kap', 'Alp', 'Iot', 'The', 'Eta', 'Zet', 'Eps', 'Del', 'Xi', 'Nu',
                       'Bet', 'Gam', 'Xi']]),
    'Ori': ('오리온자리', [['Alp', 'Lam', 'Gam'], ['Alp', 'Zet', 'Eps', 'Del', 'Gam'], ['Zet', 'Kap'],
                         ['Del', 'Bet'], ['Gam', 'Pi3'], ['Pi1', 'Pi2', 'Pi3', 'Pi4', 'Pi5', 'Pi6'],
                         ['Alp', 'Mu', 'Xi', 'Chi1']]),
    'Tau': ('황소자리', [['Zet', 'Alp', 'The2', 'Gam', 'Del1', 'Eps', 'Bet'], ['Gam', 'Lam']]),
    'Gem': ('쌍둥이자리', [['Alp', 'Tau', 'Eps', 'Mu', 'Eta'], ['Bet', 'Ups', 'Del', 'Zet', 'Gam'],
                         ['Alp', 'Bet']]),
    'Aur': ('마차부자리', [['Alp', 'Bet', 'The', 'Bet Tau', 'Iot', 'Alp']]),
    'CMa': ('큰개자리', [['Bet', 'Alp', 'Omi2', 'Del', 'Eta'], ['Del', 'Eps'], ['Alp', 'Iot', 'Gam']]),
    'CMi': ('작은개자리', [['Alp', 'Bet']]),
    'Leo': ('사자자리', [['Eps', 'Mu', 'Zet', 'Gam', 'Eta', 'Alp', 'The', 'Bet', 'Del', 'Gam']]),
    'Vir': ('처녀자리', [['Eps', 'Del', 'Gam', 'Eta', 'Bet'], ['Del', 'Zet', 'Alp', 'The', 'Gam']]),
    'Boo': ('목동자리', [['Alp', 'Eps', 'Del', 'Bet', 'Gam', 'Rho', 'Alp'], ['Alp', 'Eta'], ['Alp', 'Zet']]),
    'CrB': ('북쪽왕관자리', [['The', 'Bet', 'Alp', 'Gam', 'Del', 'Eps', 'Iot']]),
    'Her': ('헤르쿨레스자리', [['Eps', 'Zet', 'Eta', 'Pi', 'Eps'], ['Zet', 'Bet', 'Gam'], ['Eps', 'Del'],
                           ['Eta', 'Sig', 'Tau'], ['Pi', 'The', 'Iot']]),
    'Lyr': ('거문고자리', [['Alp', 'Zet1', 'Bet', 'Gam', 'Del2', 'Zet1'], ['Alp', 'Eps1']]),
    'Cyg': ('백조자리', [['Alp', 'Gam', 'Eta', 'Bet'], ['Del', 'Gam', 'Eps', 'Zet']]),
    'Aql': ('독수리자리', [['Gam', 'Alp', 'Bet'], ['Alp', 'Del', 'Lam'], ['Del', 'Eta', 'The'],
                         ['Del', 'Zet', 'Eps']]),
    'Sco': ('전갈자리', [['Bet1', 'Del', 'Pi'], ['Del', 'Sig', 'Alp', 'Tau', 'Eps', 'Mu1', 'Zet2', 'Eta',
                                                'The', 'Iot1', 'Kap', 'Lam', 'Ups']]),
    'Sgr': ('궁수자리', [['Eps', 'Gam2', 'Del', 'Eps', 'Zet', 'Phi', 'Del', 'Lam', 'Phi', 'Sig', 'Tau',
                         'Zet']]),
    'Peg': ('페가수스자리', [['Alp', 'Bet', 'Alp And', 'Gam', 'Alp'], ['Alp', 'Zet', 'The', 'Eps'],
                           ['Bet', 'Eta'], ['Bet', 'Mu', 'Lam', 'Iot', 'Kap']]),
    'And': ('안드로메다자리', [['Alp', 'Del', 'Bet', 'Gam1'], ['Bet', 'Mu', 'Nu']]),
    'Per': ('페르세우스자리', [['Eta', 'Gam', 'Alp', 'Del', 'Eps', 'Xi', 'Zet'], ['Alp', 'Kap', 'Bet', 'Rho']]),
    'Ari': ('양자리', [['41', 'Alp', 'Bet', 'Gam2']]),
    'Psc': ('물고기자리', [['Gam', 'The', 'Iot', 'Lam', 'Kap', 'Gam'],
                         ['Iot', 'Ome', 'Del', 'Eps', 'Zet', 'Mu', 'Nu', 'Alp', 'Omi', 'Eta']]),
    'Aqr': ('물병자리', [['Eps', 'Bet', 'Alp', 'Gam', 'Zet', 'Eta'], ['Zet', 'Pi'], ['Alp', 'The', 'Lam', 'Del']]),
    'Cap': ('염소자리', [['Alp2', 'Bet', 'Psi', 'Ome', 'Zet', 'Del', 'Gam', 'Iot', 'The', 'Bet']]),
    'Cet': ('고래자리', [['Alp', 'Gam', 'Del', 'Omi', 'Zet', 'Tau', 'Bet', 'Iot', 'Eta', 'The', 'Zet']]),
    'Eri': ('에리다누스자리', [['Bet', 'Mu', 'Nu', 'Omi1', 'Gam', 'Pi', 'Del', 'Eps', 'Eta']]),
    'Hya': ('바다뱀자리', [['Del', 'Sig', 'Eta', 'Eps', 'Del'], ['Eps', 'Zet', 'The', 'Iot', 'Alp', 'Ups1',
                                                              'Lam', 'Mu', 'Nu', 'Xi', 'Bet', 'Gam', 'Pi']]),
    'Cnc': ('게자리', [['Iot', 'Gam', 'Del', 'Bet'], ['Del', 'Alp']]),
    'Lib': ('천칭자리', [['Sig', 'Alp2', 'Bet', 'Gam', 'Alp2'], ['Gam', 'Ups', 'Tau']]),
    'Oph': ('뱀주인자리', [['Alp', 'Kap', 'Del', 'Eps', 'Zet', 'Eta', 'Nu', 'Bet', 'Alp'], ['Bet', 'Gam']]),
    'Ser': ('뱀자리', [['Kap', 'Gam', 'Bet', 'Iot', 'Kap'], ['Bet', 'Del', 'Alp', 'Eps', 'Mu'],
                      ['Xi', 'Eta', 'The']]),
    'Del': ('돌고래자리', [['Eps', 'Bet', 'Alp', 'Gam2', 'Del', 'Bet']]),
    'Sge': ('화살자리', [['Gam', 'Del', 'Alp'], ['Del', 'Bet']]),
    'PsA': ('남쪽물고기자리', [['Alp', 'Eps', 'Iot', 'Bet', 'Gam', 'Del', 'Alp']]),
    'Crv': ('까마귀자리', [['Alp', 'Eps', 'Gam', 'Del', 'Bet', 'Eps']]),
    'Crt': ('컵자리', [['Alp', 'Del', 'Gam', 'Bet', 'Alp']]),
    'Lep': ('토끼자리', [['Mu', 'Alp', 'Bet', 'Eps'], ['Alp', 'Zet', 'Eta'], ['Bet', 'Gam', 'Del', 'Eta']]),
    'Tri': ('삼각형자리', [['Alp', 'Bet', 'Gam', 'Alp']]),
    'Com': ('머리털자리', [['Gam', 'Bet', 'Alp']]),
    'CVn': ('사냥개자리', [['Alp2', 'Bet']]),
    'CrA': ('남쪽왕관자리', [['Gam', 'Alp', 'Bet', 'Del', 'Zet']]),
}

# Korean names people actually use for the bright stars (designation -> name).
NAMES = {
    'Alp CMa': '시리우스', 'Alp Lyr': '베가(직녀성)', 'Alp Aql': '알타이르(견우성)',
    'Alp Cyg': '데네브', 'Alp Boo': '아르크투루스', 'Alp Aur': '카펠라', 'Bet Ori': '리겔',
    'Alp Ori': '베텔게우스', 'Alp CMi': '프로키온', 'Alp Tau': '알데바란', 'Alp Vir': '스피카',
    'Alp Sco': '안타레스(대화)', 'Bet Gem': '폴룩스', 'Alp Gem': '카스토르', 'Alp Leo': '레굴루스',
    'Alp PsA': '포말하우트', 'Alp UMi': '북극성', 'Gam Ori': '벨라트릭스', 'Bet Tau': '엘나스',
    'Eps CMa': '아다라', 'Eps Ori': '알닐람', 'Zet Ori': '알니탁', 'Del Ori': '민타카',
    'Kap Ori': '사이프', 'Alp Per': '미르팍', 'Bet Per': '알골', 'Alp UMa': '두베',
    'Bet UMa': '메라크', 'Gam UMa': '펙다', 'Del UMa': '메그레즈', 'Eps UMa': '알리오스',
    'Zet UMa': '미자르', 'Eta UMa': '알카이드', 'Bet Leo': '데네볼라', 'Gam Leo': '알기에바',
    'Alp Peg': '마르카브', 'Bet Peg': '셰아트', 'Gam Peg': '알게니브', 'Eps Peg': '에니프',
    'Alp And': '알페라츠', 'Bet And': '미라크', 'Gam1And': '알마크', 'Omi Cet': '미라',
    'Bet Cet': '디프다', 'Bet Cyg': '알비레오', 'Alp Her': '라스알게티', 'Alp Oph': '라스알하게',
    'Alp Ari': '하말', 'Alp CrB': '알페카', 'Alp Cas': '셰다르', 'Bet Cas': '카프',
    'Alp2CVn': '코르 카롤리', 'Alp Hya': '알파르드', 'Alp Cep': '알데라민', 'Gam Dra': '엘타닌',
    'Sig Sgr': '눈키', 'Eps Sgr': '카우스 아우스트랄리스', 'Lam Sco': '샤울라', 'Bet UMi': '코카브',
    'Bet Aur': '멘칼리난', 'Gam Gem': '알헤나', 'Bet CMa': '미르잠', 'Del CMa': '베젠',
    'Alp Col': '팍트', 'Alp2Lib': '주벤엘게누비', 'Bet Lib': '주벤에샤마리', 'Eta Oph': '사비크',
    'Gam Cyg': '사드르', 'Alp Dra': '투반', 'Alp Cet': '멘카르',
}

GREEK = ['Alp', 'Bet', 'Gam', 'Del', 'Eps', 'Zet', 'Eta', 'The', 'Iot', 'Kap', 'Lam', 'Mu', 'Nu',
         'Xi', 'Omi', 'Pi', 'Rho', 'Sig', 'Tau', 'Ups', 'Phi', 'Chi', 'Psi', 'Ome']


def parse(path):
    stars = []
    for raw in pathlib.Path(path).read_text(encoding='latin-1').splitlines():
        if len(raw) < 107 or not raw[75:77].strip() or not raw[102:107].strip():
            continue
        hr = int(raw[0:4])
        flam = raw[4:7].strip()
        bayer = raw[7:10].strip()
        sup = raw[10:11].strip()
        con = raw[11:14].strip()
        ra = (int(raw[75:77]) + int(raw[77:79]) / 60 + float(raw[79:83]) / 3600) * 15
        dec = int(raw[84:86]) + int(raw[86:88]) / 60 + int(raw[88:90]) / 3600
        if raw[83] == '-':
            dec = -dec
        mag = float(raw[102:107])
        stars.append(dict(hr=hr, flam=flam, bayer=bayer, sup=sup, con=con, ra=ra, dec=dec, mag=mag))
    return stars


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    cat = parse(sys.argv[1])
    print(len(cat), 'catalogue records with positions')
    index = {}
    for s in cat:
        if not s['con']:
            continue
        keys = []
        if s['bayer']:
            keys.append((s['bayer'] + s['sup'], s['con']))
            if s['sup']:
                keys.append((s['bayer'] + '?' , s['con']))
        if s['flam']:
            keys.append((s['flam'], s['con']))
        for k in keys:
            # keep the brightest holder of a key (e.g. Alp? -> Alp1/Alp2)
            if k not in index or s['mag'] < index[k]['mag']:
                index[k] = s

    def find(token, con):
        if ' ' in token:
            token, con = token.split(' ')
        for k in ((token, con), (token + '?', con)):
            if k in index:
                return index[k]
        raise KeyError(f'{token} {con}')

    keep = {s['hr']: s for s in cat if s['mag'] <= MAG_LIMIT and s['dec'] >= DEC_LIMIT}
    figures = []
    for abbr, (ko, polylines) in FIGURES.items():
        for line in polylines:
            for tok in line:
                s = find(tok, abbr)
                keep[s['hr']] = s
    ordered = sorted(keep.values(), key=lambda s: s['mag'])
    pos = {s['hr']: i for i, s in enumerate(ordered)}
    for abbr, (ko, polylines) in FIGURES.items():
        lines = [[pos[find(tok, abbr)['hr']] for tok in line] for line in polylines]
        figures.append({'abbr': abbr, 'ko': ko, 'lines': lines})

    flat = []
    desig = []
    for s in ordered:
        flat += [round(s['ra'] * 100), round(s['dec'] * 100), round(s['mag'] * 100)]
        d = ''
        if s['bayer']:
            d = s['bayer'] + (s['sup'] or '') + ' ' + s['con']
        elif s['flam']:
            d = s['flam'] + ' ' + s['con']
        desig.append(d)
    names = {}
    for key, ko in NAMES.items():
        key = key.strip()
        tok, con = (key[:-3].strip(), key[-3:]) if ' ' not in key else key.split(' ')
        try:
            s = find(tok, con)
        except KeyError:
            print('name not found:', key)
            continue
        if s['hr'] in pos:
            names[pos[s['hr']]] = ko
    print(len(ordered), 'stars kept,', sum(len(f['lines']) for f in figures), 'polylines,', len(names), 'names')
    js = ('// Generated by design/works/observatory/scripts/build_sky.py from the Yale Bright Star\n'
          '// Catalogue, 5th rev. ed. (Hoffleit & Warren 1991, public domain). J2000 positions.\n'
          '// STARS is flat: [ra deg x100, dec deg x100, V mag x100, ...], brightest first.\n'
          f'export const STARS = {json.dumps(flat, separators=(",", ":"))};\n'
          f'export const DESIG = {json.dumps(desig, ensure_ascii=False, separators=(",", ":"))};\n'
          f'export const NAMES = {json.dumps(names, ensure_ascii=False, separators=(",", ":"))};\n'
          f'export const FIGURES = {json.dumps(figures, ensure_ascii=False, separators=(",", ":"))};\n')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(js, encoding='utf-8')
    print('wrote', OUT, f'{len(js.encode("utf-8")) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
