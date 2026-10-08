// Memeriksa sintaks semua file JS di js/ (tanpa menjalankannya).
// Pakai: npm run check
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

let gagal = 0;
for (const f of walk(path.join(__dirname, '..', 'js'))) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    gagal++;
    console.error('Sintaks salah:', f, '\n' + e.stderr);
  }
}
console.log(gagal ? `${gagal} file bermasalah` : 'Semua file JS valid');
process.exit(gagal ? 1 : 0);
