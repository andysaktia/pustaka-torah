# Arsitektur

Aplikasi satu halaman (SPA) murni HTML/CSS/vanilla JS, tanpa dependensi runtime dan tanpa build.
Navigasi memakai hash (`#/<kunci>/<nilai>`), dan semua tampilan dirender ke `<main id="app">`.

## Alur

```
URL hash ─► router.js: route() ─► fungsi tampilan (features/*)
                                        │
                                        ▼
                                 api.js: api(path)
                      cache memori → IndexedDB (TTL) → antrean → fetch Sefaria
```

## Rute

| Hash    | Fungsi     | Modul                    |
| ------- | ---------- | ------------------------ |
| `#/`    | `home`     | features/home.js         |
| `#/c/…` | `browse`   | features/library.js      |
| `#/b/…` | `book`     | features/library.js      |
| `#/r/…` | `read`     | features/reader.js       |
| `#/s/…` | `search`   | features/search.js       |
| `#/j`   | `jalur`    | features/library.js      |
| `#/p`   | `perpus`   | features/library.js      |
| `#/i`   | `istilah`  | features/glossary.js     |
| `#/t/…` | `topik`    | features/topics.js       |
| `#/h/…` | `hari`     | features/daily.js        |
| `#/x/…` | `acak`     | features/daily.js        |
| `#/f`   | `rujukan`  | features/references.js   |
| `#/g/…` | `terjemah` | features/translations.js |
| `#/k`   | `kamus`    | features/lexicon.js      |

## Urutan muat skrip

`utils → config → data → api → features/* → router → app`

Skrip bersifat **klasik** (bukan `type="module"`) dan berbagi lingkup global. Alasannya: templat HTML di dalam JS
memakai handler inline (`onclick="go(this)"`) yang memerlukan fungsi global. Konsekuensinya:

- Urutan `<script>` di `index.html` harus dijaga. `config.js` membutuhkan `esc` dari `utils.js`; `app.js` harus terakhir
  karena langsung memanggil `apply()` dan `route()`.
- Nama top-level harus unik antar-berkas.

## Preferensi & penyimpanan

| Kunci           | Penyimpanan  | Isi                                             |
| --------------- | ------------ | ----------------------------------------------- |
| `s`             | localStorage | mode, ukuran huruf, tema, bahasa, tradisi       |
| `last`, `hist`  | localStorage | bacaan terakhir dan riwayat (rekomendasi tema)  |
| `read`          | localStorage | penanda sudah dibaca per kitab                  |
| `pustaka-torah` | IndexedDB    | cache respons API dengan TTL (1 hari – 30 hari) |

## Keamanan

- HTML dari API disanitasi `clean()` (buang `script/style/iframe/img` dan seluruh atribut).
- Teks yang disisipkan ke templat melewati `esc()`.
- Tautan keluar memakai `rel="noopener"`.

## Jalur migrasi (opsional)

1. Ganti handler inline dengan event delegation (`data-action`).
2. Ubah berkas menjadi ES modules (`type="module"`) dengan `import`/`export` eksplisit.
3. Tambah tes (Playwright) untuk rute utama sebelum langkah 1.
