# Hasil Pengujian (dijalankan nyata pada lingkungan pembuatan)

Berkas keluaran mentah ada di folder `hasil-pengujian/`.

| Pengujian | Perintah | Hasil |
|---|---|---|
| Backend: unit + integrasi (Jest, Supertest) | `npm --prefix backend run test:coverage` | 6 suite, **59 test lulus**; cakupan pernyataan 93,06%, cabang 81,81%, fungsi 96,29%, baris 96,11% |
| Frontend: unit + komponen (Vitest) | `npm --prefix frontend test` | 4 berkas, **26 test lulus** |
| Build frontend | `npm --prefix frontend run build` | Berhasil (Vite) |
| End-to-end UI -> API -> SQLite (Playwright) | `python e2e/e2e_test.py` | **13/13 langkah lulus** |
| Smoke test API + frontend | `node scripts/smoke.mjs http://localhost:4050` | **9/9 lulus** |

Tidak dijalankan: build Docker, pipeline Jenkins, dan deployment online (alat/akun tidak tersedia).

## Catatan
- Test regresi untuk tiga kesalahan Bab IV gagal 3/3 pada salinan kode awal dan lulus 3/3 pada kode final (lihat Dokumen Bab IV-V).
- Pengujian ditulis dan dijalankan oleh AI yang sama dengan penulis kode, sehingga perlu ditinjau manusia.
