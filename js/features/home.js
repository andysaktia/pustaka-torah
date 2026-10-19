/**
 * home.js — Halaman beranda dan kotak pencarian.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/** Pintu masuk utama: kunci kategori (C di data.js) + keterangan singkat. */
const HOME_DOORS = [
  ['Tanakh', 'Torah, Nevi’im, Ketuvim'],
  ['Talmud', 'Bavli dan Yerushalmi'],
];

/** Kategori yang ditampilkan di blok Jelajah (kunci C di data.js). */
const HOME_EXPLORE = ['Liturgy', 'Midrash', 'Halakhah', 'Jewish Thought'];

/** Alat bantu: [ikon, judul, rute]. */
const HOME_TOOLS = [
  ['📖', 'Kamus Ibrani', '#/k'],
  ['🔎', 'Cari Rujukan', '#/f'],
  ['🌐', 'Terjemahan', '#/g'],
  ['🗂', 'Istilah', '#/i'],
];

/**
 * Kartu bacaan hari ini dari respons kalender Sefaria.
 */
function homeToday(d) {
  const items = (d.calendar_items || []).filter((x) => x.ref && calKey(x));
  if (!items.length) return '<p class="hm-note hm-span">Belum ada bacaan hari ini.</p>';
  return items
    .map(
      (x) =>
        `<a class="card" href="#/r/${enc(x.ref)}"><small>${esc(calKey(x))}</small><b>${esc((x.displayValue && x.displayValue.en) || x.ref)}</b></a>`,
    )
    .join('');
}

/**
 * Halaman beranda: pencarian, 'Lanjutkan membaca' (atau 'Mulai dari sini'), bacaan hari ini,
 * pintu masuk, Jalur Belajar, Jelajah, dan alat bantu. Semua blok berupa grid ke bawah di mobile.
 */
async function home() {
  const last = st.get('last', null);
  const resume = last
    ? `<p class="hm-lbl">Lanjutkan membaca</p><h2 class="hm-title">${esc(last)}</h2>
   <p class="hm-actions"><a class="hm-btn" href="#/r/${enc(last)}">Lanjutkan ▸</a><a class="btn" href="#/x">Bacaan acak</a></p>`
    : `<p class="hm-lbl">Mulai dari sini</p><h2 class="hm-title">Baru pertama kali?</h2>
   <p class="muted">Ikuti Jalur Belajar 5 tahap dari dasar hingga lanjutan.</p>
   <p class="hm-actions"><a class="hm-btn" href="#/j">Mulai Jalur Belajar ▸</a><a class="btn" href="#/x">Bacaan acak</a></p>`;
  const doors =
    HOME_DOORS.filter(([k]) => C[k])
      .map(
        ([k, sub]) =>
          `<a class="card hm-door" href="#/c/${enc(k)}"><span class="he">${esc(C[k][0])}</span><b>${esc(dn(k))}</b><small>${esc(sub)}</small></a>`,
      )
      .join('') +
    `<a class="card hm-door" href="#/p"><span class="he">ספרייה</span><b>Literatur lain</b><small>${Object.keys(C).length} kategori kitab</small></a>`;
  const steps = ST.map(
    (s, i) =>
      `<a class="card hm-step" href="#/j"><span class="hm-dot">${i + 1}</span><span><b>${esc(s[0])}</b><small>${esc(s[1].map(dn).join(', '))}</small></span></a>`,
  ).join('');
  const explore =
    HOME_EXPLORE.filter((k) => C[k])
      .map(
        (k) =>
          `<a class="card" href="#/c/${enc(k)}"><b>${esc(dn(k))}</b><span class="he">${esc(C[k][0])}</span></a>`,
      )
      .join('') +
    '<a class="card" href="#/p"><b>Semua kategori ▸</b><small>Perpustakaan</small></a><a class="card" href="#/t"><b>Topik & tema ▸</b><small>Termasuk rekomendasi dari riwayat bacaan</small></a>';
  const tools = HOME_TOOLS.map(
    ([ic, t, h]) =>
      `<a class="card" href="${h}"><b><span aria-hidden="true">${ic}</span> ${esc(t)}</b></a>`,
  ).join('');
  const skel = '<div class="card hm-skel"></div>'.repeat(4);

  app.innerHTML = `<section class="hero"><h1>Baca Tanakh, Talmud, dan literasi Yahudi</h1>
 <p>Teks Ibrani berdampingan dengan terjemahan, lengkap dengan komentar klasik.</p>
 <form onsubmit="return go(this)"><input name="q" aria-label="Cari" placeholder="Cari kitab, ayat, atau kata (mis. Genesis 1:1, Berakhot 2a, love)"><button>Cari</button></form></section>
 <div class="hm-top">
  <div class="hm-resume"><h2 class="hm-h hm-dsk">${last ? 'Lanjutkan membaca' : 'Mulai dari sini'}</h2><div class="card hm-rc">${resume}</div></div>
  <aside class="hm-today"><h2 class="hm-h">Hari ini</h2>
   <div id="today" class="hm-grid" aria-live="polite">${skel}</div>
   <p><a class="btn hm-block" href="#/h">Semua bacaan hari ini</a></p></aside>
  <div class="hm-doors"><h2 class="hm-h">Pintu masuk</h2><div class="hm-grid hm-g3">${doors}</div></div>
 </div>
 <section class="hm-sec"><h2 class="hm-h">Jalur Belajar <a class="hm-more" href="#/j">Lihat ▸</a></h2>
  <div class="hm-steps">${steps}</div><p class="hm-note">Baru mulai? Ikuti 5 tahap dari dasar hingga lanjutan. Hanya saran, semua kategori tetap terbuka.</p></section>
 <section class="hm-sec"><h2 class="hm-h">Jelajah</h2><div class="hm-grid hm-explore">${explore}</div></section>
 <section class="hm-sec"><h2 class="hm-h">Alat bantu</h2><div class="hm-grid hm-tools">${tools}</div></section>
 <p class="attr">Sumber data: Sefaria.org. Lisensi tiap versi teks ditampilkan di halaman baca. <button class="chip" onclick="clearCache(this)">Hapus data tersimpan</button></p>`;
  api(calUrl())
    .then((d) => {
      const t = document.getElementById('today');
      if (t) t.innerHTML = homeToday(d);
    })
    .catch(() => {
      const t = document.getElementById('today');
      if (t)
        t.innerHTML =
          '<p class="hm-note hm-span">Bacaan hari ini belum bisa dimuat. Coba lagi nanti.</p>';
    });
}

/**
 * Handler form pencarian: arahkan ke #/s/<kata>. Mengembalikan false agar form tidak submit.
 */
function go(f) {
  const q = f.q.value.trim();
  if (q) location.hash = '#/s/' + enc(q);
  return false;
}
