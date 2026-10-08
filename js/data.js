/**
 * data.js — Data statis: kategori pustaka, jalur belajar, glosarium, dan label terjemahan.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Lima tahap Jalur Belajar: [judul tahap, [kategori Sefaria]].
 */
const ST = [
  ['Fondasi', ['Tanakh', 'Liturgy']],
  ['Tradisi lisan dan tafsir', ['Mishnah', 'Tosefta', 'Midrash']],
  ['Diskusi para rabi', ['Talmud']],
  ['Hukum dan praktik', ['Halakhah', 'Responsa']],
  ['Pemikiran dan kerohanian', ['Musar', 'Jewish Thought', 'Chasidut', 'Kabbalah']],
];

/**
 * Metadata kategori: kunci Sefaria → [Ibrani, nama latin, deskripsi Indonesia, kitab pemula].
 */
const C = {
  Tanakh: [
    'תנ״ך',
    'Tanakh',
    "Kitab suci Ibrani: Torah (lima kitab Musa), Nevi'im (para nabi), dan Ketuvim (tulisan-tulisan). Dasar dari semua kategori lain.",
    ['Genesis', 'Psalms'],
  ],
  Liturgy: [
    'תפילה',
    'Tefillah',
    'Doa dan tata ibadah, seperti Siddur (buku doa harian) dan Haggadah.',
    ['Siddur Ashkenaz', 'Pesach Haggadah'],
  ],
  Mishnah: [
    'משנה',
    'Mishnah',
    'Karya besar pertama sastra rabinik, dibukukan sekitar tahun 200 M. Merekam hukum lisan beserta berbagai pendapat.',
    ['Pirkei Avot', 'Mishnah Berakhot'],
  ],
  Tosefta: [
    'תוספתא',
    'Tosefta',
    'Pendamping Mishnah. Memuat hukum dan diskusi yang tidak masuk ke dalam Mishnah.',
    ['Tosefta Berakhot'],
  ],
  Midrash: [
    'מדרש',
    'Midrash',
    'Tafsir dan pengembangan teks Tanakh: kisah, perumpamaan, dan penalaran hukum.',
    ['Genesis Rabbah'],
  ],
  Talmud: [
    'תלמוד',
    'Talmud',
    'Perdebatan para rabi lintas generasi tentang hukum, etika, dan Tanakh, disusun sebagai komentar atas Mishnah dan diselingi kisah.',
    ['Berakhot', 'Shabbat'],
  ],
  Halakhah: [
    'הלכה',
    'Halakhah',
    'Karya hukum yang memberi panduan untuk semua aspek kehidupan Yahudi.',
    ['Mishneh Torah', 'Shulchan Arukh'],
  ],
  Responsa: [
    'שו״ת',
    "She'elot u-Teshuvot",
    'Jawaban dan keputusan para pemimpin rabi atas pertanyaan nyata.',
    [],
  ],
  Musar: ['מוסר', 'Musar', 'Literatur etika dan pembentukan karakter.', ['Mesillat Yesharim']],
  'Jewish Thought': [
    'מחשבת ישראל',
    'Machshevet Yisrael',
    'Filsafat dan teologi Yahudi, dari abad pertengahan hingga masa kini.',
    ['Kuzari'],
  ],
  Chasidut: [
    'חסידות',
    'Chasidut',
    'Ajaran gerakan Khasidik: spiritualitas, kisah, dan pesan para rebbe.',
    ['Likutei Moharan'],
  ],
  Kabbalah: [
    'קבלה',
    'Kabbalah',
    'Tradisi mistik, misalnya Zohar. Cocok untuk pembaca yang sudah punya dasar.',
    ['Zohar', 'Sefer Yetzirah'],
  ],
};

/**
 * Daftar istilah dasar untuk halaman Istilah: [istilah, penjelasan].
 */
const G = [
  ['Tanakh', "Singkatan dari Torah, Nevi'im, dan Ketuvim: kitab suci Ibrani."],
  ['Torah', 'Lima kitab pertama (Kejadian sampai Ulangan).'],
  ["Nevi'im", 'Kitab para nabi.'],
  ['Ketuvim', 'Kitab tulisan-tulisan, seperti Mazmur dan Amsal.'],
  ['Mishnah', 'Kumpulan hukum lisan pertama yang dibukukan.'],
  ['Talmud', 'Perdebatan para rabi yang membahas Mishnah.'],
  ['Daf', 'Satu lembar Talmud. Setiap daf punya dua halaman, a dan b.'],
  ['Amud', 'Satu halaman Talmud (a atau b).'],
  ['Parasyat', 'Bagian Torah yang dibaca tiap pekan.'],
  ['Daf Yomi', 'Program membaca satu daf Talmud setiap hari.'],
  ['Halakhah', 'Hukum Yahudi.'],
  ['Midrash', 'Tafsir dan kisah di sekitar teks Tanakh.'],
  ['Siddur', 'Buku doa harian.'],
];

/**
 * stg(k): indeks tahap suatu kategori; dn(k): nama tampilan kategori (fallback ke kunci).
 */
const stg = (k) => ST.findIndex((s) => s[1].includes(k)),
  dn = (k) => (C[k] ? C[k][1] : k);

/**
 * Label Indonesia untuk jenis tautan terkait (Komentar, Rujukan, dsb.); lbl() dengan fallback.
 */
const LBL = {
    Commentary: 'Komentar',
    'Quoting Commentary': 'Dikutip dalam komentar',
    Reference: 'Rujukan',
    __web: 'Artikel luar',
  },
  lbl = (c) => LBL[c] || dn(c);

/**
 * Kategori yang tersedia sebagai penyaring pencarian teks penuh.
 */
const FTC = [
  'Tanakh',
  'Mishnah',
  'Talmud',
  'Midrash',
  'Halakhah',
  'Kabbalah',
  'Liturgy',
  'Jewish Thought',
  'Chasidut',
  'Musar',
  'Responsa',
  'Tosefta',
];

/**
 * Terjemahan jenis istilah Sefaria (scheme) ke bahasa Indonesia.
 */
const SCH = {
  Holidays: 'Hari raya',
  Parasha: 'Parasyat',
  commentary_works: 'Karya komentar',
  'he-month': 'Bulan Ibrani',
  Person: 'Tokoh',
};

/**
 * Pola judul kalender Sefaria → label Indonesia untuk bacaan harian.
 */
const CAL = [
  [/parashat hashavua/i, 'Parasyat minggu ini'],
  [/haftarah/i, 'Haftarah'],
  [/daf yomi/i, 'Daf Yomi'],
  [/mishnah/i, 'Mishnah Yomit'],
];

/**
 * Pemetaan jenis relasi antar-tema ke label Indonesia [arah keluar, arah masuk].
 */
const LT = {
  'is-a': ['Jenis dari', 'Contoh dan jenisnya'],
  'child-of': ['Induk', 'Turunan'],
  'parent-of': ['Turunan', 'Induk'],
  'related-to': ['Berkaitan', 'Berkaitan'],
  'similar-to': ['Mirip', 'Mirip'],
  'dissimilar-to': ['Berlawanan', 'Berlawanan'],
  'synonymous-with': ['Sinonim', 'Sinonim'],
  'sibling-of': ['Sepadan', 'Sepadan'],
};
