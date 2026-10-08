/**
 * router.js — Router hash (#/...) yang memetakan URL ke fungsi tampilan.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Router: urai hash '#/<kunci>/<nilai>', pilih tampilan, tangani error dengan tombol coba lagi.
 */
function route() {
  let h = '';
  try {
    h = decodeURIComponent(location.hash.slice(2));
  } catch {}
  const i = h.indexOf('/'),
    k = i < 0 ? h : h.slice(0, i),
    v = i < 0 ? '' : h.slice(i + 1);
  document.getElementById('panel').hidden = true;
  scrollTo(0, 0);
  const m =
    {
      c: () => browse(v ? v.split('|') : []),
      b: () => book(v),
      r: () => read(v),
      s: () => search(v),
      j: () => jalur(),
      p: () => perpus(),
      i: () => istilah(),
      t: () => topik(v),
      h: () => hari(v),
      x: () => acak(v),
      f: () => rujukan(),
      g: () => terjemah(v),
      k: () => kamus(),
    }[k] || home;
  app.innerHTML = '<p class="muted">Memuat…</p>';
  m().catch((e) => {
    const c = e && e.message ? esc(e.message) : '',
      bad = /^(400|404)$/.test(c);
    app.innerHTML = `<h2>Data belum bisa dimuat</h2><p class="muted">${bad ? 'Referensi atau halaman ini tidak ditemukan di Sefaria' : 'Periksa koneksi internet Anda atau coba beberapa saat lagi'}${c ? ' (kode: ' + c + ')' : ''}.</p><button onclick="route()">Coba lagi</button> <button onclick="history.back()">Kembali</button> <a class="btn" href="#/">Ke beranda</a>`;
  });
}
