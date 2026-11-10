// 두벌식 한글 조합. 페이지의 키캡은 가운데 줄 아홉 자모(ㅁㄴㅇㄹㅎ ㅗㅓㅏㅣ)뿐이라,
// 나올 수 있는 음절은 270개다. 그 음절은 모두 글꼴 부분집합에 들어 있다(design/works/keyboard/scratch/subset.py).

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
const VOWEL_PAIR = { 'ㅗㅏ': 'ㅘ', 'ㅗㅣ': 'ㅚ' };
const JONG_PAIR = { 'ㄹㅁ': 'ㄻ', 'ㄹㅎ': 'ㅀ', 'ㄴㅎ': 'ㄶ' };
const split = (table) => Object.fromEntries(Object.entries(table).map(([k, v]) => [v, [...k]]));
const VOWEL_SPLIT = split(VOWEL_PAIR);
const JONG_SPLIT = split(JONG_PAIR);
const MAX = 40;

export const isVowel = (j) => JUNG.includes(j);

export function createComposer() {
  let done = '';
  let cur = null; // { cho, jung, jong } — 빈 문자열은 없음

  function syllable(c) {
    if (c.cho && c.jung) {
      const code = 0xac00 + (CHO.indexOf(c.cho) * 21 + JUNG.indexOf(c.jung)) * 28 + (c.jong ? JONG.indexOf(c.jong) : 0);
      return String.fromCharCode(code);
    }
    return c.cho || c.jung;
  }
  function commit() {
    if (cur) done += syllable(cur);
    cur = null;
    if (done.length > MAX) done = done.slice(-MAX);
  }
  const fresh = (cho, jung = '') => ({ cho, jung, jong: '' });

  function input(j) {
    if (isVowel(j)) {
      if (!cur) { cur = fresh('', j); return; }
      if (!cur.jung) { cur.jung = j; return; }
      if (!cur.jong) {
        const pair = VOWEL_PAIR[cur.jung + j];
        if (pair) { cur.jung = pair; return; }
        commit();
        cur = fresh('', j);
        return;
      }
      // 받침이 있으면 마지막 자음을 다음 글자의 첫소리로 넘긴다 (알 + ㅏ → 아라)
      let next;
      if (JONG_SPLIT[cur.jong]) [cur.jong, next] = JONG_SPLIT[cur.jong];
      else { next = cur.jong; cur.jong = ''; }
      commit();
      cur = fresh(next, j);
      return;
    }
    if (!cur) { cur = fresh(j); return; }
    if (!cur.cho || !cur.jung) { commit(); cur = fresh(j); return; }
    if (!cur.jong) {
      if (JONG.indexOf(j) > 0) { cur.jong = j; return; }
      commit();
      cur = fresh(j);
      return;
    }
    const pair = JONG_PAIR[cur.jong + j];
    if (pair) { cur.jong = pair; return; }
    commit();
    cur = fresh(j);
  }

  function backspace() {
    if (cur) {
      if (cur.jong) cur.jong = JONG_SPLIT[cur.jong] ? JONG_SPLIT[cur.jong][0] : '';
      else if (cur.jung && VOWEL_SPLIT[cur.jung]) cur.jung = VOWEL_SPLIT[cur.jung][0];
      else if (cur.jung && cur.cho) cur.jung = '';
      else cur = null;
      return;
    }
    done = done.slice(0, -1);
  }

  return {
    input,
    backspace,
    space() { commit(); done += ' '; if (done.length > MAX) done = done.slice(-MAX); },
    clear() { done = ''; cur = null; },
    dropFirst() { if (!done.length) return false; done = done.slice(1); return true; },
    parts() { return { done, comp: cur ? syllable(cur) : '' }; },
  };
}
