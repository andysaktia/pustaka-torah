/* Pustaka Torah - navigasi bawah (mobile) + sheet "Lainnya"
   Mandiri: membuat DOM-nya sendiri, memakai tautan hash (#/...) biasa,
   jadi tidak perlu mengubah router. Sesuaikan rute di bagian CONFIG
   atau lewat window.PUSTAKA_NAV_CONFIG sebelum berkas ini dimuat. */
(function () {
  'use strict';

  if (window.PustakaBottomNav) return;

  var DEFAULTS = {
    /* Rute asli Pustaka Torah (lihat js/router.js):
       p perpustakaan, c telusur, b kitab, r baca, j jalur belajar, s cari,
       t topik, h hari ini, x acak, g terjemahan, k kamus, f rujukan, i istilah */

    /* Rute yang menyembunyikan nav. null = nav selalu tampil (termasuk layar baca).
       Untuk menyembunyikannya di layar baca: hideOn: /^#\/r(\/|$)/ */
    hideOn: null,

    /* 4 tab utama; slot ke-5 selalu "Lainnya" */
    tabs: [
      { label: 'Beranda', icon: 'home', href: '#/', match: /^(#\/?)?$/ },
      { label: 'Pustaka', icon: 'books', href: '#/p', match: /^#\/(p|c|b|r)(\/|$)/ },
      { label: 'Belajar', icon: 'route', href: '#/j', match: /^#\/j(\/|$)/ },
      { label: 'Cari', icon: 'search', href: '#/s', match: /^#\/s(\/|$)/ }
    ],

    /* Isi sheet "Lainnya": semua item menu header yang tidak punya tab */
    more: [
      { label: 'Hari ini', icon: 'calendar', href: '#/h', match: /^#\/h(\/|$)/ },
      { label: 'Topik dan tema', icon: 'tree', href: '#/t', match: /^#\/t(\/|$)/ },
      { label: 'Terjemahan', icon: 'language', href: '#/g', match: /^#\/g(\/|$)/ },
      { label: 'Kamus', icon: 'book', href: '#/k', match: /^#\/k(\/|$)/ },
      { label: 'Rujukan', icon: 'quote', href: '#/f', match: /^#\/f(\/|$)/ },
      { label: 'Istilah', icon: 'list', href: '#/i', match: /^#\/i(\/|$)/ },
      { label: 'Bacaan acak', icon: 'shuffle', href: '#/x', match: /^#\/x(\/|$)/ },
      { label: 'Ganti tema', icon: 'sun', click: '#th' }
    ],

    moreLabel: 'Lainnya',
    moreTitle: 'Menu lainnya'
  };

  var ICONS = {
    home: '<path d="M5 12H3l9-9 9 9h-2"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>',
    books: '<rect x="4" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><path d="M16.5 6.2l3.4 13"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H12"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>',
    dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    tree: '<rect x="10" y="3" width="4" height="4" rx="1"/><rect x="3" y="17" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/><path d="M5 17v-4h14v4M12 7v6"/>',
    quote: '<path d="M10 11H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.7-1.3 4.3-4 5"/><path d="M19 11h-4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.7-1.3 4.3-4 5"/>',
    scroll: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h6"/>',
    bookmark: '<path d="M18 7v14l-6-4-6 4V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4z"/>',
    language: '<path d="M4 5h7M9 3v2c0 4.4-2.2 8-5 8"/><path d="M5 9c0 2.1 3 3.9 6.700 4"/><path d="M12 20l4-9 4 9M19.100 18h-6.200"/>',
    calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/>',
    shuffle: '<path d="M18 4l3 3-3 3M18 20l3-3-3-3"/><path d="M3 7h3a5 5 0 0 1 4 2l4 6a5 5 0 0 0 4 2h3"/><path d="M3 17h3a5 5 0 0 0 4-2M14 9a5 5 0 0 1 4-2h3"/>',
    book: '<path d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0 9 9 0 0 1 9 0"/><path d="M3 6v13M12 6v13M21 6v13"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7"/>',
    sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>'
  };

  var user = window.PUSTAKA_NAV_CONFIG || {};
  var C = {};
  Object.keys(DEFAULTS).forEach(function (k) {
    C[k] = user[k] !== undefined ? user[k] : DEFAULTS[k];
  });

  var els = {};
  var lastFocus = null;

  function svg(name) {
    return '<svg class="ptn-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  function currentHash() {
    return window.location.hash || '#/';
  }

  function build() {
    var bar = document.createElement('nav');
    bar.className = 'ptn-bar';
    bar.setAttribute('aria-label', 'Navigasi utama');

    C.tabs.forEach(function (t, i) {
      var a = document.createElement('a');
      a.className = 'ptn-tab';
      a.href = t.href;
      a.setAttribute('data-ptn-tab', String(i));
      a.innerHTML = svg(t.icon) + '<span>' + t.label + '</span>';
      a.addEventListener('click', function () {
        if (a.getAttribute('aria-current') === 'page') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      bar.appendChild(a);
    });

    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'ptn-tab ptn-more';
    moreBtn.setAttribute('aria-haspopup', 'dialog');
    moreBtn.setAttribute('aria-expanded', 'false');
    moreBtn.innerHTML = svg('dots') + '<span>' + C.moreLabel + '</span>';
    moreBtn.addEventListener('click', function () {
      isOpen() ? closeSheet() : openSheet();
    });
    bar.appendChild(moreBtn);

    var overlay = document.createElement('div');
    overlay.className = 'ptn-overlay';
    overlay.addEventListener('click', closeSheet);

    var sheet = document.createElement('div');
    sheet.className = 'ptn-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', C.moreTitle);
    sheet.innerHTML = '<div class="ptn-grab"></div><div class="ptn-grid"></div>';
    var grid = sheet.querySelector('.ptn-grid');

    C.more.forEach(function (m, i) {
      var node;
      if (m.click) {
        node = document.createElement('button');
        node.type = 'button';
        node.addEventListener('click', function () {
          var target = document.querySelector(m.click);
          closeSheet();
          if (target) target.click();
          else if (window.console) console.warn('[bottom-nav] elemen tidak ditemukan:', m.click);
        });
      } else {
        node = document.createElement('a');
        node.href = m.href;
        node.addEventListener('click', function () { closeSheet(); });
      }
      node.className = 'ptn-item';
      node.setAttribute('data-ptn-more', String(i));
      node.innerHTML = svg(m.icon) + '<span>' + m.label + '</span>';
      grid.appendChild(node);
    });

    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    document.body.appendChild(bar);
    document.body.classList.add('ptn-pad');

    els = { bar: bar, more: moreBtn, overlay: overlay, sheet: sheet };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) closeSheet();
    });
  }

  function isOpen() {
    return els.sheet && els.sheet.classList.contains('is-open');
  }

  function openSheet() {
    /* Sembunyikan item berbasis tombol jika tombol aslinya tidak ada */
    C.more.forEach(function (m, i) {
      if (!m.click) return;
      var item = els.sheet.querySelector('[data-ptn-more="' + i + '"]');
      if (item) item.hidden = !document.querySelector(m.click);
    });
    lastFocus = document.activeElement;
    els.sheet.classList.add('is-open');
    els.overlay.classList.add('is-open');
    els.more.setAttribute('aria-expanded', 'true');
    var first = els.sheet.querySelector('.ptn-item:not([hidden])');
    if (first) first.focus();
  }

  function closeSheet() {
    if (!els.sheet) return;
    var wasOpen = isOpen();
    els.sheet.classList.remove('is-open');
    els.overlay.classList.remove('is-open');
    els.more.setAttribute('aria-expanded', 'false');
    if (wasOpen && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function refresh() {
    var h = currentHash();
    document.body.classList.toggle('ptn-hide', !!(C.hideOn && C.hideOn.test(h)));

    var tabs = els.bar.querySelectorAll('[data-ptn-tab]');
    var activeFound = false;
    Array.prototype.forEach.call(tabs, function (a, i) {
      var on = C.tabs[i].match.test(h);
      if (on) { a.setAttribute('aria-current', 'page'); activeFound = true; }
      else a.removeAttribute('aria-current');
    });

    var moreActive = false;
    if (!activeFound) {
      moreActive = C.more.some(function (m) { return m.match && m.match.test(h); });
    }
    els.more.classList.toggle('is-active', moreActive);

    closeSheet();
  }

  function init() {
    if (els.bar) return;
    build();
    refresh();
    window.addEventListener('hashchange', refresh);
  }

  window.PustakaBottomNav = { open: function () { openSheet(); }, close: closeSheet, refresh: function () { if (els.bar) refresh(); }, config: C };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();