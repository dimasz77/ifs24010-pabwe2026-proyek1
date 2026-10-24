import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FeedbackProvider } from '../src/components/Feedback';
import RentalForm from '../src/pages/RentalForm';

const locations = [{ id: 1, name: 'Dermaga Tomok' }];
const customers = [{ id: 2, full_name: 'Budi Santoso', phone: '081234567890' }];
const motorcycle = {
  id: 1,
  brand: 'Honda',
  model: 'Beat',
  plate: 'BB 3101 AA',
  price_per_day: 80000,
  location_id: 1,
};
const quote = {
  price_per_day: 80000,
  days: 1,
  subtotal: 80000,
  discount_percent: 0,
  discount_amount: 0,
  total_price: 80000,
};

const respond = (data, status = 200) => ({
  ok: status < 400,
  status,
  json: () => Promise.resolve(status < 400
    ? { success: true, data }
    : { success: false, error: { message: 'Permintaan ditolak', details: { motorcycle_id: 'Motor tidak tersedia' } } }),
});

function mockFetch(handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) =>
    handler(String(url), options),
  );
}

function renderPage(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackProvider>
        <Routes>
          <Route path="/sewa/baru" element={<RentalForm />} />
          <Route path="/sewa/:id/ubah" element={<RentalForm />} />
          <Route path="/sewa" element={<p>DAFTAR SEWA</p>} />
        </Routes>
      </FeedbackProvider>
    </MemoryRouter>,
  );
}

function mockRentalApi({ existing = null, submitStatus = 200 } = {}) {
  return mockFetch((url, options) => {
    if (url.includes('/locations')) return respond(locations);
    if (url.includes('/customers')) return respond(customers);
    if (url.includes('/motorcycles')) return respond(existing ? [] : [motorcycle]);
    if (url.includes('/rentals/quote')) return respond(quote);
    if (url.endsWith('/rentals/9') && options.method === 'GET') return respond(existing);
    if (options.method === 'POST' || options.method === 'PUT') {
      return respond({ code: 'SWA-0009' }, submitStatus);
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

afterEach(() => vi.restoreAllMocks());

describe('RentalForm flows', () => {
  test('validates required fields before sending a request', async () => {
    const fetchSpy = mockRentalApi();
    const user = userEvent.setup();

    renderPage('/sewa/baru');
    await screen.findByRole('heading', { name: 'Buat sewa baru' });
    await user.click(screen.getByRole('button', { name: 'Buat pesanan' }));

    expect(await screen.findByText('Motor wajib dipilih')).toBeInTheDocument();
    expect(screen.getByText('Pelanggan wajib dipilih')).toBeInTheDocument();
    expect(screen.getByText('Lokasi jemput wajib dipilih')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
  });

  test('creates a rental using the selected motor and customer', async () => {
    const fetchSpy = mockRentalApi();
    const user = userEvent.setup();

    renderPage('/sewa/baru?motor=1&pelanggan=2');
    await screen.findByRole('heading', { name: 'Buat sewa baru' });
    await waitFor(() => expect(screen.getByLabelText('Motor')).toHaveValue('1'));
    await waitFor(() => expect(screen.getByLabelText('Lokasi jemput')).toHaveValue('1'));
    await waitFor(() => expect(screen.getAllByText('Rp 80.000').length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: 'Buat pesanan' }));

    expect(await screen.findByText('DAFTAR SEWA')).toBeInTheDocument();
    expect(await screen.findByText('Sewa SWA-0009 berhasil dibuat')).toBeInTheDocument();
    const request = fetchSpy.mock.calls.find(([, options]) => options.method === 'POST');
    expect(JSON.parse(request[1].body)).toMatchObject({
      motorcycle_id: 1,
      customer_id: 2,
      pickup_location_id: 1,
    });
  });

  test('shows validation errors returned by the server', async () => {
    mockRentalApi({ submitStatus: 409 });
    const user = userEvent.setup();

    renderPage('/sewa/baru?motor=1&pelanggan=2');
    await screen.findByRole('heading', { name: 'Buat sewa baru' });
    await waitFor(() => expect(screen.getByLabelText('Lokasi jemput')).toHaveValue('1'));
    await user.click(screen.getByRole('button', { name: 'Buat pesanan' }));

    expect(await screen.findByText('Motor tidak tersedia')).toBeInTheDocument();
    expect(screen.getByText('Permintaan ditolak')).toHaveClass('form-error');
  });

  test('loads an existing rental and saves its updates', async () => {
    const existing = {
      id: 9,
      code: 'SWA-0009',
      motorcycle_id: 1,
      customer_id: 2,
      pickup_location_id: 1,
      motorcycle_name: 'Honda Beat',
      motorcycle_plate: 'BB 3101 AA',
      price_per_day: 80000,
      start_date: '2020-01-01',
      end_date: '2020-01-02',
      notes: 'Helm tambahan',
    };
    const fetchSpy = mockRentalApi({ existing });
    const user = userEvent.setup();

    renderPage('/sewa/9/ubah');

    expect(await screen.findByRole('heading', { name: 'Ubah pesanan' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Motor')).toHaveValue('1'));
    expect(screen.getByLabelText('Catatan (opsional)')).toHaveValue('Helm tambahan');
    await user.clear(screen.getByLabelText('Catatan (opsional)'));
    await user.type(screen.getByLabelText('Catatan (opsional)'), 'Tanpa helm tambahan');
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));

    expect(await screen.findByText('DAFTAR SEWA')).toBeInTheDocument();
    expect(await screen.findByText('Data sewa berhasil diperbarui')).toBeInTheDocument();
    const request = fetchSpy.mock.calls.find(([, options]) => options.method === 'PUT');
    expect(JSON.parse(request[1].body)).toMatchObject({
      motorcycle_id: 1,
      customer_id: 2,
      notes: 'Tanpa helm tambahan',
    });
  });
});
