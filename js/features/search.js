/**
 * search.js — Pencarian: nama kitab/rujukan dan pencarian teks penuh (full-text).
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Pencarian: coba kenali sebagai kitab atau rujukan lebih dulu, bila tidak tampilkan saran + teks penuh.
 */
async function search(q) {
  if (!q) return home();
  let d = {};
  try {
    d = await api('/name/' + enc(q) + '?limit=10');
  } catch {}
  if (d.is_book && d.book) {
    location.replace('#/b/' + enc(d.book));
    return;
  }
  if (d.is_ref && d.ref) {
    location.replace('#/r/' + enc(d.ref));
    return;
  }
  const cs = d.completions || [];
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Hasil untuk “${esc(q)}”</h2>${cs.length ? `<h3>Kitab</h3><div class="grid">${cs.map((c) => `<a class="card" href="#/b/${enc(c)}"><b>${esc(c)}</b></a>`).join('')}</div>` : ''}<h3>Di dalam teks</h3><div id="ff"></div><div id="ft"><p class="muted">Mencari…</p></div>`;
  fulltext(q);
}

/**
 * POST ke Sefaria search-wrapper; mencoba dua Content-Type agar lolos aturan CORS.
 */
async function ftPost(body) {
  const b = JSON.stringify(body);
  let err = '';
  // Coba dua Content-Type: 'text/plain' (menghindari preflight CORS) lalu JSON
  for (const ct of ['text/plain;charset=UTF-8', 'application/json']) {
    try {
      const x = await fetch(API + '/search-wrapper', {
        method: 'POST',
        headers: { 'Content-Type': ct },
        body: b,
      });
      if (x.ok) {
        const d = await x.json();
        if (d && typeof d.error === 'string') {
          err = d.error;
          continue;
        }
        return d;
      }
      err = 'status ' + x.status;
    } catch (e) {
      err = 'jaringan/CORS';
    }
  }
  throw new Error(err);
}

/**
 * Render tombol penyaring kategori untuk hasil pencarian teks penuh.
 */
function ftChips() {
  const F = window.FT || {},
    el = document.getElementById('ff');
  if (!el) return;
  el.innerHTML = ['', ...FTC]
    .map(
      (k) =>
        `<button class="chip${(F.filter || '') === k ? ' on' : ''}" data-k="${esc(k)}" onclick="fulltext(FT.q,this.dataset.k,0)">${esc(k ? dn(k) : 'Semua')}</button>`,
    )
    .join('');
}

/**
 * Render satu hasil pencarian teks penuh (rujukan + cuplikan dengan sorotan).
 */
const ftItem = (h) => {
  const s = h._source || {},
    x = Object.values(h.highlight || {}).flat()[0] || s.exact || s.naive_lemmatizer || '';
  return `<div class="cm"><b><a href="#/r/${enc(s.ref)}">${esc(s.ref)}</a> <span class="he" style="color:var(--gold)">${esc(s.heRef)}</span></b>${clean(x)}</div>`;
};

/**
 * Pencarian teks penuh dengan paginasi 'Muat lebih banyak' dan fallback bila endpoint berhalaman gagal.
 */
async function fulltext(q, filter = '', start = 0) {
  const el = document.getElementById('ft');
  if (!el) return;
  const he = /[\u05D0-\u05EA]/.test(q);
  window.FT = { q, filter, start };
  ftChips();
  const lk = `<a href="https://www.sefaria.org/search?q=${enc(q)}&tab=text" target="_blank" rel="noopener">Cari di Sefaria.org</a>`;
  if (!start) el.innerHTML = '<p class="muted">Mencari…</p>';
  else {
    const b0 = document.getElementById('ftb');
    if (b0) b0.innerHTML = '<p class="muted">Memuat…</p>';
  }
  // Isi permintaan pencarian; kata Ibrani memakai field lemmatizer
  const body = {
    query: q,
    type: 'text',
    size: 20,
    start,
    ...(he ? { field: 'naive_lemmatizer', slop: 10 } : {}),
    ...(filter ? { filters: [filter], filter_fields: ['path'] } : {}),
  };
  let d,
    paged = true;
  try {
    d = await ftPost(body);
  } catch (e1) {
    if (start || filter) {
      el.innerHTML = `<p class="muted">Pencarian teks penuh tidak bisa dimuat (${esc(e1.message)}). ${lk}</p>`;
      return;
    }
    try {
      d = await ftPost({ query: q, type: 'text' });
      paged = false;
    } catch (e2) {
      el.innerHTML = `<p class="muted">Pencarian teks penuh tidak bisa dimuat (${esc(e2.message)}). ${lk}</p>`;
      return;
    }
  }
  if (document.getElementById('ft') !== el) return;
  const hs = (d.hits && d.hits.hits) || [],
    tot =
      (d.hits && (typeof d.hits.total === 'object' ? d.hits.total.value : d.hits.total)) ||
      hs.length;
  if (!start) {
    if (!hs.length) {
      el.innerHTML = `<p class="muted">Tidak ada hasil di dalam teks${filter ? ' untuk kategori ini' : ''}. Coba kata lain, dalam bahasa Inggris atau Ibrani. ${lk}</p>`;
      return;
    }
    el.innerHTML = '<div id="ftl"></div><div id="ftb"></div>';
  }
  document.getElementById('ftl').insertAdjacentHTML('beforeend', hs.map(ftItem).join(''));
  const shown = start + hs.length;
  window.FT.start = shown;
  document.getElementById('ftb').innerHTML =
    `<p class="muted">Menampilkan ${nf(shown)}${paged ? ' dari ' + nf(tot) : ''} hasil.</p>` +
    (paged && hs.length && shown < tot
      ? '<button onclick="fulltext(FT.q,FT.filter,FT.start)">Muat lebih banyak</button>'
      : '') +
    `<p class="attr">${lk} untuk hasil lebih lengkap.</p>`;
}
