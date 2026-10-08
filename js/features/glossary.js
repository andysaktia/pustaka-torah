/**
 * glossary.js — Halaman Istilah penting dan pencarian istilah Sefaria.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Halaman Istilah penting: pencarian istilah Sefaria dan daftar istilah dasar.
 */
async function istilah() {
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Istilah penting</h2>
 <form onsubmit="trGo(this);return false"><input name="q" aria-label="Cari istilah" placeholder="Cari istilah lain, mis. Rambam, Pesach, Nisan"><button>Cari</button></form><div id="to"></div>
 <h3>Daftar dasar</h3><dl>${G.map((g) => `<dt>${esc(g[0])}</dt><dd>${esc(g[1])}</dd>`).join('')}</dl>`;
}

/**
 * Cari istilah di endpoint /terms Sefaria (mencoba variasi huruf besar/kecil) lalu tampilkan hasilnya.
 */
async function trGo(f) {
  const q = f.q.value.trim(),
    el = document.getElementById('to');
  if (!q) return false;
  el.innerHTML = '<p class="muted">Mencari…</p>';
  const nf2 = `<p class="muted">Istilah “${esc(q)}” tidak ada di daftar istilah Sefaria. Coba cari sebagai kitab atau teks: <a class="chip" href="#/s/${enc(q)}">Cari “${esc(q)}”</a></p>`;
  try {
    const tc = (s) => s.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
    let d, last;
    for (const v of [...new Set([q, tc(q), q.toLowerCase()])]) {
      last = await langFetch('/terms/' + enc(v));
      if (typeof last !== 'string' && !isErr(last)) {
        d = last;
        break;
      }
    }
    if (!d) {
      el.innerHTML =
        typeof last === 'string' && !/^(404|400)$/.test(last)
          ? `<p class="muted">Pencarian istilah tidak bisa dimuat (${esc(last)}).</p>`
          : nf2;
      return false;
    }
    const ti = (d.titles || []).filter((x) => x && x.text),
      pr = (l) =>
        (ti.find((x) => x.lang === l && x.primary) || ti.find((x) => x.lang === l) || {}).text ||
        '';
    const other = ti
        .filter((x) => !x.primary)
        .map((x) => x.text)
        .filter((x, i, a) => a.indexOf(x) === i)
        .slice(0, 16),
      sc = d.scheme;
    el.innerHTML = `<div class="stage"><b>${esc(pr('en') || d.name || q)}</b> <span class="he" style="color:var(--gold)">${esc(pr('he'))}</span>${sc ? `<p class="muted" style="margin:2px 0">Jenis: ${esc(SCH[sc] || sc)}</p>` : ''}${other.length ? `<p style="margin:6px 0 2px" class="muted">Nama lain:</p><p style="margin:0">${other.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</p>` : ''}<p style="margin:8px 0 0"><a class="chip" href="#/s/${enc(pr('en') || q)}">Cari di kitab dan teks</a></p></div>`;
  } catch (e) {
    el.innerHTML = `<p class="muted">Pencarian istilah tidak bisa dimuat (${esc(e.message)}).</p>`;
  }
  return false;
}
