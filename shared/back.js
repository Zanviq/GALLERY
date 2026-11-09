/*
 * A small "back to the gallery" badge for work pages.
 *
 *   <script src="/shared/back.js" defer></script>
 *   <script src="/shared/back.js" data-position="bottom-right" data-theme="light" defer></script>
 *
 * data-position: bottom-left (default) | bottom-right | top-left | top-right
 * data-theme:    dark (default) | light
 * It lives in a shadow root, so it neither inherits nor leaks styles.
 * On narrow screens it slides out of the way while the page scrolls down and
 * comes back on scroll up, so it never sits on top of what is being read.
 */
(function () {
  'use strict';
  if (window.top !== window.self) return; // not inside the gallery's own previews
  var script = document.currentScript;
  var pos = (script && script.dataset.position) || 'bottom-left';
  var light = script && script.dataset.theme === 'light';
  var v = pos.indexOf('top') === 0 ? 'top' : 'bottom';
  var h = /right$/.test(pos) ? 'right' : 'left';

  function mount() {
    var host = document.createElement('div');
    host.setAttribute('data-gallery-back', '');
    var root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      'a{position:fixed;' + v + ':max(12px,env(safe-area-inset-' + v + '));' + h + ':max(12px,env(safe-area-inset-' + h + '));z-index:2147483000;' +
      'display:flex;align-items:center;gap:8px;height:36px;padding:0 12px 0 8px;border-radius:18px;text-decoration:none;' +
      'font:500 13px/1 system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;letter-spacing:0;' +
      (light ? 'background:#ffffff;color:#111214;box-shadow:0 0 0 1px rgb(17 18 20 / .2),0 6px 16px -8px rgb(0 0 0 / .35);'
             : 'background:#111214;color:#ffd23f;box-shadow:0 0 0 1px rgb(255 255 255 / .14),0 6px 16px -8px rgb(0 0 0 / .6);') +
      'transition:transform .2s ease,box-shadow .15s ease}' +
      'a:hover{transform:translateY(-1px)}' +
      'a.away{transform:translateY(' + (v === 'top' ? '-' : '') + 'calc(100% + 24px))}' +
      'a.away:focus-visible{transform:none}' +
      'a:focus-visible{outline:2px solid #ff6a1a;outline-offset:2px}' +
      'svg{width:20px;height:20px;flex:none;border-radius:4px}' +
      '.more{max-width:0;overflow:hidden;white-space:nowrap;transition:max-width .25s ease}' +
      'a:hover .more,a:focus-visible .more{max-width:9em}' +
      '@media (prefers-reduced-motion:reduce){a,.more{transition:none}}' +
      '@media print{a{display:none}}' +
      '</style>' +
      '<a href="/" aria-label="zanviq gallery로 돌아가기">' +
      '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><rect width="16" height="16" fill="#ff6a1a"/>' +
      '<g fill="#1a1714"><rect x="4" y="3" width="8" height="2"/><rect x="10" y="5" width="2" height="1"/><rect x="9" y="6" width="2" height="1"/>' +
      '<rect x="8" y="7" width="2" height="1"/><rect x="7" y="8" width="2" height="1"/><rect x="6" y="9" width="2" height="1"/>' +
      '<rect x="5" y="10" width="2" height="1"/><rect x="4" y="11" width="8" height="2"/></g></svg>' +
      '<span>gallery</span><span class="more">로 돌아가기</span></a>';
    document.body.appendChild(host);

    // Narrow screens: get out of the way while reading down, return on the way up.
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
    if (!narrow) return;
    var link = root.querySelector('a');
    var lastY = window.scrollY, ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      if (!narrow.matches || y < 80) link.classList.remove('away');
      else if (y > lastY + 6) link.classList.add('away');
      else if (y < lastY - 6) link.classList.remove('away');
      else return;
      lastY = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
