// Dijalankan otomatis setelah `npm install` / `bun install`: membangun frontend (dist/) agar bisa disajikan `npm start`.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Pipeline CI (Jenkins) tidak memerlukan hasil build; dilewati agar install cepat dan stabil.
if (process.env.JENKINS_URL || process.env.CI) {
  console.log('[postinstall] CI terdeteksi, build frontend dilewati');
  process.exit(0);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
// Kegagalan build tidak boleh menggagalkan install; `npm start` akan mencoba membangun lagi dan melaporkan masalahnya.
if (!existsSync(vite)) {
  console.warn('[postinstall] vite tidak ditemukan, build dilewati (akan dicoba ulang saat npm start)');
  process.exit(0);
}
const result = spawnSync(process.execPath, [vite, 'build'], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) console.warn('[postinstall] build frontend gagal (akan dicoba ulang saat npm start)');
process.exit(0);
