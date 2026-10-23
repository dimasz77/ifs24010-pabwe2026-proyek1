import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackProvider } from '../src/components/Feedback';
import Motorcycles from '../src/pages/Motorcycles';
import MotorForm from '../src/pages/MotorForm';

const ok = (data, meta) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data, meta }) });
const locations = [{ id: 1, name: 'Dermaga Tomok' }, { id: 2, name: 'Tuktuk Siadong' }];
const motor = { id: 1, plate: 'BB 3101 AA', brand: 'Honda', model: 'Beat', type: 'matic', engine_cc: 110, year: 2022, color: 'Putih', price_per_day: 80000, status: 'tersedia', location_id: 1, location_name: 'Dermaga Tomok', rented_now: false };

function mockFetch(handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => handler(String(url), opts || {}));
}
const renderPage = (ui) => render(<MemoryRouter><FeedbackProvider>{ui}</FeedbackProvider></MemoryRouter>);

afterEach(() => vi.restoreAllMocks());

describe('halaman Armada Motor', () => {
  test('menampilkan daftar motor dari API', async () => {
    mockFetch((url) => (url.includes('/locations') ? ok(locations) : ok([motor], { page: 1, limit: 9, total: 1, totalPages: 1 })));
    renderPage(<Motorcycles />);
    expect(await screen.findByText('Honda Beat')).toBeInTheDocument();
    expect(screen.getByText('Rp 80.000')).toBeInTheDocument();
    const card = screen.getByText('Honda Beat').closest('li');
    expect(within(card).getByText('Tersedia')).toBeInTheDocument();
  });

  test('empty state saat tidak ada data', async () => {
    mockFetch((url) => (url.includes('/locations') ? ok(locations) : ok([], { page: 1, limit: 9, total: 0, totalPages: 1 })));
    renderPage(<Motorcycles />);
    expect(await screen.findByText('Belum ada motor')).toBeInTheDocument();
  });

  test('pesan jelas saat backend tidak tersedia', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    renderPage(<Motorcycles />);
    expect(await screen.findByText('Server tidak dapat dihubungi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
  });
});

describe('MotorForm', () => {
  test('validasi frontend: tidak mengirim request bila form kosong', async () => {
    const spy = mockFetch(() => ok({}));
    const user = userEvent.setup();
    renderPage(<MotorForm motor={null} locations={locations} onClose={() => {}} onSaved={() => {}} />);
    await user.click(screen.getByRole('button', { name: /simpan motor/i }));
    expect(await screen.findByText('Plat nomor wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Tarif per hari wajib diisi')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  test('mengirim POST dengan angka bertipe number lalu memanggil onSaved', async () => {
    const onSaved = vi.fn();
    const spy = mockFetch(() => ok({ id: 9 }));
    const user = userEvent.setup();
    renderPage(<MotorForm motor={null} locations={locations} onClose={() => {}} onSaved={onSaved} />);
    await user.type(screen.getByLabelText('Plat nomor'), 'BB 9999 ZZ');
    await user.type(screen.getByLabelText('Merek'), 'Honda');
    await user.type(screen.getByLabelText('Model'), 'Scoopy');
    await user.type(screen.getByLabelText('Kapasitas mesin (cc)'), '110');
    await user.type(screen.getByLabelText('Tarif per hari (Rp)'), '90000');
    await user.selectOptions(screen.getByLabelText('Lokasi penyimpanan'), '2');
    await user.click(screen.getByRole('button', { name: /simpan motor/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body).toMatchObject({ plate: 'BB 9999 ZZ', engine_cc: 110, price_per_day: 90000, location_id: 2 });
  });

  test('menampilkan error dari server (plat duplikat) pada kolom terkait', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ success: false, error: { code: 'DUPLICATE', message: 'Plat nomor sudah terdaftar', details: { plate: 'Plat nomor sudah terdaftar' } } }) }));
    const user = userEvent.setup();
    renderPage(<MotorForm motor={motor} locations={locations} onClose={() => {}} onSaved={() => {}} />);
    await user.click(screen.getByRole('button', { name: /simpan motor/i }));
    expect(await screen.findByText('Plat nomor sudah terdaftar')).toBeInTheDocument();
  });
});
