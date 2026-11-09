/*
 * gallery.zanviq.dev home. Reads data/works.json and turns it into an arcade select screen.
 * Add a work by adding an entry to works.json; nothing here needs to change.
 */
(function () {
  'use strict';

  // Display names for tags. Tags not listed here are shown as written in works.json.
  var TAG_LABELS = {
    client: '외주', landing: '랜딩', game: '게임', experiment: '실험', animation: '애니메이션',
    canvas: '캔버스', app: '앱', typography: '타이포', audio: '사운드', portfolio: '포트폴리오', pixel: '픽셀',
    webgl: 'WebGL', '3d': '3D', brand: '브랜드', promo: '홍보', office: '사무', interaction: '인터랙션',
    mobile: '모바일', svg: 'SVG', physics: '물리', demo: '데모'
  };

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid'), canvas = $('p-canvas'), ctx = canvas.getContext('2d');
  var works = [], tags = ['all'], mode = 0, list = [], sel = 0, busy = false, ready = false;
  var imgs = {};

  function get(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } }
  function put(store, key, val) { try { window[store].setItem(key, val); } catch (e) { /* private mode */ } }
  function label(t) { return TAG_LABELS[t] || t; }
  function kind(w) { return w.type === 'external' ? '외부 사이트' : (w.tags.indexOf('game') > -1 ? '게임' : '페이지'); }
  function host(url) { try { return new URL(url).host; } catch (e) { return url; } }

  /* ---------- sound: off unless the visitor turned it on before ---------- */
  var ac = null, soundOn = get('localStorage', 'gallery.sound') === 'on';
  function beep(f1, f2, dur, type) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = type || 'square';
      o.frequency.setValueAtTime(f1, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  function paintSound() {
    $('sound').setAttribute('aria-pressed', soundOn);
    $('sound').textContent = soundOn ? '소리 켬' : '소리 끔';
  }
  $('sound').addEventListener('click', function () {
    soundOn = !soundOn;
    put('localStorage', 'gallery.sound', soundOn ? 'on' : 'off');
    paintSound();
    beep(660, 990, 0.08);
  });
  paintSound();

  /* ---------- data ---------- */
  function clean(raw) {
    if (!Array.isArray(raw)) throw new Error('data/works.json must be an array');
    return raw.map(function (w) {
      if (!w || typeof w.slug !== 'string' || typeof w.title !== 'string' || typeof w.url !== 'string') return null;
      var external = w.type === 'external';
      var url = w.url.trim();
      if (external && !/^https?:\/\//i.test(url)) return null;          // external: http(s) only
      if (!external && /^[a-z][a-z0-9+.-]*:/i.test(url)) return null;   // internal: relative paths only
      var thumb = typeof w.thumbnail === 'string' ? w.thumbnail.trim() : '';
      if (thumb && /^[a-z][a-z0-9+.-]*:/i.test(thumb) && !/^https:\/\//i.test(thumb)) thumb = '';
      return {
        slug: w.slug, title: w.title, url: url, thumbnail: thumb,
        type: external ? 'external' : 'internal',
        tags: Array.isArray(w.tags) ? w.tags.filter(function (t) { return typeof t === 'string' && t; }) : [],
        year: isFinite(parseInt(w.year, 10)) ? parseInt(w.year, 10) : null
      };
    }).filter(Boolean);
  }

  function load() {
    $('p-title').textContent = 'LOADING';
    fetch('data/works.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('works.json ' + r.status); return r.json(); })
      .then(function (data) {
        works = clean(data);
        ready = true;
        marquee();
        buildModes();
        var last = restore();
        renderGrid(last && last.slug);
      })
      .catch(function (err) {
        console.error(err);
        showError();
      });
  }

  function marquee() {
    var sub = $('marquee-sub');
    sub.textContent = '';
    if (!works.length) { sub.textContent = '준비 중'; return; }
    var years = works.map(function (w) { return w.year; }).filter(Boolean);
    sub.appendChild(document.createTextNode('작품 ' + works.length));
    if (years.length) {
      var lo = Math.min.apply(null, years), hi = Math.max.apply(null, years);
      sub.appendChild(document.createElement('br'));
      sub.appendChild(document.createTextNode(lo === hi ? String(lo) : lo + '-' + hi));
    }
  }

  /* where you were before opening a work, so coming back lands on the same tile */
  function remember(w) { put('sessionStorage', 'gallery.last', JSON.stringify({ tag: tags[mode], slug: w.slug })); }
  function restore() {
    try {
      var last = JSON.parse(get('sessionStorage', 'gallery.last') || 'null');
      if (last && tags.indexOf(last.tag) > -1) mode = tags.indexOf(last.tag);
      return last;
    } catch (e) { return null; }
  }

  /* ---------- modes (tags) ----------
     Two groups: what a work is (always shown, in this order), then how it was made (only tags
     shared by at least two works, most used first). A one-work technique tab is noise. */
  var KINDS = ['client', 'landing', 'promo', 'office', 'brand', 'game', 'interaction', 'mobile'];
  var MIN_TECH = 2;
  var modesEl = $('modes');
  function buildModes() {
    var count = {};
    works.forEach(function (w) { w.tags.forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
    var kinds = KINDS.filter(function (t) { return count[t]; });
    var techs = Object.keys(count).filter(function (t) { return KINDS.indexOf(t) < 0 && count[t] >= MIN_TECH; })
      .sort(function (a, b) { return count[b] - count[a] || label(a).localeCompare(label(b), 'ko'); });
    tags = ['all'].concat(kinds, techs);
    modesEl.textContent = '';
    if (!works.length) return;
    var q = document.createElement('span');
    q.className = 'modes__key'; q.textContent = 'Q'; q.setAttribute('aria-hidden', 'true');
    modesEl.appendChild(q);
    tags.forEach(function (t, i) {
      if (i === kinds.length + 1 && techs.length && kinds.length) {
        var sep = document.createElement('span');
        sep.className = 'modes__sep';
        sep.setAttribute('aria-hidden', 'true');
        modesEl.appendChild(sep);
      }
      var b = document.createElement('button');
      b.className = 'mode';
      b.type = 'button';
      b.dataset.i = i;
      b.textContent = t === 'all' ? '전체' : label(t);
      b.setAttribute('aria-label', (t === 'all' ? '전체' : label(t)) + ' ' + (t === 'all' ? works.length : count[t]) + '개');
      modesEl.appendChild(b);
    });
    var e = q.cloneNode(); e.textContent = 'E';
    modesEl.appendChild(e);
    paintModes();
  }
  // the row scrolls sideways on narrow screens: fade the edge that has more tabs behind it
  function edgeModes() {
    var max = modesEl.scrollWidth - modesEl.clientWidth;
    modesEl.classList.toggle('more-l', modesEl.scrollLeft > 2);
    modesEl.classList.toggle('more-r', max > 2 && modesEl.scrollLeft < max - 2);
  }
  modesEl.addEventListener('scroll', edgeModes, { passive: true });
  addEventListener('resize', edgeModes);
  function paintModes() {
    // one tab stop for the whole row; Q / E (or a click) switch modes
    modesEl.querySelectorAll('.mode').forEach(function (b) {
      var on = +b.dataset.i === mode;
      b.setAttribute('aria-pressed', on);
      b.tabIndex = on ? 0 : -1;
    });
    var cur = modesEl.querySelector('[data-i="' + mode + '"]');
    if (cur) { // keep the active mode in view without moving the page
      var l = cur.offsetLeft - modesEl.offsetLeft, r = l + cur.offsetWidth;
      if (l < modesEl.scrollLeft) modesEl.scrollLeft = l - 24;
      else if (r > modesEl.scrollLeft + modesEl.clientWidth) modesEl.scrollLeft = r - modesEl.clientWidth + 24;
    }
    edgeModes();
  }
  modesEl.addEventListener('click', function (e) {
    var b = e.target.closest('.mode');
    if (b) { wake(); setMode(+b.dataset.i); }
  });
  function setMode(i) {
    if (!ready || !works.length) return;
    mode = (i + tags.length) % tags.length;
    paintModes();
    beep(440, 330, 0.07);
    renderGrid();
  }

  /* ---------- thumbnails ---------- */
  function image(src) {
    if (!imgs[src]) {
      var im = new Image();
      im.decoding = 'async';
      im.src = src;
      imgs[src] = im;
    }
    return imgs[src];
  }
  function whenLoaded(im, ok, fail) {
    if (im.complete) { if (im.naturalWidth) ok(); else fail(); return; }
    im.addEventListener('load', ok, { once: true });
    im.addEventListener('error', fail, { once: true });
  }
  // stand-in when a work has no thumbnail: a mirrored pixel pattern seeded by its slug
  function identicon(c, slug, size) {
    var h = 2166136261;
    for (var i = 0; i < slug.length; i++) { h ^= slug.charCodeAt(i); h = Math.imul(h, 16777619); }
    var x = c.getContext('2d'), n = 6, cell = size / n;
    var hues = ['#ff6a1a', '#ffd23f', '#2ec4b6', '#ff3b30', '#f4f1e8'];
    x.fillStyle = '#111';
    x.fillRect(0, 0, size, size);
    x.fillStyle = hues[(h >>> 0) % hues.length];
    for (var y = 0; y < n; y++) for (var k = 0; k < n / 2; k++) {
      if ((h >>> ((y * 3 + k) % 31)) & 1) {
        x.fillRect(k * cell, y * cell, cell, cell);
        x.fillRect((n - 1 - k) * cell, y * cell, cell, cell);
      }
    }
  }
  function drawTile(c, w) {
    if (!w.thumbnail) return identicon(c, w.slug, 24);
    var im = image(w.thumbnail);
    whenLoaded(im, function () {
      var s = Math.min(im.naturalWidth, im.naturalHeight);
      c.getContext('2d').drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 24, 24);
    }, function () { identicon(c, w.slug, 24); });
  }
  // tiles only fetch their thumbnail once they scroll near view
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      var w = list[+en.target.dataset.i];
      if (w) drawTile(en.target.querySelector('canvas'), w);
    });
  }, { rootMargin: '200px' }) : null;

  /* ---------- grid ---------- */
  function tiles() { return grid.querySelectorAll('.tile'); }
  function renderGrid(keepSlug) {
    var t = tags[mode];
    list = works.filter(function (w) { return t === 'all' || w.tags.indexOf(t) > -1; });
    if (io) io.disconnect();
    grid.textContent = '';
    if (!list.length) return showEmpty();
    list.forEach(function (w, i) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'tile' + (reduce ? '' : ' is-in');
      a.href = w.url;
      a.dataset.i = i;
      a.tabIndex = -1;
      if (w.type === 'external') { a.target = '_blank'; a.rel = 'noopener'; }
      a.setAttribute('aria-label', w.title + (w.year ? ', ' + w.year : '') + ', ' + kind(w) + (w.type === 'external' ? ', 새 탭에서 열림' : ''));
      a.style.animationDelay = Math.min(i, 16) * 35 + 'ms';
      var c = document.createElement('canvas');
      c.width = c.height = 24;
      c.setAttribute('aria-hidden', 'true');
      var no = document.createElement('span');
      no.className = 'tile__no';
      no.textContent = String(works.indexOf(w) + 1).padStart(2, '0');
      no.setAttribute('aria-hidden', 'true');
      a.appendChild(c);
      a.appendChild(no);
      if (w.type === 'external') {
        var ex = document.createElement('span');
        ex.className = 'tile__ext';
        ex.textContent = '외부';
        ex.setAttribute('aria-hidden', 'true');
        a.appendChild(ex);
      }
      li.appendChild(a);
      grid.appendChild(li);
      if (io) io.observe(a); else drawTile(c, w);
    });
    grid.scrollTop = 0;
    var start = 0;
    if (keepSlug) list.forEach(function (w, i) { if (w.slug === keepSlug) start = i; });
    select(start, { silent: true });
  }

  function cols() { return getComputedStyle(grid).gridTemplateColumns.split(' ').length; }

  function select(i, opt) {
    opt = opt || {};
    if (!list.length) return;
    sel = Math.max(0, Math.min(list.length - 1, i));
    var ts = tiles();
    ts.forEach(function (t, k) {
      t.classList.toggle('is-sel', k === sel);
      t.tabIndex = k === sel ? 0 : -1;
    });
    keepVisible(ts[sel], opt.user);
    var w = list[sel];
    $('p-title').textContent = w.title;
    $('p-stats').hidden = false;
    $('p-kind').textContent = kind(w);
    $('p-year').textContent = w.year || '-';
    $('p-tags').textContent = w.tags.length ? w.tags.map(label).join(', ') : '-';
    $('p-ext').hidden = w.type !== 'external';
    $('p-prompt').textContent = w.type === 'external' ? 'A 버튼: 새 탭에서 ' + host(w.url)
      : (w.tags.indexOf('game') > -1 ? 'A 버튼으로 시작' : 'A 버튼으로 입장');
    canvas.setAttribute('aria-label', w.title + ' 미리보기');
    mosaic(w);
    if (!opt.silent) beep(880, null, 0.04);
  }
  function keepVisible(tile, user) {
    if (!tile) return;
    if (grid.scrollHeight > grid.clientHeight + 1) { // desktop: the grid scrolls inside the screen
      var top = tile.offsetTop - 22, bottom = tile.offsetTop + tile.offsetHeight + 14;
      if (top < grid.scrollTop) grid.scrollTop = top;
      else if (bottom > grid.scrollTop + grid.clientHeight) grid.scrollTop = bottom - grid.clientHeight;
    } else if (user) {
      tile.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* preview: blocks resolve into the picture */
  var mosaicRun = 0;
  function mosaic(w) {
    var run = ++mosaicRun;
    stopStatic();
    ctx.imageSmoothingEnabled = false;
    if (!w.thumbnail) return noImage(w);
    var im = image(w.thumbnail);
    whenLoaded(im, function () {
      if (run !== mosaicRun) return;
      var steps = reduce ? [0] : [6, 12, 24, 48, 0], k = 0;
      var tmp = mosaic.tmp || (mosaic.tmp = document.createElement('canvas'));
      (function next() {
        if (run !== mosaicRun) return;
        var s = steps[k++];
        if (!s) { ctx.imageSmoothingEnabled = true; ctx.drawImage(im, 0, 0, 480, 360); return; }
        var sh = Math.round(s * 0.75);
        tmp.width = s; tmp.height = sh;
        tmp.getContext('2d').drawImage(im, 0, 0, s, sh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, s, sh, 0, 0, 480, 360);
        setTimeout(next, 55);
      })();
    }, function () { if (run === mosaicRun) noImage(w); });
  }
  function noImage(w) {
    var c = document.createElement('canvas');
    c.width = c.height = 240;
    identicon(c, w.slug, 240);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 480, 360);
    ctx.drawImage(c, 120, 60, 240, 240);
  }

  /* empty board and load errors: TV static */
  var staticRun = 0;
  function startStatic() {
    var run = ++staticRun;
    var img = ctx.createImageData(160, 120);
    var tmp = document.createElement('canvas');
    tmp.width = 160; tmp.height = 120;
    (function frame() {
      if (run !== staticRun) return;
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.random() * 90 | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tmp.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, 480, 360);
      if (!reduce) setTimeout(function () { requestAnimationFrame(frame); }, 70);
    })();
  }
  function stopStatic() { staticRun++; }

  function blank(title, prompt) {
    mosaicRun++;
    $('p-title').textContent = title;
    $('p-stats').hidden = true;
    $('p-ext').hidden = true;
    $('p-prompt').textContent = prompt;
    canvas.setAttribute('aria-label', '신호 없음');
    startStatic();
  }
  function showEmpty() {
    blank('NO SIGNAL', '작품을 준비하고 있습니다. 문의는 동전 투입구로.');
    var li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '아직 걸린 작품이 없습니다.';
    grid.appendChild(li);
  }
  function showError() {
    blank('LOAD ERROR', '');
    grid.textContent = '';
    var li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '작품 목록을 불러오지 못했습니다. ';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'retry';
    b.textContent = '다시 불러오기';
    b.addEventListener('click', load);
    li.appendChild(b);
    grid.appendChild(li);
  }

  /* ---------- moving + opening ---------- */
  // tilt: 'hold' keeps the stick over until release (key or finger still down), 'tap' springs back
  function move(dir, user, tilt) {
    if (busy || !list.length) return;
    var c = cols(), i = sel;
    if (dir === 'left') i = sel - 1;
    if (dir === 'right') i = sel + 1;
    if (dir === 'up') i = sel - c;
    if (dir === 'down') i = sel + c;
    if (tilt !== 'none') tiltStick(dir, tilt === 'hold');
    if (i < 0 || i >= list.length) { beep(160, null, 0.06, 'sawtooth'); return; }
    select(i, { user: user });
    if (grid.contains(document.activeElement)) tiles()[sel].focus({ preventScroll: true });
  }
  /* the stick is a photograph per direction (assets/img/stick.webp); a tilt swaps the frame */
  var stick = $('stick'), heldKey = null;
  function tiltStick(dir, hold) {
    stick.dataset.tilt = dir;
    clearTimeout(tiltStick.t);
    if (!hold) tiltStick.t = setTimeout(centreStick, 150);
  }
  function centreStick() {
    clearTimeout(tiltStick.t);
    heldKey = null;
    delete stick.dataset.tilt;
  }
  function press(b) {
    b.classList.add('is-down');
    clearTimeout(b.upT);
    b.upT = setTimeout(function () { b.classList.remove('is-down'); }, 140);
  }
  function flashReady(big, small, ms) {
    $('ready-big').textContent = big;
    $('ready-small').textContent = small;
    $('ready').hidden = false;
    clearTimeout(flashReady.t);
    if (ms) flashReady.t = setTimeout(function () { $('ready').hidden = true; }, ms);
  }

  function confirm() {
    if (busy || !list.length) return;
    var w = list[sel], tile = tiles()[sel];
    press($('btn-a'));
    beep(523, 1568, 0.25);
    remember(w);
    if (w.type === 'external') {
      // open inside the key/click handler so popup blockers allow it
      window.open(w.url, '_blank', 'noopener');
      if (!reduce) { tile.classList.add('is-confirm'); flashReady('EXIT', w.title, 900); setTimeout(function () { tile.classList.remove('is-confirm'); }, 600); }
      return;
    }
    if (reduce) { location.href = w.url; return; }
    busy = true;
    tile.classList.add('is-confirm');
    setTimeout(function () { flashReady(w.tags.indexOf('game') > -1 ? 'READY' : 'ENTER', w.title); }, 380);
    setTimeout(function () { location.href = w.url; }, 1000);
  }

  var pointerType = 'mouse';
  grid.addEventListener('pointerdown', function (e) { pointerType = e.pointerType; });
  grid.addEventListener('pointerover', function (e) {
    var t = e.target.closest('.tile');
    if (!t || e.pointerType !== 'mouse' || busy) return;
    wake();
    if (+t.dataset.i !== sel) select(+t.dataset.i);
  });
  grid.addEventListener('click', function (e) {
    var t = e.target.closest('.tile');
    if (!t) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // new tab / window: let the link work
    e.preventDefault();
    var i = +t.dataset.i;
    if (i !== sel && pointerType !== 'mouse') { select(i, { user: true }); return; } // touch: first tap picks
    if (i !== sel) select(i);
    confirm();
  });

  /* ---------- contact (insert coin) ---------- */
  var credits = 0, lastFocus = null;
  function buildContact() {
    var box = $('c-links');
    box.textContent = '';
    $('foot').querySelectorAll('a').forEach(function (src) {
      var href = src.getAttribute('href');
      if (src.hidden || !href) return;
      var a = document.createElement('a');
      a.href = href;
      if (src.target) { a.target = src.target; a.rel = 'noopener'; }
      var k = document.createElement('span');
      var v = document.createElement('span');
      var mail = /^mailto:/i.test(href);
      k.textContent = mail ? '이메일' : (src.dataset.label || src.textContent);
      v.textContent = mail ? href.slice(7) : host(href);
      a.appendChild(k);
      a.appendChild(v);
      box.appendChild(a);
    });
  }
  function insertCoin() {
    // the coin entry's lamp flashes when a coin is taken (assets/img/slot.webp, lit frame)
    var slot = $('slot');
    slot.classList.add('is-lit');
    clearTimeout(insertCoin.t);
    insertCoin.t = setTimeout(function () { slot.classList.remove('is-lit'); }, 650);
    beep(988, 1319, 0.12);
    lastFocus = document.activeElement;
    setTimeout(function () {
      credits = Math.min(99, credits + 1);
      $('credit').textContent = 'CREDIT ' + String(credits).padStart(2, '0');
      buildContact();
      $('contact').hidden = false;
      var first = $('c-links').querySelector('a');
      if (first) first.focus();
    }, reduce ? 0 : 420);
  }
  function closeContact() {
    if ($('contact').hidden) return false;
    $('contact').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    return true;
  }
  $('slot').addEventListener('click', insertCoin);
  $('coin-text').addEventListener('click', insertCoin);
  $('contact').addEventListener('click', function (e) { if (e.target === this) closeContact(); });

  /* ---------- controls ---------- */
  // like a real stick: it goes over when pushed and springs back when let go
  document.querySelectorAll('.stick button').forEach(function (b) {
    b.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      wake();
      move(b.dataset.dir, true, 'hold');
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, centreStick); });
    b.addEventListener('click', function (e) {
      if (e.detail) return;               // pointer clicks already moved on pointerdown
      wake();
      move(b.dataset.dir, true, 'tap');   // Enter / Space on the focused direction
    });
  });
  $('btn-a').addEventListener('click', function () { wake(); if ($('contact').hidden) confirm(); });
  $('btn-b').addEventListener('click', function () { wake(); press(this); if (!closeContact()) setMode(mode + 1); });

  var KEYS = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  addEventListener('keydown', function (e) {
    wake();
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var key = (e.key || '').toLowerCase();
    var contactOpen = !$('contact').hidden;
    if (contactOpen) {
      if (key === 'escape' || key === 'x' || key === 'b') { closeContact(); return; }
      if (key === 'tab') { // keep focus inside the contact screen
        var f = $('contact').querySelectorAll('a');
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
      return;
    }
    // buttons and links outside the grid keep their own Enter / Space
    var t = e.target;
    if (t && t.closest && t.closest('button, .foot a, .retry') && (key === 'enter' || key === ' ')) return;
    var dir = KEYS[key];
    if (dir) { e.preventDefault(); heldKey = key; move(dir, true, 'hold'); return; }
    if (key === 'enter' || key === ' ' || key === 'z') { e.preventDefault(); confirm(); return; }
    if (key === 'q') setMode(mode - 1);
    if (key === 'e') setMode(mode + 1);
    if (key === 'c') insertCoin();
  });
  addEventListener('keyup', function (e) {
    if ((e.key || '').toLowerCase() === heldKey) centreStick();
  });
  addEventListener('blur', centreStick);

  /* ---------- attract mode after 14s idle ---------- */
  var idleT = null, demoT = null;
  function wake() {
    clearTimeout(idleT);
    if (demoT) { clearInterval(demoT); demoT = null; $('demo').hidden = true; }
    if (!reduce) idleT = setTimeout(startDemo, 14000);
  }
  function startDemo() {
    if (busy || !$('contact').hidden || list.length < 2 || document.hidden) return wake();
    $('demo').hidden = false;
    demoT = setInterval(function () {
      var dirs = ['left', 'right', 'up', 'down'];
      var d = dirs[Math.floor(Math.random() * 4)];
      var c = cols(), i = sel + (d === 'left' ? -1 : d === 'right' ? 1 : d === 'up' ? -c : c);
      if (i >= 0 && i < list.length) { select(i, { silent: true }); tiltStick(d); }
    }, 1500);
  }
  ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) { addEventListener(ev, wake, { passive: true }); });

  /* back button after opening a work: the page may come back from cache mid-animation */
  addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    busy = false;
    $('ready').hidden = true;
    tiles().forEach(function (t) { t.classList.remove('is-confirm'); });
    wake();
  });

  /* ---------- boot: the CRT warms up once per visit ---------- */
  var screen = $('screen'), marq = $('marquee');
  if (reduce || get('sessionStorage', 'gallery.booted')) {
    screen.classList.remove('is-booting');
    marq.classList.remove('is-booting');
  } else {
    put('sessionStorage', 'gallery.booted', '1');
    setTimeout(function () { screen.classList.remove('is-booting'); }, 700);
    setTimeout(function () { marq.classList.remove('is-booting'); }, 1000);
  }
  load();
  wake();
})();
