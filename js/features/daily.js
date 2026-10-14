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

/* Pilihan tradisi Haftarah: [nilai S.cus, label] */
const DCUS = [
  ['', 'Bawaan'],
  ['ashkenazi', 'Ashkenazi'],
  ['sephardi', 'Sefardi'],
  ['edot hamizrach', 'Edot HaMizrach'],
];

/* Item kalender yang termasuk kelompok mingguan (sisanya harian) */
const DWK = /parash|haftar|a week|weekly/i;

const DIC = {
  cal: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 11h16"/></svg>',
  adj: '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/></svg>',
};

/** Tanggal berbahasa Indonesia, mis. 'Selasa, 13 Okt 2026'. */
function dLab(dt, short) {
  try {
    return new Date(dt + 'T12:00:00').toLocaleDateString('id-ID', {
      weekday: short ? 'short' : 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dt;
  }
}

/** Isi sheet pengaturan jadwal (ponsel): tradisi dan Haftarah. */
function dSheetBody() {
  const cus = S.cus || '';
  return (
    '<div class="rt-grab"></div><p class="rts-h">Pengaturan jadwal</p><p class="rts-l">Tradisi</p>' +
    '<div class="dseg"><button type="button" class="' +
    (S.dia === 0 ? 'on' : '') +
    '" onclick="dSet(\'dia\',0)">Israel</button>' +
    '<button type="button" class="' +
    (S.dia === 0 ? '' : 'on') +
    '" onclick="dSet(\'dia\',1)">Diaspora</button></div>' +
    '<p class="rts-l">Haftarah</p>' +
    DCUS.map(
      (o) =>
        '<button type="button" class="rts-row" data-v="' +
        esc(o[0]) +
        '" onclick="dSet(\'cus\',this.dataset.v)"><span>' +
        esc(o[1]) +
        '</span>' +
        (cus === o[0] ? RT_IC.ok : '') +
        '</button>',
    ).join('') +
    '<button type="button" class="dsdone" onclick="dClose()">Selesai</button>'
  );
}

function dOpen() {
  const s = document.getElementById('dts'),
    o = document.getElementById('dto');
  if (!s || !o) return;
  window.DCH = 0;
  s.innerHTML = dSheetBody();
  s.classList.add('open');
  o.classList.add('open');
}

/** Ubah satu pengaturan; jadwal baru dimuat saat sheet ditutup agar bisa mengubah dua pilihan sekaligus. */
function dSet(k, v) {
  if (k === 'dia') S.dia = +v;
  else S.cus = v;
  apply();
  window.DCH = 1;
  const s = document.getElementById('dts');
  if (s) s.innerHTML = dSheetBody();
}

function dClose() {
  const s = document.getElementById('dts'),
    o = document.getElementById('dto');
  if (!s || !o) return;
  s.classList.remove('open');
  o.classList.remove('open');
  if (window.DCH) {
    window.DCH = 0;
    route();
  }
}

if (!window.DESC) {
  window.DESC = 1;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.querySelector('#dts.open')) dClose();
  });
}

/**
 * Halaman Bacaan Hari Ini: bilah tanggal (sticky), pengaturan tradisi/Haftarah, lalu kartu bacaan
 * dikelompokkan "Minggu ini" dan "Harian".
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
  const today = f2(new Date()),
    cur = dt || today,
    isT = cur === today,
    trad = S.dia === 0 ? 'Israel' : 'Diaspora',
    cl = (DCUS.find((o) => o[0] === (S.cus || '')) || DCUS[0])[1],
    sum = trad + ' · Haftarah ' + (S.cus ? cl : 'bawaan');
  const title = (x) => (x.title && x.title.en) || '',
    isParasha = (x) => /parashat hashavua/i.test(title(x)),
    wk = it.filter((x) => DWK.test(title(x))),
    dy = it.filter((x) => !DWK.test(title(x)));
  const card = (x) => {
    const q = x.title || {},
      name = calKey(x) || q.en,
      he =
        q.he && q.he !== q.en && !/^\d+$/.test(q.he) ? `<span class="he">${esc(q.he)}</span>` : '',
      hero = isParasha(x);
    return `<a class="card${hero ? ' dhero' : ''}" href="#/r/${enc(x.ref)}"><b>${esc(name)}</b>${he}<small>${esc((x.displayValue && x.displayValue.en) || x.ref)}</small>${hero ? '<span class="dcta">Mulai membaca ›</span>' : ''}</a>`;
  };
  const sec = (label, list, cls) =>
    list.length
      ? `<h3 class="dsec">${label}</h3><div class="grid ${cls}">${list.map(card).join('')}</div>`
      : '';
  app.innerHTML = `<nav class="crumb"><a href="#/">Beranda</a></nav><h2>Bacaan hari ini <span class="he" style="color:var(--gold)">היום</span></h2>
 <p class="intro">Jadwal belajar harian dan mingguan dari Sefaria.</p>
 <div class="dbar"><button type="button" class="dbt" aria-label="Hari sebelumnya" onclick="location.hash='#/h/${sh(-1)}'">${RT_IC.bk}</button><label class="ddate">${DIC.cal}<span class="dl-lg">${esc(dLab(cur))}</span><span class="dl-sm">${esc(dLab(cur, true))}</span>${isT ? '<em class="dtoday">Hari ini</em>' : ''}<input type="date" class="dinp" aria-label="Pilih tanggal" value="${cur}" onclick="try{this.showPicker()}catch(e){}" onchange="if(this.value)location.hash='#/h/'+this.value"></label><button type="button" class="dbt" aria-label="Hari berikutnya" onclick="location.hash='#/h/${sh(1)}'">${RT_IC.gt}</button><button type="button" class="dbt dgear" aria-label="Pengaturan jadwal: ${esc(sum)}" aria-haspopup="dialog" onclick="dOpen()">${DIC.adj}</button>
 <div class="dsel"><select aria-label="Tradisi" onchange="S.dia=+this.value;apply();route()"><option value="1"${S.dia === 0 ? '' : ' selected'}>Diaspora</option><option value="0"${S.dia === 0 ? ' selected' : ''}>Israel</option></select>
 <select aria-label="Tradisi Haftarah" onchange="S.cus=this.value;apply();route()">${DCUS.map((o) => `<option value="${esc(o[0])}"${(S.cus || '') === o[0] ? ' selected' : ''}>Haftarah: ${o[0] ? esc(o[1]) : 'bawaan'}</option>`).join('')}</select></div></div>
 <p class="dmeta"><span class="dsum">${esc(sum)}</span>${isT ? '' : `<button type="button" class="dback" onclick="location.hash='#/h'">‹ Kembali ke hari ini</button>`}</p>
 ${
   it.length
     ? sec('Minggu ini', wk, 'dgw') + sec('Harian', dy, 'dgd')
     : '<p class="muted">Jadwal untuk tanggal ini belum tersedia.</p>'
 }
 <div id="nr"></div>
 <div class="rto" id="dto" onclick="dClose()"></div><div class="rts" id="dts" role="dialog" aria-modal="true" aria-label="Pengaturan jadwal"></div>`;
  const pz = it.find(isParasha),
    pn = pz && pz.displayValue && pz.displayValue.en;
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
