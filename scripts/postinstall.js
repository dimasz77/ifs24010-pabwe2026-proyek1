// Postinstall lintas-platform: pasang dependency backend/frontend lalu build frontend.
// Dilewati bila npm tidak tersedia (mis. image oven/bun di Jenkins yang hanya punya bun).
const { spawnSync } = require('node:child_process');

const run = (cmd) => spawnSync(cmd, { stdio: 'inherit', shell: true });

if (run('npm --version >' + (process.platform === 'win32' ? 'NUL' : '/dev/null') + ' 2>&1').status !== 0) {
  console.log('npm tidak tersedia, postinstall dilewati');
  process.exit(0);
}

const steps = [
  'npm --prefix backend install --ignore-scripts',
  'npm --prefix frontend install --include=dev',
  'npm --prefix frontend run build',
];

for (const step of steps) {
  const result = run(step);
  if (result.status !== 0) process.exit(result.status || 1);
}