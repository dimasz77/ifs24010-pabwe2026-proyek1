import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackProvider } from '../src/components/Feedback';
import Motorcycles from '../src/pages/Motorcycles';
import MotorForm from '../src/pages/MotorForm';

const locations = [{ id: 1, name: 'Dermaga Tomok' }];
const motorcycles = [
  {
    id: 1,
    plate: 'BB 3101 AA',
    brand: 'Honda',
    model: 'Beat',
    type: 'matic',
    engine_cc: 110,
    year: 2022,
    color: 'Putih',
    price_per_day: 80000,
    status: 'tersedia',
    location_id: 1,
    location_name: 'Dermaga Tomok',
    rented_now: false,
  },
  {
    id: 2,
    plate: 'BB 3202 BB',
    brand: 'Yamaha',
    model: 'NMax',
    type: 'matic',
    engine_cc: 155,
    year: 2021,
    color: 'Hitam',
    price_per_day: 150000,
    status: 'perawatan',
    location_id: 1,
    location_name: 'Dermaga Tomok',
    rented_now: false,
  },
];

const respond = (data, meta) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data, meta }),
});

function mockFetch(handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) =>
    handler(String(url), options),
  );
}

function renderPage(path = '/motor') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackProvider><Motorcycles /></FeedbackProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('Motorcycles management', () => {
  test('filters the fleet, opens edit form, and confirms deletion', async () => {
    const fetchSpy = mockFetch((url, options) => {
      if (url.includes('/locations')) return respond(locations);
      if (options.method === 'DELETE') return respond(null);
      return respond(motorcycles, { page: 1, limit: 9, total: 2, totalPages: 1 });
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('Honda Beat')).toBeInTheDocument();
    expect(screen.getByText('Yamaha NMax')).toBeInTheDocument();
    expect(screen.getAllByText('Perawatan').length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter status' }), 'tersedia');
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('status=tersedia'),
      expect.anything(),
    ));

    await user.type(screen.getByLabelText(/Kosong dari/), '2026-10-25');
    await user.type(screen.getByLabelText(/sampai/), '2026-10-25');
    expect(await screen.findByText(/Tanggal akhir harus setelah tanggal awal/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /hapus filter/i })[0]);

    await user.click(screen.getByRole('button', { name: 'Ubah Honda Beat' }));
    expect(screen.getByRole('dialog', { name: 'Ubah data motor' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tutup' }));

    await user.click(screen.getByRole('button', { name: 'Hapus Honda Beat' }));
    const cancelledConfirmation = screen.getByRole('alertdialog');
    expect(cancelledConfirmation).toHaveTextContent('Hapus motor?');
    await user.click(within(cancelledConfirmation).getByRole('button', { name: 'Batal' }));
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'DELETE')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Hapus Honda Beat' }));
    const confirmation = screen.getByRole('alertdialog');
    await user.click(within(confirmation).getByRole('button', { name: 'Hapus motor' }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/motorcycles/1'),
      expect.objectContaining({ method: 'DELETE' }),
    ));
    expect(await screen.findByText('Motor berhasil dihapus')).toBeInTheDocument();
  }, 10000);

  test('shows filtered empty state and clears filters', async () => {
    mockFetch((url) => url.includes('/locations')
      ? respond(locations)
      : respond([], { page: 1, limit: 9, total: 0, totalPages: 1 }));
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByRole('searchbox', { name: 'Cari merek, model, atau plat' }), 'Suzuki');
    expect(await screen.findByText('Tidak ada motor yang cocok')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Hapus filter' })[0]);
    expect(await screen.findByText('Belum ada motor')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Tambah motor' }).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: 'Tambah motor' })[0]);
    expect(screen.getByRole('dialog', { name: 'Tambah motor' })).toBeInTheDocument();
  });

  test('shows backend error and retries', async () => {
    let fail = true;
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (fail) {
        return Promise.reject(new TypeError('Network unavailable'));
      }
      return respond(motorcycles, { page: 1, limit: 9, total: 2, totalPages: 1 });
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('Server tidak dapat dihubungi')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(await screen.findByText('Honda Beat')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalled();
  });

  test('opens and saves the add form from the baru query parameter', async () => {
    const fetchSpy = mockFetch((url, options) => {
      if (url.includes('/locations')) return respond(locations);
      if (options.method === 'POST') return respond({ id: 3 });
      return respond(motorcycles, { page: 1, limit: 9, total: 2, totalPages: 1 });
    });
    const user = userEvent.setup();

    renderPage('/motor?baru=1');

    expect(await screen.findByRole('dialog', { name: 'Tambah motor' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Plat nomor'), 'BB 9999 ZZ');
    await user.type(screen.getByLabelText('Merek'), 'Honda');
    await user.type(screen.getByLabelText('Model'), 'Scoopy');
    await user.type(screen.getByLabelText('Kapasitas mesin (cc)'), '110');
    await user.clear(screen.getByLabelText('Tahun'));
    await user.type(screen.getByLabelText('Tahun'), '2024');
    await user.type(screen.getByLabelText('Tarif per hari (Rp)'), '90000');
    await user.selectOptions(screen.getByLabelText('Lokasi penyimpanan'), '1');
    await user.click(screen.getByRole('button', { name: 'Simpan motor' }));

    expect(await screen.findByText('Motor baru berhasil ditambahkan')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'POST')).toBe(true);
  });

  test('shows a notification when deleting a motorcycle fails', async () => {
    mockFetch((url, options) => {
      if (url.includes('/locations')) return respond(locations);
      if (options.method === 'DELETE') return Promise.reject(new TypeError('offline'));
      return respond(motorcycles, { page: 1, limit: 9, total: 2, totalPages: 1 });
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Hapus Honda Beat' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hapus motor' }));

    expect(await screen.findByText(/Server tidak dapat dihubungi/)).toBeInTheDocument();
  });

  test('shows rented motorcycles without a color and applies a valid availability range', async () => {
    const rented = { ...motorcycles[0], rented_now: true, color: '' };
    const fetchSpy = mockFetch((url) => url.includes('/locations')
      ? respond(locations)
      : respond([rented], { page: 1, limit: 9, total: 1, totalPages: 1 }));
    const user = userEvent.setup();

    renderPage();
    const card = (await screen.findByText('Sedang disewa')).closest('li');
    expect(within(card).getByText('Matic')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Kosong dari/), '2026-10-25');
    await user.type(screen.getByLabelText(/sampai/), '2026-10-26');

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('available_from=2026-10-25'),
      expect.anything(),
    ));
  });

  test('moves to the previous page after deleting its only motorcycle', async () => {
    const requestedPages = [];
    const fetchSpy = mockFetch((url, options) => {
      if (url.includes('/locations')) return respond(locations);
      if (options.method === 'DELETE') return respond(null, { page: 1, limit: 9, total: 9, totalPages: 1 });
      const page = new URL(url, 'http://localhost').searchParams.get('page') || '1';
      requestedPages.push(page);
      return respond([motorcycles[0]], { page: Number(page), limit: 9, total: 10, totalPages: 2 });
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Honda Beat');
    await user.click(screen.getByRole('button', { name: 'Berikutnya' }));
    await waitFor(() => expect(requestedPages.at(-1)).toBe('2'));
    await user.click(await screen.findByRole('button', { name: 'Hapus Honda Beat' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hapus motor' }));

    await waitFor(() => expect(requestedPages.at(-1)).toBe('1'));
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'DELETE')).toBe(true);
  });

  test('saves edits for a motorcycle whose optional color is empty', async () => {
    const motorWithoutColor = { ...motorcycles[0], color: null };
    const fetchSpy = mockFetch((url, options) => {
      if (url.includes('/locations')) return respond(locations);
      if (options.method === 'PUT') return respond(motorWithoutColor);
      return respond([motorWithoutColor], { page: 1, limit: 9, total: 1, totalPages: 1 });
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ubah Honda Beat' }));
    expect(screen.getByLabelText('Warna')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Simpan motor' }));

    expect(await screen.findByText('Data motor berhasil diperbarui')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'PUT')).toBe(true);
  });

  test('shows a general error when saving a motorcycle fails without field details', async () => {
    mockFetch((url, options) => options.method === 'POST'
      ? Promise.reject(new TypeError('offline'))
      : respond(locations));
    const user = userEvent.setup();

    render(<FeedbackProvider><MotorForm motor={null} locations={locations} onClose={() => {}} onSaved={() => {}} /></FeedbackProvider>);
    await user.type(screen.getByLabelText('Plat nomor'), 'BB 9999 ZZ');
    await user.type(screen.getByLabelText('Merek'), 'Honda');
    await user.type(screen.getByLabelText('Model'), 'Scoopy');
    await user.type(screen.getByLabelText('Kapasitas mesin (cc)'), '110');
    await user.type(screen.getByLabelText('Tarif per hari (Rp)'), '90000');
    await user.selectOptions(screen.getByLabelText('Lokasi penyimpanan'), '1');
    await user.click(screen.getByRole('button', { name: 'Simpan motor' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server tidak dapat dihubungi');
  });
});
