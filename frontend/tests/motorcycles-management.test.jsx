import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackProvider } from '../src/components/Feedback';
import Motorcycles from '../src/pages/Motorcycles';

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
    const confirmation = screen.getByRole('alertdialog');
    expect(confirmation).toHaveTextContent('Hapus motor?');
    await user.click(within(confirmation).getByRole('button', { name: 'Hapus motor' }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/motorcycles/1'),
      expect.objectContaining({ method: 'DELETE' }),
    ));
    expect(await screen.findByText('Motor berhasil dihapus')).toBeInTheDocument();
  });

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
});
