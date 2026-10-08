# 📜 Pustaka Torah

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/andysaktia/pustaka-torah/actions/workflows/ci.yml/badge.svg)](https://github.com/andysaktia/pustaka-torah/actions/workflows/ci.yml)
[![Deploy with Vercel](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/andysaktia/pustaka-torah)
![Tanpa build](https://img.shields.io/badge/build-none-brightgreen) ![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e)

**Pembaca web untuk Tanakh, Talmud, dan literatur Yahudi klasik.**
Teks Ibrani berdampingan dengan terjemahan, komentar para rabi, kamus Ibrani, jalur belajar bertahap,
dan bacaan harian, semuanya dalam satu halaman statis yang cepat dan tanpa build.
Data dari [Sefaria](https://www.sefaria.org).

> **EN:** A fast, zero-dependency web reader for Tanakh, Talmud and classical Jewish texts: Hebrew beside
> translation, classical commentary, a Hebrew lexicon, a guided learning path and daily readings,
> powered by the Sefaria API. Pure HTML/CSS/vanilla JS, no build step. The interface is in Indonesian.

- **Layer:** Consumer
- **Bergantung pada:** Sefaria API (layanan eksternal, <https://developers.sefaria.org>)
- **Dipakai oleh:** -
- **Status pengecualian arsitektur:** Tidak ada (`js/data.js` = konten UI/kurasi, bukan dataset)

🔗 **Demo:** https://pustaka-torah.vercel.app _(ganti dengan URL Anda)_

<!-- Letakkan tangkapan layar di docs/screenshots/ lalu aktifkan baris di bawah
![Layar baca](docs/screenshots/reader.png)
-->

## Fitur

- **Layar baca** Ibrani + terjemahan (atau salah satunya), ukuran huruf dapat diatur, tema terang/gelap
- **Ketuk kata Ibrani** untuk arti dari kamus (Klein, Jastrow, BDB); **ketuk ayat** untuk komentar dan tautan terkait
- **Jalur Belajar** 5 tahap dan **Perpustakaan** 12 kategori kitab
- **Topik/tema**, peta tema, dan rekomendasi dari riwayat baca
- **Bacaan harian** (Parasyat, Haftarah, Daf Yomi, Mishnah Yomit) dan **bacaan acak**
- **Pencarian** kitab, rujukan, dan teks penuh; **Cari Rujukan** untuk mengenali sitasi di paragraf bebas
- **Terjemahan**: pilih versi dan bahasa bawaan dari yang tersedia di Sefaria
- **Naskah kuno** dengan penampil zoom/geser, dan **bagikan ayat sebagai gambar**
- **Penanda sudah dibaca** dan "Lanjutkan membaca", tersimpan lokal
- **Cache** IndexedDB dengan TTL, antrean permintaan, dan penanganan galat yang ramah

## Mulai cepat

```bash
git clone https://github.com/andysaktia/pustaka-torah.git
cd pustaka-torah
npm install      # hanya untuk Prettier (opsional)
npm run dev      # http://localhost:3000
```

Tidak butuh build: `index.html` juga bisa dibuka langsung di peramban.

## Struktur proyek

```
pustaka-torah/
├── index.html            # kerangka halaman + urutan CSS/JS
├── css/                  # base → layout → components → reader → features
├── js/
│   ├── utils.js          # fungsi bantu murni
│   ├── config.js         # API, localStorage, state preferensi
│   ├── data.js           # kategori, jalur belajar, glosarium
│   ├── api.js            # cache IndexedDB, antrean, fetch Sefaria
│   ├── features/         # satu berkas per fitur (reader, topics, lexicon, ...)
│   ├── router.js         # router hash #/...
│   └── app.js            # titik masuk
├── docs/ARCHITECTURE.md  # peta modul & alasan desain
├── vercel.json           # header keamanan + cache
└── .github/              # CI, templat issue & PR
```

Detail ada di [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deploy ke Vercel

1. Push repo ke GitHub.
2. [vercel.com/new](https://vercel.com/new) → **Import** repo ini.
3. _Framework Preset_: **Other**. Kosongkan Build Command; Output Directory `.` (sudah diatur di `vercel.json`).
4. **Deploy**. Setiap push ke `main` otomatis rilis ke produksi; Pull Request mendapat URL pratinjau.

Atau lewat CLI: `npx vercel` lalu `npx vercel --prod`.

## Posisi dalam arsitektur & kapan naik ke Service layer

Proyek ini adalah **Consumer**: seluruh teks, terjemahan, kamus, komentar, dan kalender ditarik dari API Sefaria
(service layer pihak ketiga) saat runtime. Repo tidak menyimpan dataset. Cache IndexedDB/localStorage hanya
salinan sementara. `js/data.js` berisi konten UI (kategori, tahap Jalur Belajar, glosarium), bukan sumber data.

Dependensi satu arah: **Pustaka Torah → Sefaria API**.

**Pemicu untuk menambah Service/Data layer sendiri:**

- Ada consumer kedua yang butuh data Sefaria atau kurasi kategori yang sama. Bangun service tipis (mis. `sefaria-proxy-api`)
  untuk caching dan rate limit bersama, lalu semua consumer menariknya dari sana.
- Terjemahan Indonesia mulai dibuat: simpan sebagai Data layer bertag versi (mis. `torah-id-json`), sajikan lewat
  Service layer, lalu Pustaka Torah menariknya dari service tersebut.
- Sefaria membatasi atau memblokir akses langsung dari browser (CORS atau rate limit).

## Sumber data & atribusi

Semua teks, terjemahan, kamus, dan metadata dimuat langsung dari [API Sefaria](https://developers.sefaria.org)
saat aplikasi berjalan. **Repo ini tidak menyimpan teks kitab.** Lisensi tiap versi teks ditampilkan di halaman baca;
patuhi lisensi tersebut bila Anda membagikan ulang. Naskah kuno berasal dari koleksi pihak ketiga melalui Sefaria.
Proyek ini tidak berafiliasi dengan Sefaria.

## Keterbatasan & rencana

- Bergantung pada ketersediaan dan CORS API Sefaria.
- Antarmuka berbahasa Indonesia; teks sumber ditampilkan dalam Ibrani dan terjemahan yang tersedia di Sefaria (belum ada terjemahan Indonesia). Dukungan i18n antarmuka masuk rencana.
- Skrip klasik berbagi lingkup global (lihat arsitektur); rencana migrasi bertahap ke ES modules + event delegation.
- Rencana: tes otomatis (Playwright), PWA/offline, dan i18n antarmuka.

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Bug dan ide: buka _issue_. Keamanan: [SECURITY.md](SECURITY.md).

## Lisensi

Kode dirilis di bawah [MIT](LICENSE). Konten teks tunduk pada lisensi masing-masing versi di Sefaria.
