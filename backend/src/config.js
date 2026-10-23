const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diisi pada NODE_ENV=production');
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || './data/rental.db'),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  serveFrontend: bool(process.env.SERVE_FRONTEND),
  frontendDist: process.env.FRONTEND_DIST
    ? path.resolve(process.env.FRONTEND_DIST)
    : path.resolve(__dirname, '..', '..', 'frontend', 'dist'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-ganti-di-produksi',
  tokenTtlSeconds: (Number(process.env.TOKEN_TTL_HOURS) || 168) * 3600,
  allowRegistration: bool(process.env.ALLOW_REGISTRATION, true),
  autoSeed: bool(process.env.AUTO_SEED, false),
  lateFeeMultiplier: Number(process.env.LATE_FEE_MULTIPLIER) || 1.5,
};
