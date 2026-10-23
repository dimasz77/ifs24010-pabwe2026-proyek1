# Panduan Jenkins (Hasil Pengujian Deployment)

`Jenkinsfile` di root repository menjalankan: Checkout -> Install -> Test (Jest + Vitest paralel) -> Build frontend -> Build image Docker -> Smoke test container -> Deploy (opsional, parameter `DEPLOY`). Pipeline otomatis **gagal** bila test/build/smoke test gagal.

> Status: Jenkinsfile **belum dijalankan** (tidak ada Jenkins/Docker di lingkungan pembuatan). Bukti pipeline harus Anda ambil dari Jenkins Anda sendiri.

## 1. Menjalankan Jenkins lokal (Docker)
```bash
docker run -d --name jenkins -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts-jdk17
docker logs jenkins        # ambil initial admin password, buka http://localhost:8080
```
Agar pipeline dapat memanggil `docker`, `node`, `curl` di dalam Jenkins, gunakan image Jenkins kustom yang memuat Docker CLI, atau pasang Jenkins langsung di mesin/VM Linux (apt) beserta Docker. Pada Windows, gunakan WSL2/Docker Desktop.

## 2. Plugin dan tools
- Plugin: *Pipeline*, *Git*, *NodeJS*, *Credentials Binding*, *Timestamper*, (opsional) *SSH Agent*, *GitHub*.
- Manage Jenkins -> Tools -> **NodeJS installations**: tambah dengan nama persis `node22` (versi 22.x), centang *Install automatically*.

## 3. Credentials (hanya bila memakai tahap Deploy)
Manage Jenkins -> Credentials -> tambah:
- `deploy-ssh-key` (SSH Username with private key) untuk server tujuan.
- `deploy-host` (Secret text) berisi IP/hostname server.
Jangan menaruh kunci/sandi di repository.

## 4. Membuat job
New Item -> *Pipeline* -> Pipeline script from SCM -> Git -> URL repository GitHub -> Branch `*/main` -> Script Path `Jenkinsfile` -> Save.
Untuk repository privat, tambahkan credential GitHub (token).

## 5. Menjalankan dan bukti yang didokumentasikan
1. *Build with Parameters* (biarkan `DEPLOY` tidak dicentang untuk uji tanpa deploy; centang bila server sudah siap).
2. Tangkap layar: **Stage View** (semua hijau), **Console Output** bagian akhir (`Finished: SUCCESS`, hasil Jest/Vitest, smoke test), dan tab *Artifacts* (`smoke-result.txt`).
3. Jika ingin menunjukkan pipeline *gagal saat test gagal*: ubah satu `expect` di test, push, jalankan, tangkap layar merah, lalu kembalikan.
4. Cantumkan tangkapan layar pada dokumen proyek dan lampirkan tautan build.

## 6. Masalah umum
| Gejala | Solusi |
|---|---|
| `docker: command not found` | Agent Jenkins belum punya Docker CLI / akses socket |
| Tool `node22` tidak ditemukan | Nama tool di Jenkinsfile harus sama dengan konfigurasi NodeJS |
| `better-sqlite3` gagal build di agent | Pasang `python3 make g++` pada agent |
| Port 4099 dipakai | Ubah `SMOKE_PORT` di Jenkinsfile |
