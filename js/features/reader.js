/**
 * reader.js — Layar baca: teks Ibrani + terjemahan, ketuk kata, dan panel komentar/rujukan terkait.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Ref asli per segmen untuk rentang (mis. 'Genesis 6:9-11:32'); null bila bukan rentang.
 * Dipakai agar ketukan ayat mengirim ref valid ke Sefaria (bukan 'Genesis 6:9-11:32:3').
 */
function segRefs(d, n) {
  const ref = d.ref || '',
    vs = d.versions || [],
    raw = (vs.find((v) => v.language === 'he') || vs[0] || {}).text;
  let m = ref.match(/^(.+?) (\d+):(\d+)-(\d+):(\d+)$/); // lintas bab
  if (m && Array.isArray(raw) && Array.isArray(raw[0])) {
    const out = [];
    raw.forEach((ch, ci) => {
      const start = ci ? 1 : +m[3];
      (ch || []).forEach((_, j) => out.push(m[1] + ' ' + (+m[2] + ci) + ':' + (start + j)));
    });
    return out;
  }
  m = ref.match(/^(.+?) (\d+):(\d+)-(\d+)$/); // satu bab, sebagian ayat
  if (m) return Array.from({ length: n }, (_, j) => m[1] + ' ' + m[2] + ':' + (+m[3] + j));
  return null;
}

/**
 * Layar baca: ambil teks Ibrani + terjemahan, render per segmen, atur navigasi, riwayat, dan atribusi lisensi.
 */
async function read(ref) {
  // URL v3: teks Ibrani + terjemahan pilihan (atau Inggris sebagai bawaan)
  const qs = (tr, lg) =>
    '/v3/texts/' + enc(ref) + '?version=hebrew&version=' + (tr ? enc(tr) : enc(lg || 'english'));
  let d;
  try {
    d = await api(qs(S.tr, S.lang));
  } catch (e) {
    if (!S.tr && !S.lang) throw e;
  }
  let fb = false;
  if ((S.tr || S.lang) && !(d && (d.versions || []).some((v) => v.language !== 'he'))) {
    d = await api(qs('', 'english'));
    fb = true;
  }
  // Bila ref yang dibuka sebenarnya judul kitab, arahkan ke halaman kitab
  if (d.indexTitle && String(d.ref || ref).trim() === d.indexTitle) {
    location.replace('#/b/' + enc(d.indexTitle));
    return;
  }
  const ver = (l) => (d.versions || []).find((v) => v.language === l),
    he = ver('he'),
    en = (d.versions || []).find((v) => v.language !== 'he');
  const H = he ? flat(he.text) : [],
    E = en ? flat(en.text) : [],
    n = Math.max(H.length, E.length),
    SR = segRefs(d, n);
  // Simpan posisi terakhir dan riwayat (dipakai 'Lanjutkan membaca' & rekomendasi tema)
  st.set('last', d.ref || ref);
  window.RF = d.ref || ref;
  const pc = parseCh(d.ref || ref);
  window.PC = pc;
  st.set(
    'hist',
    [d.ref || ref, ...st.get('hist', []).filter((x) => x !== (d.ref || ref))].slice(0, 12),
  );
  window.SEG = {
    H: H.map(plain),
    E: E.map(plain),
    ref: d.ref || ref,
    lang: (en && en.language) || '',
    attr: [he, en]
      .filter(Boolean)
      .map((v) => v.versionTitle + (v.license ? ' (' + v.license + ')' : ''))
      .join(' · '),
  };
  let av = d.available_versions;
  if (!Array.isArray(av) && d.indexTitle) {
    try {
      av = await api('/texts/versions/' + enc(d.indexTitle));
    } catch {}
  }
  // Daftar terjemahan yang tersedia; Indonesia lalu Inggris diprioritaskan
  const trs = (Array.isArray(av) ? av : [])
    .filter((v) => v.language !== 'he' && v.versionTitle)
    .sort(
      (a, b) =>
        (b.actualLanguage === 'id') - (a.actualLanguage === 'id') ||
        (b.actualLanguage === 'en') - (a.actualLanguage === 'en'),
    )
    .slice(0, 60);
  const hasId = trs.some((v) => v.actualLanguage === 'id');
  window.TRS = trs; // dipakai pemilih terjemahan di ponsel (reader-tools.js)
  const sel = trs.length
    ? `<select id="vsel" aria-label="Pilih terjemahan" onchange="S.tr=this.value;apply();route()"><option value="">Terjemahan bawaan</option>${trs
        .map((v) => {
          const c = (v.languageFamilyName || 'english').toLowerCase() + '|' + v.versionTitle;
          return `<option value="${esc(c)}"${S.tr === c ? ' selected' : ''}>${esc((v.languageFamilyName || v.actualLanguage || 'English') + ': ' + v.versionTitle)}</option>`;
        })
        .join('')}</select>`
    : '';
  const note = fb
    ? 'Terjemahan pilihan tidak tersedia untuk bagian ini, jadi terjemahan bawaan yang ditampilkan.'
    : trs.length
      ? hasId
        ? 'Tersedia terjemahan Indonesia (lihat pilihan terjemahan).'
        : 'Terjemahan Indonesia belum tersedia untuk teks ini.'
      : '';
  const cat = d.categories || [];
  const seg = Array.from(
    { length: n },
    (_, i) =>
      `<div class="seg" data-i="${i + 1}"${SR && SR[i] ? ` data-r="${esc(SR[i])}"` : ''} title="Ketuk untuk melihat komentar"><span class="n">${i + 1}${E[i] ? '' : mtBtnH(i + 1)}</span>${H[i] ? `<div class="he" lang="he">${words(clean(H[i]))}</div>` : ''}${E[i] ? `<div class="en" lang="en">${clean(E[i])}${mtBtn(i + 1)}</div>${mtRes()}` : H[i] ? mtRes() : ''}</div>`,
  ).join('');
  const nav = `<div class="pn">${d.prev ? `<a class="btn" href="#/r/${enc(d.prev)}">‹ ${esc(d.prev)}</a>` : '<span></span>'}${d.next ? `<a class="btn" href="#/r/${enc(d.next)}">${esc(d.next)} ›</a>` : ''}</div>`;
  const attr = [he, en]
    .filter(Boolean)
    .map((v) => `${esc(v.versionTitle)} (${esc(v.license || 'lisensi tidak disebutkan')})`)
    .join(' · ');
  const rt = rtMarkup(trs, pc);
  // Petunjuk sekali tampil: "Klik" untuk mouse, "Ketuk" untuk layar sentuh; dapat ditutup dan diingat
  const act = '<span class="h-fine">Klik</span><span class="h-coarse">Ketuk</span>';
  const hint = st.get('hint', 0)
    ? ''
    : `<p class="rth muted"><span>${act} kata Ibrani untuk melihat artinya. ${act} bagian lain untuk komentar.</span><button type="button" class="rth-x" onclick="st.set('hint',1);this.parentNode.remove()">Mengerti</button></p>`;
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a>${cat.map((c, i) => ` › <a href="#/c/${encP(cat.slice(0, i + 1))}">${esc(i ? c : dn(c))}</a>`).join('')}${d.indexTitle ? ` › <a href="#/b/${enc(d.indexTitle)}">${esc(d.indexTitle)}</a>` : ''}</nav>
 <h2 class="rt-h2">${esc(d.ref || ref)} <span class="he" style="color:var(--gold)">${esc(d.heRef)}</span>${stg(cat[0]) >= 0 ? `<span class="tag">${esc(dn(cat[0]))} · Tahap ${stg(cat[0]) + 1}</span>` : ''}${rt.acts}</h2>
 <div id="rt"></div>
 <div class="tb"><button data-m="both" onclick="S.mode='both';apply()"><span class="lg">Ibrani + Terjemahan</span><span class="sm">Dua bahasa</span></button><button data-m="he" onclick="S.mode='he';apply()">Ibrani</button><button data-m="en" onclick="S.mode='en';apply()">Terjemahan</button>
 <button id="tbdn" class="tbz" aria-label="Perkecil huruf" title="Perkecil huruf" onclick="S.size=Math.max(14,S.size-2);apply();rtSize()">A−</button><span id="tbsz" class="tbv" aria-live="polite"></span><button id="tbup" class="tbz" aria-label="Perbesar huruf" title="Perbesar huruf" onclick="S.size=Math.min(34,S.size+2);apply();rtSize()">A+</button><button type="button" class="tbt" data-mt-hub title="Terjemahan mesin" onclick="mtHub(this)">${MT_IC}<span class="tbl">Terjemah</span></button><button class="tbn" title="Naskah kuno" onclick="ms(window.RF)">${RT_IC.sc}<span class="tbl">Naskah kuno</span></button>${pc ? rdBtn(pc) : ''}${sel}${d.prev ? `<a class="btn tbp tbp-p" href="#/r/${enc(d.prev)}" aria-label="Pasal sebelumnya" title="${esc(d.prev)}">${RT_IC.bk}</a>` : `<button class="btn tbp tbp-p" disabled aria-label="Tidak ada pasal sebelumnya">${RT_IC.bk}</button>`}${d.next ? `<a class="btn tbp tbp-n" href="#/r/${enc(d.next)}" aria-label="Pasal berikutnya" title="${esc(d.next)}">${RT_IC.gt}</a>` : `<button class="btn tbp tbp-n" disabled aria-label="Tidak ada pasal berikutnya">${RT_IC.gt}</button>`}</div>
 ${mtNote()}${hint}${note ? `<p class="muted rtn">${note}</p>` : ''}${n ? '' : '<p class="muted">Teks tidak tersedia untuk bagian ini. Coba bagian lain dari daftar kitab.</p>'}
 <div id="txt" class="text both">${seg}</div>${rt.end}${nav}<p class="attr">Sumber: Sefaria.org · ${attr}</p>${rt.tools}`;
  // Delegasi klik: kata Ibrani → kamus, bagian lain → komentar
  document.getElementById('txt').onclick = (e) => {
    // Ikon/hasil terjemah dan klik setelah memblok teks tidak boleh membuka kamus/komentar
    if (e.target.closest('.tbtn, .trw')) return;
    if (window.getSelection && String(window.getSelection()).trim()) return;
    const w = e.target.closest('.w');
    if (w) {
      lex(w.dataset.w, d.ref || ref);
      return;
    }
    const s = e.target.closest('.seg');
    if (s) comments(d.ref || ref, s.dataset.i, s.dataset.r);
  };
  topicsFor(d.ref || ref);
  apply();
  rtInit();
}

/**
 * Panel komentar & tautan terkait suatu ayat. Kerangka (header, tab, pilihan kategori) dibuat sekali
 * oleh cpShell() (reader-tools.js); hanya daftar kartu yang diperbarui saat kategori berganti.
 */
async function comments(r, i, sr) {
  const p = document.getElementById('panel');
  p.hidden = false;
  p.innerHTML = cpShell(r, i);
  p.scrollTop = 0;
  cpMark(i);
  // Muat tema ayat di latar belakang sambil komentar dimuat
  window.CMT = '';
  const full = sr || r + ':' + i,
    key = (window.CMK = full);
  topicHtml(key, 'ayat').then((h) => {
    if (window.CMK !== key) return;
    window.CMT = h;
    cpTopics(h);
  });
  try {
    const ref = full;
    let l,
      err = '';
    for (const u of ['/links/' + enc(ref) + '?with_text=0', '/related/' + enc(ref)]) {
      try {
        const x = await api(u);
        l = Array.isArray(x) ? x : x && x.links;
        if (Array.isArray(l)) break;
        l = null;
      } catch (e) {
        err = e.message;
      }
    }
    if (!l) throw new Error(err || 'respons kosong');
    if (window.CMK !== key) return;
    const all = l.filter((x) => x.sourceRef && x.category),
      n = {};
    all.forEach((x) => (n[x.category] = (n[x.category] || 0) + 1));
    const cats = Object.keys(n).sort(
      (a, b) => (b === 'Commentary') - (a === 'Commentary') || n[b] - n[a],
    );
    cats.push('__web');
    window.CM = { all, n, cats, ref };
    const sc = document.getElementById('cms');
    if (sc)
      sc.innerHTML = `<label class="cmp-l" for="cmsel">Kategori</label><select id="cmsel" onchange="cmShow(this.value)">${cats.map((k) => `<option value="${esc(k)}">${esc(lbl(k))}${k === '__web' ? '' : ' (' + n[k] + ')'}</option>`).join('')}</select>`;
    cmShow(cats[0]);
  } catch (e) {
    if (window.CMK !== key) return;
    const el = document.getElementById('cml');
    if (el)
      el.innerHTML = `<p class="muted">Data terkait tidak bisa dimuat (${esc(e.message)}). Ketuk bagian ini lagi untuk mencoba ulang.</p>`;
  }
}

/**
 * Tampilkan satu kategori tautan terkait (paginasi 10 per muat) beserta cuplikan teksnya.
 * Hanya mengganti isi #cml; header, tab, dan pilihan kategori tidak ikut dirender ulang.
 */
function cmShow(c, off = 0) {
  const el = document.getElementById('cml');
  if (!el || !window.CM) return;
  const { all, ref } = window.CM,
    sel = document.getElementById('cmsel');
  if (sel && sel.value !== c) sel.value = c;
  if (!off) document.getElementById('panel').scrollTop = 0;
  if (!c) {
    el.innerHTML =
      '<p class="muted">Belum ada teks terkait untuk bagian ini. Ketuk bagian lain.</p>';
    return;
  }
  if (c === '__web') {
    el.innerHTML = '<div id="wb"><p class="muted">Memuat artikel luar…</p></div>';
    webLoad(ref);
    return;
  }
  const list = all.filter((x) => x.category === c),
    show = list.slice(0, off + 10);
  el.innerHTML =
    show
      .map(
        (x, k) =>
          `<div class="cm" onclick="if(!event.target.closest('a,.trlk,.trw'))this.classList.toggle('open')"><b><a href="#/r/${enc(x.sourceRef)}">${esc(x.sourceRef)}</a></b><span id="cmt${k}" class="muted">Memuat…</span></div>`,
      )
      .join('') +
    (list.length > show.length
      ? `<button data-c="${esc(c)}" data-o="${off + 10}" onclick="cmShow(this.dataset.c,+this.dataset.o)">Muat lebih banyak (${show.length} dari ${list.length})</button>`
      : '');
  show.forEach(async (x, k) => {
    let h = '';
    try {
      const d = await api('/v3/texts/' + enc(x.sourceRef) + '?version=hebrew&version=english', 1),
        v = d.versions || [],
        a = v.find((z) => z.language === 'en') || v.find((z) => z.language === 'he'),
        tx = a ? flat(a.text).join(' ') : '';
      h = clean(tx.length > 1500 ? tx.slice(0, 1500).replace(/<[^>]*$/, '') + '…' : tx);
    } catch {}
    const e = document.getElementById('cmt' + k);
    if (e) {
      e.className = '';
      e.innerHTML =
        h || '<span class="muted">Teks tidak tersedia. Ketuk referensi untuk membukanya.</span>';
      if (h && typeof mtCardInit === 'function') mtCardInit(e.closest('.cm'));
    }
  });
}

/**
 * Bungkus tiap kata Ibrani dalam <span class=w> agar bisa diketuk untuk melihat arti.
 */
function words(h) {
  const t = document.createElement('template');
  t.innerHTML = h;
  const R = /[\u0591-\u05BD\u05BF-\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA]+/g,
    w = document.createTreeWalker(t.content, NodeFilter.SHOW_TEXT),
    ns = [];
  while (w.nextNode()) ns.push(w.currentNode);
  ns.forEach((n) => {
    const s = n.nodeValue;
    if (!/[\u05D0-\u05EA]/.test(s)) return;
    const f = document.createDocumentFragment();
    let i = 0;
    s.replace(R, (m, o) => {
      f.append(s.slice(i, o));
      const e = document.createElement('span');
      e.className = 'w';
      e.dataset.w = m.replace(/[\u0591-\u05AF]/g, '');
      e.textContent = m;
      f.append(e);
      i = o + m.length;
      return m;
    });
    f.append(s.slice(i));
    n.replaceWith(f);
  });
  return t.innerHTML;
}

/**
 * Muat artikel luar (situs web) yang terkait dengan suatu ayat; ditandai sebagai pihak ketiga.
 */
async function webLoad(ref) {
  const el = document.getElementById('wb');
  if (!el) return;
  try {
    const d = await langFetch('/related/' + enc(ref) + '/websites');
    if (typeof d === 'string') throw new Error(d);
    if (isErr(d)) throw new Error(d.error);
    const A = [];
    (function w(o, dp) {
      if (!o || dp > 4 || typeof o !== 'object') return;
      if (Array.isArray(o)) o.forEach((x) => w(x, dp + 1));
      else if (typeof (o.url || o.link) === 'string') A.push(o);
      else Object.values(o).forEach((x) => w(x, dp + 1));
    })(d, 0);
    const L = A.filter((x) => /^https?:\/\//i.test(x.url || x.link)).slice(0, 20);
    if (document.getElementById('wb') !== el) return;
    el.innerHTML = L.length
      ? L.map((x) => {
          const u = x.url || x.link;
          let h = '';
          try {
            h = new URL(u).hostname;
          } catch {}
          return `<div class="cm"><b><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x.title || x.name || h || u)}</a></b>${x.description ? `<span class="muted">${esc(String(x.description).slice(0, 240))}</span><br>` : ''}<span class="attr">${esc(x.siteName || x.domain || h)}</span></div>`;
        }).join('') +
        '<p class="attr">Tautan ini menuju situs luar. Isinya tidak dikelola oleh Sefaria maupun aplikasi ini, jadi nilai kualitasnya sendiri.</p>'
      : '<p class="muted">Belum ada artikel luar untuk ayat ini.</p>';
  } catch (e) {
    if (document.getElementById('wb') === el)
      el.innerHTML = `<p class="muted">Artikel luar tidak bisa dimuat (${esc(e.message)}).</p>`;
  }
}
