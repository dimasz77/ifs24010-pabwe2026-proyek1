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
npm run preview           # http://localhost:4173
```
`dist/` dapat dihosting di server statis mana pun, **dengan fallback ke `index.html`** untuk semua rute (SPA). Contoh dengan Docker (nginx):
```bash
VITE_API_URL=https://api.contoh.app docker compose up -d --build   # http://localhost:8080
```

## Troubleshooting
| Gejala | Solusi |
|---|---|
| "Server tidak dapat dihubungi" | Backend belum jalan / `VITE_PROXY_TARGET` salah; cek `curl localhost:4000/api/health` |
| Error CORS setelah deploy | Tambahkan origin frontend ke `CORS_ORIGINS` di backend |
| Request ke `/api` gagal setelah deploy, padahal backend hidup | `VITE_API_URL` kosong saat build; isi lalu build ulang (nilainya di-embed saat build) |
| 404 saat refresh halaman di hosting | Aktifkan fallback SPA ke `index.html` |
