/**
 * reader-tools.js — Kontrol layar baca untuk ponsel (<= 768px): sheet "Tampilan teks",
 * pemilih terjemahan berkelompok per bahasa, dan tombol tandai-dibaca yang mengikuti #rdb.
 * Juga kerangka panel komentar ayat (sheet di ponsel/tablet, panel samping di >= 1024px).
 * Di desktop toolbar lama tetap dipakai apa adanya; semua elemen di sini disembunyikan oleh CSS.
 * Proyek: Pustaka Torah
 */

var RT_IC = {
  ck: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 12.5l2.2 2.2L15.5 10"/></svg>',
  aa: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19l5-13 5 13M6 14h6"/><path d="M15 19l3-8 3 8M16 16h4"/></svg>',
  gt: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  bk: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  x: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  sh: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></svg>',
  sc: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h6"/></svg>',
  sun: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7"/></svg>',
  moon: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.500z"/></svg>',
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
    (typeof mtPct === 'function'
      ? '<button type="button" class="rts-row" data-mt-hub onclick="rtClose();mtHub()"><span>Terjemahan mesin</span><span class="v">Kuota ' + mtPct() + '%</span>' + RT_IC.gt + '</button>'
      : '') +
    '<button type="button" class="rts-row" onclick="rtClose();ms(window.RF)"><span>Naskah kuno</span>' + RT_IC.gt + '</button></div>' +
    '<div id="rtp" class="rtp" role="dialog" aria-modal="true" aria-label="Pilih terjemahan"></div>';
  return { acts, end, tools };
}

function rtSize() {
  ['rts-sz', 'tbsz'].forEach((id) => {
    const e = document.getElementById(id);
    if (e) e.textContent = S.size;
  });
  const dn = document.getElementById('tbdn'),
    up = document.getElementById('tbup');
  if (dn) dn.disabled = S.size <= 14;
  if (up) up.disabled = S.size >= 34;
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
  const dv = done ? '1' : '0';
  if (rb.dataset.done !== dv) rb.dataset.done = dv;
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
  if (e.key !== 'Escape') return;
  if (document.querySelector('.rts.open, .rtp.open')) rtClose();
  else if (cpOpen() && !(document.getElementById('lb') && !document.getElementById('lb').hidden)) cpClose();
});
window.addEventListener('hashchange', rtClose);


/* ===== Panel komentar ayat ===== */

function cpOpen() {
  const p = document.getElementById('panel');
  return !!p && !p.hidden && !!p.querySelector(':scope > .cmp');
}

/** Kerangka panel: header sticky (judul, bagikan, tutup) + tab Terkait/Tema + wadah daftar. */
function cpShell(r, i) {
  const n = Number(i);
  return (
    '<div class="cmp"><div class="cmp-top"><div class="cmp-grab" onclick="cpFull()" aria-hidden="true"></div>' +
    '<div class="cmp-bar"><div class="cmp-t"><b>' + esc(r) + ':' + n + '</b><span>Terkait ayat ini</span></div>' +
    '<button type="button" class="cmp-ib" id="cpshb" aria-label="Bagikan" aria-haspopup="true" aria-expanded="false" onclick="cpShare()">' + RT_IC.sh + '</button>' +
    '<button type="button" class="cmp-ib" aria-label="Tutup" onclick="cpClose()">' + RT_IC.x + '</button></div>' +
    '<div class="cmp-share" id="cpsh" hidden>' +
    '<button type="button" onclick="shareImg(' + n + ')">Bagikan sebagai gambar</button>' +
    '<button type="button" onclick="shareImg(' + n + ",'english',this)\">Gambar Sefaria: Inggris</button>" +
    '<button type="button" onclick="shareImg(' + n + ",'hebrew',this)\">Gambar Sefaria: Ibrani</button></div>" +
    '<div class="cmp-tabs" role="tablist">' +
    '<button type="button" role="tab" id="cmp-tr" class="on" aria-selected="true" onclick="cpTab(\'r\')">Terkait</button>' +
    '<button type="button" role="tab" id="cmp-tt" aria-selected="false" onclick="cpTab(\'t\')">Topik</button></div></div>' +
    '<div id="cmp-r" class="cmp-pane" role="tabpanel"><div id="cms" class="cmp-sel"></div><div id="cml"><p class="muted">Memuat…</p></div></div>' +
    '<div id="cmp-t" class="cmp-pane" role="tabpanel" hidden><div id="pt"><span class="muted" style="font-size:13px">Memuat topik…</span></div></div></div>'
  );
}

function cpTab(k) {
  ['r', 't'].forEach((x) => {
    const pane = document.getElementById('cmp-' + x),
      tab = document.getElementById('cmp-t' + x);
    if (pane) pane.hidden = x !== k;
    if (tab) {
      tab.classList.toggle('on', x === k);
      tab.setAttribute('aria-selected', x === k ? 'true' : 'false');
    }
  });
  const p = document.getElementById('panel');
  if (p) p.scrollTop = 0;
}

/** Ubah chip tema (keluaran topicHtml) menjadi baris yang mudah diketuk, dan perbarui angka di tab. */
function cpTopics(h) {
  const e = document.getElementById('pt'),
    tab = document.getElementById('cmp-tt');
  if (!e) return;
  const t = document.createElement('template');
  t.innerHTML = h;
  const links = Array.from(t.content.querySelectorAll('a.chip'));
  if (links.length) {
    e.innerHTML =
      '<p class="cmp-note">Ketuk topik untuk membuka halamannya.</p>' +
      links
        .map((a) => '<a class="cmp-th" href="' + esc(a.getAttribute('href')) + '"><span>' + a.innerHTML + '</span>' + RT_IC.gt + '</a>')
        .join('');
  } else e.innerHTML = h;
  if (tab) tab.textContent = 'Topik' + (links.length ? ' (' + links.length + ')' : '');
}

/** Tandai ayat yang dipilih; di ponsel/tablet gulung agar tidak tertutup sheet. */
function cpMark(i) {
  document.querySelectorAll('.seg.sel').forEach((e) => e.classList.remove('sel'));
  const s = document.querySelector('.seg[data-i="' + Number(i) + '"]');
  if (!s) return;
  s.classList.add('sel');
  if (window.matchMedia('(max-width: 1023px)').matches) {
    const r = s.getBoundingClientRect();
    if (r.top < 100 || r.bottom > window.innerHeight * 0.42)
      s.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

function cpClose() {
  const p = document.getElementById('panel');
  if (!p) return;
  p.hidden = true;
  p.classList.remove('full');
}

function cpFull() {
  if (Date.now() - (window.CPD || 0) < 300) return;
  const p = document.getElementById('panel');
  if (p) p.classList.toggle('full');
}

function cpShareHide() {
  const m = document.getElementById('cpsh'),
    b = document.getElementById('cpshb');
  if (m) m.hidden = true;
  if (b) b.setAttribute('aria-expanded', 'false');
}

function cpShare() {
  const m = document.getElementById('cpsh'),
    b = document.getElementById('cpshb');
  if (!m) return;
  m.hidden = !m.hidden;
  if (b) b.setAttribute('aria-expanded', m.hidden ? 'false' : 'true');
}

/**
 * Adaptor: panel selain komentar (arti kata Ibrani, naskah kuno, dst.) dibungkus otomatis ke kerangka
 * drawer yang sama. Node dipindahkan, bukan ditulis ulang, jadi id dan referensi dari kode pengisinya
 * (lexicon.js, manuscripts.js) tetap berlaku. Tombol "Tutup" lama diganti ikon X di header.
 */
function cpWrap(p) {
  if (!p || p.hidden || !p.firstChild || p.querySelector(':scope > .cmp')) return;
  p.querySelectorAll('button').forEach((b) => {
    if (b.classList.contains('x') || /^\s*tutup\s*$/i.test(b.textContent)) b.remove();
  });
  const h = p.querySelector('h3'),
    tt = h ? h.textContent.trim() : '',
    sub = p.querySelector('.ms') ? 'Naskah kuno' : /[\u0590-\u05FF]/.test(tt) ? 'Arti kata' : '',
    cmp = document.createElement('div');
  cmp.className = 'cmp cmp-x';
  cmp.innerHTML =
    '<div class="cmp-top"><div class="cmp-grab" onclick="cpFull()" aria-hidden="true"></div>' +
    '<div class="cmp-bar"><div class="cmp-t"><b></b><span></span></div>' +
    (sub !== 'Naskah kuno' && typeof MT_IC !== 'undefined'
      ? '<button type="button" class="cmp-ib" data-mt-dict aria-label="Terjemahkan ke Indonesia" title="Terjemahkan ke Indonesia" aria-pressed="false" onclick="mtDict(this)">' + MT_IC + '</button>'
      : '') +
    '<button type="button" class="cmp-ib" aria-label="Tutup" onclick="cpClose()">' + RT_IC.x + '</button></div></div>' +
    '<div class="cmp-pane"></div>';
  const b = cmp.querySelector('.cmp-t b');
  if (h) while (h.firstChild) b.appendChild(h.firstChild);
  else b.textContent = 'Detail';
  if (h) h.remove();
  cmp.querySelector('.cmp-t span').textContent = sub;
  const body = cmp.querySelector('.cmp-pane');
  while (p.firstChild) body.appendChild(p.firstChild);
  p.appendChild(cmp);
  p.scrollTop = 0;
  document.querySelectorAll('.seg.sel').forEach((e) => e.classList.remove('sel'));
}

/** Sinkronkan class body (menggeser teks di desktop) dan penanda ayat dengan status panel. */
function cpSync() {
  const on = cpOpen();
  document.body.classList.toggle('cp-open', on);
  if (!on) document.querySelectorAll('.seg.sel').forEach((e) => e.classList.remove('sel'));
}

(function () {
  const p = document.getElementById('panel');
  if (p)
    new MutationObserver(() => {
      cpWrap(p);
      cpSync();
    }).observe(p, { attributes: true, attributeFilter: ['hidden'], childList: true });
  document.addEventListener('click', (e) => {
    const m = document.getElementById('cpsh');
    if (m && !m.hidden && !e.target.closest('#cpsh, #cpshb')) cpShareHide();
  });
  // Geser gagang: turun = kecilkan/tutup, naik = perbesar
  let y0 = null;
  document.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.cmp-grab');
    y0 = g ? e.clientY : null;
  });
  document.addEventListener('pointerup', (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0,
      p2 = document.getElementById('panel');
    y0 = null;
    if (Math.abs(dy) > 10) window.CPD = Date.now();
    if (!p2) return;
    if (dy > 70) {
      if (p2.classList.contains('full')) p2.classList.remove('full');
      else cpClose();
    } else if (dy < -50) p2.classList.add('full');
  });
  document.addEventListener('pointercancel', () => (y0 = null));
})();

/* Ukur tinggi header (menu bisa membungkus baris) dan simpan sebagai --hh,
   dipakai panel samping dan toolbar sticky agar tidak menutupi header. */
(function () {
  const h = document.querySelector('header');
  if (!h) return;
  const set = () => document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px');
  set();
  window.addEventListener('resize', set);
  if (window.ResizeObserver) new ResizeObserver(set).observe(h);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
})();


/* ===== Baris topik pasal: 3 chip + "+n lagi" ===== */

/** Ringkas keluaran topicHtml('pasal'); pesan galat/kosong diteruskan apa adanya. */
function rtTopics(h) {
  const t = document.createElement('template');
  t.innerHTML = h;
  const chips = Array.from(t.content.querySelectorAll('a.chip')),
    N = 3,
    hid = chips.length - N;
  if (!chips.length) return h;
  return (
    '<div class="rtt"><span class="rtt-l">Topik:</span>' +
    chips
      .map((a, i) => '<a class="chip' + (i >= N ? ' rtt-x' : '') + '" href="' + esc(a.getAttribute('href')) + '">' + a.innerHTML + '</a>')
      .join('') +
    (hid > 0 ? '<button type="button" class="chip rtt-m" aria-expanded="false" onclick="rtTog(this)">+' + hid + ' lagi</button>' : '') +
    '</div>'
  );
}

function rtTog(b) {
  const w = b.closest('.rtt'),
    open = w.classList.toggle('open');
  b.setAttribute('aria-expanded', open ? 'true' : 'false');
  b.textContent = open ? 'Ringkas' : '+' + w.querySelectorAll('.rtt-x').length + ' lagi';
}

/* ===== Header: tombol tema jadi ikon, menu menandai halaman aktif ===== */

(function () {
  const b = document.getElementById('th'),
    root = document.documentElement;
  if (b) {
    const upd = () => {
      const dark = root.getAttribute('data-theme') === 'dark',
        key = dark ? 'dark' : 'light';
      if (b.dataset.ic === key && b.querySelector('svg')) return;
      b.dataset.ic = key;
      b.innerHTML = dark ? RT_IC.sun : RT_IC.moon;
      const t = 'Ganti ke mode ' + (dark ? 'terang' : 'gelap');
      b.title = t;
      b.setAttribute('aria-label', t);
      b.classList.add('th-ic');
    };
    upd();
    new MutationObserver(upd).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    new MutationObserver(upd).observe(b, { childList: true, characterData: true, subtree: true });
  }
  const sync = () => {
    const m = (location.hash || '#/').match(/^#\/([a-z])/);
    let k = m ? m[1] : '';
    if (k && 'rbc'.indexOf(k) >= 0) k = 'p'; // layar baca/kitab/telusur termasuk Perpustakaan
    document.querySelectorAll('header .menu a').forEach((a) => {
      if (k && a.getAttribute('href') === '#/' + k) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };
  sync();
  window.addEventListener('hashchange', sync);
})();