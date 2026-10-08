/**
 * reader-tools.js — Kontrol layar baca untuk ponsel (<= 768px): sheet "Tampilan teks",
 * pemilih terjemahan berkelompok per bahasa, dan tombol tandai-dibaca yang mengikuti #rdb.
 * Di desktop toolbar lama tetap dipakai apa adanya; semua elemen di sini disembunyikan oleh CSS.
 * Proyek: Pustaka Torah
 */

var RT_IC = {
  ck: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 12.5l2.2 2.2L15.5 10"/></svg>',
  aa: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19l5-13 5 13M6 14h6"/><path d="M15 19l3-8 3 8M16 16h4"/></svg>',
  gt: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  bk: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  ok: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

var RT_LANG = {
  indonesian: 'Indonesia', english: 'Inggris', french: 'Prancis', german: 'Jerman',
  portuguese: 'Portugis', spanish: 'Spanyol', russian: 'Rusia', italian: 'Italia',
  arabic: 'Arab', yiddish: 'Yiddish', ladino: 'Ladino', persian: 'Persia',
  polish: 'Polandia', dutch: 'Belanda', hungarian: 'Hungaria', hebrew: 'Ibrani',
  chinese: 'Mandarin', turkish: 'Turki', catalan: 'Katalan', greek: 'Yunani',
  japanese: 'Jepang', korean: 'Korea', swedish: 'Swedia', esperanto: 'Esperanto',
};

var RT_MO = null;

/** Rapikan judul versi untuk tampilan ponsel (buang akhiran seperti " [fr]"). */
function rtLbl(t) {
  return String(t || '').replace(/\s*\[[a-z]{2,3}\]\s*$/i, '');
}

/**
 * Markup tambahan layar baca: ikon di baris judul (acts), blok akhir pasal (end),
 * sheet "Tampilan teks" + pemilih terjemahan (tools).
 */
function rtMarkup(trs, pc) {
  const cur = S.tr ? rtLbl(S.tr.split('|').slice(1).join('|')) : 'Bawaan';
  const acts =
    '<span class="rt-acts">' +
    (pc
      ? '<button id="rdi" class="rt-ib" type="button" aria-pressed="false" aria-label="Tandai sudah dibaca" onclick="toggleRead()">' + RT_IC.ck + '</button>'
      : '') +
    '<button class="rt-ib" type="button" aria-label="Tampilan teks" aria-haspopup="dialog" onclick="rtOpen()">' + RT_IC.aa + '</button></span>';
  const end = pc
    ? '<div class="rt-end"><button id="rde" type="button" onclick="toggleRead()">Tandai sudah dibaca</button></div>'
    : '';
  const tools =
    '<div id="rto" class="rto" onclick="rtClose()"></div>' +
    '<div id="rts" class="rts" role="dialog" aria-modal="true" aria-label="Tampilan teks">' +
    '<div class="rt-grab"></div><p class="rts-h">Tampilan teks</p><p class="rts-l">Ukuran huruf</p>' +
    '<div class="rts-step"><button type="button" aria-label="Perkecil huruf" onclick="S.size=Math.max(14,S.size-2);apply();rtSize()">A−</button>' +
    '<span class="rts-pv" lang="he">בְּרֵאשִׁית</span><span id="rts-sz" class="rts-sz"></span>' +
    '<button type="button" aria-label="Perbesar huruf" onclick="S.size=Math.min(34,S.size+2);apply();rtSize()">A+</button></div>' +
    (trs && trs.length
      ? '<button type="button" class="rts-row" onclick="rtPick()"><span>Terjemahan</span><span class="v">' + esc(cur) + '</span>' + RT_IC.gt + '</button>'
      : '') +
    '<button type="button" class="rts-row" onclick="rtClose();ms(window.RF)"><span>Naskah kuno</span>' + RT_IC.gt + '</button></div>' +
    '<div id="rtp" class="rtp" role="dialog" aria-modal="true" aria-label="Pilih terjemahan"></div>';
  return { acts, end, tools };
}

function rtSize() {
  const e = document.getElementById('rts-sz');
  if (e) e.textContent = S.size;
}

function rtOpen() {
  const s = document.getElementById('rts'),
    o = document.getElementById('rto');
  if (!s || !o) return;
  rtSize();
  s.classList.add('open');
  o.classList.add('open');
  const b = s.querySelector('button');
  if (b) b.focus();
}

function rtClose() {
  ['rts', 'rto', 'rtp'].forEach((id) => {
    const e = document.getElementById(id);
    if (e) e.classList.remove('open');
  });
}

function rtBack() {
  const p = document.getElementById('rtp');
  if (p) p.classList.remove('open');
}

/** Pemilih terjemahan: daftar yang sama dengan <select id="vsel">, dikelompokkan per bahasa. */
function rtPick() {
  const p = document.getElementById('rtp');
  if (!p) return;
  const T = window.TRS || [],
    g = {},
    order = [];
  T.forEach((v) => {
    const f = (v.languageFamilyName || 'english').toLowerCase();
    if (!g[f]) {
      g[f] = [];
      order.push(f);
    }
    g[f].push(v);
  });
  const opt = (c, label) =>
    '<button type="button" class="rtp-o' + (S.tr === c ? ' on' : '') + '" data-c="' + esc(c) + '" onclick="rtSet(this.dataset.c)"><span>' +
    esc(label) + '</span>' + (S.tr === c ? RT_IC.ok : '') + '</button>';
  p.innerHTML =
    '<div class="rtp-h"><button type="button" class="rt-ib" aria-label="Kembali" onclick="rtBack()">' + RT_IC.bk + '</button><b>Pilih terjemahan</b></div>' +
    opt('', 'Terjemahan bawaan') +
    order
      .map(
        (f) =>
          '<div class="rtp-g">' + esc(RT_LANG[f] || f.charAt(0).toUpperCase() + f.slice(1)) + '</div>' +
          g[f].map((v) => opt(f + '|' + v.versionTitle, rtLbl(v.versionTitle))).join(''),
      )
      .join('');
  p.classList.add('open');
  const b = p.querySelector('button');
  if (b) b.focus();
}

/** Sama persis dengan onchange pada <select id="vsel">. */
function rtSet(c) {
  S.tr = c;
  apply();
  rtClose();
  route();
}

/** Samakan ikon/tombol tandai-dibaca versi ponsel dengan #rdb (sumber kebenaran). */
function rtSync() {
  const rb = document.getElementById('rdb');
  if (!rb) return;
  const label = rb.textContent.trim(),
    done = rb.classList.contains('on') || (label !== '' && !/^tandai/i.test(label)),
    i = document.getElementById('rdi'),
    e = document.getElementById('rde');
  if (i) {
    i.classList.toggle('on', done);
    i.setAttribute('aria-pressed', done ? 'true' : 'false');
    i.setAttribute('aria-label', label || 'Tandai sudah dibaca');
  }
  if (e) {
    e.classList.toggle('on', done);
    e.textContent = label || 'Tandai sudah dibaca';
  }
}

/** Dipanggil di akhir read(): pindahkan sheet ke <body> dan pantau perubahan #rdb. */
function rtInit() {
  document.querySelectorAll('body > .rto, body > .rts, body > .rtp').forEach((e) => e.remove());
  ['rto', 'rts', 'rtp'].forEach((id) => {
    const e = document.getElementById(id);
    if (e) document.body.appendChild(e);
  });
  if (RT_MO) {
    RT_MO.disconnect();
    RT_MO = null;
  }
  rtSize();
  const rb = document.getElementById('rdb');
  if (!rb) return;
  RT_MO = new MutationObserver(rtSync);
  RT_MO.observe(rb, { attributes: true, childList: true, characterData: true, subtree: true });
  rtSync();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') rtClose();
});
window.addEventListener('hashchange', rtClose);