// 정면사진관: the page is plain HTML. Script only folds the menu on phones and lets the visitor take the
// format guides off the photographs to see them clean.
document.documentElement.classList.add('js');
const $ = (s) => document.querySelector(s);

// table of contents on phones
const tocBtn = $('[data-toc-btn]');
const toc = $('#toc');
function setToc(open) {
  tocBtn.setAttribute('aria-expanded', String(open));
  toc.classList.toggle('is-open', open);
}
tocBtn.addEventListener('click', () => setToc(tocBtn.getAttribute('aria-expanded') !== 'true'));
toc.addEventListener('click', (e) => { if (e.target.closest('a')) setToc(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && tocBtn.getAttribute('aria-expanded') === 'true') { setToc(false); tocBtn.focus(); }
});

// guides on / off (a toggle button: the label stays, aria-pressed carries the state)
const guides = $('[data-guides]');
const formats = $('#formats');
guides.hidden = false;
guides.addEventListener('click', () => {
  const clean = guides.getAttribute('aria-pressed') !== 'true';
  guides.setAttribute('aria-pressed', String(clean));
  formats.classList.toggle('is-clean', clean);
});
