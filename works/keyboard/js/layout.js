// 가락 65 배열 — 65%, 68키. 3D 모델, 배열도(SVG), 물리 키 매핑이 모두 이 표 하나를 쓴다.
// w: 키 폭(u), top/sub: 위·아래 각인, ko: 두벌식 자모, codes: KeyboardEvent.code, group: 키캡 색 묶음

export const ROWS = [
  [
    { id: 'esc', top: 'Esc', w: 1, group: 'accent', codes: ['Escape', 'Backquote'] },
    { id: '1', top: '!', sub: '1', codes: ['Digit1'] },
    { id: '2', top: '@', sub: '2', codes: ['Digit2'] },
    { id: '3', top: '#', sub: '3', codes: ['Digit3'] },
    { id: '4', top: '$', sub: '4', codes: ['Digit4'] },
    { id: '5', top: '%', sub: '5', codes: ['Digit5'] },
    { id: '6', top: '^', sub: '6', codes: ['Digit6'] },
    { id: '7', top: '&', sub: '7', codes: ['Digit7'] },
    { id: '8', top: '*', sub: '8', codes: ['Digit8'] },
    { id: '9', top: '(', sub: '9', codes: ['Digit9'] },
    { id: '0', top: ')', sub: '0', codes: ['Digit0'] },
    { id: 'minus', top: '_', sub: '-', codes: ['Minus'] },
    { id: 'equal', top: '+', sub: '=', codes: ['Equal'] },
    { id: 'bksp', label: 'Back', w: 2, group: 'mod', codes: ['Backspace'] },
    { id: 'del', label: 'Del', group: 'mod', codes: ['Delete', 'Home', 'Insert'] },
  ],
  [
    { id: 'tab', label: 'Tab', w: 1.5, group: 'mod', codes: ['Tab'] },
    { id: 'q', top: 'Q', ko: 'ㅂ', codes: ['KeyQ'] },
    { id: 'w', top: 'W', ko: 'ㅈ', codes: ['KeyW'] },
    { id: 'e', top: 'E', ko: 'ㄷ', codes: ['KeyE'] },
    { id: 'r', top: 'R', ko: 'ㄱ', codes: ['KeyR'] },
    { id: 't', top: 'T', ko: 'ㅅ', codes: ['KeyT'] },
    { id: 'y', top: 'Y', ko: 'ㅛ', codes: ['KeyY'] },
    { id: 'u', top: 'U', ko: 'ㅕ', codes: ['KeyU'] },
    { id: 'i', top: 'I', ko: 'ㅑ', codes: ['KeyI'] },
    { id: 'o', top: 'O', ko: 'ㅐ', codes: ['KeyO'] },
    { id: 'p', top: 'P', ko: 'ㅔ', codes: ['KeyP'] },
    { id: 'lbr', top: '{', sub: '[', codes: ['BracketLeft'] },
    { id: 'rbr', top: '}', sub: ']', codes: ['BracketRight'] },
    { id: 'bsl', top: '|', sub: '\\', w: 1.5, group: 'mod', codes: ['Backslash', 'IntlYen'] },
    { id: 'pgup', label: 'PgUp', group: 'mod', codes: ['PageUp'] },
  ],
  [
    { id: 'caps', label: 'Caps', w: 1.75, group: 'mod', codes: ['CapsLock'] },
    { id: 'a', top: 'A', ko: 'ㅁ', codes: ['KeyA'] },
    { id: 's', top: 'S', ko: 'ㄴ', codes: ['KeyS'] },
    { id: 'd', top: 'D', ko: 'ㅇ', codes: ['KeyD'] },
    { id: 'f', top: 'F', ko: 'ㄹ', codes: ['KeyF'], homing: true },
    { id: 'g', top: 'G', ko: 'ㅎ', codes: ['KeyG'] },
    { id: 'h', top: 'H', ko: 'ㅗ', codes: ['KeyH'] },
    { id: 'j', top: 'J', ko: 'ㅓ', codes: ['KeyJ'], homing: true },
    { id: 'k', top: 'K', ko: 'ㅏ', codes: ['KeyK'] },
    { id: 'l', top: 'L', ko: 'ㅣ', codes: ['KeyL'] },
    { id: 'semi', top: ':', sub: ';', codes: ['Semicolon'] },
    { id: 'quote', top: '"', sub: "'", codes: ['Quote'] },
    { id: 'enter', label: 'Enter', w: 2.25, group: 'accent', codes: ['Enter', 'NumpadEnter'] },
    { id: 'pgdn', label: 'PgDn', group: 'mod', codes: ['PageDown'] },
  ],
  [
    { id: 'lshift', label: 'Shift', w: 2.25, group: 'mod', codes: ['ShiftLeft'] },
    { id: 'z', top: 'Z', ko: 'ㅋ', codes: ['KeyZ'] },
    { id: 'x', top: 'X', ko: 'ㅌ', codes: ['KeyX'] },
    { id: 'c', top: 'C', ko: 'ㅊ', codes: ['KeyC'] },
    { id: 'v', top: 'V', ko: 'ㅍ', codes: ['KeyV'] },
    { id: 'b', top: 'B', ko: 'ㅠ', codes: ['KeyB'] },
    { id: 'n', top: 'N', ko: 'ㅜ', codes: ['KeyN'] },
    { id: 'm', top: 'M', ko: 'ㅡ', codes: ['KeyM'] },
    { id: 'comma', top: '<', sub: ',', codes: ['Comma'] },
    { id: 'period', top: '>', sub: '.', codes: ['Period'] },
    { id: 'slash', top: '?', sub: '/', codes: ['Slash', 'IntlRo'] },
    { id: 'rshift', label: 'Shift', w: 1.75, group: 'mod', codes: ['ShiftRight'] },
    { id: 'up', label: '↑', group: 'mod', arrow: true, codes: ['ArrowUp'] },
    { id: 'end', label: 'End', group: 'mod', codes: ['End'] },
  ],
  [
    { id: 'lctrl', label: 'Ctrl', w: 1.25, group: 'mod', codes: ['ControlLeft'] },
    { id: 'meta', label: '', mark: true, w: 1.25, group: 'mod', codes: ['MetaLeft', 'OSLeft', 'MetaRight'] },
    { id: 'lalt', label: 'Alt', w: 1.25, group: 'mod', codes: ['AltLeft'] },
    { id: 'space', label: '', w: 6.25, group: 'alpha', codes: ['Space'] },
    { id: 'hanyeong', label: '한/영', w: 1, group: 'mod', codes: ['AltRight', 'Lang1', 'HangulMode', 'KanaMode'] },
    { id: 'fn', label: 'Fn', w: 1, group: 'mod', codes: ['ContextMenu'] },
    { id: 'hanja', label: '한자', w: 1, group: 'mod', codes: ['ControlRight', 'Lang2', 'HanjaMode'] },
    { id: 'left', label: '←', group: 'mod', arrow: true, codes: ['ArrowLeft'] },
    { id: 'down', label: '↓', group: 'mod', arrow: true, codes: ['ArrowDown'] },
    { id: 'right', label: '→', group: 'mod', arrow: true, codes: ['ArrowRight'] },
  ],
];

// x 위치(u)와 행 번호를 채운 평면 목록
export const KEYS = [];
ROWS.forEach((row, r) => {
  let x = 0;
  row.forEach((k) => {
    const key = { w: 1, group: 'alpha', ...k, row: r, x };
    key.cx = x + key.w / 2; // 중심(u)
    KEYS.push(key);
    x += key.w;
  });
});

export const COLS_U = 16;
export const ROWS_U = 5;

export const BY_ID = new Map(KEYS.map((k) => [k.id, k]));
export const BY_CODE = new Map();
KEYS.forEach((k) => k.codes.forEach((c) => BY_CODE.set(c, k)));

// 스태빌라이저가 들어가는 키
export const STAB_IDS = new Set(['bksp', 'enter', 'lshift', 'space']);
