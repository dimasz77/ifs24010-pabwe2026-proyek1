# Jenika Rental - Frontend (React)

Antarmuka web aplikasi **rental sepeda motor di kawasan Samosir**: beranda/ringkasan, armada motor, pelanggan, penyewaan (pesan -> mulai -> kembali), registrasi dan login. Repository ini hanya berisi **frontend**; API ada di repository terpisah: `ifs24010-pabwe2026-proyek1-backend`.

Proyek 1 PABWE, Institut Teknologi Del, TA 2026/2027. Penulis: Dimas Rexan Samuel Sidabutar (11S24010).

## Teknologi
React 19, Vite, React Router 7, Vitest + Testing Library, Playwright (E2E).

## Struktur
```
src/{pages,components,context,lib}   tests/   e2e/e2e_test.py   public/
```

## Menjalankan (pengembangan)
Jalankan backend lebih dulu (lihat README repository backend, default http://localhost:4000), lalu:
```bash
npm ci
cp .env.example .env          # opsional
npm run dev                   # http://localhost:5173  (/api di-proxy ke VITE_PROXY_TARGET)
```

## Konfigurasi (`.env`)
| Variabel | Keterangan |
|---|---|
| `VITE_API_URL` | URL backend, dipakai **saat build**. Kosongkan untuk dev (pakai proxy Vite). Isi bila frontend dan backend beda domain, mis. `https://api.contoh.app` |
| `VITE_PROXY_TARGET` | Target proxy dev/preview Vite. Default `http://localhost:4000` |

Jika `VITE_API_URL` diisi, backend harus mengizinkan origin frontend lewat `CORS_ORIGINS`.

## Pengujian
```bash
npm test                  # Vitest (13 berkas, 123 test)
npm run test:coverage     # dengan cakupan (coverage/lcov.info untuk SonarQube)
```
E2E (UI -> API -> SQLite) membutuhkan repository backend dan Chromium:
```bash
pip install playwright && playwright install chromium
npm run build
BACKEND_DIR=../ifs24010-pabwe2026-proyek1-backend python e2e/e2e_test.py
```

## Build dan deploy
```bash
npm run build             # hasil di dist/ (statis)
npm start                   # sajikan dist/ + teruskan /api ke backend (lihat di bawah)
```
`npm install` otomatis menjalankan build (lewat `postinstall`, dilewati bila `CI` terdeteksi), lalu `npm start` menyajikan `dist/` dengan fallback SPA. Server ini tanpa dependency tambahan, mengompresi aset teks dengan gzip, dan **meneruskan `/api/*` ke backend** sehingga browser hanya berbicara ke satu origin (tanpa CORS). Halaman-halaman dimuat per rute agar JavaScript yang tidak dipakai tidak ikut diunduh pada awal kunjungan.
Build produksi juga menghasilkan source map untuk audit/debugging; `public/robots.txt` menyediakan aturan crawler yang valid.

| Variabel (runtime) | Keterangan |
|---|---|
| `API_URL` | Alamat backend yang di-deploy, mis. `https://api.contoh.app`. **Wajib** agar login/data berfungsi |
| `PORT` | Port server (default 4000) |

Alternatif: isi `VITE_API_URL` saat build agar browser memanggil backend langsung (backend harus mengizinkan origin ini di `CORS_ORIGINS`).

Docker (nginx, tanpa `npm start`): `VITE_API_URL=https://api.contoh.app docker compose up -d --build` -> http://localhost:8080.

## Troubleshooting
| Gejala | Solusi |
|---|---|
| "Server tidak dapat dihubungi" | Dev: backend belum jalan / `VITE_PROXY_TARGET` salah. Produksi: `API_URL` belum diatur atau backend belum di-deploy |
| 502 Bad Gateway dari nginx | Tidak ada proses yang berjalan. Pastikan `npm start` ada dan `npm install` selesai (build `dist/`) |
| Error CORS setelah deploy | Tambahkan origin frontend ke `CORS_ORIGINS` di backend |
| Request ke `/api` gagal setelah deploy, padahal backend hidup | `VITE_API_URL` kosong saat build; isi lalu build ulang (nilainya di-embed saat build) |
| 404 saat refresh halaman di hosting | Aktifkan fallback SPA ke `index.html` |
