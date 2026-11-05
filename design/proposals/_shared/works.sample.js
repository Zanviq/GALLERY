/*
 * 시안 공통 더미 데이터. 항목 형식은 data/works.json 과 같다.
 * 시안 단계라 작품 페이지가 없으므로, 작품 링크를 누르면 이동 대신 어디로 갈지 알려 주는 토스트를 띄운다.
 */
(function () {
  var works = [
    { slug: 'neon-landing',    title: 'Neon Landing',   type: 'internal', url: 'works/neon-landing/',          tags: ['landing', 'animation'],     thumbnail: 'thumbnails/neon-landing.webp',    year: 2026 },
    { slug: 'oven-bakery',     title: '오븐집 베이커리', type: 'external', url: 'https://ovenjip.example/',      tags: ['client', 'landing'],        thumbnail: 'thumbnails/oven-bakery.webp',     year: 2026 },
    { slug: 'tile-drop',       title: 'Tile Drop',      type: 'internal', url: 'works/tile-drop/',             tags: ['game', 'canvas'],           thumbnail: 'thumbnails/tile-drop.webp',       year: 2026 },
    { slug: 'orbit-clock',     title: 'Orbit Clock',    type: 'internal', url: 'works/orbit-clock/',           tags: ['canvas', 'experiment'],     thumbnail: 'thumbnails/orbit-clock.webp',     year: 2025 },
    { slug: 'studio-han',      title: '한건축사사무소',   type: 'external', url: 'https://studiohan.example/',   tags: ['client', 'portfolio'],      thumbnail: 'thumbnails/studio-han.webp',      year: 2025 },
    { slug: 'pixel-garden',    title: 'Pixel Garden',   type: 'internal', url: 'works/pixel-garden/',          tags: ['game'],                     thumbnail: 'thumbnails/pixel-garden.webp',    year: 2026 },
    { slug: 'hangul-specimen', title: '한글 견본집',     type: 'internal', url: 'works/hangul-specimen/',       tags: ['typography', 'experiment'], thumbnail: 'thumbnails/hangul-specimen.webp', year: 2025 },
    { slug: 'rain-synth',      title: 'Rain Synth',     type: 'internal', url: 'works/rain-synth/',            tags: ['audio', 'canvas'],          thumbnail: 'thumbnails/rain-synth.webp',      year: 2025 },
    { slug: 'dental-clinic',   title: '밝은미소치과',    type: 'external', url: 'https://brightsmile.example/', tags: ['client', 'landing'],        thumbnail: 'thumbnails/dental-clinic.webp',   year: 2026 },
    { slug: 'ledger-lite',     title: 'Ledger Lite',    type: 'external', url: 'https://ledger.example/',      tags: ['app'],                      thumbnail: 'thumbnails/ledger-lite.webp',     year: 2026 },
    { slug: 'snake-merge',     title: 'Snake Merge',    type: 'internal', url: 'works/snake-merge/',           tags: ['game'],                     thumbnail: 'thumbnails/snake-merge.webp',     year: 2025 },
    { slug: 'paper-fold',      title: 'Paper Fold',     type: 'internal', url: 'works/paper-fold/',            tags: ['animation', 'experiment'],  thumbnail: 'thumbnails/paper-fold.webp',      year: 2026 }
  ];

  var tagLabels = {
    client: '외주', landing: '랜딩', game: '게임', experiment: '실험', animation: '애니메이션',
    canvas: '캔버스', app: '앱', typography: '타이포', audio: '사운드', portfolio: '포트폴리오'
  };

  var G = window.GALLERY_SAMPLE = {
    works: works,
    tagLabels: tagLabels,
    // 카카오톡 오픈채팅 주소는 아직 없다. 받으면 여기만 바꾸면 된다.
    contact: { email: 'zanviq.dev@gmail.com', kakao: 'https://open.kakao.com/o/XXXXXXXX' },
    base: '../_shared/',
    thumb: function (w) { return G.base + w.thumbnail; },
    href: function (w) { return w.type === 'external' ? w.url : '../../../' + w.url; },
    host: function (w) { try { return new URL(w.url).host; } catch (e) { return w.url; } },
    label: function (t) { return tagLabels[t] || t; },
    /* 태그 목록: 많이 쓰인 순. 외주(client)는 항상 앞에 둔다. */
    tags: function () {
      var count = {};
      works.forEach(function (w) { w.tags.forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
      return Object.keys(count).sort(function (a, b) {
        if (a === 'client') return -1;
        if (b === 'client') return 1;
        return count[b] - count[a];
      });
    },
    open: function (w) {
      if (w.type === 'external') G.toast('실제로는 새 탭에서 ' + w.url + ' 을 엽니다.');
      else G.toast('시안이라 작품 페이지는 아직 없습니다. 실제로는 ' + w.url + ' 로 이동합니다.');
    },
    toast: function (msg) {
      var el = document.querySelector('.sample-toast');
      if (!el) {
        el = document.createElement('div');
        el.className = 'sample-toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add('is-on');
      clearTimeout(G._tt);
      G._tt = setTimeout(function () { el.classList.remove('is-on'); }, 3200);
    }
  };

  var css = document.createElement('style');
  css.textContent =
    '.sample-toast{position:fixed;left:50%;bottom:24px;z-index:9999;max-width:min(92vw,560px);' +
    'transform:translate(-50%,16px);opacity:0;pointer-events:none;padding:12px 16px;font:14px/1.5 var(--toast-font,system-ui);' +
    'background:var(--toast-bg,#1d1b24);color:var(--toast-fg,#fbfbfd);border-radius:var(--toast-radius,4px);' +
    'transition:opacity .2s,transform .2s}' +
    '.sample-toast.is-on{opacity:1;transform:translate(-50%,0)}';
  document.head.appendChild(css);

  // 시안 전용: 작품 링크와 아직 없는 오픈채팅 링크를 가로챈다. 시안 쪽 핸들러가 먼저 preventDefault 하면 건드리지 않는다.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[data-work], a[data-contact="kakao"]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.contact === 'kakao') { G.toast('오픈채팅 주소를 받으면 연결합니다.'); return; }
    var w = works.find(function (x) { return x.slug === a.dataset.work; });
    if (w) G.open(w);
  });
})();
