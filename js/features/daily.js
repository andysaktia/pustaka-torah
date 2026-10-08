/**
 * daily.js — Bacaan harian (kalender Sefaria), jadwal baca ulang Parasyat, dan bacaan acak.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Ubah judul kalender Sefaria menjadi label Indonesia (mis. 'Parasyat minggu ini').
 */
const calKey = (x) => {
  const n = (x.title && x.title.en) || '',
    m = CAL.find((c) => c[0].test(n)),
    pm = n.match(/\(.*\)/);
  return m ? m[1] + (pm && m[1] !== n ? ' ' + pm[0] : '') : '';
};

/**
 * Susun URL /calendars sesuai tradisi (Diaspora/Israel), Haftarah, tanggal, dan zona waktu.
 */
function calUrl(dt) {
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {}
  const [y, m, d] = dt ? dt.split('-').map(Number) : [];
  return (
    '/calendars?diaspora=' +
    (S.dia === 0 ? 0 : 1) +
    (dt ? `&year=${y}&month=${m}&day=${d}` : '') +
    (S.cus ? '&custom=' + enc(S.cus) : '') +
    (tz ? '&timezone=' + enc(tz) : '')
  );
}

/**
 * Ambil dan tampilkan jadwal pembacaan ulang sebuah Parasyat.
 */
async function nextRead(name) {
  const el = document.getElementById('nr');
  if (!el) return;
  el.innerHTML = '<p class="muted">Memuat jadwal Parasyat…</p>';
  try {
    const d = await api('/calendars/next-read/' + enc(name)),
      dates = [],
      refs = new Set();
    walk(d, (k, v) => {
      if (typeof v !== 'string') return;
      if (/date/i.test(k)) dates.push([/he/i.test(k) ? 'Tanggal Ibrani' : 'Tanggal', v]);
      if (/^(ref|url)$/i.test(k) && /[A-Za-z]/.test(v)) refs.add(v);
    });
    if (document.getElementById('nr') !== el) return;
    el.innerHTML = `<div class="stage"><b>Parasyat ${esc(name)}: dibaca lagi pada</b>${dates.length ? dates.map((x) => `<p style="margin:2px 0">${x[0]}: <b>${esc(x[1])}</b></p>`).join('') : '<p class="muted">Tanggal tidak terbaca dari data.</p>'}
  ${refs.size ? `<p class="muted" style="margin:6px 0 2px">Bacaan pada tanggal itu:</p>${[...refs].map((x) => `<a class="chip" href="#/r/${enc(x)}">${esc(x)}</a>`).join('')}` : ''}
  <details><summary class="muted">Data mentah</summary><pre>${esc(JSON.stringify(d, null, 1))}</pre></details></div>`;
  } catch (e) {
    if (document.getElementById('nr') === el)
      el.innerHTML = `<p class="muted">Jadwal Parasyat tidak bisa dimuat (${esc(e.message)}).</p>`;
  }
}

/**
 * Halaman Bacaan Hari Ini: pilih tanggal/tradisi lalu tampilkan jadwal baca dari kalender Sefaria.
 */
async function hari(v) {
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '',
    d = await api(calUrl(dt)),
    it = (d.calendar_items || []).filter((x) => x.ref);
  const base = dt ? new Date(dt + 'T12:00:00') : new Date(),
    sh = (n) => {
      const z = new Date(base);
      z.setDate(z.getDate() + n);
      return f2(z);
    };
  const pz = it.find((x) => /parashat hashavua/i.test(x.title && x.title.en)),
    pn = pz && pz.displayValue && pz.displayValue.en;
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Bacaan hari ini <span class="he" style="color:var(--gold)">היום</span></h2>
 <p class="intro">Jadwal belajar harian dan mingguan yang dicatat Sefaria. Pilih tanggal atau tradisi, lalu ketuk salah satu untuk mulai membaca.</p>
 <div class="dn"><button onclick="location.hash='#/h/${sh(-1)}'">‹ Sebelumnya</button><input type="date" aria-label="Pilih tanggal" value="${dt || f2(new Date())}" onchange="if(this.value)location.hash='#/h/'+this.value"><button onclick="location.hash='#/h/${sh(1)}'">Berikutnya ›</button><button onclick="location.hash='#/h'">Hari ini</button>
 <select aria-label="Tradisi" onchange="S.dia=+this.value;apply();route()"><option value="1"${S.dia === 0 ? '' : ' selected'}>Diaspora</option><option value="0"${S.dia === 0 ? ' selected' : ''}>Israel</option></select>
 <select aria-label="Tradisi Haftarah" onchange="S.cus=this.value;apply();route()">${[
   ['', 'Haftarah: bawaan'],
   ['ashkenazi', 'Haftarah: Ashkenazi'],
   ['sephardi', 'Haftarah: Sefardi'],
   ['edot hamizrach', 'Haftarah: Edot HaMizrach'],
 ]
   .map(
     (o) => `<option value="${o[0]}"${(S.cus || '') === o[0] ? ' selected' : ''}>${o[1]}</option>`,
   )
   .join('')}</select></div>
 ${d.date ? `<p class="muted">Tanggal jadwal: ${esc(d.date)} · Tradisi: ${S.dia === 0 ? 'Israel' : 'Diaspora'}${S.cus ? ' · Haftarah: ' + esc(S.cus) : ''}</p>` : ''}
 ${
   it.length
     ? `<div class="grid">${it
         .map((x) => {
           const q = x.title || {};
           return `<a class="card" href="#/r/${enc(x.ref)}"><b>${esc(calKey(x) || q.en)}</b><span class="he">${esc(q.he)}</span><small>${esc((x.displayValue && x.displayValue.en) || x.ref)}</small></a>`;
         })
         .join('')}</div>`
     : '<p class="muted">Jadwal untuk tanggal ini belum tersedia.</p>'
 }
 <div id="nr"></div>`;
  if (pn) nextRead(pn);
}

/**
 * Bacaan acak: dari seluruh pustaka, satu kategori, atau tema populer.
 */
async function acak(v) {
  if (v) {
    const x = await fetch(
      API +
        (v === '~'
          ? '/texts/random-by-topic'
          : '/texts/random' + (v === '*' ? '' : '?categories=' + enc(v))),
      { headers: { 'Accept-Language': 'en' } },
    );
    if (!x.ok) throw new Error(x.status);
    const d = await x.json();
    if (d && d.error) throw new Error(d.error);
    const ref = d.ref || d.tref || d.sectionRef;
    if (!ref) throw new Error('respons tidak dikenali');
    location.replace('#/r/' + enc(ref));
    return;
  }
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Bacaan acak <span class="he" style="color:var(--gold)">אקראי</span></h2><p class="intro">Belum tahu mau membaca apa? Biarkan Sefaria memilihkan satu bagian teks. Pilih dari mana:</p>
 <p><a class="btn" href="#/x/*">Dari seluruh perpustakaan</a> <a class="btn" href="#/x/~">Dari tema populer</a></p><div class="grid">${ST.flatMap(
   (s) => s[1],
 )
   .map(
     (k) =>
       `<a class="card" href="#/x/${enc(k)}"><b>${esc(C[k][1])}</b><span class="he">${esc(C[k][0])}</span></a>`,
   )
   .join('')}</div>`;
}
