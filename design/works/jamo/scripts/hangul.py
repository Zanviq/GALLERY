"""Shared Hangul tables and puzzle loading for the jamo build scripts (mirrors works/jamo/js/hangul.js)."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'jamo'

CHO = list('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ')
JUNG = list('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ')
JONG = [''] + list('ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ')

# compound jamo -> the basic jamo stacked to make them
PARTS = {
    'ㄲ': 'ㄱㄱ', 'ㄸ': 'ㄷㄷ', 'ㅃ': 'ㅂㅂ', 'ㅆ': 'ㅅㅅ', 'ㅉ': 'ㅈㅈ',
    'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ',
    'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
    'ㅐ': 'ㅏㅣ', 'ㅒ': 'ㅑㅣ', 'ㅔ': 'ㅓㅣ', 'ㅖ': 'ㅕㅣ', 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅏㅣ',
    'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅓㅣ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
}
# stroke-addition families (가획): index in the string = strokes added to the root
CHAINS = ['ㄱㅋ', 'ㄴㄷㅌ', 'ㅁㅂㅍ', 'ㅅㅈㅊ', 'ㅏㅑ', 'ㅓㅕ', 'ㅗㅛ', 'ㅜㅠ']
BASIC = set('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ')


def root_level(j):
    for c in CHAINS:
        if j in c:
            return c[0], c.index(j)
    return j, 0


def split(j):
    return list(PARTS.get(j, j))


def decompose(syl):
    code = ord(syl) - 0xAC00
    cho, rest = divmod(code, 21 * 28)
    jung, jong = divmod(rest, 28)
    return CHO[cho], JUNG[jung], JONG[jong]


def compose(cho, jung, jong=''):
    return chr(0xAC00 + (CHO.index(cho) * 21 + JUNG.index(jung)) * 28 + JONG.index(jong))


def basics_of(word):
    out = []
    for s in word:
        for j in decompose(s):
            if j:
                out += split(j)
    return out


def load_puzzles():
    text = (SITE / 'js' / 'puzzles.js').read_text(encoding='utf-8')
    out = {}
    for name in ('LESSONS', 'PUZZLES', 'GROUPS'):
        m = re.search(r'export const ' + name + r' = (\[.*?\n\]);', text, flags=re.S)
        out[name] = json.loads(m.group(1))
    return out
