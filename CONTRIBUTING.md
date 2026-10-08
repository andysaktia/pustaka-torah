# Berkontribusi

Terima kasih sudah berminat! Proyek ini static site tanpa build.

## Menjalankan lokal

```bash
git clone https://github.com/USERNAME/pustaka-torah.git
cd pustaka-torah
npm install
npm run dev        # http://localhost:3000
```

(Atau cukup buka `index.html` di peramban; tidak perlu server.)

## Alur

1. Fork lalu buat branch: `feat/nama-fitur` atau `fix/nama-bug`.
2. Ubah kode. Tambahkan komentar `/** ... */` pada fungsi baru (gaya yang sama dengan modul lain).
3. Jalankan `npm run format` dan `npm test`.
4. Buka Pull Request memakai templat yang tersedia.

## Aturan penting

- Urutan `<script>` di `index.html` penting; baca `docs/ARCHITECTURE.md` sebelum menambah modul.
- Sanitasi HTML dari API dengan `clean()`, dan escape teks dengan `esc()`.
- Jangan menyalin teks kitab ke repo. Teks dimuat dari Sefaria saat dijalankan, dengan lisensi tiap versi.
- Pesan commit: [Conventional Commits](https://www.conventionalcommits.org/id/v1.0.0/) (mis. `fix(reader): ...`).
