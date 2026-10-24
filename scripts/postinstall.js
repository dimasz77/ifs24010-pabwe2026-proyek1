// Dijalankan otomatis setelah `bun install` / `npm install` di root.
// Dependency backend + frontend sudah terpasang oleh workspaces; di sini hanya membangun frontend
// (frontend/dist) supaya bisa disajikan Express. Tidak membutuhkan npm: vite dijalankan lewat
// runtime yang sedang dipakai (node atau bun).
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Pipeline CI (Jenkins) tidak memerlukan hasil build; dilewati agar install cepat dan stabil.
if (process.env.JENKINS_URL || process.env.CI) {
  console.log('[postinstall] CI terdeteksi, build frontend dilewati');
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const vite = [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js'),
].find((p) => fs.existsSync(p));

if (!vite) {
  console.error('[postinstall] vite tidak ditemukan, build frontend gagal');
  process.exit(1);
}

const result = spawnSync(process.execPath, [vite, 'build'], { cwd: frontend, stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);