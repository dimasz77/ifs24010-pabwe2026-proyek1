// Entry point produksi lintas-platform: menyajikan frontend hasil build + API dari satu proses Express.
// Dipakai oleh `npm start` di root repository (cocok untuk platform hosting berbasis template Node.js).
// Tanpa file .env pun aplikasi berjalan: mode produksi, frontend disajikan, dan JWT_SECRET dibuat otomatis.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.SERVE_FRONTEND = process.env.SERVE_FRONTEND || 'true';
require('../backend/src/server.js');
