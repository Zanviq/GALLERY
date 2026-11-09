// 가락 65 — 1차 예약 폼. 아무것도 보내지 않는다. 결과는 이 브라우저의 localStorage 에만 남긴다.
(function () {
  'use strict';
  var root = document.querySelector('[data-reserve]');
  if (!root) return;

  var KEY = 'garak65-reservation';
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 동작 */ } },
    del: function () { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }
  };

  var PRICE = { full: 398000, barebone: 298000 };
  var KIT = { full: '완성품', barebone: '베어본' };
  var COLOR = { azalea: '진달래', silver: '은', black: '먹' };
  var SWITCH = { goyo: '고요 (리니어)', maru: '마루 (택타일)', ttogak: '또각 (클릭)' };

  var form = root.querySelector('[data-form]');
  var slip = root.querySelector('[data-slip]');
  var email = form.querySelector('[data-email]');
  var err = form.querySelector('[data-email-err]');
  var total = form.querySelector('[data-total]');
  var hint = form.querySelector('[data-barebone-hint]');
  var switchInputs = form.querySelectorAll('input[name="switch"]');

  function won(n) { return n.toLocaleString('ko-KR'); }
  function value(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }

  function sync() {
    var kit = value('kit');
    total.textContent = won(PRICE[kit]);
    var bare = kit === 'barebone';
    hint.hidden = !bare;
    for (var i = 0; i < switchInputs.length; i++) switchInputs[i].disabled = bare;
  }

  function check() {
    var v = email.value.trim();
    var msg = '';
    if (!v) msg = '이메일을 적어 주세요. 출고 안내를 이 주소로 보냅니다.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = '이메일 형식이 맞지 않습니다. 예: name@example.com';
    err.textContent = msg;
    err.hidden = !msg;
    email.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function show(r, focus) {
    slip.querySelector('[data-slip-no]').textContent = r.no;
    slip.querySelector('[data-slip-kit]').textContent = KIT[r.kit];
    slip.querySelector('[data-slip-color]').textContent = COLOR[r.color];
    slip.querySelector('[data-slip-switch]').textContent = r.kit === 'barebone' ? '없음 (베어본)' : SWITCH[r.sw];
    slip.querySelector('[data-slip-total]').textContent = won(PRICE[r.kit]);
    slip.querySelector('[data-slip-mail]').textContent = r.email + ' 주소로 출고 2주 전에 결제 안내를 보냅니다.';
    form.hidden = true;
    slip.hidden = false;
    if (focus) slip.focus();
  }

  form.addEventListener('change', function (e) {
    if (e.target.name === 'kit') sync();
  });
  email.addEventListener('blur', function () { if (email.value) check(); });
  email.addEventListener('input', function () { if (!err.hidden) check(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!check()) { email.focus(); return; }
    var r = {
      no: 'GR65-1-' + String(Math.floor(Math.random() * 300) + 1).padStart(4, '0'),
      kit: value('kit'), color: value('color'), sw: value('switch'), email: email.value.trim()
    };
    store.set(r);
    show(r, true);
  });

  slip.querySelector('[data-slip-reset]').addEventListener('click', function () {
    store.del();
    slip.hidden = true;
    form.hidden = false;
    form.querySelector('input[name="kit"]:checked').focus();
  });

  sync();
  var saved = store.get();
  if (saved && saved.no && PRICE[saved.kit] && COLOR[saved.color]) show(saved, false);
})();
