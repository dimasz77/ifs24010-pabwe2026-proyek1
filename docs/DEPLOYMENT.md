# Panduan Deployment dan URL Online

Syarat proyek: aplikasi harus dapat diakses online. Karena database adalah **SQLite (file)**, hosting harus menyediakan **penyimpanan persisten (volume/disk)**. Platform dengan filesystem sementara akan menghapus data setiap restart/redeploy.

> Harga, kuota gratis, dan fitur platform sering berubah. Periksa halaman resmi masing-masing sebelum memilih. Seluruh langkah di bawah **belum saya uji di akun hosting** (saya tidak memiliki akses akun Anda).

## Opsi A (disarankan): VPS + Docker
Cocok bila Anda punya server Linux (VPS) dengan Docker. Satu container melayani frontend + API, data di volume.
1. Pasang Docker di server: https://docs.docker.com/engine/install/
2. Salin proyek ke server (`git clone`), lalu:
   ```bash
   docker compose up -d --build
   curl http://localhost:4000/api/health
   ```
3. (Opsional) pasang reverse proxy + HTTPS (Caddy/Nginx). Contoh Caddy: `app.contoh.id { reverse_proxy localhost:4000 }`.
4. Buka `http://IP-SERVER:4000` (atau domain Anda). Ini URL yang dikumpulkan.
5. Pastikan data persisten: `docker compose restart` lalu cek data masih ada; volume `rental_data` tidak ikut terhapus saat `docker compose down` (tanpa `-v`).

Pengaturan: build via `Dockerfile`; start command `node src/server.js`; env `PORT=4000`, `DB_PATH=/data/rental.db`, `SERVE_FRONTEND=true`; volume dipasang di `/data`.

## Opsi B: Fly.io (volume persisten)
`fly.toml` sudah disiapkan (belum diuji). Perlu akun Fly.io dan flyctl; layanan ini dapat berbayar.
```bash
fly auth login
fly launch --no-deploy --copy-config      # ganti nama app bila perlu
fly volumes create rental_data --size 1 --region sin
fly deploy
fly status && curl https://<nama-app>.fly.dev/api/health
```
Catatan: dengan satu volume, jalankan **satu mesin saja** (volume tidak dibagi antar mesin).

## Opsi C: Railway / Render dengan volume
Buat service dari repository GitHub (otomatis memakai `Dockerfile`), tambahkan **Volume** dengan mount path `/data`, set env `DB_PATH=/data/rental.db`, `SERVE_FRONTEND=true`, `PORT` sesuai platform. Pada Render, disk persisten umumnya hanya tersedia pada paket berbayar; periksa dahulu.

## Frontend dan backend di-host terpisah (tidak disarankan)
Set `VITE_API_URL=https://api-anda` saat build frontend dan `CORS_ORIGINS=https://frontend-anda` pada backend.

## Verifikasi setelah deploy
```bash
node scripts/smoke.mjs https://URL-ANDA
```
Simpan tangkapan layar hasilnya + URL untuk dokumen proyek.
