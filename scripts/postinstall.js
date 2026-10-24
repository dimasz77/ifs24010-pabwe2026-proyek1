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
if (!existsSync(vite)) {
  console.error('[postinstall] vite tidak ditemukan, build frontend gagal');
  process.exit(1);
}
const result = spawnSync(process.execPath, [vite, 'build'], { cwd: root, stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
