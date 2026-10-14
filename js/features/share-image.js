/**
 * share-image.js — Bagikan ayat sebagai gambar: kartu buatan sendiri (canvas) atau gambar Sefaria.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Gambar kartu 1080×1350 (Ibrani + terjemahan + atribusi) di kanvas; font menyusut otomatis agar muat.
 */
async function drawCard(ref, he, en, attr) {
  try {
    await Promise.all([
      document.fonts.load('48px "Frank Ruhl Libre"'),
      document.fonts.load('30px "Source Serif 4"'),
    ]);
  } catch {}
  const W = 1080,
    Ht = 1350,
    P = 90,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = Ht;
  const c = cv.getContext('2d'),
    dk = document.documentElement.dataset.theme === 'dark';
  const fg = dk ? '#e6e8ec' : '#1c2230',
    gold = dk ? '#d4aa4f' : '#9a7421',
    mut = dk ? '#9097a3' : '#69707d';
  c.fillStyle = dk ? '#12151c' : '#f1f3f0';
  c.fillRect(0, 0, W, Ht);
  c.fillStyle = dk ? '#1a1e27' : '#fbfcfb';
  c.fillRect(40, 40, W - 80, Ht - 80);
  c.strokeStyle = gold;
  c.lineWidth = 3;
  c.strokeRect(40, 40, W - 80, Ht - 80);
  c.textAlign = 'left';
  c.direction = 'ltr';
  c.fillStyle = gold;
  c.font = '600 34px Figtree,sans-serif';
  c.fillText(ref, P, P + 50);
  c.font = '400 24px Figtree,sans-serif';
  c.direction = 'ltr';
  let fl = wrapText(c, 'Sumber: Sefaria.org' + (attr ? ' · ' + attr : ''), W - 2 * P);
  if (fl.length > 3) {
    fl = fl.slice(0, 3);
    fl[2] = fl[2].replace(/.{0,2}$/, '') + '…';
  }
  const LH = 30,
    fy = Ht - P - 34 - (fl.length - 1) * LH,
    maxH = fy - 60 - (P + 120);
  let fh = 64,
    fe = 38,
    hl = [],
    el = [];
  for (; fh >= 28; fh -= 4) {
    fe = Math.max(22, Math.round(fh * 0.6));
    c.direction = 'rtl';
    c.font = `400 ${fh}px "Frank Ruhl Libre",serif`;
    hl = he ? wrapText(c, he, W - 2 * P) : [];
    c.direction = 'ltr';
    c.font = `400 ${fe}px "Source Serif 4",Georgia,serif`;
    el = en ? wrapText(c, en, W - 2 * P) : [];
    if (hl.length * fh * 1.55 + (hl.length && el.length ? 44 : 0) + el.length * fe * 1.5 <= maxH)
      break;
  }
  if (fh < 28) fh = 28;
  let cut = false;
  const tot = () =>
    hl.length * fh * 1.55 + (hl.length && el.length ? 44 : 0) + el.length * fe * 1.5;
  while (tot() > maxH && hl.length + el.length > 1) {
    if (el.length > 1) el.pop();
    else if (hl.length > 1 && !el.length) hl.pop();
    else if (el.length) el.pop();
    else hl.pop();
    cut = true;
  }
  if (cut) {
    const a = el.length ? el : hl;
    a[a.length - 1] = a[a.length - 1].replace(/.{0,1}$/, '') + '…';
  }
  let y = P + 120 + fh;
  c.fillStyle = fg;
  c.direction = 'rtl';
  c.textAlign = 'right';
  c.font = `400 ${fh}px "Frank Ruhl Libre",serif`;
  hl.forEach((l) => {
    c.fillText(l, W - P, y);
    y += fh * 1.55;
  });
  y += hl.length && el.length ? 44 - fh * 0.55 + fe * 0.6 : 0;
  c.direction = 'ltr';
  c.textAlign = 'left';
  c.font = `400 ${fe}px "Source Serif 4",Georgia,serif`;
  el.forEach((l) => {
    c.fillText(l, P, y);
    y += fe * 1.5;
  });
  c.fillStyle = mut;
  c.font = '400 24px Figtree,sans-serif';
  c.direction = 'ltr';
  c.textAlign = 'left';
  fl.forEach((l, i) => c.fillText(l, P, fy + i * LH));
  c.fillText('Pustaka Torah', P, Ht - P);
  return new Promise((r) => cv.toBlob(r, 'image/png'));
}

/**
 * Gambar kartu 1200×630 bergaya Sefaria (latar biru, teks putih) sebagai cadangan gambar bawaan.
 */
async function drawSefStyle(ref, txt, isHe, attr) {
  try {
    await Promise.all([
      document.fonts.load('48px "Frank Ruhl Libre"'),
      document.fonts.load('48px "Source Serif 4"'),
    ]);
  } catch {}
  const W = 1200,
    Ht = 630,
    P = 90,
    HB = 92,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = Ht;
  const c = cv.getContext('2d');
  c.fillStyle = '#00536b';
  c.fillRect(0, 0, W, Ht);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, HB);
  c.textAlign = 'center';
  c.direction = 'ltr';
  c.fillStyle = '#18345d';
  c.font = '600 36px "Source Serif 4",Georgia,serif';
  c.fillText('Pustaka Torah', W / 2, HB / 2 + 13);
  const top = HB + 36,
    bot = Ht - 140,
    areaH = bot - top,
    fam = isHe ? '"Frank Ruhl Libre",serif' : '"Source Serif 4",Georgia,serif';
  let fs = 64,
    lines = [];
  for (; fs >= 26; fs -= 4) {
    c.font = `400 ${fs}px ${fam}`;
    c.direction = isHe ? 'rtl' : 'ltr';
    lines = wrapText(c, txt, W - 2 * P);
    if (lines.length * fs * 1.35 <= areaH) break;
  }
  if (fs < 26) fs = 26;
  let cut = false;
  while (lines.length * fs * 1.35 > areaH && lines.length > 1) {
    lines.pop();
    cut = true;
  }
  if (cut) lines[lines.length - 1] = lines[lines.length - 1].replace(/.{0,1}$/, '') + '…';
  let y = top + (areaH - lines.length * fs * 1.35) / 2 + fs;
  c.fillStyle = '#ffffff';
  c.font = `400 ${fs}px ${fam}`;
  c.direction = isHe ? 'rtl' : 'ltr';
  c.textAlign = isHe ? 'right' : 'left';
  lines.forEach((l) => {
    c.fillText(l, isHe ? W - P : P, y);
    y += fs * 1.35;
  });
  c.direction = 'ltr';
  c.textAlign = 'center';
  c.font = '500 30px Figtree,sans-serif';
  c.fillStyle = '#ffffff';
  c.fillText(ref.toUpperCase(), W / 2, Ht - 84);
  c.font = '400 17px Figtree,sans-serif';
  c.fillStyle = '#ffffffbb';
  let a = wrapText(c, 'Teks: Sefaria.org' + (attr ? ' · ' + attr : ''), W - 120);
  if (a.length > 2) {
    a = a.slice(0, 2);
    a[1] = a[1].replace(/.{0,1}$/, '') + '…';
  }
  a.forEach((l, i) => c.fillText(l, W / 2, Ht - (a.length - i) * 24 - 4));
  return new Promise((r) => cv.toBlob(r, 'image/png'));
}

/**
 * Heuristik: apakah gambar Sefaria berisi teks (piksel putih di area tengah) atau kosong.
 */
async function imgHasText(b) {
  try {
    const bm = await createImageBitmap(b),
      w = 240,
      h = Math.max(1, Math.round((bm.height * w) / bm.width)),
      cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    c.drawImage(bm, 0, 0, w, h);
    const y0 = Math.round(h * 0.3),
      y1 = Math.round(h * 0.75),
      d = c.getImageData(Math.round(w * 0.05), y0, Math.round(w * 0.9), y1 - y0).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) n++;
    return n / (d.length / 4) > 0.006;
  } catch {
    return true;
  }
}

/**
 * Cek apakah URL gambar bisa dimuat (timeout 12 dtk).
 */
const probeImg = (u) =>
  new Promise((res) => {
    const im = new Image(),
      tm = setTimeout(() => res(false), 12000);
    im.onload = () => {
      clearTimeout(tm);
      res(true);
    };
    im.onerror = () => {
      clearTimeout(tm);
      res(false);
    };
    im.src = u;
  });

/**
 * Pembungkus: buka lightbox dalam keadaan "menyiapkan gambar", jalankan pembuatan gambar, dan tampilkan
 * kegagalan (dengan tombol "Coba lagi") bila gagal.
 */
async function shareImg(i, sf, btn) {
  const S0 = window.SEG;
  if (!S0) return;
  const t0 = btn && btn.textContent;
  lbBusy(S0.ref + ':' + i);
  try {
    await shareImgRun(i, sf, btn);
    if (LB.busy) lbFail('Teks ayat ini tidak tersedia untuk dijadikan gambar.');
  } catch (e) {
    lbFail('Gambar belum bisa dibuat. Periksa koneksi, lalu coba lagi.', () => shareImg(i, sf, btn));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = t0;
    }
  }
}

/**
 * Buat/ambil gambar ayat (kartu sendiri atau gambar Sefaria) lalu buka di lightbox untuk diunduh/dibagikan.
 */
async function shareImgRun(i, sf, btn) {
  const S0 = window.SEG;
  if (!S0) return;
  const ref = S0.ref + ':' + i,
    open = (it) => {
      if (!LB.busy) return; // pengguna sudah menutup lightbox saat gambar dibuat
      window.MSL = [it];
      lb({ dataset: { i: 0 }, focus() {} });
    };
  if (sf) {
    const lg = sf === 1 ? 'english' : sf,
      isHe = lg === 'hebrew',
      L = isHe ? ['hebrew', 'he'] : ['english', 'en'],
      lab = isHe ? 'Ibrani' : 'Inggris',
      t0 = btn && btn.textContent;
    const C = [
      ...L.map((l) => '?lang=' + l + '&platform=facebook'),
      ...L.map((l) => '?lang=' + l),
      ...(isHe ? [] : ['?platform=facebook', '']),
    ].map((q) => API + '/img-gen/' + enc(ref) + q);
    const own = async (why) => {
      const hs = S0.H[i - 1] || '',
        es = S0.E[i - 1] || '',
        useHe = isHe ? !!hs : !es && !!hs,
        txt = useHe ? hs : es;
      if (!txt) return false;
      const b = await drawSefStyle(ref, txt, useHe, S0.attr);
      if (!b) return false;
      const fn = 'pustaka-torah-gaya-sefaria-' + ref.replace(/[^A-Za-z0-9]+/g, '-') + '.png';
      open({
        u: URL.createObjectURL(b),
        n: ref + ' (dibuat sendiri: ' + why + ')',
        dl: true,
        fn,
        file: new File([b], fn, { type: 'image/png' }),
      });
      lbNote('Gambar ini dibuat oleh aplikasi dengan gaya serupa, karena ' + why + '.');
      return true;
    };
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Memuat gambar…';
    }
    let found = '',
      blob = null;
    for (const u of C) {
      if (!(await probeImg(u))) continue;
      try {
        const x = await fetch(u);
        if (!x.ok) throw 0;
        const b = await x.blob();
        if (!/^image\//.test(b.type)) throw 0;
        if (await imgHasText(b)) {
          found = u;
          blob = b;
          break;
        }
      } catch {
        found = u;
        break;
      }
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = t0;
    }
    if (!found) {
      if (await own('gambar Sefaria Library tidak ditemukan atau kosong')) return;
      open({ u: C[0], n: ref + ' (gambar Sefaria ' + lab + ': semua bentuk alamat gagal dimuat)' });
      return;
    }
    const it = { u: found, n: ref + ' (gambar Sefaria, ' + lab + ')' };
    if (blob) {
      const ex = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*/, ''),
        fn =
          'sefaria-' + ref.replace(/[^A-Za-z0-9]+/g, '-') + '-' + (isHe ? 'he' : 'en') + '.' + ex;
      it.dl = true;
      it.fn = fn;
      it.du = URL.createObjectURL(blob);
      it.file = new File([blob], fn, { type: blob.type });
    } else it.regen = () => own('gambar Sefaria Library kosong atau tidak bisa diperiksa');
    open(it);
    return;
  }
  const he = S0.H[i - 1] || '',
    en = S0.E[i - 1] || '';
  if (!he && !en) return;
  const b = await drawCard(ref, he, en, S0.attr);
  if (!b) return;
  const fn = 'pustaka-torah-' + ref.replace(/[^A-Za-z0-9]+/g, '-') + '.png';
  open({
    u: URL.createObjectURL(b),
    n: ref,
    dl: true,
    fn,
    file: new File([b], fn, { type: 'image/png' }),
  });
}