/**
 * translations.js — Halaman Terjemahan: pilih bahasa bawaan dan telusuri kitab per bahasa.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Jadikan sebuah bahasa sebagai bahasa terjemahan bawaan lalu render ulang halaman.
 */
function setLang(c) {
  S.lang = c === 'en' ? '' : dispName(c, 'en').toLowerCase();
  S.tr = '';
  apply();
  route();
}

/**
 * Hitung jumlah daun dalam struktur terjemahan bersarang.
 */
const trN = (o) =>
  Array.isArray(o)
    ? o.length
    : o && typeof o === 'object'
      ? Object.values(o).reduce((s, x) => s + trN(x), 0)
      : 1;

/**
 * Render pohon terjemahan (details/summary bersarang) menjadi kartu kitab.
 */
function trTree(o, dep = 0) {
  if (Array.isArray(o))
    return `<div class="grid">${o
      .slice(0, 400)
      .map((x) => {
        const q =
          typeof x === 'string'
            ? x
            : (x && (x.title || x.indexTitle || x.index_title || x.book || x.name)) || '';
        return q ? `<a class="card" href="#/b/${enc(q)}"><b>${esc(q)}</b></a>` : '';
      })
      .join('')}</div>`;
  if (o && typeof o === 'object')
    return Object.entries(o)
      .map(
        ([k, v]) =>
          `<details ${dep ? '' : 'open'} style="margin:6px 0"><summary><b>${esc(dn(k))}</b> <span class="muted">(${trN(v)})</span></summary>${trTree(v, dep + 1)}</details>`,
      )
      .join('');
  return '';
}

/**
 * Halaman Terjemahan: daftar bahasa, atau kitab-kitab yang tersedia untuk satu bahasa.
 */
async function terjemah(v) {
  const crumb =
    '<nav class="crumb"><a href="#/">Beranda</a>' +
    (v ? ' › <a href="#/g">Terjemahan</a>' : '') +
    '</nav>';
  if (v) {
    const d = await api('/texts/translations/' + enc(v)),
      nm = dispName(v, 'id');
    app.innerHTML = `${crumb}<h2>Terjemahan: ${esc(nm)}</h2><p><button onclick="setLang('${esc(v)}')">Jadikan bahasa bawaan</button></p>${trTree(d) || '<p class="muted">Tidak ada data yang terbaca.</p><pre>' + esc(JSON.stringify(d).slice(0, 600)) + '</pre>'}`;
    return;
  }
  const d = await api('/texts/translations');
  let ent = Array.isArray(d)
    ? d.map((x) =>
        typeof x === 'string' ? [x, ''] : [x.code || x.lang || x.language || '', x.count || ''],
      )
    : Object.entries(d || {});
  ent = ent
    .filter((e) => /^[a-z]{2,3}$/.test(e[0]))
    .sort((a, b) => dispName(a[0], 'id').localeCompare(dispName(b[0], 'id')));
  const hasId = ent.some((e) => e[0] === 'id'),
    cur = S.lang ? dispName(S.lang.slice(0, 2), 'id') : '';
  app.innerHTML = `${crumb}<h2>Terjemahan <span class="he" style="color:var(--gold)">תרגום</span></h2><p class="intro">Pilih bahasa untuk melihat kitab apa saja yang sudah diterjemahkan, lalu jadikan bawaan agar teks tampil dalam bahasa itu bila tersedia.</p>
 <p class="muted">${hasId ? 'Terjemahan bahasa Indonesia tersedia di Sefaria.' : 'Terjemahan bahasa Indonesia belum tersedia di Sefaria.'}${S.lang ? ` Bahasa bawaan saat ini: <b>${esc(S.lang)}</b>. <a href="#/g" onclick="setLang('en');return false">Kembali ke Inggris</a>` : ''}</p>
 ${ent.length ? '' : `<p class="muted">Daftar bahasa tidak terbaca dari data.</p><pre>${esc(JSON.stringify(d).slice(0, 600))}</pre>`}<div class="grid">${ent.map((e) => `<a class="card" href="#/g/${enc(e[0])}"><b>${esc(dispName(e[0], 'id'))}</b><small>${esc(e[0])}${typeof e[1] === 'number' ? ' · ' + nf(e[1]) + ' teks' : ''}</small></a>`).join('')}</div>`;
}
