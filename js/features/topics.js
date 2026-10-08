/**
 * topics.js — Topik/tema: daftar tema, detail tema, peta tema, dan rekomendasi dari riwayat baca.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Isi cuplikan teks untuk daftar rujukan secara paralel terbatas (lazy, via pool).
 */
function fillRefs(list, pre, off = 0) {
  pool(
    list.map((r, k) => async () => {
      let h = '';
      try {
        const d = await api('/v3/texts/' + enc(r) + '?version=hebrew&version=english', 1),
          v = d.versions || [],
          a = v.find((z) => z.language === 'en') || v.find((z) => z.language === 'he'),
          tx = a ? flat(a.text).join(' ') : '';
        h = clean(tx.length > 1200 ? tx.slice(0, 1200).replace(/<[^>]*$/, '') + '…' : tx);
      } catch {}
      const el = document.getElementById(pre + (off + k));
      if (el) {
        el.className = '';
        el.innerHTML =
          h || '<span class="muted">Teks tidak tersedia. Ketuk referensi untuk membukanya.</span>';
      }
    }),
  );
}

/**
 * Halaman Topik: tema populer, rekomendasi, dan pencarian tema (120 pertama ditampilkan).
 */
async function topik(s) {
  if (s) return topikDetail(s);
  const all = (await api('/topics?limit=1000')).filter(
    (x) => x.slug && x.shouldDisplay !== false && x.primaryTitle,
  );
  all.sort((a, b) => (a.displayOrder ?? 1e9) - (b.displayOrder ?? 1e9));
  window.TP = all;
  const have = new Set(all.map((x) => x.slug)),
    pop = [
      ['Sabat', 'shabbat'],
      ['Doa', 'prayer'],
      ['Pertobatan', 'teshuvah'],
      ['Kasih', 'love'],
      ['Keadilan', 'justice'],
      ['Paskah', 'passover'],
      ['Torah', 'torah'],
      ['Amal', 'tzedakah'],
    ].filter((x) => have.has(x[1]));
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Topik <span class="he" style="color:var(--gold)">נושאים</span></h2><p class="intro">Belum tahu mau membaca apa? Pilih tema, lalu lihat teks dari berbagai kitab yang membahasnya.</p>
 ${pop.length ? `<p><b>Tema populer</b></p><p>${pop.map((x) => `<a class="chip" href="#/t/${enc(x[1])}">${x[0]}</a>`).join('')}</p>` : ''}
 <h3>Tema untuk Anda</h3><div id="rk"></div><input class="filter" aria-label="Cari tema" placeholder="Cari tema (bahasa Inggris atau Ibrani)…" oninput="tpShow(this.value)"> <button class="chip" id="tpall" onclick="tpAll()">Cari di seluruh tema (data besar)</button><div class="grid" id="tg"></div>`;
  tpShow('');
  rekomen();
}

/**
 * Saring dan tampilkan kartu tema (maks. 120) berdasarkan teks input.
 */
function tpShow(v) {
  v = v.toLowerCase();
  const a = window.TP.filter(
    (x) =>
      !v ||
      ((x.primaryTitle.en || '') + ' ' + (x.primaryTitle.he || '') + ' ' + x.slug)
        .toLowerCase()
        .includes(v),
  );
  document.getElementById('tg').innerHTML =
    a
      .slice(0, 120)
      .map(
        (x) =>
          `<a class="card" href="#/t/${enc(x.slug)}"><b>${esc(x.primaryTitle.en || x.slug)}</b><span class="he">${esc(x.primaryTitle.he)}</span></a>`,
      )
      .join('') +
    (a.length > 120
      ? `<p class="muted" style="grid-column:1/-1">Menampilkan 120 dari ${a.length}. Ketik untuk menyaring.</p>`
      : '') +
    (a.length ? '' : '<p class="muted" style="grid-column:1/-1">Tema tidak ditemukan.</p>');
}

/**
 * Satu butir daftar teks sebuah tema; menyimpan posisi scroll sebelum membuka teks.
 */
const tpItem = (x, k) =>
  `<div class="cm"><b><a href="#/r/${enc(x)}" onclick="(window.TSY=window.TSY||{})[window.TR.slug]=scrollY">${esc(x)}</a></b><span id="tr${k}" class="muted">Memuat…</span></div>`;

/**
 * Perbarui penghitung 'menampilkan X dari Y' dan tombol 'Muat lebih banyak' di detail tema.
 */
function tpBar() {
  const T = window.TR,
    b = document.getElementById('tb');
  if (b)
    b.innerHTML =
      `<p class="muted">Menampilkan ${nf(T.shown)} dari ${nf(T.rf.length)} teks.</p>` +
      (T.shown < T.rf.length ? `<button onclick="tpMore(12)">Muat lebih banyak</button>` : '');
}

/**
 * Tambah n teks berikutnya pada detail tema dan ingat jumlahnya per tema.
 */
function tpMore(add) {
  const T = window.TR,
    from = T.shown,
    to = Math.min(T.rf.length, from + add),
    part = T.rf.slice(from, to);
  document
    .getElementById('tl')
    .insertAdjacentHTML('beforeend', part.map((x, k) => tpItem(x, from + k)).join(''));
  T.shown = to;
  (window.TS = window.TS || {})[T.slug] = to;
  fillRefs(part, 'tr', from);
  tpBar();
}

/**
 * Detail satu tema: deskripsi, tema terkait, daftar teks (diurutkan prioritas), dan peta tema.
 */
async function topikDetail(s) {
  const d = await api('/v2/topics/' + enc(s) + '?with_refs=1&with_links=1');
  const ti = d.primaryTitle || {},
    desc = (d.description && (d.description.en || d.description.he)) || '';
  let rf = d.refs;
  if (rf && !Array.isArray(rf))
    rf = Object.values(rf).flatMap((v) => (Array.isArray(v) ? v : (v && v.refs) || []));
  rf = (rf || []).filter((x) => x && (typeof x === 'string' || typeof x.ref === 'string'));
  const pr = (x) => (typeof x === 'string' ? 0 : (x.order && +x.order.pr) || 0);
  if (rf.some((x) => pr(x) > 0)) rf = rf.slice().sort((a, b) => pr(b) - pr(a));
  rf = [...new Set(rf.map((x) => x.ref || x))];
  let rl = d.links
    ? Object.values(d.links).flatMap((v) => (Array.isArray(v) ? v : (v && v.links) || []))
    : [];
  const seen = new Set(),
    rel = rl.filter((x) => x && x.topic && !seen.has(x.topic) && seen.add(x.topic)).slice(0, 14);
  window.TR = { slug: s, rf, shown: 0 };
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a> › <a href="#/t">Topik</a></nav><h2>${esc(ti.en || s)} <span class="he" style="color:var(--gold)">${esc(ti.he)}</span></h2>${desc ? `<p class="intro">${clean(desc)}</p>` : ''}
 ${rel.length ? `<p><b>Tema terkait</b></p><p>${rel.map((x) => `<a class="chip" href="#/t/${enc(x.topic)}">${esc((x.title && (x.title.en || x.title)) || x.topic)}</a>`).join('')}</p>` : ''}
 <div id="pg"></div>${rf.length ? '<p><button onclick="acakTema(this)">Acak dari tema ini</button></p>' : ''}<h3>Teks tentang tema ini</h3>${rf.length ? '<div id="tl"></div><div id="tb"></div>' : '<p class="muted">Belum ada daftar teks untuk tema ini.</p>'}`;
  if (rf.length) {
    tpMore((window.TS || {})[s] || 12);
    const y = (window.TSY || {})[s];
    if (y) setTimeout(() => scrollTo(0, y), 150);
  }
  peta(s);
}

/**
 * Cari rekursif objek bertipe {topic: '...'} di dalam respons API yang bentuknya bervariasi.
 */
function findTopics(o, out = [], d = 0) {
  if (!o || d > 5) return out;
  if (Array.isArray(o)) o.forEach((x) => findTopics(x, out, d + 1));
  else if (typeof o === 'object') {
    if (typeof o.topic === 'string') out.push(o);
    else Object.values(o).forEach((x) => findTopics(x, out, d + 1));
  }
  return out;
}

/**
 * Ambil tema untuk suatu ref; mencoba beberapa endpoint & variasi header dan mengingat yang berhasil.
 */
async function fetchTopics(ref, unit) {
  const E = enc(ref),
    V = [
      ['', { 'Accept-Language': 'en' }],
      ['?lang=english', {}],
      ['?interfaceLang=english', {}],
      ['', {}],
    ],
    W = (window.RTW = window.RTW || {}),
    tr = (window.RTDBG = []);
  let last,
    bad = false;
  for (const b of ['/ref-topic-links/', '/related/']) {
    for (const v of W[b] ? [W[b], ...V] : V) {
      try {
        const d = await rj(b + E + v[0], v[1]);
        last = d;
        if (isErr(d)) {
          tr.push(
            b + v[0] + (v[1]['Accept-Language'] ? ' [Accept-Language: en]' : '') + ' -> ' + d.error,
          );
          continue;
        }
        W[b] = v;
        return d;
      } catch (e) {
        last = e.message;
        tr.push(b + v[0] + ' -> ' + e.message);
        if (e.message === 'waktu habis' || /fetch/i.test(e.message)) {
          bad = true;
          break;
        }
      }
    }
    if (bad) break;
  }
  return last;
}

/**
 * Hasilkan HTML chip tema (maks. 10, terurut prioritas) untuk pasal/ayat, dengan pesan galat yang ramah.
 */
async function topicHtml(ref, unit) {
  const m = (x) => `<span class="muted" style="font-size:13px">${x}</span>`,
    pr = (x) => (x.order && +x.order.pr) || 0;
  try {
    const d = await fetchTopics(ref, unit);
    if (typeof d === 'string') throw new Error(d);
    const A = findTopics(d && d.topics ? d.topics : d),
      seen = new Set(),
      L = A.slice()
        .sort((a, b) => pr(b) - pr(a))
        .map((x) => x.topic)
        .filter((s) => !seen.has(s) && seen.add(s))
        .slice(0, 10);
    if (!L.length) {
      const raw = JSON.stringify(d && d.topics !== undefined ? d.topics : d) || '',
        empty = ['[]', '{}', 'null', ''].includes(raw);
      return m(
        empty
          ? 'Belum ada tema untuk ' +
              unit +
              ' ini.' +
              (unit === 'pasal' ? ' Ketuk satu ayat untuk melihat tema per ayat.' : '')
          : 'Format data tema belum dikenali: ' +
              esc(raw.slice(0, 100)) +
              '<details><summary>Rincian teknis</summary><pre>' +
              esc((window.RTDBG || []).join('\n')) +
              '</pre></details>',
      );
    }
    const tt = {};
    try {
      (await api('/topics?limit=1000', 1)).forEach((x) => {
        if (x.slug && x.primaryTitle) tt[x.slug] = x.primaryTitle.en;
      });
    } catch {}
    return (
      m('Tema di bagian ini:') +
      ' ' +
      L.map(
        (s) =>
          `<a class="chip" href="#/t/${enc(s)}">${esc(tt[s] || s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()))}</a>`,
      ).join('')
    );
  } catch (e) {
    return (
      m(
        'Tema tidak bisa dimuat (' +
          esc(e.message) +
          '). Server Sefaria mungkin sedang lambat untuk ' +
          unit +
          ' ini.',
      ) +
      (unit === 'pasal'
        ? ' <button class="chip" onclick="topicsFor(window.RF)">Coba lagi</button>'
        : ' Ketuk ayat ini lagi untuk mencoba ulang.')
    );
  }
}

/**
 * Muat dan tampilkan tema untuk pasal yang sedang dibaca.
 */
async function topicsFor(ref) {
  const el = document.getElementById('rt');
  if (!el) return;
  el.innerHTML =
    '<span class="muted" style="font-size:13px">Memuat tema… (bisa agak lama untuk pasal yang panjang)</span>';
  const h = await topicHtml(ref, 'pasal');
  if (document.getElementById('rt') === el) el.innerHTML = h;
}

/**
 * Peta slug → nama tema Inggris (di-cache di window.TT).
 */
async function ttMap() {
  if (window.TT) return window.TT;
  const m = {};
  try {
    (await api('/topics?limit=1000', 1)).forEach((x) => {
      if (x.slug && x.primaryTitle) m[x.slug] = x.primaryTitle.en;
    });
  } catch {}
  return (window.TT = m);
}

/**
 * Nama tema yang ramah baca: pakai peta judul, atau ubah slug-kebab menjadi kapital awal.
 */
const pretty = (s, m) =>
  (m && m[s]) ||
  String(s)
    .replace(/-/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

/**
 * Ekstrak daftar slug tema dari respons API yang bentuknya bervariasi.
 */
function slugsOf(d) {
  const out = [],
    add = (s) => {
      if (typeof s === 'string' && s && !out.includes(s)) out.push(s);
    };
  if (
    d &&
    typeof d === 'object' &&
    !Array.isArray(d) &&
    Object.values(d).length &&
    Object.values(d).every((v) => typeof v === 'number')
  )
    return Object.keys(d);
  (function w(o, dp) {
    if (o == null || dp > 5 || typeof o !== 'object') return;
    if (Array.isArray(o)) o.forEach((x) => (typeof x === 'string' ? add(x) : w(x, dp + 1)));
    else if (typeof o.topic === 'string') add(o.topic);
    else if (typeof o.slug === 'string') add(o.slug);
    else Object.values(o).forEach((x) => w(x, dp + 1));
  })(d, 0);
  return out;
}

/**
 * Rekomendasi tema dari riwayat baca (endpoint rekomendasi, fallback gabungan tema ref terakhir).
 */
async function rekomen() {
  const el = document.getElementById('rk');
  if (!el) return;
  const h = st.get('hist', []).slice(0, 6);
  if (!h.length) {
    el.innerHTML =
      '<p class="muted">Baca beberapa teks dulu, lalu tema yang cocok dengan bacaan Anda muncul di sini.</p>';
    return;
  }
  el.innerHTML = '<p class="muted">Memuat rekomendasi…</p>';
  try {
    let L = [],
      lokal = false;
    for (const path of [
      '/recommend/topics/' + enc(h[0]),
      h.length > 1 ? '/recommend/topics/' + h.map(enc).join('+') : '',
    ]) {
      if (!path) continue;
      try {
        const d = await langFetch(path);
        if (typeof d !== 'string' && !isErr(d)) {
          const s = slugsOf(d);
          if (s.length) {
            L = s;
            break;
          }
        }
      } catch {}
    }
    if (!L.length) {
      lokal = true;
      const rs = await Promise.allSettled(h.slice(0, 3).map((q) => fetchTopics(q, 'pasal'))),
        cnt = {};
      rs.forEach((x) => {
        if (x.status !== 'fulfilled' || typeof x.value === 'string' || isErr(x.value)) return;
        findTopics(x.value && x.value.topics ? x.value.topics : x.value).forEach((o) => {
          cnt[o.topic] = (cnt[o.topic] || 0) + 1;
        });
      });
      L = Object.keys(cnt)
        .sort((a, b) => cnt[b] - cnt[a])
        .slice(0, 12);
    }
    const m = await ttMap();
    if (document.getElementById('rk') !== el) return;
    el.innerHTML = L.length
      ? `<p>${L.map((s) => `<a class="chip" href="#/t/${enc(s)}">${esc(pretty(s, m))}</a>`).join('')}</p>${lokal ? '<p class="attr">Disusun dari tema bacaan terakhir Anda.</p>' : ''}`
      : '<p class="muted">Belum ada rekomendasi untuk bacaan Anda. Coba baca beberapa teks lain, lalu buka halaman ini lagi.</p>';
  } catch (e) {
    if (document.getElementById('rk') === el)
      el.innerHTML = `<p class="muted">Rekomendasi tidak bisa dimuat (${esc(e.message)}). <button class="chip" onclick="rekomen()">Coba lagi</button></p>`;
  }
}

/**
 * Urai graf tema Sefaria menjadi kelompok relasi berlabel Indonesia dan peta slug → judul.
 */
function parseGraph(d, s) {
  const tops = {},
    links = [];
  (function w(o, dp) {
    if (!o || typeof o !== 'object' || dp > 6) return;
    if (Array.isArray(o)) {
      o.forEach((x) => w(x, dp + 1));
      return;
    }
    if (typeof o.linkType === 'string') {
      links.push(o);
      return;
    }
    if (typeof o.slug === 'string' && o.primaryTitle) tops[o.slug] = o.primaryTitle.en || o.slug;
    Object.entries(o).forEach(([k, v]) => {
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        (v.primaryTitle || v.titles) &&
        typeof v.slug !== 'string'
      )
        tops[k] = (v.primaryTitle && v.primaryTitle.en) || k;
      w(v, dp + 1);
    });
  })(d, 0);
  const G = {};
  links.forEach((l) => {
    const a = l.fromTopic || l.from || l.source || l.topic1,
      b = l.toTopic || l.to || l.target || l.topic2;
    let o,
      out = true;
    if (a === s && typeof b === 'string') o = b;
    else if (b === s && typeof a === 'string') {
      o = a;
      out = false;
    }
    if (!o) return;
    const lab = (LT[l.linkType] || [l.linkType, l.linkType])[out ? 0 : 1];
    (G[lab] = G[lab] || new Set()).add(o);
  });
  return { G, tops };
}

/**
 * Muat dan tampilkan 'Peta tema' (tema terhubung berdasarkan jenis relasi).
 */
async function peta(s) {
  const el = document.getElementById('pg');
  if (!el) return;
  el.innerHTML = '<p class="muted">Memuat peta tema…</p>';
  try {
    const d = await langFetch('/topics-graph/' + enc(s));
    if (typeof d === 'string') throw new Error(d);
    const m = await ttMap();
    if (document.getElementById('pg') !== el) return;
    if (isErr(d)) {
      el.innerHTML = `<p class="muted">Peta tema belum bisa dimuat: ${esc(d.error)}</p>`;
      return;
    }
    const { G, tops } = parseGraph(d, s),
      ks = Object.keys(G),
      ti = (o) => tops[o] || pretty(o, m),
      chips = (a) =>
        [...a]
          .slice(0, 14)
          .map((o) => `<a class="chip" href="#/t/${enc(o)}">${esc(ti(o))}</a>`)
          .join('');
    const rest = Object.keys(tops).filter((o) => o !== s);
    el.innerHTML = ks.length
      ? `<h3>Peta tema</h3>${ks.map((k) => `<p style="margin:6px 0 2px"><b>${esc(k)}</b></p><p style="margin:0">${chips(G[k])}</p>`).join('')}`
      : rest.length
        ? `<h3>Peta tema</h3><p class="muted" style="margin:0">Tema terhubung:</p><p>${chips(rest)}</p>`
        : `<p class="muted">Peta tema belum tersedia untuk tema ini.</p><details><summary class="muted">Data mentah</summary><pre>${esc(JSON.stringify(d).slice(0, 600))}</pre></details>`;
  } catch (e) {
    if (document.getElementById('pg') === el)
      el.innerHTML = `<p class="muted">Peta tema tidak bisa dimuat (${esc(e.message)}).</p>`;
  }
}

/**
 * Pilih teks acak dari satu tema; coba hingga 5 kandidat yang benar-benar punya teks.
 */
async function acakTema(b) {
  const T = window.TR;
  if (!T || !T.rf.length) return;
  if (b) {
    b.disabled = true;
    b.textContent = 'Mencari teks…';
  }
  const ok = T.rf.filter((x) => !/^sheet\b/i.test(x)),
    cand = (ok.length ? ok : T.rf).slice();
  for (let i = 0; i < 5 && cand.length; i++) {
    const q = cand.splice(Math.floor(Math.random() * cand.length), 1)[0];
    try {
      const d = await apiTO('/v3/texts/' + enc(q) + '?version=hebrew&version=english');
      if (d && !d.error && (d.versions || []).length) {
        location.hash = '#/r/' + enc(q);
        return;
      }
    } catch {}
  }
  if (b) {
    b.textContent = 'Belum menemukan teks yang bisa dibuka. Ketuk lagi';
    b.disabled = false;
  }
}

/**
 * Muat seluruh daftar tema (data besar) agar pencarian tema mencakup semuanya.
 */
async function tpAll() {
  const b = document.getElementById('tpall');
  if (!b) return;
  b.disabled = true;
  b.textContent = 'Memuat seluruh tema… (bisa agak lama)';
  try {
    const d = await apiTO('/topics?limit=50000', 60000),
      all = (Array.isArray(d) ? d : []).filter(
        (x) => x.slug && x.shouldDisplay !== false && x.primaryTitle,
      );
    if (all.length <= (window.TP || []).length) throw new Error('jumlah tema tidak bertambah');
    window.TP = all;
    b.textContent = 'Mencari di ' + nf(all.length) + ' tema';
    const i = document.querySelector('.filter');
    tpShow(i ? i.value : '');
  } catch (e) {
    b.disabled = false;
    b.textContent = 'Gagal (' + e.message + '). Ketuk untuk mencoba lagi';
  }
}
