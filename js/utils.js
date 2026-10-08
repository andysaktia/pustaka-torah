/**
 * utils.js — Fungsi bantu murni (tanpa efek samping) yang dipakai di seluruh aplikasi.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Escape HTML (&, <, >, ", ') agar aman disisipkan ke innerHTML.
 */
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/**
 * Ratakan array bersarang menjadi satu dimensi; nilai non-array dibungkus array.
 */
const flat = (a) => (Array.isArray(a) ? a.flat(Infinity) : [a ?? '']);

/**
 * Sanitasi HTML dari Sefaria: buang script/style/iframe/img dan semua atribut.
 */
function clean(h) {
  const t = document.createElement('template');
  t.innerHTML = h || '';
  t.content.querySelectorAll('script,style,iframe,img').forEach((e) => e.remove());
  t.content
    .querySelectorAll('*')
    .forEach((e) => [...e.attributes].forEach((a) => e.removeAttribute(a.name)));
  return t.innerHTML;
}

/**
 * Alias encodeURIComponent; encP menggabungkan array jalur kategori dengan '|' lalu meng-encode.
 */
const enc = encodeURIComponent,
  encP = (a) => enc(a.join('|'));

/**
 * Jalankan daftar fungsi async dengan konkurensi terbatas (default 4 pekerja).
 */
function pool(fns, n = 4) {
  let i = 0;
  const run = async () => {
    while (i < fns.length) {
      const f = fns[i++];
      await f();
    }
  };
  for (let k = 0; k < n; k++) run();
}

/**
 * Format angka dengan pemisah ribuan lokal Indonesia.
 */
const nf = (n) => n.toLocaleString('id-ID');

/**
 * Format Date menjadi 'YYYY-MM-DD' (zona waktu lokal).
 */
const f2 = (z) =>
  z.getFullYear() +
  '-' +
  String(z.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(z.getDate()).padStart(2, '0');

/**
 * Telusuri objek/array bersarang (maks. kedalaman 6) dan panggil f(kunci, nilai) di tiap nilai primitif.
 */
function walk(o, f, k = '', d = 0) {
  if (d > 6 || o == null) return;
  if (Array.isArray(o)) o.forEach((x) => walk(x, f, k, d + 1));
  else if (typeof o === 'object') Object.entries(o).forEach(([a, b]) => walk(b, f, a, d + 1));
  else f(k, o);
}

/**
 * True bila respons API berupa objek error {error: '...'}.
 */
const isErr = (d) => d && typeof d === 'object' && !Array.isArray(d) && typeof d.error === 'string';

/**
 * Nama bahasa tampilan dari kode bahasa (Intl.DisplayNames); fallback ke kode.
 */
const dispName = (c, l) => {
  try {
    return new Intl.DisplayNames([l], { type: 'language' }).of(c);
  } catch {
    return c;
  }
};

/**
 * Ubah HTML menjadi teks polos (tanpa catatan kaki & tanda vokal Ibrani) untuk gambar bagikan.
 */
const plain = (h) => {
  const e = document.createElement('template');
  e.innerHTML = h || '';
  e.content.querySelectorAll('sup,.footnote,.footnote-marker').forEach((x) => x.remove());
  return e.content.textContent
    .replace(/[\u0591-\u05AF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Pecah teks menjadi baris-baris yang muat dalam lebar w piksel pada kanvas c.
 */
function wrapText(c, txt, w) {
  const L = [];
  let cur = '';
  txt.split(' ').forEach((x) => {
    const q = cur ? cur + ' ' + x : x;
    if (c.measureText(q).width > w && cur) {
      L.push(cur);
      cur = x;
    } else cur = q;
  });
  if (cur) L.push(cur);
  return L;
}
