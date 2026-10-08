/**
 * app.js — Titik masuk aplikasi: pasang event global lalu render halaman pertama.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

// Render ulang halaman setiap kali hash URL berubah (navigasi SPA tanpa reload).
addEventListener('hashchange', route);

// Tombol tema (Terang/Gelap): balik state lalu terapkan. Sebelumnya inline onclick di HTML.
document.getElementById('th').addEventListener('click', () => {
  S.dark = !S.dark;
  apply();
});

// Terapkan tema, ukuran huruf, dan mode teks yang tersimpan sebelum render pertama.
apply();

// Render halaman sesuai hash saat ini (beranda bila kosong).
route();
