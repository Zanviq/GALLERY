// 또렷 시표: twelve Hangul syllables drawn on a 10 x 10 grid with a 2-unit stroke,
// the same 1/5 stroke-to-height rule that Sloan letters and Landolt rings follow.
// Consonant sits in x 0..4, vowel in x 6..10, so every gap is one stroke wide.

const CONSONANT = {
  'ㄱ': [[0, 0, 4, 2], [2, 0, 2, 10]],
  'ㄴ': [[0, 0, 2, 10], [0, 8, 4, 2]],
  'ㄷ': [[0, 0, 4, 2], [0, 0, 2, 10], [0, 8, 4, 2]],
  'ㄹ': [[0, 0, 4, 2], [2, 0, 2, 6], [0, 4, 4, 2], [0, 4, 2, 6], [0, 8, 4, 2]],
  'ㅋ': [[0, 0, 4, 2], [2, 0, 2, 10], [0, 4, 4, 2]],
  'ㅌ': [[0, 0, 4, 2], [0, 0, 2, 10], [0, 4, 4, 2], [0, 8, 4, 2]],
};
const VOWEL = {
  'ㅏ': [[6, 0, 2, 10], [8, 4, 2, 2]],
  'ㅓ': [[6, 4, 2, 2], [8, 0, 2, 10]],
};
const SYLLABLE = {
  '가': ['ㄱ', 'ㅏ'], '거': ['ㄱ', 'ㅓ'], '나': ['ㄴ', 'ㅏ'], '너': ['ㄴ', 'ㅓ'],
  '다': ['ㄷ', 'ㅏ'], '더': ['ㄷ', 'ㅓ'], '라': ['ㄹ', 'ㅏ'], '러': ['ㄹ', 'ㅓ'],
  '카': ['ㅋ', 'ㅏ'], '커': ['ㅋ', 'ㅓ'], '타': ['ㅌ', 'ㅏ'], '터': ['ㅌ', 'ㅓ'],
};

const r = (n) => Math.round(n * 100) / 100;

/** Path data for one optotype whose top-left corner is (x, y) and height is h. */
export function glyphPath(ch, x, y, h) {
  const parts = SYLLABLE[ch];
  if (!parts) return '';
  const u = h / 10;
  let d = '';
  for (const [rx, ry, rw, rh] of [...CONSONANT[parts[0]], ...VOWEL[parts[1]]]) {
    d += `M${r(x + rx * u)} ${r(y + ry * u)}h${r(rw * u)}v${r(rh * u)}h${r(-rw * u)}z`;
  }
  return d;
}

/** Path data for a row of optotypes centred on cx, spaced one letter width apart. */
export function rowPath(letters, cx, y, h, gap = 1) {
  const n = letters.length;
  const width = n * h + (n - 1) * h * gap;
  let x = cx - width / 2;
  let d = '';
  for (const ch of letters) {
    d += glyphPath(ch, x, y, h);
    x += h * (1 + gap);
  }
  return { d, width };
}
