/**
 * search-overlay.js — Pencarian global. Ikon kaca pembesar di header membuka layar pencarian
 * (layar penuh di ponsel, modal di desktop). Kata yang dikirim menuju rute #/s/<kata> milik
 * search.js; riwayat bacaan terakhir (st 'hist') ditampilkan sebagai pintasan. Pintasan keyboard: "/".
 * Proyek: Pustaka Torah
 */
(function () {
  'use strict';

  if (window.PustakaSearch) return;

  var IC = {
    search:
      '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/></svg>',
    back: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    hist: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
  };

  var box = null,
    input = null,
    lastFocus = null;

  function build() {
    box = document.createElement('div');
    box.id = 'so';
    box.className = 'so';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Cari');
    box.innerHTML =
      '<div class="so-box"><form class="so-f" role="search">' +
      '<button type="button" class="so-b" aria-label="Tutup pencarian">' +
      IC.back +
      '</button>' +
      '<input id="soq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Kitab, ayat, atau kata Ibrani" aria-label="Cari">' +
      '<button type="submit" class="so-s" aria-label="Cari">' +
      IC.search +
      '</button></form>' +
      '<p class="so-h">Contoh: Genesis 1:1, Berakhot 2a, shalom</p><div id="sor"></div></div>';
    input = box.querySelector('#soq');
    // Klik latar (desktop) menutup; klik di dalam kotak tidak
    box.addEventListener('click', function (e) {
      if (e.target === box) close();
      if (e.target.closest && e.target.closest('#sor a')) close();
    });
    box.querySelector('.so-b').addEventListener('click', close);
    box.querySelector('form').addEventListener('submit', go);
    document.body.appendChild(box);
  }

  function recents() {
    var el = document.getElementById('sor'),
      h = [];
    try {
      h = (typeof st !== 'undefined' && st.get('hist', [])) || [];
    } catch (e) {}
    el.innerHTML = h.length
      ? '<p class="so-sec">Terakhir dibaca</p>' +
        h
          .slice(0, 8)
          .map(function (r) {
            return (
              '<a class="so-r" href="#/r/' +
              enc(r) +
              '">' +
              IC.hist +
              '<span>' +
              esc(r) +
              '</span></a>'
            );
          })
          .join('')
      : '';
  }

  function open() {
    if (!box) build();
    lastFocus = document.activeElement;
    recents();
    input.value = '';
    box.hidden = false;
    document.body.classList.add('so-open');
    input.focus();
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.classList.remove('so-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function go(e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) {
      input.focus();
      return;
    }
    var target = '#/s/' + encodeURIComponent(q);
    close();
    if (location.hash === target) {
      if (typeof route === 'function') route();
    } else location.hash = target;
  }

  function mount() {
    var hd = document.querySelector('header');
    if (!hd) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'sb';
    b.className = 'hdr-ib';
    b.title = 'Cari (/)';
    b.setAttribute('aria-label', 'Cari');
    b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = IC.search;
    b.addEventListener('click', open);
    var th = document.getElementById('th');
    if (th) {
      // Kelompokkan ikon pencarian + tombol tema agar tetap berdampingan di sisi kanan header
      var w = document.createElement('div');
      w.className = 'hdr-act';
      th.parentNode.insertBefore(w, th);
      w.appendChild(b);
      w.appendChild(th);
    } else hd.appendChild(b);
  }

  // Fase capture: Esc menutup pencarian saja (tidak ikut menutup panel komentar)
  window.addEventListener(
    'keydown',
    function (e) {
      if (e.key === 'Escape' && box && !box.hidden) {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target,
        tag = t && t.tagName;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (t && t.isContentEditable)) return;
      e.preventDefault();
      open();
    },
    true,
  );
  window.addEventListener('hashchange', close);

  window.PustakaSearch = { open: open, close: close };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
