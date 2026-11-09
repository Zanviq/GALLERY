import { FORMATS, byId, px } from './formats.js';
import { SITTERS, shapes, toSVG, landmarks } from './sitter.js';
import { createStudio } from './studio.js';
import { createCamera, CAMERA_TEXT } from './camera.js';
import { createSheet } from './sheet.js';
import { createFiles } from './files.js';

document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const KEY = 'idphoto.v1';

function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* the page works without storage */ } }
const saved = load();

// ---------- table of contents on phones
const tocBtn = $('[data-toc-btn]'), toc = $('#toc');
function setToc(open) { tocBtn.setAttribute('aria-expanded', String(open)); toc.classList.toggle('is-open', open); }
tocBtn.addEventListener('click', () => setToc(tocBtn.getAttribute('aria-expanded') !== 'true'));
toc.addEventListener('click', (e) => { if (e.target.closest('a')) setToc(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tocBtn.getAttribute('aria-expanded') === 'true') { setToc(false); tocBtn.focus(); } });

// ---------- live announcements (one polite region for the studio)
const announceEl = $('[data-announce]');
let announceTimer = 0;
function announce(text) {
  clearTimeout(announceTimer);
  announceEl.textContent = '';
  announceTimer = setTimeout(() => { announceEl.textContent = text; }, 60);
}

// ---------- studio
let format = byId(saved.format);
const studio = createStudio({
  screen: $('[data-screen]'), canvas: $('[data-canvas]'), guide: $('[data-guide]'), frozen: $('[data-frozen]'),
  checks: $('[data-checks]'), sum: $('[data-sum]'), how: $('[data-checks-how]'), state: $('[data-screen-state]'), announce,
}, { format });

const radios = $$('input[name="format"]');
const note = $('[data-format-note]');
function applyFormat(F, user) {
  format = F;
  note.textContent = F.note;
  studio.setFormat(F);
  for (const row of $$('[data-row]')) row.querySelector('[data-now]').hidden = !row.dataset.row.split(' ').includes(F.id);
  if (user) save({ ...load(), format: F.id });
}
for (const r of radios) {
  r.checked = r.value === format.id;
  r.addEventListener('change', () => { if (r.checked) applyFormat(byId(r.value), true); });
}
applyFormat(format, false);

// pad buttons: one step per press; holding repeats
let repeat = 0, hold = 0;
function act(btn, big = false) {
  const a = btn.dataset.act;
  if (a === 'zoom') studio.zoom(Number(btn.dataset.dir), big);
  else if (a === 'move') studio.move(Number(btn.dataset.dx), Number(btn.dataset.dy), big);
  else if (a === 'tilt') studio.tilt(Number(btn.dataset.dir), big);
  else if (a === 'reset') studio.reset();
}
function stopRepeat() { clearTimeout(hold); clearInterval(repeat); hold = repeat = 0; }
for (const btn of $$('[data-act]')) {
  btn.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    act(btn, e.shiftKey);
    if (btn.dataset.act === 'reset') return;
    stopRepeat();
    hold = setTimeout(() => { repeat = setInterval(() => act(btn, e.shiftKey), 70); }, 350);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stopRepeat);
  btn.addEventListener('click', (e) => { if (e.detail === 0) act(btn, e.shiftKey); }); // keyboard
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}
addEventListener('blur', stopRepeat);

// ---------- camera (opt in)
const camera = createCamera();
const camBtn = $('[data-camera]'), camNote = $('[data-camera-note]');
function cameraText(kind, alert = false) { camNote.textContent = CAMERA_TEXT[kind]; camNote.classList.toggle('is-alert', alert); }
const HOW = '숫자는 화면 속 손님의 실제 치수로 계산합니다.';
function cameraOff(kind = 'off') {
  camera.stop();
  studio.useDrawing();
  studio.setHow(HOW);
  camBtn.textContent = '내 얼굴로 해 보기';
  cameraText(kind, kind !== 'off');
}
camera.onLost = () => cameraOff('lost');
camBtn.addEventListener('click', async () => {
  if (camBtn.getAttribute('aria-disabled') === 'true') return;
  if (camera.live) { cameraOff('off'); announce(CAMERA_TEXT.off); return; }
  camBtn.setAttribute('aria-disabled', 'true');
  cameraText('asking');
  try {
    const video = await camera.start();
    studio.useCamera(video);
    studio.setHow('카메라 화면에서는 배경만 잽니다. 나머지 넷은 가이드 띠를 보고 직접 확인하세요.');
    camBtn.textContent = '카메라 끄기';
    cameraText('live');
    announce('카메라를 켰습니다. ' + CAMERA_TEXT.live);
  } catch (err) {
    camera.stop();
    studio.useDrawing();
    studio.setHow(HOW);
    cameraText(err.kind || 'error', true);
    announce(CAMERA_TEXT[err.kind || 'error']);
  } finally {
    camBtn.removeAttribute('aria-disabled');
  }
});

$('[data-next-sitter]').addEventListener('click', () => {
  if (camera.live) { camera.stop(); camBtn.textContent = '내 얼굴로 해 보기'; cameraText('idle'); studio.setHow(HOW); }
  const s = studio.useDrawing(true);
  announce(s.desc);
});

// ---------- shutter, flash, print
const sheet = createSheet({
  block: $('[data-print]'), sheet: $('[data-sheet]'), paper: $('[data-paper]'), cuts: $('[data-cuts]'), blade: $('[data-blade]'),
  what: $('[data-slip-what]'), verdict: $('[data-slip-verdict]'), mirror: $('[data-slip-mirror]'),
});
const files = createFiles({
  photoCanvas: $('[data-file-photo]'), caption: $('[data-file-caption]'), status: $('[data-file-status]'),
  specs: { 300: $('[data-spec="300"]'), 600: $('[data-spec="600"]'), small: $('[data-spec="small"]') },
  buttons: $$('[data-save]'),
});
const shutter = $('[data-shutter]'), flash = $('[data-flash]');
const shutterNote = $('#shutter-note');
function noteForMotion() { shutterNote.textContent = reduced.matches ? '움직임 줄이기 설정이라 플래시 대신 찍힌 장면을 잠깐 멈춰 보여 드립니다.' : '누르면 플래시가 한 번 터집니다.'; }
noteForMotion();
reduced.addEventListener('change', noteForMotion);
let firing = false;
shutter.addEventListener('click', () => {
  if (firing) return;
  firing = true;
  shutter.setAttribute('aria-disabled', 'true');
  shutter.classList.add('is-firing');
  const F = studio.format, result = studio.result, cam = studio.mode === 'camera';
  const hi = studio.capture(600);
  const photo = document.createElement('canvas');
  photo.width = px(F.w, 300); photo.height = px(F.h, 300);
  photo.getContext('2d').drawImage(hi, 0, 0, photo.width, photo.height);
  const hold = reduced.matches ? 900 : 380;
  if (reduced.matches) studio.freeze(hold);
  else flash.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: hold, easing: 'cubic-bezier(.2,.6,.3,1)' });
  // the button stays locked a little longer than the flash: never more than two flashes a second
  setTimeout(() => { firing = false; shutter.removeAttribute('aria-disabled'); shutter.classList.remove('is-firing'); }, Math.max(hold, 500));
  sheet.show(photo, F, result, { camera: cam });
  files.set(hi, F, cam ? `방금 카메라로 찍은 ${F.name} 사진입니다. 이 기기 안에만 있습니다.` : `방금 찍은 손님 ${studio.sitter.id}의 ${F.name} 사진입니다.`);
  announce(`찍었습니다. 인화지가 나왔습니다. ${F.name} ${F.cols * F.rows}컷.`);
  setTimeout(() => {
    const r = $('[data-sheet]').getBoundingClientRect();
    if (r.top > innerHeight * 0.75 || r.bottom < 0) $('[data-print]').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  }, reduced.matches ? 0 : 420);
});
$('[data-retake]').addEventListener('click', () => {
  const s = $('[data-screen]');
  s.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
  s.focus({ preventScroll: true });
});

// before any shot, the file desk shows the shop's own framing of customer 1 for the chosen format
function idealFile() {
  const F = byId('passport');
  files.set(studio.capture(600, { format: F, cam: studio.idealView(0, F), sitter: 0 }), F, '아직 셔터를 누르지 않아 저희가 맞춘 손님 1의 여권 사진으로 보여 드립니다.');
}
idealFile();

// ---------- mini photos for 촬영 전 준비: the same customers, framed by the shop for 3.5 × 4.5
const MINIS = {
  clothes: [[0, { outfit: 'shirt' }, 'white', '흰 셔츠만 입어 어깨선이 흰 배경에 묻힌 사진'], [0, {}, 'white', '검은 재킷을 걸쳐 어깨선이 보이는 사진']],
  hair: [[1, { fringe: 'heavy' }, 'blue', '앞머리가 눈썹을 덮은 사진'], [1, { fringe: 'pinned' }, 'blue', '앞머리를 핀으로 넘겨 눈썹이 보이는 사진']],
  glasses: [[2, { glasses: 'glare' }, 'white', '안경 렌즈에 조명이 비쳐 눈이 가려진 사진'], [2, {}, 'white', '렌즈에 비침 없이 눈이 보이는 사진']],
  ears: [[1, { ears: 'covered' }, 'blue', '긴 머리가 귀와 얼굴 옆선을 덮은 사진'], [1, {}, 'blue', '머리를 귀 뒤로 넘겨 귀가 보이는 사진']],
  smile: [[0, { smile: 'teeth' }, 'blue', '이를 보이며 크게 웃은 사진'], [0, {}, 'blue', '입을 다문 사진']],
};
function mini(i, opts, bg, label, ok) {
  const sp = SITTERS[i], F = byId('passport'), L = landmarks(sp);
  const s = 0.29, eyeTop = 19; // looser than the rule, so collars and shoulders show
  const cx = 0, cy = L.eyeY - (eyeTop - F.h / 2) / s;
  const fig = document.createElement('figure');
  fig.className = `mini ${ok ? 'mini--ok' : 'mini--no'}`;
  fig.innerHTML = `<svg viewBox="0 0 ${F.w} ${F.h}" role="img" aria-label="${label}"><rect width="${F.w}" height="${F.h}" fill="${bg === 'blue' ? '#B9D3EA' : '#FFFFFF'}"/>` +
    `<g transform="translate(${F.w / 2} ${F.h / 2}) scale(${s}) translate(${-cx} ${-cy.toFixed(2)})">${toSVG(shapes(sp, opts))}</g></svg>` +
    `<figcaption>${ok ? '이렇게 찍습니다' : '이대로면 다시 찍습니다'}</figcaption>`;
  return fig;
}
for (const el of $$('[data-minis]')) {
  const [bad, good] = MINIS[el.dataset.minis];
  el.append(mini(...bad, false), mini(...good, true));
}
