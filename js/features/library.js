/**
 * library.js — Perpustakaan: jelajah kategori, halaman kitab, jalur belajar, dan penanda progres baca.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Jelajah kategori/sub-kategori indeks Sefaria dengan breadcrumb dan penyaring daftar.
 */
async function browse(p) {
  const t = await api('/index');
  let items,
    title,
    base = [];
  if (p[0] === '*') {
    items = t.filter((x) => !C[x.category]);
    title = 'Lainnya';
  } else if (!p[0]) {
    items = t;
    title = 'Semua kategori';
  } else {
    let cur = t,
      node;
    for (const n of p) {
      node = cur.find((x) => x.category === n);
      if (!node) throw 0;
      cur = node.contents;
    }
    items = cur;
    title = node.category;
    base = p;
  }
  const card = (n) =>
    n.contents
      ? `<a class="card" data-t="${esc((n.category + ' ' + (n.heCategory || '')).toLowerCase())}" href="#/c/${encP([...base, n.category])}"><b>${esc(dn(n.category))}</b><span class="he">${esc(n.heCategory)}</span><small>${n.contents.length} item</small></a>`
      : `<a class="card" data-t="${esc((n.title + ' ' + (n.heTitle || '')).toLowerCase())}" href="#/b/${enc(n.title)}"><b>${esc(n.title)}</b><span class="he">${esc(n.heTitle)}</span></a>`;
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a>${base.map((n, i) => ` › <a href="#/c/${encP(base.slice(0, i + 1))}">${esc(i ? n : dn(n))}</a>`).join('')}</nav>
 ${catHead(p) || `<h2>${esc(title)}</h2><div id="cd"></div>`}<input class="filter" aria-label="Saring" placeholder="Saring daftar ini…" oninput="filt(this.value)"><div class="grid" id="g">${items.map(card).join('')}</div>`;
  if (p[0] && p[0] !== '*') catDesc(p);
}

/**
 * Saring kartu di daftar saat ini berdasarkan teks input (client-side).
 */
function filt(v) {
  v = v.toLowerCase();
  document.querySelectorAll('#g .card').forEach((c) => (c.hidden = !c.dataset.t.includes(v)));
}

/**
 * Hasilkan daftar bagian (pasal, atau daf a/b untuk Talmud) dari skema kitab.
 */
const secs = (sc) => {
  const L = sc.lengths && sc.lengths[0];
  if (!L) return null;
  const a = [];
  if ((sc.addressTypes || [])[0] === 'Talmud') {
    for (let i = 3; i <= L; i++) a.push(Math.floor((i + 1) / 2) + (i % 2 ? 'a' : 'b'));
  } else for (let i = 1; i <= L; i++) a.push(String(i));
  return a;
};

/**
 * Render rekursif simpul skema kitab bertingkat menjadi daftar bagian yang bisa diklik.
 */
const nl = (ns, pre) =>
  ns
    .map((n) => {
      const f = n.title ? pre + ', ' + n.title : pre,
        nm = n.title
          ? `${esc(n.title)} <span class="he" style="color:var(--gold)">${esc(n.heTitle)}</span>`
          : '';
      if (n.nodes) return `<div class="stage">${nm ? `<b>${nm}</b>` : ''}${nl(n.nodes, f)}</div>`;
      const s = (n.depth || 1) > 1 ? secs(n) : null;
      return s
        ? `<div class="stage"><b>${nm || 'Bagian'}</b><div class="nums" style="margin-top:6px">${s.map((x) => `<a href="#/r/${enc(f + ' ' + x)}">${x}</a>`).join('')}</div></div>`
        : `<a class="card" style="margin:6px 0" href="#/r/${enc(f)}"><b>${nm || 'Buka teks'}</b></a>`;
    })
    .join('');

/**
 * Halaman kitab: pilih pasal/daf, tandai yang sudah dibaca, atau tampilkan struktur bertingkat.
 */
async function book(t) {
  let d;
  for (const u of ['/v2/index/', '/index/']) {
    try {
      d = await api(u + enc(t));
      if (d && d.schema) break;
    } catch {}
  }
  if (!d) throw 0;
  const sc = d.schema || {},
    L = sc.lengths && sc.lengths[0],
    talmud = (sc.addressTypes || [])[0] === 'Talmud',
    cats = d.categories || [];
  let body;
  const rd = st.get('read', {})[d.title || t] || [];
  if (L) {
    const it = [];
    if (talmud) {
      for (let i = 3; i <= L; i++) it.push(Math.floor((i + 1) / 2) + (i % 2 ? 'a' : 'b'));
    } else for (let i = 1; i <= L; i++) it.push(String(i));
    body = `<p class="muted">${talmud ? 'Pilih halaman (<abbr title="Daf = satu lembar Talmud, terdiri dari halaman a dan b (amud)">daf</abbr>)' : 'Pilih bagian'}</p><p class="muted" id="prg"></p><div class="nums" id="nm">${it.map((x) => `<a class="${rd.includes(x) ? 'rd' : ''}" data-s="${x}" href="#/r/${enc(t + ' ' + x)}">${x}${rd.includes(x) ? '<i>✓</i>' : ''}</a>`).join('')}</div>`;
  } else if (sc.nodes && sc.nodes.length)
    body =
      '<p class="muted">Kitab ini terdiri dari beberapa bagian. Pilih salah satu:</p>' +
      nl(sc.nodes, d.title || t);
  else
    body = `<p class="muted">Struktur kitab ini kompleks. Cari bagian tertentu dengan referensi, mis. “${esc(t)} 1”, atau mulai dari awal.</p><a class="btn" href="#/r/${enc(t + ' 1')}">Buka dari awal</a>`;
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a>${cats.map((n, i) => ` › <a href="#/c/${encP(cats.slice(0, i + 1))}">${esc(i ? n : dn(n))}</a>`).join('')}</nav>
 <h2>${esc(d.title || t)} <span class="he" style="color:var(--gold)">${esc(d.heTitle)}</span></h2>${body}`;
  shapeFill(d.title || t, talmud, rd);
}

/**
 * Kepala halaman kategori tingkat atas: deskripsi, posisi di Jalur Belajar, dan kitab pemula.
 */
function catHead(p) {
  const k = p[0],
    c = C[k];
  if (p.length !== 1 || !c) return '';
  const s = stg(k),
    pr = s > 0 ? ST[s - 1][1] : [],
    nx = s < 4 ? ST[s + 1][1] : [];
  const lk = (a) => a.map((x) => `<a class="chip" href="#/c/${enc(x)}">${esc(dn(x))}</a>`).join('');
  return `<h2>${esc(c[1])} <span class="he" style="color:var(--gold)">${esc(c[0])}</span>${k === 'Kabbalah' ? '<span class="tag">lanjutan</span>' : ''}</h2><p class="intro">${esc(c[2])}</p><div id="cd"></div>
 <div class="stage"><b>Tahap ${s + 1} dari 5: ${esc(ST[s][0])}</b>${pr.length ? `<p class="muted">Sebaiknya dibaca setelah: ${lk(pr)}</p>` : ''}${nx.length ? `<p class="muted">Lanjut ke: ${lk(nx)}</p>` : ''}</div>
 ${c[3].length ? `<p><b>Mulai dari sini</b></p><p>${c[3].map((x) => `<a class="chip" href="#/s/${enc(x)}">${esc(x)}</a>`).join('')}</p>` : ''}<h3>Semua kitab</h3>`;
}

/**
 * Kartu kategori (nama, Ibrani, keterangan) yang menaut ke halaman kategori.
 */
const kcard = (k, sub) =>
  `<a class="card" href="#/c/${enc(k)}"><b>${esc(C[k][1])}</b><span class="he">${esc(C[k][0])}</span><small>${esc(sub)}</small></a>`;

/**
 * Halaman Jalur Belajar: lima tahap beserta kategori tiap tahap.
 */
async function jalur() {
  app.innerHTML =
    `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Jalur Belajar <span class="he" style="color:var(--gold)">מסלול</span></h2><p class="intro">Urutan yang umum dipakai pemula. Ini hanya saran: semua kategori tetap terbuka dan boleh dilompati. Aliran dan guru yang berbeda bisa menyusun urutan yang berbeda.</p>` +
    ST.map(
      (s, i) =>
        `<div class="stage"><b>Tahap ${i + 1}: ${esc(s[0])}</b><div class="grid" style="margin-top:8px">${s[1].map((k) => kcard(k, C[k][2].split('. ')[0])).join('')}</div></div>`,
    ).join('');
}

/**
 * Halaman Perpustakaan: semua kategori berurutan menurut tahap, ditambah 'Lainnya'.
 */
async function perpus() {
  const ex = (await api('/index')).filter((x) => !C[x.category]);
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Perpustakaan</h2><p class="muted">Berurutan sesuai Jalur Belajar.</p><div class="grid">${ST.flatMap((s, i) => s[1].map((k) => kcard(k, 'Tahap ' + (i + 1) + ' · ' + s[0]))).join('')}${ex.length ? `<a class="card" href="#/c/*"><b>Lainnya</b><small>${ex.length} kategori</small></a>` : ''}</div>`;
}

/**
 * Muat deskripsi kategori dari Sefaria (Inggris) dan sisipkan di halaman kategori.
 */
async function catDesc(p) {
  const el = document.getElementById('cd');
  if (!el) return;
  try {
    const d = await langFetch('/category/' + p.map(enc).join('/'));
    if (!d || typeof d === 'string' || isErr(d)) return;
    const tx = d.enDesc || d.enShortDesc || '';
    if (!tx || document.getElementById('cd') !== el) return;
    el.innerHTML = `<p class="muted" style="margin:6px 0"><b>Deskripsi dari Sefaria (Inggris):</b> ${clean(tx)}</p>`;
  } catch {}
}

/**
 * Pecah rujukan 'Kitab 12a' menjadi {t: judul, s: bagian}; null bila bukan pasal.
 */
const parseCh = (r) => {
  const m = String(r).match(/^(.+?)\s(\d+[ab]?)$/);
  return m ? { t: m[1], s: m[2] } : null;
};

/**
 * Apakah bagian ini sudah ditandai dibaca (localStorage 'read').
 */
const isRead = (q) => (st.get('read', {})[q.t] || []).includes(q.s);

/**
 * HTML tombol 'Tandai sudah dibaca' sesuai status saat ini.
 */
const rdBtn = (q) =>
  `<button id="rdb" class="${isRead(q) ? 'on' : ''}" onclick="toggleRead()">${isRead(q) ? '✓ Sudah dibaca' : 'Tandai sudah dibaca'}</button>`;

/**
 * Ubah status baca bagian yang sedang dibuka dan perbarui tombolnya.
 */
function toggleRead() {
  const q = window.PC;
  if (!q) return;
  const R = st.get('read', {}),
    a = R[q.t] || [];
  R[q.t] = a.includes(q.s) ? a.filter((x) => x !== q.s) : [...a, q.s];
  st.set('read', R);
  const b = document.getElementById('rdb'),
    on = R[q.t].includes(q.s);
  if (b) {
    b.className = on ? 'on' : '';
    b.textContent = on ? '✓ Sudah dibaca' : 'Tandai sudah dibaca';
  }
}

/**
 * Tambahkan jumlah ayat per bagian di grid pasal (dari endpoint /shape) dan ringkasan progres.
 */
async function shapeFill(t, talmud, rd) {
  const pg = document.getElementById('prg'),
    nm = document.getElementById('nm');
  if (!nm) return;
  const cells = [...nm.children];
  if (pg)
    pg.textContent = `Sudah dibaca ${rd.length} dari ${cells.length} bagian. Tandai bagian yang selesai dari tombol di layar baca.`;
  try {
    let d = await api('/shape/' + enc(t), 1);
    if (Array.isArray(d)) d = d.length === 1 ? d[0] : null;
    const ch = d && d.chapters;
    if (!Array.isArray(ch) || document.getElementById('nm') !== nm) return;
    const off = talmud
      ? ch.length === cells.length + 2
        ? 2
        : ch.length === cells.length
          ? 0
          : -1
      : 0;
    if (off < 0) return;
    cells.forEach((a, i) => {
      const v = ch[i + off],
        n = Array.isArray(v) ? v.reduce((s, x) => s + (+x || 0), 0) : +v;
      if (n) {
        a.title = n + ' ayat/segmen';
        a.insertAdjacentHTML('beforeend', '<small>' + n + '</small>');
      }
    });
  } catch {}
}
