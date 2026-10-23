# Jenika Rental - Rental Motor Samosir

Aplikasi web untuk mengelola usaha **rental sepeda motor di kawasan Samosir** (Tomok, Tuktuk Siadong, Ambarita, Pangururan, Simanindo): armada motor, data pelanggan, pemesanan, pengembalian, denda keterlambatan, dan ringkasan harian.

Proyek 1 mata kuliah Pengembangan Aplikasi Berbasis Web (PABWE), Institut Teknologi Del, TA 2026/2027.
Penulis: Dimas Rexan Samuel Sidabutar (11S24010), Sarjana Informatika.

## 1. Fitur utama
- **Beranda**: kondisi armada (tersedia/disewa/perawatan), motor terlambat, jadwal pengembalian, pendapatan bulan berjalan, komposisi tipe motor.
- **Armada motor**: CRUD, pencarian, filter tipe/lokasi/status, urutan harga, dan filter *ketersediaan pada rentang tanggal*.
- **Pelanggan**: CRUD, pencarian, nomor telepon dinormalisasi agar tidak duplikat.
- **Penyewaan**: pesanan -> mulai -> pengembalian, pembatalan, ubah pesanan, hapus; deteksi bentrok jadwal; kalkulasi biaya langsung (diskon 10% mulai 7 hari, 15% mulai 14 hari); denda keterlambatan otomatis (tarif harian x hari terlambat x 1,5, dapat diatur lewat `LATE_FEE_MULTIPLIER`); durasi maksimal 90 hari.
- **Registrasi dan login** (kata sandi di-hash scrypt, token JWT); seluruh API data wajib login; registrasi dapat ditutup lewat `ALLOW_REGISTRATION=false`.
- Validasi di frontend dan backend, notifikasi, konfirmasi hapus, *loading/empty/error state*, banner saat backend mati, tampilan responsif (laptop dan ponsel).

## 2. Teknologi
| Lapisan | Teknologi |
|---|---|
| Backend | Node.js 22, **Express.js 5**, REST API JSON |
| Database | **SQLite** via `better-sqlite3` (file persisten, query berparameter) |
| Frontend | **React 19** + Vite + React Router (referensi: Modul praktikum 4) |
| Pengujian | Jest + Supertest (backend), Vitest + Testing Library (frontend), Playwright (E2E) |
| CI/CD | Jenkins (`Jenkinsfile`), Docker |

Alasan memilih React: ekosistem luas, cocok dengan modul praktikum, dan komponen form/tabel yang banyak dapat dipakai ulang dengan sederhana.

## 3. Arsitektur
```
Browser (React SPA)  --HTTP/JSON-->  Express.js (/api/*)  -->  models (SQL berparameter)  -->  SQLite (file)
                                      |-- routes -> controllers -> services (aturan bisnis sewa)
                                      |-- validators, middleware error handler
Produksi: Express juga menyajikan hasil build frontend (SERVE_FRONTEND=true) sehingga satu layanan, tanpa CORS.
```
Struktur direktori:
```
backend/   src/{routes,controllers,services,models,validators,middleware,utils,db}  tests/  scripts/init-db.js
frontend/  src/{pages,components,lib}  tests/
e2e/       e2e_test.py (Playwright)      scripts/smoke.mjs      docs/
Dockerfile  docker-compose.yml  Jenkinsfile  fly.toml
```

## 4. Persyaratan
Node.js >= 20 (diuji pada 22), npm >= 10, Git. Opsional: Docker, Python 3 + Playwright (untuk E2E).

## 5. Clone dan instalasi
```bash
git clone <URL-REPOSITORY-ANDA>
cd rental-motor-samosir
npm run install:all          # atau: npm --prefix backend ci && npm --prefix frontend ci
```

## 6. Konfigurasi environment
```bash
cp backend/.env.example backend/.env       # Windows: copy backend\.env.example backend\.env
cp frontend/.env.example frontend/.env     # opsional
```
| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | 4000 | Port API |
| `DB_PATH` | ./data/rental.db | Lokasi file SQLite |
| `CORS_ORIGINS` | http://localhost:5173 | Origin frontend yang diizinkan |
| `SERVE_FRONTEND` | false | `true` agar Express menyajikan `frontend/dist` |
| `AUTO_SEED` | false | `true` = isi data contoh bila tabel kosong (tidak menggandakan). Default: database kosong |
| `JWT_SECRET` | (dev) | Kunci token login. **Wajib** diisi pada produksi (min. 32 karakter acak) |
| `TOKEN_TTL_HOURS` | 168 | Masa berlaku token login |
| `ALLOW_REGISTRATION` | true | `false` = tutup pendaftaran akun baru |
| `LATE_FEE_MULTIPLIER` | 1.5 | Pengali denda keterlambatan |
| `VITE_API_URL` (frontend) | kosong | Isi hanya bila frontend dan backend beda domain |

## 7. Inisialisasi database SQLite
Tabel dibuat otomatis saat server start. Cara manual:
```bash
npm --prefix backend run db:init     # buat tabel
npm --prefix backend run db:seed     # buat tabel + data contoh (aman diulang)
npm --prefix backend run db:clean    # hapus file DB, buat ulang dalam keadaan KOSONG
npm --prefix backend run db:reset    # hapus file DB, buat ulang, isi data contoh
```

## 8. Menjalankan (mode pengembangan)
Terminal 1: `npm run dev:backend` (http://localhost:4000)
Terminal 2: `npm run dev:frontend` (http://localhost:5173, `/api` di-proxy ke backend)

## 9. Pengujian
```bash
npm test                                   # backend (Jest, 59 test) + frontend (Vitest, 26 test)
npm --prefix backend run test:coverage     # dengan cakupan kode
# E2E (UI -> API -> SQLite), butuh: pip install playwright && playwright install chromium
npm run build && python e2e/e2e_test.py
# Smoke test pada server yang berjalan
node scripts/smoke.mjs http://localhost:4000
```

## 10. Build dan menjalankan untuk produksi
```bash
npm run build
SERVE_FRONTEND=true npm --prefix backend start      # Windows PowerShell: $env:SERVE_FRONTEND="true"; npm --prefix backend start
# buka http://localhost:4000
```
Atau dengan Docker: `docker compose up -d --build` (data SQLite disimpan di volume `rental_data`).

## 11. API
Semua respons: `{ "success": true, "data": ..., "meta": ... }` atau `{ "success": false, "error": { "code", "message", "details?" } }`.

| Metode | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | Status API dan database (503 bila DB bermasalah); publik |
| POST | `/api/auth/register` | `{name,email,password}` -> 201 `{user,token}` (403 bila registrasi ditutup, 409 email terdaftar) |
| POST | `/api/auth/login` | `{email,password}` -> `{user,token}` (401 bila salah) |
| GET | `/api/auth/me` | Profil pengguna dari token |

Semua endpoint di bawah wajib header `Authorization: Bearer <token>` (401 bila tidak ada/tidak valid).

| GET | `/api/dashboard/summary` | Ringkasan beranda |
| GET | `/api/locations` | Lokasi jemput |
| GET/POST | `/api/motorcycles` | Daftar (`q,type,status,location_id,sort,available_from,available_to,page,limit`) / tambah |
| GET/PUT/DELETE | `/api/motorcycles/:id` | Detail / ubah / hapus (409 bila punya riwayat sewa) |
| GET/POST | `/api/customers` | Daftar (`q,page,limit`) / tambah |
| GET/PUT/DELETE | `/api/customers/:id` | Detail + riwayat / ubah / hapus |
| GET/POST | `/api/rentals` | Daftar (`status,q,overdue,motorcycle_id,customer_id,page,limit`) / buat |
| GET | `/api/rentals/quote` | Hitung biaya (`motorcycle_id,start_date,end_date`) |
| GET/PUT/DELETE | `/api/rentals/:id` | Detail / ubah (hanya status dipesan) / hapus |
| PATCH | `/api/rentals/:id/status` | `{"action":"start"\|"return"\|"cancel","returned_date?"}` |

Kode status: 200, 201, 400 (ID/JSON salah), 404, 409 (duplikat/bentrok/status tidak valid), 422 (validasi), 500, 503.

Contoh (respons nyata dari aplikasi):
```bash
curl -X POST http://localhost:4000/api/motorcycles -H "Content-Type: application/json" \
  -d '{"plate":"BB 4001 XA","brand":"Honda","model":"Beat","type":"matic","engine_cc":110,"year":2024,"color":"Putih","price_per_day":80000,"location_id":1}'
# 201 {"success":true,"data":{"id":16,"plate":"BB 4001 XA","brand":"Honda","model":"Beat","type":"matic","engine_cc":110,"year":2024,"color":"Putih","price_per_day":80000,"status":"tersedia","location_id":1,"location_name":"Dermaga Tomok","rented_now":false,...}}

curl -X POST http://localhost:4000/api/motorcycles -H "Content-Type: application/json" -d '{"plate":"x"}'
# 422 {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Data yang dikirim tidak valid","details":{"plate":"Plat nomor minimal 4 karakter","brand":"Merek wajib diisi",...}}}

curl "http://localhost:4000/api/rentals/quote?motorcycle_id=1&start_date=2026-11-01&end_date=2026-11-08"
# 200 {"success":true,"data":{"days":7,"price_per_day":80000,"subtotal":560000,"discount_percent":10,"discount_amount":56000,"total_price":504000,...}}
```

## 12. Deployment
Lihat [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (hosting dengan volume persisten) dan [docs/JENKINS.md](docs/JENKINS.md) (pipeline).

## 13. Troubleshooting
| Gejala | Penyebab / solusi |
|---|---|
| `better-sqlite3` gagal terpasang / error `node-gyp` | Proyek memakai binary prebuilt (`backend/.npmrc` berisi `ignore-scripts=true`). Pastikan file itu ada dan Node 20/22 LTS. Bila tetap gagal: `npm --prefix backend ci --ignore-scripts` |
| `EADDRINUSE` port 4000 | Ubah `PORT` di `backend/.env` (dan `VITE_PROXY_TARGET` di frontend) |
| Frontend menampilkan "Server tidak dapat dihubungi" | Backend belum jalan / port berbeda; cek `curl localhost:4000/api/health` |
| Error CORS di browser | Tambahkan origin frontend ke `CORS_ORIGINS`, atau gunakan proxy Vite / `SERVE_FRONTEND=true` |
| Data hilang setelah redeploy | Database berada di filesystem sementara; pasang volume dan arahkan `DB_PATH` ke sana |
| Ingin mengosongkan data | `npm --prefix backend run db:reset` |
| Layar putih setelah deploy | Jalankan `npm run build` dan pastikan `SERVE_FRONTEND=true` serta `FRONTEND_DIST` benar |

## Catatan keterbatasan
Aplikasi memiliki login, tetapi semua akun yang terdaftar melihat data yang sama (tidak ada peran/multi-usaha) dan belum ada pembatasan percobaan login. Untuk penggunaan nyata: set `JWT_SECRET` yang kuat, pakai HTTPS, dan setelah akun pemilik dibuat set `ALLOW_REGISTRATION=false`. Seluruh data contoh bersifat fiktif.
