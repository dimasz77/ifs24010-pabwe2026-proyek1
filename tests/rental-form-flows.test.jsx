import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  test('preserves an existing motorcycle and normalizes a missing rental note', async () => {
    const existing = {
      id: 9,
      code: 'SWA-0009',
      motorcycle_id: 1,
      customer_id: 2,
      pickup_location_id: 1,
      motorcycle_name: 'Honda Beat',
      motorcycle_plate: 'BB 3101 AA',
      price_per_day: 80000,
      start_date: '2026-10-25',
      end_date: '2026-10-26',
      notes: null,
    };
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.endsWith('/rentals/9')) return respond(existing);
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/9/ubah');
    expect(await screen.findByRole('heading', { name: 'Ubah pesanan' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Motor')).toHaveValue('1'));
    expect(screen.getByLabelText('Catatan (opsional)')).toHaveValue('');
    expect(screen.getByRole('option', { name: /Honda Beat/ })).toBeInTheDocument();
  });

  test('shows the empty customer message and clears the quote for an invalid date range', async () => {
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond([]);
      if (url.includes('/motorcycles')) return respond([]);
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/baru');
    await screen.findByRole('heading', { name: 'Buat sewa baru' });

    expect(await screen.findByText(/Belum ada pelanggan/)).toBeInTheDocument();
    expect(screen.getByText('Pilih motor untuk melihat total biaya.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tanggal kembali'), { target: { value: screen.getByLabelText('Tanggal mulai').value } });

    expect(await screen.findByText('Isi tanggal sewa yang valid untuk melihat total biaya.')).toBeInTheDocument();
  });

  test('handles null customer and location data without crashing', async () => {
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(null);
      if (url.includes('/customers')) return respond(null);
      if (url.includes('/motorcycles')) return respond([]);
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/baru');

    expect(await screen.findByRole('heading', { name: 'Buat sewa baru' })).toBeInTheDocument();
    expect(screen.getByText(/Belum ada pelanggan/)).toBeInTheDocument();
    expect(screen.getByLabelText('Lokasi jemput')).toBeInTheDocument();
  });

  test('does not render rental fields while locations are still loading', async () => {
    let resolveLocations;
    const locationRequest = new Promise((resolve) => { resolveLocations = resolve; });
    mockFetch((url) => {
      if (url.includes('/locations')) return locationRequest;
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/baru');

    expect(await screen.findByText('Memuat data...')).toBeInTheDocument();
    expect(screen.queryByLabelText('Tanggal mulai')).not.toBeInTheDocument();
    await act(async () => resolveLocations(respond(locations)));
    expect(await screen.findByRole('heading', { name: 'Buat sewa baru' })).toBeInTheDocument();
  });

  test('shows a customer loading error with a retry action', async () => {
    let fail = true;
    const fetchSpy = mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return fail ? Promise.reject(new TypeError('offline')) : respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      throw new Error(`Unexpected request: ${url}`);
    });
    const user = userEvent.setup();

    renderPage('/sewa/baru');
    expect(await screen.findByText('Server tidak dapat dihubungi')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(await screen.findByRole('heading', { name: 'Buat sewa baru' })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalled();
  });

  test('shows the existing-rental loading state until its request completes', async () => {
    let resolveRental;
    const rentalRequest = new Promise((resolve) => { resolveRental = resolve; });
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.endsWith('/rentals/9')) return rentalRequest;
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/9/ubah');
    expect(await screen.findByText('Memuat data...')).toBeInTheDocument();
    await act(async () => resolveRental(respond({
      id: 9,
      code: 'SWA-0009',
      motorcycle_id: 1,
      customer_id: 2,
      pickup_location_id: 1,
      motorcycle_name: 'Honda Beat',
      motorcycle_plate: 'BB 3101 AA',
      price_per_day: 80000,
      start_date: '2026-10-25',
      end_date: '2026-10-26',
      notes: '',
    })));
    expect(await screen.findByRole('heading', { name: 'Ubah pesanan' })).toBeInTheDocument();
  });

  test('shows a percentage discount in the estimate', async () => {
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.includes('/rentals/quote')) return respond({ ...quote, days: 7, discount_percent: 10, discount_amount: 56000, total_price: 504000 });
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/baru?motor=1&pelanggan=2');
    expect(await screen.findByRole('heading', { name: 'Buat sewa baru' })).toBeInTheDocument();
    expect(await screen.findByText('Diskon sewa 10%')).toBeInTheDocument();
  });

  test('updates the selected motorcycle and automatically selects its pickup location', async () => {
    const secondMotorcycle = { ...motorcycle, id: 2, brand: 'Yamaha', model: 'NMax', plate: 'BB 3202 BB', location_id: 2 };
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.includes('/locations')) return respond([...locations, { id: 2, name: 'Tuktuk Siadong' }]);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle, secondMotorcycle]);
      if (url.includes('/rentals/quote')) return respond(quote);
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/baru');
    await screen.findByRole('heading', { name: 'Buat sewa baru' });
    await user.selectOptions(screen.getByLabelText('Motor'), '2');

    await waitFor(() => expect(screen.getByLabelText('Lokasi jemput')).toHaveValue('2'));
    expect(screen.getByLabelText('Motor')).toHaveValue('2');
  });

  test('shows an error when the price quote request fails', async () => {
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.includes('/rentals/quote')) return respond(null, 503);
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/baru?motor=1&pelanggan=2');

    expect(await screen.findByRole('heading', { name: 'Buat sewa baru' })).toBeInTheDocument();
    expect(await screen.findByText('Permintaan ditolak')).toBeInTheDocument();
  });

  test('cancels quote updates when a pending request resolves after unmount', async () => {
    let resolveQuote;
    let quoteRequested = false;
    const pendingQuote = new Promise((resolve) => { resolveQuote = resolve; });
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.includes('/rentals/quote')) {
        quoteRequested = true;
        return pendingQuote;
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const view = renderPage('/sewa/baru?motor=1&pelanggan=2');

    await waitFor(() => expect(quoteRequested).toBe(true));
    view.unmount();
    await act(async () => {
      resolveQuote(respond(quote));
      await Promise.resolve();
    });
  });

  test('ignores a quote error when its request finishes after unmount', async () => {
    let rejectQuote;
    let quoteRequested = false;
    const pendingQuote = new Promise((resolve, reject) => { rejectQuote = reject; });
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.includes('/rentals/quote')) {
        quoteRequested = true;
        return pendingQuote;
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const view = renderPage('/sewa/baru?motor=1&pelanggan=2');

    await waitFor(() => expect(quoteRequested).toBe(true));
    view.unmount();
    await act(async () => {
      rejectQuote(new TypeError('offline'));
      await Promise.resolve();
    });
  });


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

  test('shows an error when an existing rental cannot be loaded', async () => {
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.endsWith('/rentals/9')) return respond(null, 500);
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('/sewa/9/ubah');

    expect(await screen.findByText('Data gagal dimuat')).toBeInTheDocument();
    expect(screen.getByText('Permintaan ditolak')).toBeInTheDocument();
  });

  test('shows a general error when rental submission fails without validation details', async () => {
    mockFetch((url, options) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.includes('/rentals/quote')) return respond(quote);
      if (options.method === 'POST') return Promise.reject(new TypeError('offline'));
      throw new Error(`Unexpected request: ${url}`);
    });
    const user = userEvent.setup();

    renderPage('/sewa/baru?motor=1&pelanggan=2');
    await screen.findByRole('heading', { name: 'Buat sewa baru' });
    await user.click(screen.getByRole('button', { name: 'Buat pesanan' }));

    expect(await screen.findByText(/Server tidak dapat dihubungi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buat pesanan' })).toBeEnabled();
  });

  test('supports a blank start date when calculating the minimum return date', async () => {
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond(customers);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      throw new Error(`Unexpected request: ${url}`);
    });
    const user = userEvent.setup();

    renderPage('/sewa/baru');
    await screen.findByRole('heading', { name: 'Buat sewa baru' });
    await user.clear(screen.getByLabelText('Tanggal mulai'));

    expect(screen.getByLabelText('Tanggal kembali')).not.toHaveAttribute('min');
  });
});
