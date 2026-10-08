/**
 * lightbox.js — Penampil gambar layar penuh (zoom, geser, swipe, keyboard).
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * State lightbox: daftar gambar, indeks, zoom, posisi geser, dan elemen pembuka.
 */
let LB = { list: [], i: 0, z: 1, x: 0, y: 0, opener: null, hint: true };

/**
 * Singkatan getElementById untuk elemen lightbox.
 */
const $lb = (id) => document.getElementById(id);

/**
 * Terapkan zoom/geser ke gambar dan perbarui persentase zoom.
 */
function lbApply() {
  $lb('lbi').style.transform = `translate(${LB.x}px,${LB.y}px) scale(${LB.z})`;
  $lb('lbz').textContent = Math.round(LB.z * 100) + '%';
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
 * Tampilkan gambar ke-i (berputar), prefetch tetangganya, dan atur tombol terkait.
 */
function lbShow(i) {
  const n = LB.list.length;
  if (!n) return;
  LB.i = (i + n) % n;
  const it = LB.list[LB.i],
    im = $lb('lbi'),
    tt = $lb('lbt');
  lbReset();
  document.querySelectorAll('#lb .lbn').forEach((b) => (b.hidden = n < 2));
  tt.textContent = it.n + (n > 1 ? ' (' + (LB.i + 1) + '/' + n + ')' : '');
  im.style.opacity = 0.25;
  im.onload = () => {
    im.style.opacity = 1;
  };
  im.onerror = () => {
    im.style.opacity = 1;
    tt.textContent += ' · gambar gagal dimuat';
  };
  im.src = it.u;
  im.alt = it.n;
  $lb('lbo').href = it.u;
  lbBtns(it);
  if (n > 1)
    [LB.i - 1, LB.i + 1].forEach((j) => {
      new Image().src = LB.list[(j + n) % n].u;
    });
}

/**
 * Tampilkan/sembunyikan tombol Buat sendiri, Unduh, dan Bagikan sesuai kemampuan item & peramban.
 */
function lbBtns(it) {
  $lb('lbg').hidden = !it.regen;
  $lb('lbd').hidden = !it.dl;
  if (it.dl) {
    $lb('lbd').href = it.du || it.u;
    $lb('lbd').download = it.fn || 'gambar.png';
  }
  $lb('lbsh').hidden = !(
    it.dl &&
    it.file &&
    navigator.canShare &&
    navigator.canShare({ files: [it.file] })
  );
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
 * Tutup lightbox, pulihkan scroll, dan kembalikan fokus ke pemicu (aksesibilitas).
 */
function lbClose() {
  $lb('lb').hidden = true;
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
  d.setAttribute('aria-label', 'Penampil naskah');
  d.innerHTML =
    '<div class="lbbar"><span id="lbt" style="flex:1;min-width:140px"></span><button onclick="lbZ(1/1.4)" aria-label="Perkecil">−</button><span id="lbz" style="min-width:44px;text-align:center">100%</span><button onclick="lbZ(1.4)" aria-label="Perbesar">＋</button><button onclick="lbReset()">Reset</button><button id="lbg" hidden onclick="lbRegen()">Gambar kosong? Buat sendiri</button><a id="lbd" class="btn" hidden>Unduh</a><button id="lbsh" hidden onclick="lbShare()">Bagikan</button><a id="lbo" class="btn" target="_blank" rel="noopener">Buka gambar asli</a><button id="lbc" onclick="lbClose()">Tutup</button></div><div id="lbs"><button class="lbn lbp" onclick="lbShow(LB.i-1)" aria-label="Naskah sebelumnya">‹</button><img id="lbi" alt=""><button class="lbn lbx" onclick="lbShow(LB.i+1)" aria-label="Naskah berikutnya">›</button><div id="lbm"></div></div>';
  document.body.append(d);
  const s = d.querySelector('#lbs'),
    P = new Map(),
    rect = () => s.getBoundingClientRect();
  let dist = 0,
    s0 = null;
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
    if (e.target.closest('.lbn')) return;
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
    if (e.target.closest('.lbn')) return;
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
  LB.opener = a;
  LB.list = window.MSL || [];
  $lb('lb').hidden = false;
  document.body.style.overflow = 'hidden';
  lbShow(+a.dataset.i);
  const m = $lb('lbm');
  if (LB.hint) {
    m.textContent =
      'Scroll atau cubit untuk zoom · seret untuk menggeser · geser kiri/kanan untuk berpindah · ketuk area gelap untuk menutup';
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
 * Tampilkan catatan singkat di bagian bawah lightbox lalu pudarkan.
 */
function lbNote(x) {
  const m = $lb('lbm');
  if (!m) return;
  m.textContent = x;
  m.style.opacity = 1;
  setTimeout(() => {
    m.style.opacity = 0;
  }, 9000);
}
