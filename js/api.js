/**
 * api.js — Lapisan jaringan: cache IndexedDB + memori, antrean permintaan, dan pemanggilan API Sefaria.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Prefiks versi kunci cache IndexedDB, daftar permintaan berjalan (FL), dan antrean Q.
 */
const PV = 'pt1:',
  FL = {},
  Q = { n: 0, max: 4, hi: [], lo: [] };

/**
 * Buka database IndexedDB 'pustaka-torah'; bernilai null bila tak tersedia (mis. mode privat).
 */
const IDB = new Promise((res) => {
  try {
    const q = indexedDB.open('pustaka-torah', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('kv');
    q.onsuccess = () => res(q.result);
    q.onerror = () => res(null);
  } catch {
    res(null);
  }
});

/**
 * Baca nilai cache IndexedDB; undefined bila tidak ada atau sudah kedaluwarsa.
 */
async function pget(k) {
  const db = await IDB;
  if (!db) return;
  return new Promise((r) => {
    try {
      const q = db
        .transaction('kv')
        .objectStore('kv')
        .get(PV + k);
      q.onsuccess = () => {
        const v = q.result;
        r(v && v.e > Date.now() ? v.d : undefined);
      };
      q.onerror = () => r();
    } catch {
      r();
    }
  });
}

/**
 * Tulis nilai ke cache IndexedDB dengan masa berlaku ms milidetik.
 */
async function pset(k, d, ms) {
  const db = await IDB;
  if (!db) return;
  try {
    db.transaction('kv', 'readwrite')
      .objectStore('kv')
      .put({ d, e: Date.now() + ms }, PV + k);
  } catch {}
}

/**
 * Tentukan masa simpan cache (ms) menurut jenis endpoint; 0 berarti tidak di-cache permanen.
 */
function ttl(p) {
  const D = 864e5;
  if (p === '/index') return 7 * D;
  if (/^\/(v2\/index|index)\//.test(p)) return 30 * D;
  if (p.startsWith('/topics?limit=')) return 7 * D;
  if (p.startsWith('/calendars')) return p.includes('next-read') ? 7 * D : 0.25 * D;
  if (p.startsWith('/shape/')) return 30 * D;
  if (p.startsWith('/category/')) return 7 * D;
  if (p.startsWith('/texts/translations')) return 7 * D;
  if (p.startsWith('/words/') || p.startsWith('/terms/')) return 30 * D;
  return 0;
}

/**
 * Kunci cache; endpoint kalender 'hari ini' diberi tanggal agar tidak basi.
 */
const pkey = (p) =>
  p +
  (p.startsWith('/calendars') && !/year=|next-read/.test(p) ? '|' + new Date().toDateString() : '');

/**
 * Ambil dari cache persisten bila ada; bila tidak, panggil load() lalu simpan (kecuali respons error/kosong).
 */
async function cached(k, T, load) {
  const h = T ? await pget(k) : undefined;
  if (h !== undefined) return h;
  const d = await load();
  if (
    T &&
    !(d && typeof d === 'object' && !Array.isArray(d) && typeof d.error === 'string') &&
    !(Array.isArray(d) && !d.length)
  )
    pset(k, d, T);
  return d;
}

/**
 * Minta slot antrean permintaan (maks. Q.max bersamaan); permintaan latar belakang (bg) berprioritas rendah.
 */
const qacq = (bg) =>
  new Promise((r) => {
    if (Q.n < Q.max) {
      Q.n++;
      r();
    } else (bg ? Q.lo : Q.hi).push(r);
  });

/**
 * Lepas slot antrean dan jalankan permintaan berikutnya (prioritas tinggi dulu).
 */
const qrel = () => {
  const nx = Q.hi.shift() || Q.lo.shift();
  if (nx) nx();
  else Q.n--;
};

/**
 * fetch JSON dengan antrean, batas waktu (default 30 dtk), dan pesan error yang ringkas.
 */
async function qjson(u, o, ms, bg) {
  await qacq(bg);
  const c = new AbortController(),
    tm = setTimeout(() => c.abort(), ms || 30000);
  try {
    const r = await fetch(u, { ...(o || {}), signal: c.signal });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'waktu habis' : e.message);
  } finally {
    clearTimeout(tm);
    qrel();
  }
}

/**
 * Pintu utama data Sefaria: cache memori → permintaan berjalan → cache IndexedDB → jaringan.
 */
function api(p, bg) {
  if (cache[p]) return Promise.resolve(cache[p]);
  if (FL[p]) return FL[p];
  return (FL[p] = cached(pkey(p), ttl(p), () => qjson(API + p, {}, 30000, bg))
    .then((d) => {
      cache[p] = d;
      return d;
    })
    .finally(() => {
      delete FL[p];
    }));
}

/**
 * Hapus seluruh data tersimpan (IndexedDB + memori) dan beri umpan balik pada tombol.
 */
async function clearCache(b) {
  const db = await IDB;
  if (db)
    try {
      db.transaction('kv', 'readwrite').objectStore('kv').clear();
    } catch {}
  Object.keys(cache).forEach((k) => delete cache[k]);
  window.TT = null;
  if (b) b.textContent = 'Data tersimpan dihapus ✓';
}

/**
 * Seperti api() tetapi mendukung header kustom dan selalu berprioritas latar belakang (timeout 20 dtk).
 */
function rj(u, h) {
  const k = u + JSON.stringify(h || {});
  if (cache[k]) return Promise.resolve(cache[k]);
  if (FL[k]) return FL[k];
  return (FL[k] = cached(pkey(u) + (h && h['Accept-Language'] ? '|al' : ''), ttl(u), () =>
    qjson(API + u, { headers: h || {} }, 20000, 1),
  )
    .then((d) => {
      cache[k] = d;
      return d;
    })
    .finally(() => {
      delete FL[k];
    }));
}

/**
 * Panggil endpoint Sefaria yang peka bahasa; mencoba variasi header/parameter lalu mengingat yang berhasil.
 */
async function langFetch(path) {
  const K = path.split('/')[1],
    V = [
      ['', { 'Accept-Language': 'en' }],
      ['?lang=english', {}],
      ['', {}],
    ],
    W = (window.LFW = window.LFW || {});
  let last;
  for (const v of W[K] ? [W[K]] : V) {
    try {
      const u = path + (v[0] ? (path.includes('?') ? '&' : '?') + v[0].slice(1) : '');
      const d = await rj(u, v[1]);
      last = d;
      if (isErr(d)) continue;
      W[K] = v;
      return d;
    } catch (e) {
      last = e.message;
      if (e.message === 'waktu habis' || /fetch/i.test(e.message)) break;
    }
  }
  return last;
}

/**
 * api() dengan timeout kustom, dipakai untuk data besar (daftar semua tema) atau pengecekan cepat.
 */
async function apiTO(p, ms = 12000) {
  if (cache[p]) return cache[p];
  return (cache[p] = await cached(pkey(p), ttl(p), () => qjson(API + p, {}, ms)));
}
