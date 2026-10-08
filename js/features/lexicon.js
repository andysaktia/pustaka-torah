/**
 * lexicon.js — Kamus Ibrani: papan huruf, saran kata, dan tampilan entri kamus.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Render rekursif satu 'sense' entri kamus (definisi + sub-makna) menjadi <li>.
 */
const sn = (s) =>
  typeof s === 'string'
    ? `<li>${clean(s)}</li>`
    : `<li>${s.definition ? clean(s.definition) : ''}${s.senses && s.senses.length ? `<ul>${s.senses.map(sn).join('')}</ul>` : ''}</li>`;

/**
 * Panel kamus untuk satu kata Ibrani (dengan konteks ref bila ada), memuat hingga 6 entri.
 */
async function lex(w, r) {
  const p = document.getElementById('panel');
  p.hidden = false;
  const head = `<button class="x" onclick="this.parentNode.hidden=true">Tutup</button><h3><span class="he" style="font-size:1.4em">${esc(w)}</span> · Kamus</h3>`;
  p.innerHTML = head + '<p class="muted">Memuat…</p>';
  let d,
    err = '';
  for (const u of [
    '/words/' + enc(w) + '?lookup_ref=' + enc(r) + '&always_consonants=1',
    '/words/' + enc(w) + '?always_consonants=1',
  ]) {
    try {
      const x = await api(u);
      if (Array.isArray(x) && x.length) {
        d = x;
        break;
      }
    } catch (e) {
      err = e.message;
    }
  }
  if (!d) {
    p.innerHTML =
      head +
      `<p class="muted">Arti kata ini belum ditemukan${err ? ' (' + esc(err) + ')' : ''}. Kata dengan awalan atau akhiran kadang sulit dicari. Coba ketuk kata lain.</p>`;
    return;
  }
  p.innerHTML =
    head +
    d
      .slice(0, 6)
      .map(
        (e) =>
          `<div class="cm"><b><span class="he">${esc(e.headword)}</span> <span class="muted">${esc(e.parent_lexicon || '')}</span></b><ol>${((e.content && e.content.senses) || []).map(sn).join('') || '<li class="muted">Tidak ada rincian arti.</li>'}</ol></div>`,
      )
      .join('') +
    '<p class="attr">Sumber kamus tercantum pada tiap entri (melalui Sefaria).</p>';
}

/**
 * Halaman Kamus Ibrani: input RTL, pilihan kamus, dan papan huruf Ibrani virtual.
 */
async function kamus() {
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Kamus Ibrani <span class="he" style="color:var(--gold)">מילון</span></h2><p class="intro">Ketik kata Ibrani (boleh tanpa tanda vokal), lalu pilih dari saran. Belum punya papan ketik Ibrani? Pakai papan huruf di bawah.</p>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="kw" class="he" dir="rtl" lang="he" style="font-size:22px" placeholder="תורה" oninput="kwGo()"><select id="kl" onchange="kwGo()"><option>Klein Dictionary</option><option>Jastrow Dictionary</option><option>BDB Augmented Strong</option></select></div>
 <p>${[...'אבגדהוזחטיכךלמםנןסעפףצץקרשת'].map((c) => `<button class="chip he" onclick="kwAdd('${c}')">${c}</button>`).join('')}<button class="chip" onclick="kwAdd('')">Hapus</button></p><div id="kr"></div>`;
}

/**
 * Timer debounce untuk saran kata.
 */
let kt;

/**
 * Tambah/hapus satu huruf pada input kamus lewat papan huruf lalu cari saran.
 */
function kwAdd(c) {
  const i = document.getElementById('kw');
  i.value = c ? i.value + c : i.value.slice(0, -1);
  kwGo();
}

/**
 * Cari saran kata (debounce 250 ms) dari endpoint completion kamus terpilih.
 */
function kwGo() {
  clearTimeout(kt);
  kt = setTimeout(async () => {
    const w = document.getElementById('kw').value.trim(),
      el = document.getElementById('kr');
    if (!el) return;
    if (!w) {
      el.innerHTML = '';
      return;
    }
    try {
      const a = await api(
        '/words/completion/' +
          enc(w) +
          '/' +
          enc(document.getElementById('kl').value) +
          '?limit=12',
      );
      el.innerHTML =
        Array.isArray(a) && a.length
          ? a
              .map((x) => {
                const q = Array.isArray(x) ? x : [x];
                return `<button class="chip he" style="font-size:20px" data-w="${esc(q[1] || q[0])}" onclick="lex(this.dataset.w,'')">${esc(q[1] || q[0])}</button>`;
              })
              .join('')
          : '<p class="muted">Tidak ada saran. Coba huruf lain.</p>';
    } catch (e) {
      el.innerHTML = `<p class="muted">Saran tidak bisa dimuat (${esc(e.message)}).</p>`;
    }
  }, 250);
}
