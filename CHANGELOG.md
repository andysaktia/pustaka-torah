# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan [SemVer](https://semver.org/lang/id/).

## [1.0.0] - 2026-10-08

### Diubah

- Refaktor `read_v11.html` (satu file) menjadi struktur multi-file: `index.html`, `css/` (5 file), `js/` (19 modul).
- Kode diformat (Prettier) dan diberi komentar per blok fungsi.
- Tombol tema memakai `addEventListener` (sebelumnya `onclick` inline di HTML).

### Ditambahkan

- Metadata SEO/Open Graph, favicon, `vercel.json` (header keamanan & cache), CI GitHub Actions, dokumentasi.

### Tidak berubah

- Seluruh fungsionalitas aplikasi dan logika JS identik dengan v11.
