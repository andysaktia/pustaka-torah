/**
 * references.js — Pencari rujukan: mengenali sitasi kitab di teks bebas (Sefaria Linker).
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Susun HTML teks dengan sitasi yang dikenali menjadi tautan ke pembaca.
 */
function frHtml(txt, res) {
  const R = res
    .filter((x) => typeof x.startChar === 'number' && typeof x.endChar === 'number')
    .sort((a, b) => a.startChar - b.startChar);
  let pos = 0,
    o = '';
  const refs = new Set();
  R.forEach((x) => {
    if (x.startChar < pos) return;
    o += esc(txt.slice(pos, x.startChar));
    const q = x.refs && x.refs[0],
      s = esc(txt.slice(x.startChar, x.endChar));
    if (!x.linkFailed && q) {
      refs.add(q);
      o += `<a href="#/r/${enc(q)}" title="${esc(x.refs.join(' / '))}">${s}</a>`;
    } else o += s;
    pos = x.endChar;
  });
  return { html: o + esc(txt.slice(pos)), refs: [...refs] };
}

/**
 * Halaman Cari Rujukan: tempel paragraf, sitasi kitab dikenali otomatis.
 */
async function rujukan() {
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Cari rujukan <span class="he" style="color:var(--gold)">מראי מקומות</span></h2>
 <p class="intro">Tempel paragraf (bahasa Inggris atau Ibrani) yang menyebut kitab, misalnya “as it says in Genesis 1:1 and Berakhot 2a”. Setiap rujukan yang dikenali menjadi tautan ke teksnya.</p>
 <textarea id="fr" rows="6" aria-label="Teks" style="width:100%;padding:12px;border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--fg);font:inherit" placeholder="Tempel teks di sini…"></textarea>
 <p><button onclick="frGo()">Temukan rujukan</button> <button onclick="document.getElementById('fr').value='As it says in Genesis 1:1, and see also Berakhot 2a and Rashi on Exodus 3:14.';frGo()">Contoh</button></p><div id="fo"></div>`;
}

/**
 * Kirim teks ke Sefaria Linker (/find-refs); bila asinkron, polling hingga 40 detik.
 */
async function linkerFetch(txt, sl) {
  sl = sl || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const body = JSON.stringify({ text: { title: '', body: txt } });
  let j,
    err = '';
  // Coba dua Content-Type: 'text/plain' (menghindari preflight CORS) lalu JSON
  for (const ct of ['text/plain;charset=UTF-8', 'application/json']) {
    try {
      const x = await fetch(API + '/find-refs', {
        method: 'POST',
        headers: { 'Content-Type': ct },
        body,
      });
      if (x.ok) {
        j = await x.json();
        break;
      }
      err = 'status ' + x.status;
    } catch (e) {
      err = 'jaringan/CORS';
    }
  }
  if (!j) throw new Error(err);
  if (j.error) throw new Error(j.error);
  if (!j.task_id) return j;
  for (let i = 0; i < 40; i++) {
    await sl(1000);
    let y;
    try {
      y = await fetch(API + '/async/' + enc(j.task_id));
    } catch {
      continue;
    }
    if (!y.ok) throw new Error('status ' + y.status);
    const z = await y.json().catch(() => null);
    if (!z) continue;
    if (z.error) throw new Error(z.error);
    if (z.state === 'FAILURE') throw new Error('tugas gagal di server');
    if (z.result || z.ready || z.state === 'SUCCESS') return z.result || z;
  }
  throw new Error('waktu habis');
}

/**
 * Jalankan pencarian rujukan dan tampilkan teks bertaut beserta daftar rujukan.
 */
async function frGo() {
  const txt = document.getElementById('fr').value.trim(),
    el = document.getElementById('fo');
  if (!txt) return;
  el.innerHTML = '<p class="muted">Mencari rujukan… (bisa beberapa detik)</p>';
  let d;
  try {
    d = await linkerFetch(txt);
  } catch (e) {
    el.innerHTML = `<p class="muted">Pencarian rujukan tidak bisa dimuat (${esc(e.message)}).</p>`;
    return;
  }
  const B = d && (d.body || (d.result && d.result.body));
  if (!B) {
    el.innerHTML = `<p class="muted">Format hasil belum dikenali: ${esc(JSON.stringify(d).slice(0, 160))}</p>`;
    return;
  }
  const o = frHtml(txt, B.results || []);
  el.innerHTML = o.refs.length
    ? `<div class="fr stage">${o.html}</div><p class="muted">${o.refs.length} rujukan ditemukan:</p><p>${o.refs.map((q) => `<a class="chip" href="#/r/${enc(q)}">${esc(q)}</a>`).join('')}</p>`
    : `<p class="muted">Tidak ada rujukan yang dikenali di teks ini.</p>`;
}
