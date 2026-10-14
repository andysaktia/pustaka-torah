/**
 * lightbox.js — Penampil gambar layar penuh (zoom, geser, swipe, keyboard).
 * Dipakai galeri naskah kuno dan "Bagikan sebagai gambar". Ponsel: bilah judul + X di kanan atas,
 * aksi di bawah (zona jempol). Desktop: gambar di kiri, panel aksi di kanan.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * State lightbox: daftar gambar, indeks, zoom, posisi geser, elemen pembuka, dan status "sibuk".
 */
let LB = { list: [], i: 0, z: 1, x: 0, y: 0, opener: null, hint: true, busy: false, retry: null };

/**
 * Singkatan getElementById untuk elemen lightbox.
 */
const $lb = (id) => document.getElementById(id);

const LBIC = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  share:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  dl: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  rst: '<path d="M4 4v5h5"/><path d="M4.5 9a8 8 0 1 1-1 5"/>',
};
const lbIco = (k) => '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true">' + LBIC[k] + '</svg>';

/**
 * Terapkan zoom/geser ke gambar, perbarui persentase zoom, dan tampilkan chip zoom saat diperbesar.
 */
function lbApply() {
  $lb('lbi').style.transform = `translate(${LB.x}px,${LB.y}px) scale(${LB.z})`;
  $lb('lbz').textContent = Math.round(LB.z * 100) + '%';
  $lb('lbzc').classList.toggle('on', LB.z > 1.001);
}

/**
 * Ubah zoom (1x–8x) dengan titik pusat tertentu, sehingga zoom mengikuti kursor/jari.
 */
function lbZ(f, cx = 0, cy = 0) {
  const nz = Math.min(8, Math.max(1, LB.z * f)),
    k = nz / LB.z;
  LB.x = cx - (cx - LB.x) * k;
  LB.y = cy - (cy - LB.y) * k;
  LB.z = nz;
  if (nz === 1) LB.x = LB.y = 0;
  lbApply();
}

/**
 * Kembalikan zoom dan posisi gambar ke semula.
 */
function lbReset() {
  LB.z = 1;
  LB.x = LB.y = 0;
  lbApply();
}

/**
 * Tampilkan keadaan di atas gambar: 'busy' (memuat, muncul setelah jeda singkat), 'err' (dengan tombol
 * coba lagi bila ada fungsi retry), atau null untuk menyembunyikan.
 */
function lbStatus(kind, msg, retry) {
  const s = $lb('lbst');
  if (!kind) {
    s.hidden = true;
    s.innerHTML = '';
    return;
  }
  LB.retry = retry || null;
  s.hidden = false;
  s.className = 'lbst ' + kind;
  s.innerHTML =
    (kind === 'busy' ? '<span class="lbsp" aria-hidden="true"></span>' : '') +
    '<p>' +
    esc(msg) +
    '</p>' +
    (kind === 'err' && retry
      ? '<button type="button" class="lbbtn p" onclick="LB.retry&&LB.retry()">Coba lagi</button>'
      : '');
}

/**
 * Buka lightbox dalam keadaan "menyiapkan gambar" (sebelum ada item), mis. saat gambar sedang dibuat.
 */
function lbBusy(title) {
  lbInit();
  LB.opener = document.activeElement;
  LB.list = [];
  LB.busy = true;
  $lb('lb').hidden = false;
  $lb('lb').classList.add('noitem');
  document.body.style.overflow = 'hidden';
  $lb('lbt').textContent = title || '';
  $lb('lbsub').textContent = '';
  $lb('lbi').removeAttribute('src');
  $lb('lbi').style.opacity = 0;
  document.querySelectorAll('#lb .lbn').forEach((b) => (b.hidden = true));
  lbReset();
  lbStatus('busy', 'Menyiapkan gambar…');
  $lb('lbc').focus();
}

/**
 * Tampilkan kegagalan di lightbox, dengan tombol "Coba lagi" bila fungsi retry diberikan.
 */
function lbFail(msg, retry) {
  lbInit();
  if ($lb('lb').hidden) return;
  LB.busy = true;
  $lb('lb').classList.add('noitem');
  $lb('lbi').style.opacity = 0;
  lbStatus('err', msg, retry);
}

/**
 * Tampilkan gambar ke-i (berputar), prefetch tetangganya, dan atur tombol terkait.
 */
function lbShow(i) {
  const n = LB.list.length;
  if (!n) return;
  LB.i = (i + n) % n;
  LB.busy = false;
  const it = LB.list[LB.i],
    im = $lb('lbi');
  lbReset();
  lbMenu(false);
  $lb('lb').classList.remove('noitem');
  document.querySelectorAll('#lb .lbn').forEach((b) => (b.hidden = n < 2));
  // Judul = bagian sebelum kurung; subjudul = isi kurung + penghitung galeri
  const m = String(it.n || '').match(/^(.*?)\s*\((.*)\)\s*$/),
    parts = [];
  if (m) parts.push(m[2]);
  if (n > 1) parts.push(LB.i + 1 + '/' + n);
  $lb('lbt').textContent = m ? m[1] : it.n || '';
  $lb('lbsub').textContent = parts.join(' · ');
  im.style.opacity = 0.25;
  lbStatus('busy', 'Memuat gambar…');
  im.onload = () => {
    im.style.opacity = 1;
    lbStatus(null);
  };
  im.onerror = () => {
    im.style.opacity = 1;
    lbStatus('err', 'Gambar gagal dimuat.', () => lbShow(LB.i));
  };
  im.src = it.u;
  im.alt = it.n || '';
  lbBtns(it);
  if (n > 1)
    [LB.i - 1, LB.i + 1].forEach((j) => {
      new Image().src = LB.list[(j + n) % n].u;
    });
}

/**
 * Atur tombol aksi sesuai kemampuan item & peramban. Tombol utama: Bagikan bila bisa, jika tidak Unduh.
 */
function lbBtns(it) {
  const canShare = !!(it.file && navigator.canShare && navigator.canShare({ files: [it.file] })),
    d = $lb('lbd');
  $lb('lbsh').hidden = !canShare;
  d.hidden = !it.dl;
  if (it.dl) {
    d.href = it.du || it.u;
    d.download = it.fn || 'gambar.png';
  }
  d.classList.toggle('p', !canShare);
  $lb('lbcp').hidden = !(
    it.file &&
    window.ClipboardItem &&
    navigator.clipboard &&
    navigator.clipboard.write
  );
  $lb('lbg').hidden = !it.regen;
  $lb('lbo').href = it.u;
}

/**
 * Buat ulang gambar secara lokal bila gambar Sefaria kosong.
 */
function lbRegen() {
  const it = LB.list[LB.i],
    b = $lb('lbg');
  if (!it || !it.regen) return;
  b.disabled = true;
  b.textContent = 'Membuat…';
  it.regen().finally(() => {
    b.disabled = false;
    b.textContent = 'Gambar kosong? Buat sendiri';
  });
}

/**
 * Buka/tutup menu aksi tambahan (ponsel). Tanpa argumen: bolak-balik.
 */
function lbMenu(force) {
  const a = $lb('lbact');
  if (!a) return;
  const on = typeof force === 'boolean' ? force : !a.classList.contains('menu');
  a.classList.toggle('menu', on);
  $lb('lbmore').setAttribute('aria-expanded', on ? 'true' : 'false');
}

/**
 * Tutup lightbox, pulihkan scroll, dan kembalikan fokus ke pemicu (aksesibilitas).
 */
function lbClose() {
  $lb('lb').hidden = true;
  LB.busy = false;
  lbMenu(false);
  document.body.style.overflow = '';
  if (LB.opener && LB.opener.focus) LB.opener.focus();
}

/**
 * Bangun DOM lightbox sekali saja dan pasang interaksi: roda, cubit, seret, geser, ketuk, dobel-klik, keyboard.
 */
function lbInit() {
  if ($lb('lb')) return;
  const d = document.createElement('div');
  d.id = 'lb';
  d.hidden = true;
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', 'Penampil gambar');
  d.innerHTML =
    '<div class="lbside"><div class="lbhd"><div class="lbtt"><b id="lbt"></b><span id="lbsub"></span></div>' +
    '<button id="lbc" type="button" class="lbclose" aria-label="Tutup" onclick="lbClose()">' +
    lbIco('x') +
    '</button></div>' +
    '<div class="lbact" id="lbact"><div class="lbprim">' +
    '<button id="lbsh" type="button" class="lbbtn p" hidden onclick="lbShare()">' +
    lbIco('share') +
    'Bagikan</button>' +
    '<a id="lbd" class="lbbtn" hidden>' +
    lbIco('dl') +
    'Unduh</a>' +
    '<button id="lbcp" type="button" class="lbbtn" hidden onclick="lbCopy()">' +
    lbIco('copy') +
    'Salin gambar</button></div>' +
    '<button id="lbmore" type="button" class="lbmore" aria-label="Aksi lain" aria-haspopup="true" aria-expanded="false" onclick="lbMenu()">' +
    lbIco('dots') +
    '</button>' +
    '<div class="lbsec"><a id="lbo" class="lbbtn" target="_blank" rel="noopener">' +
    lbIco('ext') +
    'Buka gambar asli</a>' +
    '<button id="lbg" type="button" class="lbbtn" hidden onclick="lbRegen()">Gambar kosong? Buat sendiri</button></div></div></div>' +
    '<div id="lbs"><button class="lbn lbp" onclick="lbShow(LB.i-1)" aria-label="Gambar sebelumnya">‹</button><img id="lbi" alt="">' +
    '<button class="lbn lbx" onclick="lbShow(LB.i+1)" aria-label="Gambar berikutnya">›</button>' +
    '<div id="lbst" class="lbst" hidden role="status"></div><div id="lbm"></div>' +
    '<div id="lbzc" class="lbzoom"><button type="button" class="lbzm" onclick="lbZ(1/1.4)" aria-label="Perkecil">−</button>' +
    '<button type="button" class="lbzp" onclick="lbReset()" aria-label="Kembalikan zoom"><span id="lbz">100%</span></button>' +
    '<button type="button" class="lbzpl" onclick="lbZ(1.4)" aria-label="Perbesar">＋</button>' +
    '<button type="button" class="lbzr" onclick="lbReset()" aria-label="Reset zoom">' +
    lbIco('rst') +
    '</button></div></div>';
  document.body.append(d);
  const s = d.querySelector('#lbs'),
    P = new Map(),
    rect = () => s.getBoundingClientRect(),
    skip = (e) => e.target.closest('.lbn, .lbzoom, .lbst');
  let dist = 0,
    s0 = null;
  d.addEventListener('click', (e) => {
    if (!e.target.closest('#lbmore, .lbsec')) lbMenu(false);
  });
  s.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = rect();
      lbZ(
        e.deltaY < 0 ? 1.15 : 1 / 1.15,
        e.clientX - r.left - r.width / 2,
        e.clientY - r.top - r.height / 2,
      );
    },
    { passive: false },
  );
  s.addEventListener('pointerdown', (e) => {
    if (skip(e)) return;
    s.setPointerCapture(e.pointerId);
    P.set(e.pointerId, [e.clientX, e.clientY]);
    dist = 0;
    if (P.size === 1) s0 = { x: e.clientX, y: e.clientY, m: 0 };
    else if (s0) s0.m = 99;
  });
  s.addEventListener('pointermove', (e) => {
    if (!P.has(e.pointerId)) return;
    const o = P.get(e.pointerId);
    P.set(e.pointerId, [e.clientX, e.clientY]);
    if (s0) s0.m = Math.max(s0.m, Math.hypot(e.clientX - s0.x, e.clientY - s0.y));
    if (P.size === 2) {
      const [a, b] = [...P.values()],
        n = Math.hypot(a[0] - b[0], a[1] - b[1]),
        r = rect();
      if (dist)
        lbZ(
          n / dist,
          (a[0] + b[0]) / 2 - r.left - r.width / 2,
          (a[1] + b[1]) / 2 - r.top - r.height / 2,
        );
      dist = n;
    } else if (LB.z > 1) {
      LB.x += e.clientX - o[0];
      LB.y += e.clientY - o[1];
      lbApply();
    }
  });
  const up = (e) => {
    if (!P.has(e.pointerId)) return;
    P.delete(e.pointerId);
    dist = 0;
    if (!s0 || P.size) return;
    const dx = e.clientX - s0.x,
      dy = e.clientY - s0.y,
      m = s0.m;
    s0 = null;
    if (e.type !== 'pointerup') return;
    if (m < 6) {
      const r = $lb('lbi').getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        lbClose();
      return;
    }
    if (LB.z === 1) {
      if (Math.abs(dx) > 60 && Math.abs(dy) < 70) lbShow(LB.i + (dx < 0 ? 1 : -1));
      else if (dy > 110 && Math.abs(dx) < 70) lbClose();
    }
  };
  s.addEventListener('pointerup', up);
  s.addEventListener('pointercancel', up);
  s.addEventListener('dblclick', (e) => {
    if (skip(e)) return;
    const r = rect();
    if (LB.z > 1) lbReset();
    else lbZ(2.5, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
  });
  addEventListener('keydown', (e) => {
    if (d.hidden) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowRight') lbShow(LB.i + 1);
    else if (e.key === 'ArrowLeft') lbShow(LB.i - 1);
    else if (e.key === '+' || e.key === '=') lbZ(1.4);
    else if (e.key === '-') lbZ(1 / 1.4);
    else if (e.key === '0') lbReset();
  });
}

/**
 * Buka lightbox pada gambar yang diklik; tampilkan petunjuk gestur sekali saja.
 */
function lb(a) {
  lbInit();
  if (a && a.tagName) LB.opener = a;
  LB.list = window.MSL || [];
  $lb('lb').hidden = false;
  document.body.style.overflow = 'hidden';
  lbShow(+a.dataset.i);
  const m = $lb('lbm');
  if (LB.hint) {
    const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches,
      multi = LB.list.length > 1;
    m.textContent = touch
      ? 'Cubit atau ketuk dua kali untuk zoom · seret untuk menggeser' +
        (multi ? ' · geser kiri/kanan untuk berpindah' : '') +
        ' · geser ke bawah untuk menutup'
      : 'Scroll untuk zoom · seret untuk menggeser' +
        (multi ? ' · ← → untuk berpindah' : '') +
        ' · Esc untuk menutup';
    m.style.opacity = 1;
    setTimeout(() => {
      m.style.opacity = 0;
    }, 5000);
    LB.hint = false;
  } else m.style.opacity = 0;
  $lb('lbc').focus();
  return false;
}

/**
 * Bagikan file gambar lewat Web Share API bila tersedia.
 */
function lbShare() {
  const it = LB.list[LB.i];
  if (it && it.file) navigator.share({ files: [it.file], title: it.n }).catch(() => {});
}

/**
 * Salin gambar ke papan klip (desktop); gambar non-PNG dikonversi lebih dulu.
 */
async function lbCopy() {
  const it = LB.list[LB.i];
  if (!it || !it.file) return;
  try {
    let b = it.file;
    if (b.type !== 'image/png') {
      const bm = await createImageBitmap(b),
        cv = document.createElement('canvas');
      cv.width = bm.width;
      cv.height = bm.height;
      cv.getContext('2d').drawImage(bm, 0, 0);
      b = await new Promise((r) => cv.toBlob(r, 'image/png'));
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]);
    lbNote('Gambar disalin ke papan klip', 3000);
  } catch {
    lbNote('Gambar tidak bisa disalin di peramban ini', 4000);
  }
}

/**
 * Tampilkan catatan singkat di bagian bawah lightbox lalu pudarkan.
 */
function lbNote(x, ms = 9000) {
  const m = $lb('lbm');
  if (!m) return;
  m.textContent = x;
  m.style.opacity = 1;
  setTimeout(() => {
    m.style.opacity = 0;
  }, ms);
}
