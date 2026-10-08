/**
 * manuscripts.js — Panel naskah kuno (manuscripts) dari koleksi pihak ketiga via Sefaria.
 * Proyek: Pustaka Torah (https://github.com/USERNAME/pustaka-torah)
 */

/**
 * Panel naskah kuno untuk suatu ref: grid thumbnail (maks. 30) yang membuka lightbox.
 */
async function ms(r) {
  const p = document.getElementById('panel');
  p.hidden = false;
  const head = `<button class="x" onclick="this.parentNode.hidden=true">Tutup</button><h3>Naskah kuno · ${esc(r)}</h3>`;
  p.innerHTML = head + '<p class="muted">Memuat…</p>';
  try {
    const d = await api('/manuscripts/' + enc(r)),
      L = (Array.isArray(d) ? d : (d && d.manuscripts) || []).filter(
        (x) => x.image_url || x.thumbnail_url,
      );
    window.MSL = L.slice(0, 30).map((x) => {
      const m = x.manuscript || {};
      return {
        u: x.image_url || x.thumbnail_url,
        n:
          (m.title || m.he_title || x.manuscript_slug || 'Naskah') +
          (x.page_id ? ' · ' + x.page_id : ''),
      };
    });
    p.innerHTML =
      head +
      (L.length
        ? `<div class="ms">${L.slice(0, 30)
            .map((x, k) => {
              const m = x.manuscript || {},
                n = m.title || m.he_title || x.manuscript_slug || 'Naskah';
              return `<figure style="margin:0"><a href="${esc(x.image_url || x.thumbnail_url)}" data-i="${k}" onclick="return lb(this)"><img loading="lazy" src="${esc(x.thumbnail_url || x.image_url)}" alt="${esc(n)}"></a><figcaption class="attr">${esc(n)}${x.page_id ? ' · ' + esc(x.page_id) : ''}${m.license ? ' · ' + esc(m.license) : ''}</figcaption></figure>`;
            })
            .join(
              '',
            )}</div><p class="attr">Ketuk gambar untuk memperbesar. Gambar berasal dari koleksi pihak ketiga melalui Sefaria. Periksa sumber dan lisensi pada tiap naskah.</p>`
        : '<p class="muted">Belum ada naskah kuno untuk bagian ini. Tidak semua bagian punya naskah.</p>');
  } catch (e) {
    p.innerHTML = head + `<p class="muted">Data naskah tidak bisa dimuat (${esc(e.message)}).</p>`;
  }
}
