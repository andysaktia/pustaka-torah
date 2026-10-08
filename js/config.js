/**
 * config.js — Konfigurasi global, penyimpanan lokal (localStorage) dan state preferensi pengguna.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Konstanta inti: basis URL API Sefaria, elemen <main id=app>, dan cache memori sesi.
 */
const API = 'https://www.sefaria.org/api',
  app = document.getElementById('app'),
  cache = {};

/**
 * Pembungkus localStorage aman (try/catch): get(kunci, bawaan) dan set(kunci, nilai) dalam JSON.
 */
const st = {
  get(k, d) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

/**
 * State preferensi pengguna (mode tampilan, ukuran huruf, tema gelap, bahasa/terjemahan, tradisi).
 */
let S = st.get('s', { mode: 'both', size: 20, dark: false });

/**
 * Terapkan preferensi S ke DOM: tema, ukuran huruf, mode teks, tombol aktif; lalu simpan.
 */
function apply() {
  const r = document.documentElement;
  r.dataset.theme = S.dark ? 'dark' : 'light';
  r.style.setProperty('--fs', S.size + 'px');
  st.set('s', S);
  const t = document.getElementById('txt');
  if (t) t.className = 'text ' + S.mode;
  document
    .querySelectorAll('[data-m]')
    .forEach((b) => b.classList.toggle('on', b.dataset.m === S.mode));
}
