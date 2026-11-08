// Page behaviour: menu, section highlight, drawing callouts, careers, contact.
import { startChart, showFallback } from './chart/story.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- chart ----------
const story = $('.story');
if (story) {
  try {
    const chart = startChart(story);
    if (location.search.includes('debug')) window.__chart = chart;
  } catch (err) {
    showFallback($('.stage', story));
    if (window.console) console.warn('chart unavailable:', err && err.message);
  }
}

// ---------- mobile menu ----------
const menuBtn = $('.menu-btn');
const nav = $('#site-nav');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  menuBtn.querySelector('.menu-btn__label').textContent = open ? '닫기' : '메뉴';
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
nav?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn?.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
});
document.addEventListener('click', (e) => {
  if (menuBtn?.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setMenu(false);
});
matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

// ---------- current section in the nav ----------
const navLinks = $$('.site-nav ul a');
const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
const howGroup = ['problem', 'approach', 'how', 'try'];
const secIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    let id = e.target.id;
    if (howGroup.includes(id)) id = 'how';
    navLinks.forEach((a) => a.removeAttribute('aria-current'));
    const a = byId.get(id);
    if (a) a.setAttribute('aria-current', 'true');
  }
}, { rootMargin: '-50% 0px -50% 0px' });
['problem', 'approach', 'how', 'try', 'boat', 'field', 'team', 'backers', 'careers', 'contact'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) secIO.observe(el);
});
const heroIO = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) navLinks.forEach((a) => a.removeAttribute('aria-current'));
}, { rootMargin: '-50% 0px -50% 0px' });
const heroStep = $('.step--hero');
if (heroStep) heroIO.observe(heroStep);

// ---------- drawing ↔ parts list ----------
const drawing = $('[data-drawing]');
const partBtns = $$('.parts__btn');
function showPart(n, pinned) {
  drawing.classList.toggle('has-active', !!n);
  $$('.part, .callout', drawing).forEach((g) => g.classList.toggle('is-active', g.dataset.part === n));
  partBtns.forEach((b) => b.setAttribute('aria-pressed', String(pinned && b.closest('li').dataset.part === n)));
}
let pinnedPart = null;
partBtns.forEach((btn) => {
  const n = btn.closest('li').dataset.part;
  btn.addEventListener('click', () => {
    pinnedPart = pinnedPart === n ? null : n;
    showPart(pinnedPart, true);
  });
  btn.addEventListener('mouseenter', () => { if (!pinnedPart) showPart(n, false); });
  btn.addEventListener('mouseleave', () => { if (!pinnedPart) showPart(null, false); });
});
$$('.callout', drawing || document).forEach((g) => {
  g.addEventListener('mouseenter', () => { if (!pinnedPart) showPart(g.dataset.part, false); });
  g.addEventListener('mouseleave', () => { if (!pinnedPart) showPart(null, false); });
  g.addEventListener('click', () => { pinnedPart = pinnedPart === g.dataset.part ? null : g.dataset.part; showPart(pinnedPart, true); });
});

// ---------- form helpers ----------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function fieldError(input, msg) {
  const err = input.closest('.fld').querySelector('.fld__err');
  if (err && !err.id) err.id = input.id + '-err';
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
    err.textContent = msg;
    err.hidden = false;
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    if (err) { err.textContent = ''; err.hidden = true; }
  }
}
function validate(form, rules) {
  let first = null;
  for (const [name, check] of rules) {
    const input = form.elements[name];
    const msg = check(input.value.trim());
    fieldError(input, msg);
    if (msg && !first) first = input;
  }
  return first;
}
function liveRevalidate(form, rules) {
  for (const [name, check] of rules) {
    const input = form.elements[name];
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') fieldError(input, check(input.value.trim()));
    });
    input.addEventListener('blur', () => {
      if (input.value.trim()) fieldError(input, check(input.value.trim()));
    });
  }
}
const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.2"/><path d="m7.6 12.3 3 3 5.8-6.2"/></svg>';
function doneBox({ title, body, again }) {
  const box = document.createElement('div');
  box.className = 'done';
  box.setAttribute('role', 'status');
  box.tabIndex = -1;
  const head = document.createElement('p');
  head.className = 'done__head';
  head.innerHTML = CHECK_SVG;
  head.append(document.createTextNode(title));
  const p = document.createElement('p');
  p.textContent = body;
  const fine = document.createElement('p');
  fine.className = 'done__fine';
  fine.textContent = '가상 회사라 실제로 보낸 것은 없습니다. 입력한 내용도 저장하지 않았습니다.';
  box.append(head, p, fine);
  if (again) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--secondary btn--sm';
    b.textContent = again.label;
    b.addEventListener('click', again.onClick);
    box.append(b);
  }
  return box;
}
const sending = (btn, on) => { btn.disabled = on; btn.dataset.label ??= btn.textContent; btn.textContent = on ? '보내는 중…' : btn.dataset.label; };

// ---------- careers ----------
const tpl = $('#apply-template');
$$('.role').forEach((role, idx) => {
  const toggle = $('.role__toggle', role);
  const body = $('.role__body', role);
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    if (open && !reduceMotion()) {
      body.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
  });
  const applyBtn = $('.role__apply', role);
  applyBtn.addEventListener('click', () => openApply(role, idx, applyBtn));
});

function openApply(role, idx, applyBtn) {
  const frag = tpl.content.cloneNode(true);
  const form = frag.querySelector('form');
  const sfx = `-${idx + 1}`;
  form.querySelectorAll('[id]').forEach((el) => { el.id = el.id.replace(/(-err)?$/, (m) => sfx + m); });
  form.querySelectorAll('label[for]').forEach((l) => { l.htmlFor += sfx; });
  const title = form.querySelector('.apply__title');
  title.textContent = `${role.dataset.role} 지원서`;
  form.setAttribute('aria-label', title.textContent);
  applyBtn.hidden = true;
  applyBtn.after(form);
  form.elements.name.focus();

  const rules = [
    ['name', (v) => (v ? '' : '이름을 적어 주세요.')],
    ['email', (v) => (!v ? '답장을 받을 이메일을 적어 주세요.' : EMAIL.test(v) ? '' : '이메일 형식을 확인해 주세요. 예: name@example.com')],
    ['link', (v) => { if (!v) return ''; try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? '' : 'http:// 나 https:// 로 시작하는 주소를 적어 주세요.'; } catch { return '주소 형식을 확인해 주세요. 예: https://example.com/portfolio'; } }],
  ];
  liveRevalidate(form, rules);
  form.querySelector('[data-close]').addEventListener('click', () => {
    form.remove();
    applyBtn.hidden = false;
    applyBtn.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = validate(form, rules);
    if (bad) { bad.focus(); return; }
    const btn = form.querySelector('[type="submit"]');
    sending(btn, true);
    setTimeout(() => {
      const email = form.elements.email.value.trim();
      const box = doneBox({
        title: '지원서를 받았습니다',
        body: `${role.dataset.role} 자리 담당자가 닷새 안에 ${email} 주소로 답을 드립니다.`,
      });
      form.replaceWith(box);
      box.focus();
    }, 650);
  });
}

// ---------- contact ----------
const inquiry = $('#inquiry');
if (inquiry) {
  const rules = [
    ['name', (v) => (v ? '' : '이름을 적어 주세요.')],
    ['email', (v) => (!v ? '답장을 받을 이메일을 적어 주세요.' : EMAIL.test(v) ? '' : '이메일 형식을 확인해 주세요. 예: name@example.com')],
    ['message', (v) => (v ? '' : '문의 내용을 적어 주세요. 해역과 시기를 함께 적어 주시면 답이 빨라집니다.')],
  ];
  liveRevalidate(inquiry, rules);
  inquiry.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = validate(inquiry, rules);
    if (bad) { bad.focus(); return; }
    const btn = inquiry.querySelector('[type="submit"]');
    sending(btn, true);
    setTimeout(() => {
      const email = inquiry.elements.email.value.trim();
      const topic = inquiry.elements.topic.value;
      const box = doneBox({
        title: '문의를 받았습니다',
        body: `‘${topic}’ 문의로 접수했습니다. 영업일 2일 안에 ${email} 주소로 답장을 드립니다.`,
        again: {
          label: '다른 문의 쓰기',
          onClick: () => {
            inquiry.reset();
            sending(btn, false);
            box.replaceWith(inquiry);
            inquiry.elements.name.focus();
          },
        },
      });
      inquiry.replaceWith(box);
      box.focus();
    }, 700);
  });
}
// "문의 양식" link from careers preselects the topic
$$('a[data-topic]').forEach((a) => a.addEventListener('click', () => {
  const r = inquiry && [...inquiry.elements.topic].find((x) => x.value === a.dataset.topic);
  if (r) r.checked = true;
}));
