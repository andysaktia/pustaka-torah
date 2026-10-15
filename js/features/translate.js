/**
 * translate.js — Terjemahan mesin ke Indonesia (MyMemory), diadaptasi dari translate_v3.html.
 *  - Ikon terjemah per ayat (dari teks Inggris Sefaria); hasil tampil di bawah ayat.
 *  - Terjemah teks yang diblok: pil "Terjemahkan" -> sheet (ponsel) / popover (desktop).
 *  - Tombol "Terjemahkan" di kartu komentar; kamus dan teks lain lewat pilihan teks.
 *  - "Hub": terjemahkan pasal (dengan perkiraan kuota), ikon per ayat on/off, email opsional.
 *  - Indikator kuota kecil di kiri bawah: muncul sementara, menetap saat kuota menipis.
 * Mesin ada di balik mtText()/mtChunk(); ganti mtChunk() bila kelak memakai endpoint serverless.
 * Proyek: Pustaka Torah
 */

const MT_URL = 'https://api.mymemory.translated.net/get';
const MT_MAXB = 450; // batas MyMemory ±500 byte per permintaan (huruf Ibrani = 2 byte)
const MT_PFX = 'mt:';
const MT_CACHE_N = 300;

const MT_IC =
  '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';
const MT_ICX =
  '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const MT_LANG = {
  en: 'Inggris', he: 'Ibrani', fr: 'Prancis', de: 'Jerman', pt: 'Portugis', es: 'Spanyol',
  ru: 'Rusia', it: 'Italia', ar: 'Arab', fa: 'Persia', pl: 'Polandia', yi: 'Yiddish',
};

const $mt = (id) => document.getElementById(id);
const mtEnc = new TextEncoder();
const mtBytes = (s) => mtEnc.encode(s).length;
const mtMobile = () => window.matchMedia('(max-width: 768px)').matches;
const mtTouch = () => window.matchMedia('(pointer: coarse)').matches;

/* ---------- util teks ---------- */

const mtHash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36) + s.length;
};

const mtDecode = (s) => {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
};

/** Bahasa dari aksara: lebih banyak huruf Ibrani daripada Latin -> 'he', selain itu 'en'. */
function mtDet(text) {
  const he = (text.match(/[\u05D0-\u05EA]/g) || []).length,
    la = (text.match(/[A-Za-z]/g) || []).length;
  return he > la ? 'he' : 'en';
}

/** Buang nikud dan ta'amim sebelum dikirim; teks tampilan tidak diubah. */
const mtNikud = (s) => s.replace(/[\u0591-\u05C7]/g, '');

const mtClean = (text, lang) => (lang === 'he' ? mtNikud(text) : text).replace(/\s+/g, ' ').trim();

/** Pecah teks per kalimat agar tiap permintaan <= MT_MAXB byte. */
function mtSplit(text) {
  const sentences = text.match(/[^.!?\u05C3]+[.!?\u05C3]+["')\]]*\s*|[^.!?\u05C3]+$/g) || [text],
    chunks = [];
  let cur = '';
  const flush = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = '';
  };
  for (const s of sentences) {
    if (mtBytes(s) > MT_MAXB) {
      flush();
      for (const w of s.split(/(\s+)/)) {
        if (mtBytes(cur + w) > MT_MAXB) flush();
        cur += w;
      }
      flush();
      continue;
    }
    if (mtBytes(cur + s) > MT_MAXB) flush();
    cur += s;
  }
  flush();
  return chunks;
}

const mtGoogle = (text) =>
  'https://translate.google.com/?sl=auto&tl=id&op=translate&text=' + encodeURIComponent(text.slice(0, 1800));

/* ---------- cache (maks. MT_CACHE_N entri, yang terlama dibuang) ---------- */

function mtCacheGet(k) {
  try {
    return localStorage.getItem(MT_PFX + k);
  } catch {
    return null;
  }
}

function mtCacheSet(k, v) {
  try {
    localStorage.setItem(MT_PFX + k, v);
    const ix = JSON.parse(localStorage.getItem(MT_PFX + 'idx') || '[]').filter((x) => x !== k);
    ix.push(k);
    while (ix.length > MT_CACHE_N) localStorage.removeItem(MT_PFX + ix.shift());
    localStorage.setItem(MT_PFX + 'idx', JSON.stringify(ix));
  } catch {}
}

/* ---------- kuota (perkiraan, per hari, per perangkat ini) ---------- */

const mtToday = () => new Date().toISOString().slice(0, 10);
const mtFresh = () => ({ d: mtToday(), used: 0, finished: false });
let MQ = (() => {
  try {
    const q = JSON.parse(localStorage.getItem(MT_PFX + 'quota'));
    if (q && q.d === mtToday()) return q;
  } catch {}
  return mtFresh();
})();
let MT_SEEN = false, // sudah ada terjemahan pada sesi halaman ini
  MT_DIMT = 0,
  MT_PREV = null,
  MT_STOP = false,
  MT_TOK = 0,
  MS = null; // pilihan teks terakhir {text, lang, rect}

const mtEmail = () => {
  try {
    return localStorage.getItem(MT_PFX + 'email') || '';
  } catch {
    return '';
  }
};
const mtLimit = () => (mtEmail() ? 50000 : 5000);

function mtQCheck() {
  if (MQ.d !== mtToday()) MQ = mtFresh();
}

function mtRemain() {
  mtQCheck();
  return MQ.finished ? 0 : Math.max(0, mtLimit() - MQ.used);
}

const mtPct = () => Math.round((mtRemain() / mtLimit()) * 100);
const fmtN = (n) => n.toLocaleString('id-ID');

/** Rata-rata panjang ayat (untuk menaksir "±N ayat lagi"). */
function mtAvg() {
  const l = ((window.SEG && window.SEG.E) || []).filter(Boolean).map((s) => s.length);
  return l.length ? Math.max(80, Math.round(l.reduce((a, b) => a + b, 0) / l.length)) : 220;
}

function mtQSave() {
  try {
    localStorage.setItem(MT_PFX + 'quota', JSON.stringify(MQ));
  } catch {}
  mtQUI();
}

function mtOut() {
  MQ.finished = true;
  mtQSave();
  const e = new Error('Kuota terjemahan hari ini sudah habis. Coba lagi besok.');
  e.quota = true;
  return e;
}

/* ---------- mesin ---------- */

/** Satu permintaan ke MyMemory (<= MT_MAXB byte). Adaptor: ganti fungsi ini untuk mesin lain. */
async function mtChunk(q, lang, to = 'id') {
  mtQCheck();
  if (MQ.finished) throw mtOut();
  const em = mtEmail(),
    res = await fetch(
      `${MT_URL}?q=${encodeURIComponent(q)}&langpair=${lang}|${to}` + (em ? `&de=${encodeURIComponent(em)}` : ''),
    );
  if (res.status === 429) throw mtOut();
  if (!res.ok) throw new Error('Server terjemahan tidak merespons (' + res.status + ').');
  const data = await res.json();
  if (
    Number(data.responseStatus) === 429 ||
    data.quotaFinished === true ||
    /MYMEMORY WARNING/i.test((data.responseData && data.responseData.translatedText) || '')
  )
    throw mtOut();
  if (Number(data.responseStatus) !== 200) throw new Error(data.responseDetails || 'Terjemahan gagal.');
  MQ.used += q.length;
  MT_SEEN = true;
  mtQSave();
  return mtDecode(data.responseData.translatedText);
}

/** Jalur untuk teks Ibrani: 'direct' (Ibrani -> Indonesia, hemat) atau 'pivot' (lewat Inggris, ±2,5x kuota). */
const mtPath = () => {
  try {
    return localStorage.getItem(MT_PFX + 'path') === 'pivot' ? 'pivot' : 'direct';
  } catch {
    return 'direct';
  }
};
const mtPivot = (lang) => lang === 'he' && mtPath() === 'pivot';

/** Satu lompatan terjemahan (from -> to) dengan pemecahan dan cache. Kunci 'xx:hash' dipertahankan untuk xx -> id. */
async function mtRun(text, from, to) {
  const clean = mtClean(text, from),
    key = (to === 'id' ? from : from + '>' + to) + ':' + mtHash(clean),
    hit = mtCacheGet(key);
  if (hit) return hit;
  const parts = [];
  for (const c of mtSplit(clean)) parts.push(await mtChunk(c, from, to));
  const out = parts.join(' ');
  mtCacheSet(key, out);
  return out;
}

/** Terjemahkan teks ke Indonesia (dengan cache). lang: kode bahasa sumber ('en', 'he', ...). */
async function mtText(text, lang) {
  lang = lang || mtDet(text);
  if (!mtPivot(lang)) return mtRun(text, lang, 'id');
  const key = 'hep:' + mtHash(mtClean(text, lang)),
    hit = mtCacheGet(key);
  if (hit) return hit;
  const out = await mtRun(await mtRun(text, 'he', 'en'), 'en', 'id');
  mtCacheSet(key, out);
  return out;
}

const mtOrigin = (lang) => (MT_LANG[lang] || lang) + (mtPivot(lang) ? ', lewat Inggris' : '');

function mtCached(text, lang) {
  const c = mtClean(text, lang);
  return !!mtCacheGet(mtPivot(lang) ? 'hep:' + mtHash(c) : lang + ':' + mtHash(c));
}

/** Perkiraan karakter yang akan dipakai (0 bila sudah ada di cache). Jalur lewat Inggris ±2,5x. */
function mtCost(text, lang) {
  if (mtCached(text, lang)) return 0;
  const n = mtClean(text, lang).length;
  return mtPivot(lang) ? n + Math.round(n * 1.5) : n;
}

/* ---------- ikon per ayat ---------- */

/** Teks sumber ayat ke-i: terjemahan non-Ibrani dari Sefaria (umumnya Inggris). */
function mtSrc(i) {
  const S0 = window.SEG;
  if (!S0) return null;
  const t = (S0.E[i - 1] || '').trim();
  if (t) return { text: t, lang: S0.lang || 'en' };
  const h = (S0.H[i - 1] || '').trim();
  return h ? { text: h, lang: 'he' } : null;
}

/** Apakah pasal ini hanya punya teks Ibrani (tanpa terjemahan di Sefaria)? */
function mtHebOnly() {
  const S0 = window.SEG;
  return !!(S0 && S0.H.some(Boolean) && !S0.E.some(Boolean));
}

/** Banner di atas pasal yang hanya tersedia dalam bahasa Ibrani. */
function mtNote() {
  if (!mtHebOnly()) return '';
  return (
    '<div class="mtnote" role="note"><b>Belum ada terjemahan di Sefaria</b>' +
    '<p>Terjemahan mesin dari Ibrani tersedia, tetapi kurang akurat.</p>' +
    '<button type="button" class="mtlink" data-mt-hub onclick="mtHub(this)">Terjemahkan pasal ini</button></div>'
  );
}

const mtBtnHTML = (i, pre) =>
  (pre || '') +
  '<button type="button" class="tbtn" data-tv="' + i + '" aria-pressed="false" title="Terjemahkan ke Indonesia" aria-label="Terjemahkan ayat ' + i + ' ke Indonesia">' +
  MT_IC + '</button>';

/** Ikon di ujung baris terjemahan (ayat yang punya teks Inggris); dipanggil dari template reader.js. */
function mtBtn(i) {
  const S0 = window.SEG;
  if (!S0 || S0.lang === 'id' || !(S0.E[i - 1] || '').trim()) return '';
  return mtBtnHTML(i, '\u2060');
}

/** Ikon di kolom nomor untuk ayat yang hanya punya teks Ibrani. */
function mtBtnH(i) {
  const S0 = window.SEG;
  if (!S0 || (S0.E[i - 1] || '').trim() || !mtSrc(i)) return '';
  return mtBtnHTML(i, '');
}

/** Wadah hasil di bawah ayat/kartu. */
const mtRes = () =>
  '<div class="trw" aria-live="polite"><div class="tri"><div class="trt" lang="id" dir="ltr"></div></div></div>';

function mtVerseEls(i) {
  const seg = document.querySelector('.seg[data-i="' + i + '"]');
  return seg ? { seg, btn: seg.querySelector('.tbtn'), wrap: seg.querySelector('.trw'), box: seg.querySelector('.trt') } : null;
}

function mtBtnState(btn, label, state, html) {
  if (!btn) return;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.dataset.state = state;
  if (html !== undefined) btn.innerHTML = html;
}

function mtShowErr(box, e, text) {
  box.className = 'trt error';
  box.textContent = '';
  const p = document.createElement('div');
  p.textContent = (e && e.message ? e.message : 'Terjemahan gagal.') + ' Ketuk lagi untuk mencoba ulang.';
  box.append(p);
  if (e && e.quota) {
    const a = document.createElement('a');
    a.href = mtGoogle(text);
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Buka di Google Terjemahan ↗';
    box.append(a);
  }
}

const mtLabel = (lang) =>
  lang === 'he'
    ? 'Terjemahan mesin dari ' + mtOrigin(lang) + '. Gunakan sebagai gambaran; teks Ibrani adalah rujukan.'
    : 'Terjemahan mesin · dari ' + (MT_LANG[lang] || lang);

function mtShowOK(box, out, label, src) {
  const he = src && src.lang === 'he';
  box.className = 'trt';
  box.textContent = '';
  if (he) {
    const w = document.createElement('small');
    w.className = 'trwn';
    w.textContent = 'Kurang akurat';
    box.append(w);
  }
  const t = document.createElement('div');
  t.className = 'trtx';
  t.textContent = out;
  const l = document.createElement('small');
  l.className = 'trl';
  l.textContent = label;
  box.append(t, l);
  if (he) {
    const a = document.createElement('a');
    a.className = 'trgl';
    a.href = mtGoogle(src.text);
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Bandingkan di Google Terjemahan ↗';
    box.append(a);
  }
}

/** Terjemahkan ayat ke-i dan tampilkan di bawah ayat. Melempar galat agar proses pasal bisa berhenti. */
async function mtVerseRun(i) {
  const E = mtVerseEls(i),
    src = mtSrc(i);
  if (!E || !E.wrap || !src || E.wrap.dataset.done === '1') return;
  const { btn, wrap, box } = E;
  if (btn) {
    btn.disabled = true;
    mtBtnState(btn, 'Menerjemahkan…', 'loading', '<span class="spin"></span>');
  }
  try {
    const out = await mtText(src.text, src.lang);
    mtShowOK(box, out, mtLabel(src.lang), src);
    wrap.dataset.done = '1';
    wrap.classList.add('open');
    if (btn) {
      btn.setAttribute('aria-pressed', 'true');
      mtBtnState(btn, 'Sembunyikan terjemahan', 'done', MT_IC);
    }
  } catch (e) {
    mtShowErr(box, e, src.text);
    wrap.classList.add('open');
    mtBtnState(btn, 'Coba terjemahkan lagi', 'error', MT_IC);
    throw e;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function mtVerseToggle(b) {
  const i = +b.dataset.tv,
    E = mtVerseEls(i);
  if (!E || !E.wrap) return;
  if (E.wrap.dataset.done === '1') {
    const open = E.wrap.classList.toggle('open');
    b.setAttribute('aria-pressed', open ? 'true' : 'false');
    mtBtnState(b, open ? 'Sembunyikan terjemahan' : 'Tampilkan terjemahan', 'done');
  } else mtVerseRun(i).catch(() => {});
}

/* ---------- panel kamus (arti kata) ---------- */

/**
 * Pilih baris teks Inggris dari isi panel untuk diterjemahkan: buang baris Ibrani, yang terlalu pendek,
 * penanda "memuat", dan duplikat; batasi 14 baris / 1600 karakter agar kuota tidak habis.
 */
function mtPickLines(raw) {
  const seen = new Set(),
    lines = [];
  let total = 0,
    cut = false;
  for (let l of String(raw).split(/\n+/)) {
    l = l.replace(/\s+/g, ' ').replace(/^[\d.)\-•\s]+/, '').trim();
    if (l.length < 4 || /^(memuat|loading)/i.test(l)) continue;
    const he = (l.match(/[\u05D0-\u05EA]/g) || []).length,
      la = (l.match(/[A-Za-z]/g) || []).length;
    if (la < 3 || he >= la || seen.has(l)) continue;
    if (l.length < 14 && /\d/.test(l)) continue; // rujukan pendek seperti "Gen 1:1"
    seen.add(l);
    if (lines.length >= 14) {
      cut = true;
      break;
    }
    if (total + l.length > 1600) {
      // Baris panjang dipotong di batas kalimat terakhir yang masih muat, lalu berhenti
      const room = 1600 - total;
      if (room > 200) {
        const part = l.slice(0, room),
          k = part.lastIndexOf('. ');
        lines.push(k > 100 ? part.slice(0, k + 1) : part);
      }
      cut = true;
      break;
    }
    lines.push(l);
    total += l.length;
  }
  return { lines, total, cut };
}

/** Teks isi panel (tanpa tombol dan hasil terjemah), dengan jeda baris di tiap blok. */
function mtDictRaw(pane) {
  const c = pane.cloneNode(true);
  c.querySelectorAll('.mtdict, button, select, input, script, style, .trw').forEach((e) => e.remove());
  c.querySelectorAll('p,li,div,dd,dt,tr,h1,h2,h3,h4,h5,h6,br').forEach((e) => e.append('\n'));
  return c.textContent;
}

/** Terjemahkan arti di panel kamus (dan panel serupa) ke Indonesia; hasil tampil di bagian atas panel. */
async function mtDict(btn) {
  const pane = document.querySelector('#panel .cmp-pane');
  if (!pane) return;
  let box = pane.querySelector('.mtdict');
  if (box && box.dataset.done === '1') {
    box.hidden = !box.hidden;
    btn.setAttribute('aria-pressed', box.hidden ? 'false' : 'true');
    return;
  }
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('aria-live', 'polite');
    pane.prepend(box);
  }
  box.className = 'mtdict trt';
  box.lang = 'id';
  box.dir = 'ltr';
  box.hidden = false;
  box.textContent = '';
  const { lines, cut } = mtPickLines(mtDictRaw(pane));
  const note = (t) => {
    const n = document.createElement('small');
    n.className = 'trl';
    n.textContent = t;
    box.append(n);
  };
  if (!lines.length) {
    note('Tidak ada teks berbahasa Inggris di panel ini yang bisa diterjemahkan. Blok teks tertentu lalu ketuk "Terjemahkan".');
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>';
  const ul = document.createElement('ul');
  box.append(ul);
  let done = 0,
    err = null;
  for (const l of lines) {
    try {
      const li = document.createElement('li');
      li.textContent = await mtText(l, 'en');
      ul.append(li);
      done++;
    } catch (e) {
      err = e;
      break;
    }
  }
  note(
    'Terjemahan mesin · ' + done + ' dari ' + lines.length + ' baris' +
      (cut ? '; teks yang lebih panjang dipotong, blok bagian lain untuk menerjemahkannya' : '') + '.',
  );
  if (err) {
    const w = document.createElement('div');
    w.textContent = err.message;
    box.append(w);
    if (err.quota) {
      const a = document.createElement('a');
      a.href = mtGoogle(lines.slice(done).join('\n'));
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Buka sisanya di Google Terjemahan ↗';
      box.append(a);
    }
  }
  box.dataset.done = done ? '1' : '0';
  btn.disabled = false;
  btn.innerHTML = MT_IC;
  btn.setAttribute('aria-pressed', done ? 'true' : 'false');
}

/* ---------- kartu komentar ---------- */

/** Tambahkan tombol terjemah di kartu komentar setelah cuplikannya dimuat (dipanggil dari reader.js). */
function mtCardInit(card) {
  if (!card || card.querySelector('.trlk')) return;
  const ex = card.querySelector('[id^="cmt"]');
  if (!ex) return;
  const text = ex.textContent.trim();
  if (text.length < 20) return;
  const lang = mtDet(text),
    cost = mtCost(text, lang);
  card.insertAdjacentHTML(
    'beforeend',
    '<button type="button" class="trlk">' + MT_IC + ' Terjemahkan' + (cost ? ' <small>±' + fmtN(cost) + ' kar.</small>' : '') + '</button>' + mtRes(),
  );
}

async function mtCard(btn) {
  const card = btn.closest('.cm'),
    wrap = card.querySelector('.trw'),
    box = wrap.querySelector('.trt');
  if (wrap.dataset.done === '1') {
    const open = wrap.classList.toggle('open');
    btn.innerHTML = MT_IC + (open ? ' Sembunyikan terjemahan' : ' Tampilkan terjemahan');
    return;
  }
  const text = card.querySelector('[id^="cmt"]').textContent.trim(),
    lang = mtDet(text);
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Menerjemahkan…';
  try {
    mtShowOK(box, await mtText(text, lang), mtLabel(lang), { lang, text });
    wrap.dataset.done = '1';
    wrap.classList.add('open');
    btn.innerHTML = MT_IC + ' Sembunyikan terjemahan';
  } catch (e) {
    mtShowErr(box, e, text);
    wrap.classList.add('open');
    btn.innerHTML = MT_IC + ' Coba lagi';
  }
  btn.disabled = false;
}

/* ---------- panel hasil (sheet di ponsel, popover di desktop) ---------- */

let MT_ANCHOR = null;

function mtPlace(el, rect) {
  if (mtMobile() || !rect) {
    el.style.left = el.style.top = '';
    return;
  }
  const w = el.offsetWidth || 340,
    h = el.offsetHeight || 200,
    sx = window.scrollX,
    sy = window.scrollY,
    vw = document.documentElement.clientWidth;
  let left = rect.left + sx + rect.width / 2 - w / 2;
  left = Math.max(sx + 12, Math.min(left, sx + vw - w - 12));
  let top = rect.bottom + sy + 10;
  if (rect.bottom + h + 20 > window.innerHeight && rect.top - h - 20 > 0) top = rect.top + sy - h - 10;
  el.style.left = left + 'px';
  el.style.top = top + 'px';
}

const mtReplace = () => {
  const p = $mt('trp');
  if (p && p.classList.contains('open')) mtPlace(p, MT_ANCHOR);
};

function mtOpen(title, rect) {
  const p = $mt('trp');
  MT_ANCHOR = rect || null;
  $mt('trpt').textContent = title;
  p.classList.add('open');
  $mt('trov').classList.toggle('open', mtMobile());
  mtPlace(p, MT_ANCHOR);
  const x = p.querySelector('.trp-x');
  if (x) x.focus({ preventScroll: true });
}

function mtClose() {
  MT_TOK++;
  ['trp', 'trov'].forEach((id) => {
    const e = $mt(id);
    if (e) e.classList.remove('open');
  });
}

const mtOpenNow = () => !!$mt('trp') && $mt('trp').classList.contains('open');

function mtFoot(sel, extra) {
  const left = Math.floor(mtRemain() / mtAvg());
  return (
    'Terjemahan mesin, bisa kurang akurat. Sisa kuota hari ini ±' + fmtN(left) + ' ayat.' +
    (sel && sel.lang === 'he'
      ? window.SEG && window.SEG.E.some(Boolean)
        ? ' Untuk hasil lebih baik, terjemahkan dari teks Inggris.'
        : ' Gunakan sebagai gambaran; teks Ibrani adalah rujukan.'
      : '') +
    (extra || '') +
    (sel ? ' <a href="' + mtGoogle(sel.text) + '" target="_blank" rel="noopener">Buka di Google Terjemahan ↗</a>' : '')
  );
}

/** Hasil terjemah untuk teks yang dipilih. */
async function mtShowSel(sel) {
  const tok = ++MT_TOK;
  mtOpen('Terjemahan · ' + (mtPivot(sel.lang) ? 'Ibrani → Inggris → Indonesia' : (MT_LANG[sel.lang] || sel.lang) + ' → Indonesia'), sel.rect);
  const body = $mt('trpb'),
    foot = $mt('trpf');
  body.innerHTML = (sel.lang === 'he' ? '<small class="trwn">Kurang akurat</small>' : '') + '<p class="mtsrc"></p><div class="mtres" lang="id" dir="ltr" aria-live="polite"><span class="spin"></span></div><div class="mtact"></div>';
  body.querySelector('.mtsrc').textContent = '“' + (sel.text.length > 160 ? sel.text.slice(0, 160) + '…' : sel.text) + '”';
  foot.innerHTML = mtFoot(sel);
  mtReplace();
  const res = body.querySelector('.mtres'),
    act = body.querySelector('.mtact');
  try {
    const out = await mtText(sel.text, sel.lang);
    if (tok !== MT_TOK) return;
    res.textContent = out;
    act.innerHTML =
      '<button type="button" class="mtbtn p" id="mtcopy">Salin</button><button type="button" class="mtbtn" onclick="mtClose()">Tutup</button>';
    $mt('mtcopy').onclick = () => {
      navigator.clipboard
        .writeText(out)
        .then(() => {
          $mt('mtcopy').textContent = 'Tersalin ✓';
          setTimeout(() => {
            const b = $mt('mtcopy');
            if (b) b.textContent = 'Salin';
          }, 1600);
        })
        .catch(() => {});
    };
  } catch (e) {
    if (tok !== MT_TOK) return;
    res.className = 'mtres error';
    res.textContent = e.message;
    act.innerHTML = '<button type="button" class="mtbtn p" id="mtretry">Coba lagi</button><button type="button" class="mtbtn" onclick="mtClose()">Tutup</button>';
    $mt('mtretry').onclick = () => mtShowSel(sel);
  }
  foot.innerHTML = mtFoot(sel);
  mtReplace();
}

/* ---------- pilihan teks -> pil "Terjemahkan" ---------- */

let MT_SELT = 0,
  MT_DOWN = false;

function mtSelOK(node) {
  const el = node && (node.nodeType === 1 ? node : node.parentElement);
  if (!el || !el.closest('#app, #panel')) return false;
  return !el.closest('.trw, .trt, #trp, .tb, .tbtn, .trlk, button, select, input, textarea, nav, .cmp-top, .rtt, .rth, .dbar');
}

function mtSelRead() {
  const s = window.getSelection();
  if (!s || !s.rangeCount || s.isCollapsed) return null;
  const text = s.toString().replace(/\s+/g, ' ').trim();
  if (text.length < 3 || text.length > 2000) return null;
  if (!mtSelOK(s.anchorNode) || !mtSelOK(s.focusNode)) return null;
  const he = (text.match(/[\u05D0-\u05EA]/g) || []).length,
    la = (text.match(/[A-Za-z]/g) || []).length;
  let lang = he > la ? 'he' : 'en';
  if (lang === 'en') {
    const an = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement;
    if (an && an.closest('.seg .en') && window.SEG && window.SEG.lang) lang = window.SEG.lang;
  }
  if (lang === 'id') return null;
  return { text, lang, rect: s.getRangeAt(0).getBoundingClientRect() };
}

function mtPillHide() {
  const p = $mt('mtpill');
  if (p) p.hidden = true;
  MS = null;
}

function mtPillShow(sel) {
  const p = $mt('mtpill');
  MS = sel;
  p.querySelector('small').textContent = fmtN(sel.text.length) + ' kar.';
  p.hidden = false;
  if (mtTouch() || mtMobile()) {
    p.classList.add('fix');
    p.style.left = p.style.top = '';
  } else {
    p.classList.remove('fix');
    mtPlace(p, sel.rect);
  }
}

/* ---------- hub: pasal, pengaturan, kuota ---------- */

function mtChapInfo() {
  const S0 = window.SEG;
  if (!S0 || !$mt('txt')) return null;
  const todo = [];
  let cost = 0,
    n = 0;
  for (let i = 1; i <= S0.E.length; i++) {
    const s = mtSrc(i);
    if (!s) continue;
    n++;
    const E = mtVerseEls(i);
    if (E && E.wrap && E.wrap.dataset.done === '1') continue;
    todo.push(i);
    cost += mtCost(s.text, s.lang);
  }
  return { n, todo, cost };
}

/** Teks perkiraan biaya terjemahan satu pasal. */
function mtCostText(info) {
  if (!info.todo.length) return 'Semua ayat pada pasal ini sudah diterjemahkan.';
  const enough = info.cost <= mtRemain();
  return (
    '±' + fmtN(info.cost) + ' karakter dari ' + info.todo.length + ' ayat · memakai ±' +
    Math.round((info.cost / mtLimit()) * 100) + '% kuota hari ini' + (mtHebOnly() && mtPath() === 'pivot' ? ' (jalur lewat Inggris)' : '') + '.' +
    (enough ? '' : ' <span class="mtwarn">Kuota hari ini tidak cukup untuk seluruh pasal; terjemahkan per ayat atau coba besok.</span>')
  );
}

let MT_RUN = false;

function mtCostUI() {
  const c = $mt('mtcost'),
    info = mtChapInfo();
  if (!c || !info) return;
  c.innerHTML = mtCostText(info);
  const b = $mt('mtchap');
  if (b && !MT_RUN) b.disabled = !info.todo.length || info.cost > mtRemain();
}

function mtSetPath(v) {
  try {
    localStorage.setItem(MT_PFX + 'path', v === 'pivot' ? 'pivot' : 'direct');
  } catch {}
  mtCostUI();
}

function mtHubHTML() {
  const info = mtChapInfo(),
    iconsOn = !document.body.classList.contains('mt-noicons');
  let h = '<p class="mths">Terjemahan mesin · Inggris → Indonesia</p>';
  if (info && info.n) {
    const rem = mtRemain(),
      enough = info.cost <= rem;
    h += '<div class="mtsec"><b>Terjemahkan pasal ini</b><p id="mtcost">' + mtCostText(info) + '</p><p id="mtprog" class="mtprog" hidden></p>';
    h += '<button type="button" class="mtbtn p" id="mtchap" onclick="mtChapter()"' + (!info.todo.length || !enough ? ' disabled' : '') + '>Terjemahkan pasal ini</button></div>';
  }
  h +=
    '<div class="mtsec"><b>Jalur untuk teks Ibrani</b>' +
    '<label class="mtrd"><input type="radio" name="mtpath" value="direct"' + (mtPath() === 'direct' ? ' checked' : '') + ' onchange="mtSetPath(this.value)"><span>Langsung (Ibrani → Indonesia)<small>Hemat kuota.</small></span></label>' +
    '<label class="mtrd"><input type="radio" name="mtpath" value="pivot"' + (mtPath() === 'pivot' ? ' checked' : '') + ' onchange="mtSetPath(this.value)"><span>Lewat Inggris (Ibrani → Inggris → Indonesia)<small>Mungkin lebih akurat; memakai ±2,5× kuota dan lebih lambat.</small></span></label></div>';
  h +=
    '<label class="mtsw"><input type="checkbox" id="mtico"' + (iconsOn ? ' checked' : '') + ' onchange="mtIcons(this.checked)"> <span>Tampilkan ikon terjemah di tiap ayat</span></label>';
  h +=
    '<div class="mtsec"><b>Kuota hari ini</b><div class="mtqb"><i id="mtqbar"></i></div><p id="mtqtx"></p></div>';
  h +=
    '<div class="mtsec"><b>Email pribadi (opsional)</b><div class="mtem"><input type="email" id="mtem" autocomplete="email" placeholder="nama@contoh.com" value="' + esc(mtEmail()) + '"><button type="button" class="mtbtn" onclick="mtEmailSave()">Simpan</button></div>' +
    '<small>Menaikkan kuota harian MyMemory untuk perangkat ini (5.000 menjadi 50.000 karakter). Disimpan hanya di peramban ini.</small></div>';
  return h;
}

function mtHub(anchor) {
  let a = anchor && anchor.getBoundingClientRect ? anchor : document.querySelector('.tbt');
  if (!a || !a.offsetParent) a = $mt('mtq');
  const r = a && !a.hidden ? a.getBoundingClientRect() : { left: window.innerWidth / 2, right: window.innerWidth / 2, top: 80, bottom: 80, width: 0, height: 0 };
  mtPillHide();
  MT_TOK++;
  mtOpen('Terjemahan mesin', r);
  $mt('trpb').innerHTML = mtHubHTML();
  $mt('trpf').textContent = 'Terjemahan mesin bisa kurang akurat. Mesin: MyMemory.';
  mtQUI();
  mtReplace();
}

function mtIcons(on) {
  document.body.classList.toggle('mt-noicons', !on);
  try {
    st.set('mti', on ? 1 : 0);
  } catch {}
}

function mtEmailSave() {
  const v = ($mt('mtem').value || '').trim();
  try {
    if (!v) localStorage.removeItem(MT_PFX + 'email');
    else if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) localStorage.setItem(MT_PFX + 'email', v);
    else {
      $mt('mtem').setCustomValidity('Email tidak valid');
      $mt('mtem').reportValidity();
      $mt('mtem').setCustomValidity('');
      return;
    }
  } catch {}
  mtQUI();
}

async function mtChapter() {
  const info = mtChapInfo(),
    btn = $mt('mtchap');
  if (!info || !info.todo.length || !btn) return;
  MT_STOP = false;
  MT_RUN = true;
  btn.textContent = 'Hentikan';
  btn.onclick = () => {
    MT_STOP = true;
    btn.disabled = true;
  };
  const prog = $mt('mtprog');
  let done = 0;
  for (const i of info.todo) {
    if (MT_STOP) break;
    const p = $mt('mtprog');
    if (p) {
      p.hidden = false;
      p.textContent = 'Menerjemahkan ayat ' + (done + 1) + ' dari ' + info.todo.length + '…';
    }
    try {
      await mtVerseRun(i);
    } catch {
      break;
    }
    done++;
  }
  MT_RUN = false;
  const p2 = $mt('mtprog');
  if (p2) {
    p2.hidden = false;
    p2.textContent = MT_STOP ? 'Dihentikan: ' + done + ' ayat selesai.' : done === info.todo.length ? 'Selesai: ' + done + ' ayat diterjemahkan.' : 'Berhenti di ayat ke-' + (done + 1) + ' (kuota habis atau jaringan bermasalah).';
  }
  const b2 = $mt('mtchap');
  if (b2) {
    b2.disabled = false;
    b2.textContent = 'Terjemahkan pasal ini';
    b2.onclick = mtChapter;
    const c = $mt('mtcost'),
      i2 = mtChapInfo();
    if (i2 && !i2.todo.length) {
      b2.disabled = true;
      if (c) c.textContent = 'Semua ayat pada pasal ini sudah diterjemahkan.';
    }
  }
  mtReplace();
}

/* ---------- indikator kuota (kiri bawah, muncul sementara) ---------- */

function mtQUI() {
  const q = $mt('mtq');
  if (!q) return;
  const pct = mtPct(),
    level = pct === 0 ? 'out' : pct <= 15 ? 'low' : pct <= 40 ? 'warn' : 'ok',
    RING = 2 * Math.PI * 20,
    label = level === 'out' ? 'Kuota terjemahan habis hari ini' : level === 'low' ? 'Kuota terjemahan hampir habis' : 'Kuota terjemahan: ' + pct + '% tersisa';
  q.dataset.level = level;
  $mt('mtqring').style.strokeDashoffset = RING * (1 - pct / 100);
  $mt('mtqv').textContent = pct + '%';
  q.setAttribute('aria-label', label + '. Ketuk untuk pengaturan terjemahan.');
  // Tampil: setelah ada terjemahan di sesi ini, atau menetap saat kuota menipis
  const show = MT_SEEN || level === 'low' || level === 'out';
  q.hidden = !show;
  if (show) {
    q.classList.remove('dim');
    clearTimeout(MT_DIMT);
    if (level === 'ok' || level === 'warn') {
      if (level === 'ok') MT_DIMT = setTimeout(() => q.classList.add('dim'), 4000);
    }
  }
  if (MT_PREV && MT_PREV !== level && (level === 'low' || level === 'out')) {
    const t = $mt('mtqt');
    t.textContent = label;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
  }
  MT_PREV = level;
  // Ikut perbarui hub yang sedang terbuka
  const bar = $mt('mtqbar'),
    tx = $mt('mtqtx');
  if (bar) bar.style.width = pct + '%';
  if (tx)
    tx.innerHTML =
      level === 'out'
        ? '<strong>Kuota harian habis.</strong> Terjemahan baru bisa dicoba lagi besok; yang sudah pernah dibuka tetap tersedia dari peramban.'
        : 'Terpakai <strong>' + fmtN(MQ.used) + '</strong> dari ' + fmtN(mtLimit()) + ' karakter · cukup untuk ±<strong>' + fmtN(Math.floor(mtRemain() / mtAvg())) + ' ayat</strong> lagi. Yang pernah dibuka diambil dari peramban tanpa memakai kuota. Angka ini perkiraan.';
}

/* ---------- inisialisasi ---------- */

function mtInit() {
  if ($mt('trp')) return;
  try {
    if (st.get('mti', 1) === 0) document.body.classList.add('mt-noicons');
  } catch {}
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<button id="mtpill" type="button" class="mtpill" hidden>' + MT_IC + '<span>Terjemahkan</span><small></small></button>' +
    '<div id="trov" class="trov"></div>' +
    '<div id="trp" class="trp" role="dialog" aria-label="Terjemahan mesin"><div class="trp-grab" aria-hidden="true"></div>' +
    '<div class="trp-h"><b id="trpt"></b><button type="button" class="trp-x" aria-label="Tutup" onclick="mtClose()">' + MT_ICX + '</button></div>' +
    '<div id="trpb" class="trp-b"></div><div id="trpf" class="trp-f"></div></div>' +
    '<button id="mtq" type="button" class="mtq" hidden data-level="ok" aria-label="Kuota terjemahan"><svg class="mtqr" viewBox="0 0 48 48" aria-hidden="true"><circle class="trk" cx="24" cy="24" r="20"/><circle id="mtqring" class="bar" cx="24" cy="24" r="20"/></svg><span id="mtqv">100%</span></button>' +
    '<div id="mtqt" class="mtqt" role="status"></div>';
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  const pill = $mt('mtpill');
  pill.addEventListener('pointerdown', (e) => e.preventDefault());
  pill.addEventListener('click', () => {
    const sel = MS;
    if (!sel) return;
    mtPillHide();
    mtShowSel(sel);
  });
  $mt('trov').addEventListener('click', mtClose);
  $mt('mtq').addEventListener('click', () => mtHub($mt('mtq')));

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.tbtn[data-tv]');
    if (b) return mtVerseToggle(b);
    const c = e.target.closest('.trlk');
    if (c) mtCard(c);
  });
  document.addEventListener('mousedown', (e) => {
    MT_DOWN = true;
    if (mtOpenNow() && !mtMobile() && !e.target.closest('#trp, #mtpill, #mtq, [data-mt-hub]')) mtClose();
  });
  document.addEventListener('mouseup', () => {
    MT_DOWN = false;
  });
  document.addEventListener('selectionchange', () => {
    clearTimeout(MT_SELT);
    MT_SELT = setTimeout(
      () => {
        if (MT_DOWN) return;
        const sel = mtSelRead();
        if (sel && !mtOpenNow()) mtPillShow(sel);
        else mtPillHide();
      },
      mtTouch() ? 350 : 200,
    );
  });
  // Esc menutup panel terjemahan saja (fase capture, tidak ikut menutup panel komentar)
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && mtOpenNow()) {
        e.stopPropagation();
        mtClose();
      }
    },
    true,
  );
  window.addEventListener('hashchange', () => {
    mtClose();
    mtPillHide();
  });
  mtQUI();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mtInit);
else mtInit();