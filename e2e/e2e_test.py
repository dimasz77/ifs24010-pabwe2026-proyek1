"""Uji integrasi end-to-end (UI -> Express -> SQLite) menggunakan Playwright.

Prasyarat: pip install playwright && playwright install chromium
           repository backend sudah di-clone dan `npm ci` sudah dijalankan di sana
Jalankan : BACKEND_DIR=../ifs24010-pabwe2026-proyek1-backend python e2e/e2e_test.py   (dari root repo frontend)
Skrip menjalankan backend (port 4020, database sementara) dan `vite preview` frontend hasil build
(port 4021, /api di-proxy ke backend). Jalankan `npm run build` lebih dulu.
"""
import os, re, signal, subprocess, sys, tempfile, time, urllib.request
from datetime import date, timedelta
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 4020            # backend
FRONT_PORT = 4021      # frontend (vite preview)
API = f'http://localhost:{PORT}'
BASE = f'http://localhost:{FRONT_PORT}'
BACKEND_DIR = os.path.abspath(os.environ.get('BACKEND_DIR', os.path.join(ROOT, '..', 'ifs24010-pabwe2026-proyek1-backend')))
DB = os.path.join(tempfile.mkdtemp(), 'e2e.db')
SHOTS = os.environ.get('SHOTS_DIR', '')
results = []


def start_server():
    env = {**os.environ, 'PORT': str(PORT), 'DB_PATH': DB, 'NODE_ENV': 'test', 'AUTO_SEED': 'true', 'CORS_ORIGINS': BASE}
    proc = subprocess.Popen(['node', 'src/server.js'], cwd=BACKEND_DIR, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        try:
            urllib.request.urlopen(f'{API}/api/health', timeout=1); return proc
        except Exception:
            time.sleep(0.25)
    raise RuntimeError('server tidak start')


def start_frontend():
    env = {**os.environ, 'VITE_PROXY_TARGET': API}
    vite = os.path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
    proc = subprocess.Popen(['node', vite, 'preview', '--port', str(FRONT_PORT), '--strictPort'], cwd=ROOT, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        try:
            urllib.request.urlopen(BASE + '/', timeout=1); return proc
        except Exception:
            time.sleep(0.25)
    raise RuntimeError('frontend preview tidak start')


def step(name):
    def deco(fn):
        try:
            fn(); results.append((name, True, '')); print(f'PASS  {name}')
        except Exception as e:  # noqa
            results.append((name, False, str(e).splitlines()[0])); print(f'FAIL  {name}: {str(e).splitlines()[0]}')
        return fn
    return deco


def pick(label, text):
    return page.get_by_label(label, exact=True).locator('option', has_text=text).first.get_attribute('value')


def shot(page, name):
    if SHOTS:
        page.screenshot(path=os.path.join(SHOTS, f'{name}.png'), full_page=True)


server = start_server()
front = start_frontend()
today = date.today()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1366, 'height': 900})
        globals()['page'] = page
        page.set_default_timeout(8000)

        @step('0a. Halaman terproteksi mengarahkan ke /masuk saat belum login')
        def _():
            page.goto(BASE + '/motor')
            expect(page).to_have_url(re.compile(r'/auth/login$'))
            expect(page.get_by_role('heading', name='Masuk')).to_be_visible()

        @step('0a2. Selector penguji otomatis di /auth/login: #username, #password, #btn-submit')
        def _():
            page.goto(BASE + '/auth/login')
            expect(page.locator('#username')).to_be_visible()
            expect(page.locator('#password')).to_be_visible()
            expect(page.locator('#btn-submit')).to_be_visible()
            page.goto(BASE + '/masuk')
            expect(page).to_have_url(re.compile(r'/auth/login$'))

        @step('0b. Registrasi lewat UI: validasi sandi tidak sama, lalu berhasil dan masuk ke beranda')
        def _():
            page.goto(BASE + '/auth/register')
            page.get_by_label('Nama lengkap').fill('Dimas Tester')
            page.get_by_label('Username', exact=True).fill('dimas_tester')
            page.get_by_label('Kata sandi', exact=True).fill('rahasia123')
            page.get_by_label('Ulangi kata sandi').fill('beda12345')
            page.get_by_role('button', name='Daftar').click()
            expect(page.get_by_text('Konfirmasi kata sandi tidak sama')).to_be_visible()
            page.get_by_label('Ulangi kata sandi').fill('rahasia123')
            page.get_by_role('button', name='Daftar').click()
            expect(page.get_by_role('heading', name='Horas! Ringkasan hari ini')).to_be_visible()
            expect(page.get_by_text('Dimas Tester')).to_be_visible()
            shot(page, 'e2e_setelah_registrasi')

        @step('1. Dashboard memuat ringkasan dari API')
        def _():
            page.goto(BASE + '/')
            expect(page.get_by_role('heading', name='Horas! Ringkasan hari ini')).to_be_visible()
            expect(page.get_by_text('Kondisi armada')).to_be_visible()
            expect(page.get_by_text('15 motor terdaftar')).to_be_visible()
            shot(page, 'e2e_dashboard')

        @step('2. Validasi form motor (kosong) tampil tanpa menyimpan')
        def _():
            page.get_by_role('link', name='Armada Motor').click()
            page.get_by_role('button', name='Tambah motor').first.click()
            page.get_by_role('button', name='Simpan motor').click()
            expect(page.get_by_text('Plat nomor wajib diisi')).to_be_visible()
            expect(page.get_by_text('Tarif per hari wajib diisi')).to_be_visible()
            shot(page, 'e2e_validasi_motor')

        @step('3. Create motor lewat UI dan tersimpan di SQLite')
        def _():
            page.get_by_role('dialog').get_by_label('Plat nomor', exact=True).fill('bb7777xy')
            page.get_by_role('dialog').get_by_label('Merek', exact=True).fill('Suzuki')
            page.get_by_role('dialog').get_by_label('Model', exact=True).fill('Address')
            page.get_by_role('dialog').get_by_label('Kapasitas mesin (cc)', exact=True).fill('113')
            page.get_by_role('dialog').get_by_label('Tarif per hari (Rp)', exact=True).fill('85000')
            page.get_by_role('dialog').get_by_label('Lokasi penyimpanan', exact=True).select_option(label='Ambarita')
            page.get_by_role('button', name='Simpan motor').click()
            expect(page.get_by_text('Motor baru berhasil ditambahkan')).to_be_visible()
            page.get_by_placeholder('Cari merek, model, atau plat').fill('Address')
            expect(page.get_by_text('Suzuki Address')).to_be_visible()
            expect(page.get_by_text('BB 7777 XY')).to_be_visible()  # plat dinormalkan backend

        @step('4. Plat duplikat ditolak backend (409) dan pesan tampil di form')
        def _():
            page.get_by_role('button', name='Tambah motor').first.click()
            page.get_by_role('dialog').get_by_label('Plat nomor', exact=True).fill('BB 7777 XY')
            page.get_by_role('dialog').get_by_label('Merek', exact=True).fill('Suzuki')
            page.get_by_role('dialog').get_by_label('Model', exact=True).fill('Dup')
            page.get_by_role('dialog').get_by_label('Kapasitas mesin (cc)', exact=True).fill('113')
            page.get_by_role('dialog').get_by_label('Tarif per hari (Rp)', exact=True).fill('85000')
            page.get_by_role('dialog').get_by_label('Lokasi penyimpanan', exact=True).select_option(label='Ambarita')
            page.get_by_role('button', name='Simpan motor').click()
            expect(page.get_by_text('Plat nomor sudah terdaftar').first).to_be_visible()
            page.get_by_role('button', name='Batal').click()

        @step('5. Update tarif motor (PUT) tampil di daftar')
        def _():
            page.get_by_role('button', name='Ubah Suzuki Address').click()
            page.get_by_role('dialog').get_by_label('Tarif per hari (Rp)', exact=True).fill('95000')
            page.get_by_role('button', name='Simpan motor').click()
            expect(page.get_by_text('Data motor berhasil diperbarui')).to_be_visible()
            expect(page.get_by_text('Rp 95.000')).to_be_visible()

        @step('6. Filter dan pencarian: tidak ada hasil menampilkan empty state')
        def _():
            page.get_by_placeholder('Cari merek, model, atau plat').fill('zzzzzz')
            expect(page.get_by_text('Tidak ada motor yang cocok')).to_be_visible()
            page.get_by_role('button', name='Hapus filter').first.click()

        @step('7. Create pelanggan lewat UI')
        def _():
            page.get_by_role('link', name='Pelanggan').click()
            page.get_by_role('button', name='Tambah pelanggan').first.click()
            page.get_by_role('dialog').get_by_label('Nama lengkap', exact=True).fill('Tester Samosir')
            page.get_by_role('dialog').get_by_label('Nomor telepon', exact=True).fill('0813 9999 0001')
            page.get_by_role('dialog').get_by_label('Nomor KTP / Paspor', exact=True).fill('1217999900010001')
            page.get_by_role('dialog').get_by_label('Nomor SIM C', exact=True).fill('SIM-E2E-0001')
            page.get_by_role('button', name='Simpan pelanggan').click()
            expect(page.get_by_text('Pelanggan baru ditambahkan')).to_be_visible()
            expect(page.get_by_text('Tester Samosir')).to_be_visible()

        @step('8. Buat sewa: ketersediaan, kalkulasi biaya (diskon 7 hari), dan simpan')
        def _():
            page.goto(BASE + '/sewa/baru')
            page.get_by_label('Tanggal mulai', exact=True).fill(today.isoformat())
            page.get_by_label('Tanggal kembali', exact=True).fill((today + timedelta(days=7)).isoformat())
            page.get_by_label('Motor', exact=True).select_option(value=pick('Motor', 'Suzuki Address'))
            page.get_by_label('Pelanggan', exact=True).select_option(value=pick('Pelanggan', 'Tester Samosir'))
            expect(page.get_by_text('Diskon sewa 10%')).to_be_visible()
            expect(page.get_by_text('Rp 598.500')).to_be_visible()  # 95.000 x 7 = 665.000 - 10%
            shot(page, 'e2e_form_sewa')
            page.get_by_role('button', name='Buat pesanan').click()
            expect(page.get_by_text(re.compile(r'Sewa RMS-\d{4}-\d{4} berhasil dibuat'))).to_be_visible()

        @step('9. Motor yang sudah dipesan tidak ditawarkan pada rentang tanggal bentrok')
        def _():
            page.goto(BASE + '/sewa/baru')
            page.get_by_label('Tanggal mulai', exact=True).fill((today + timedelta(days=2)).isoformat())
            page.get_by_label('Tanggal kembali', exact=True).fill((today + timedelta(days=4)).isoformat())
            # motor yang sudah dipesan tidak muncul pada rentang tanggal tersebut
            page.wait_for_timeout(800)
            options = page.get_by_label('Motor', exact=True).locator('option').all_inner_texts()
            assert not any('Suzuki Address' in o for o in options), 'motor bentrok masih ditawarkan'

        @step('10. Alur status: Mulai -> Kembalikan')
        def _():
            page.goto(BASE + '/sewa?status=dipesan')
            row = page.locator('tr', has_text='Tester Samosir')
            row.get_by_role('button', name='Mulai').click()
            page.get_by_role('button', name='Mulai sewa').click()
            expect(page.get_by_text('Sewa dimulai')).to_be_visible()
            page.goto(BASE + '/sewa?status=berjalan')
            page.locator('tr', has_text='Tester Samosir').get_by_role('button', name='Kembalikan').click()
            page.get_by_role('button', name='Selesaikan sewa').click()
            expect(page.get_by_text('Motor dikembalikan tanpa denda')).to_be_visible()
            page.goto(BASE + '/sewa?status=selesai')
            expect(page.locator('tr', has_text='Tester Samosir')).to_be_visible()

        @step('11. Hapus motor yang punya riwayat sewa ditolak; motor tanpa riwayat dapat dihapus')
        def _():
            page.goto(BASE + '/motor')
            page.get_by_placeholder('Cari merek, model, atau plat').fill('Address')
            page.get_by_role('button', name='Hapus Suzuki Address').click()
            page.get_by_role('button', name='Hapus motor').click()
            expect(page.get_by_text(re.compile(r'memiliki 1 data sewa'))).to_be_visible()
            page.get_by_placeholder('Cari merek, model, atau plat').fill('Revo')
            page.get_by_role('button', name='Hapus Honda Revo').click()
            page.get_by_role('button', name='Hapus motor').click()  # Revo punya riwayat? tidak -> terhapus
            expect(page.get_by_text('Motor berhasil dihapus')).to_be_visible()

        @step('12. Data tetap ada setelah server di-restart (persistensi SQLite)')
        def _():
            global server
            server.send_signal(signal.SIGTERM); server.wait(timeout=10)
            server = start_server()
            page.goto(BASE + '/motor')
            page.get_by_placeholder('Cari merek, model, atau plat').fill('Address')
            expect(page.get_by_text('Suzuki Address')).to_be_visible()
            page.get_by_placeholder('Cari merek, model, atau plat').fill('Revo')
            expect(page.get_by_text('Tidak ada motor yang cocok')).to_be_visible()  # penghapusan juga persisten, seed tidak menggandakan

        @step('12b. Keluar, login gagal (sandi salah), lalu login berhasil')
        def _():
            page.goto(BASE + '/')
            page.get_by_role('button', name='Keluar').click()
            expect(page).to_have_url(re.compile(r'/auth/login$'))
            page.get_by_label('Username').fill('dimas_tester')
            page.get_by_label('Kata sandi').fill('salahsalah')
            page.get_by_role('button', name='Masuk').click()
            expect(page.get_by_text('Username atau kata sandi salah')).to_be_visible()
            page.locator('#password').fill('rahasia123')
            page.locator('#btn-submit').click()
            expect(page.get_by_role('heading', name='Horas! Ringkasan hari ini')).to_be_visible()

        @step('13. Backend mati: UI menampilkan pesan "Server tidak dapat dihubungi"')
        def _():
            page.goto(BASE + '/')
            expect(page.get_by_text('Kondisi armada')).to_be_visible()
            server.send_signal(signal.SIGTERM); server.wait(timeout=10)
            page.get_by_role('link', name='Pelanggan').click()
            expect(page.get_by_text('Server tidak dapat dihubungi').first).to_be_visible()
            shot(page, 'e2e_backend_mati')

        browser.close()
finally:
    for proc in (server, front):
        if proc.poll() is None:
            proc.send_signal(signal.SIGTERM)

failed = [r for r in results if not r[1]]
print(f'\nRingkasan E2E: {len(results) - len(failed)}/{len(results)} langkah lulus')
sys.exit(1 if failed else 0)
