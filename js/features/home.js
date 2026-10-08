/**
 * home.js — Halaman beranda dan kotak pencarian.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Halaman beranda: pencarian, 'Lanjutkan membaca', bacaan hari ini, dan tiga pintu masuk utama.
 */
async function home() {
  const last = st.get('last', null);
  app.innerHTML = `<section class="hero"><h1>Baca Tanakh, Talmud, dan literasi Yahudi</h1>
 <p>Teks Ibrani berdampingan dengan terjemahan, lengkap dengan komentar klasik.</p>
 <form onsubmit="return go(this)"><input name="q" aria-label="Cari" placeholder="Cari kitab, ayat, atau kata (mis. Genesis 1:1, Berakhot 2a, love)"><button>Cari</button></form></section>
 ${last ? `<p><a class="chip" href="#/r/${enc(last)}">Lanjutkan membaca: <b>${esc(last)}</b></a></p>` : ''}
 <div id="today"></div><p><a class="chip" href="#/x">Bacaan acak</a><a class="chip" href="#/h">Semua bacaan hari ini</a></p>
 <div class="paths"><a class="path" href="#/j"><span class="he">מסלול</span><b>Jalur Belajar</b><small>Baru mulai? Ikuti 5 tahap dari dasar hingga lanjutan</small></a><a class="path" href="#/p"><span class="he">ספרייה</span><b>Perpustakaan</b><small>Langsung ke 12 kategori kitab</small></a><a class="path" href="#/t"><span class="he">נושאים</span><b>Topik</b><small>Belum tahu mau baca apa? Mulai dari tema</small></a></div>
 <p class="attr">Sumber data: Sefaria.org. Lisensi tiap versi teks ditampilkan di halaman baca. <button class="chip" onclick="clearCache(this)">Hapus data tersimpan</button></p>`;
  api(calUrl())
    .then((d) => {
      const t = document.getElementById('today');
      if (t)
        t.innerHTML = (d.calendar_items || [])
          .filter((x) => x.ref && calKey(x))
          .map(
            (x) =>
              `<a class="chip" href="#/r/${enc(x.ref)}">${esc(calKey(x))}: <b>${esc((x.displayValue && x.displayValue.en) || x.ref)}</b></a>`,
          )
          .join('');
    })
    .catch(() => {});
}

/**
 * Handler form pencarian: arahkan ke #/s/<kata>. Mengembalikan false agar form tidak submit.
 */
function go(f) {
  const q = f.q.value.trim();
  if (q) location.hash = '#/s/' + enc(q);
  return false;
}
