// Entry point produksi lintas-platform: menyajikan frontend hasil build + API dari satu proses Express.
// Dipakai oleh `npm start` di root repository (cocok untuk platform hosting berbasis template Node.js).
process.env.SERVE_FRONTEND = process.env.SERVE_FRONTEND || 'true';
require('../backend/src/server.js');
