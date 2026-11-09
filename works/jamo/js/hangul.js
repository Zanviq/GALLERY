// 한글 자모 표, 모아쓰기(유니코드 계산), 가획 사슬, 조사 고르기.

export const CHO = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
export const JUNG = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
export const JONG = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];

const VOWELS = new Set('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ');
export const isVowel = (j) => VOWELS.has(j);

// 겹쳐 쓰기: 칸 한 자리에 모인 기본 자모(순서 무관) -> 합쳐진 자모
const key = (list) => [...list].sort().join('');
const table = (pairs) => new Map(Object.entries(pairs).map(([k, v]) => [key(k), v]));
const STACK = {
  cho: table({ 'ㄱㄱ': 'ㄲ', 'ㄷㄷ': 'ㄸ', 'ㅂㅂ': 'ㅃ', 'ㅅㅅ': 'ㅆ', 'ㅈㅈ': 'ㅉ' }),
  jung: table({
    'ㅏㅣ': 'ㅐ', 'ㅑㅣ': 'ㅒ', 'ㅓㅣ': 'ㅔ', 'ㅕㅣ': 'ㅖ', 'ㅗㅏ': 'ㅘ', 'ㅗㅏㅣ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
    'ㅜㅓ': 'ㅝ', 'ㅜㅓㅣ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ',
  }),
  jong: table({
    'ㄱㄱ': 'ㄲ', 'ㅅㅅ': 'ㅆ', 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ',
    'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ',
  }),
};

/** The jamo a slot shows for the basic jamo stacked in it, or null when they cannot stack. */
export function slotValue(slot, list) {
  if (!list.length) return '';
  if (list.length === 1) {
    const j = list[0];
    if (slot === 'jung') return isVowel(j) ? j : null;
    return isVowel(j) ? null : j;
  }
  return STACK[slot].get(key(list)) || null;
}

export function compose(cho, jung, jong = '') {
  const c = CHO.indexOf(cho), v = JUNG.indexOf(jung), t = JONG.indexOf(jong);
  if (c < 0 || v < 0 || t < 0) return '';
  return String.fromCharCode(0xac00 + (c * 21 + v) * 28 + t);
}

export function decompose(syl) {
  const code = syl.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return { cho: CHO[Math.floor(code / 588)], jung: JUNG[Math.floor((code % 588) / 28)], jong: JONG[code % 28] };
}

// 가획: 사슬 안의 위치가 더한 획 수
export const CHAINS = ['ㄱㅋ', 'ㄴㄷㅌ', 'ㅁㅂㅍ', 'ㅅㅈㅊ', 'ㅏㅑ', 'ㅓㅕ', 'ㅗㅛ', 'ㅜㅠ'].map((s) => [...s]);
export function chainOf(j) {
  for (const c of CHAINS) {
    const i = c.indexOf(j);
    if (i >= 0) return { chain: c, level: i };
  }
  return { chain: [j], level: 0 };
}
export const addStroke = (j) => { const { chain, level } = chainOf(j); return chain[level + 1] || null; };
export const removeStroke = (j) => { const { chain, level } = chainOf(j); return level > 0 ? chain[level - 1] : null; };
export const strokesBetween = (from, to) => chainOf(to).level - chainOf(from).level;

// 읽는 이름 (화면 읽기 프로그램과 조사 고르기에 쓴다)
const NAMES = {
  'ㄱ': '기역', 'ㄲ': '쌍기역', 'ㄴ': '니은', 'ㄷ': '디귿', 'ㄸ': '쌍디귿', 'ㄹ': '리을', 'ㅁ': '미음', 'ㅂ': '비읍',
  'ㅃ': '쌍비읍', 'ㅅ': '시옷', 'ㅆ': '쌍시옷', 'ㅇ': '이응', 'ㅈ': '지읒', 'ㅉ': '쌍지읒', 'ㅊ': '치읓', 'ㅋ': '키읔',
  'ㅌ': '티읕', 'ㅍ': '피읖', 'ㅎ': '히읗', 'ㄳ': '기역시옷', 'ㄵ': '니은지읒', 'ㄶ': '니은히읗', 'ㄺ': '리을기역',
  'ㄻ': '리을미음', 'ㄼ': '리을비읍', 'ㄽ': '리을시옷', 'ㄾ': '리을티읕', 'ㄿ': '리을피읖', 'ㅀ': '리을히읗', 'ㅄ': '비읍시옷',
};
export const jamoName = (j) => NAMES[j] || (isVowel(j) ? j : j);

/** Does the word end in a final consonant when read aloud? Jamo are read by their names. */
function hasFinal(word) {
  const last = word[word.length - 1];
  if (!last) return false;
  if (NAMES[last]) return true; // every consonant name ends in a 받침
  if (isVowel(last)) return false;
  const d = decompose(last);
  if (d) return d.jong !== '';
  return /[136780lmnr]$/i.test(last);
}
function finalIsRieul(word) {
  const last = word[word.length - 1];
  if (last === 'ㄹ') return true;
  const d = decompose(last || '');
  return !!d && d.jong === 'ㄹ';
}

/** Attach a particle: josa('ㄱ', '을/를') -> 'ㄱ을'. '으로/로' keeps 로 after ㄹ. */
export function josa(word, pair) {
  const [withFinal, without] = pair.split('/');
  if (pair === '으로/로') return word + (hasFinal(word) && !finalIsRieul(word) ? '으로' : '로');
  return word + (hasFinal(word) ? withFinal : without);
}

export const ORDINAL = ['첫째', '둘째', '셋째', '넷째'];
