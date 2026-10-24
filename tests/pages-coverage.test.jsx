import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FeedbackProvider } from '../src/components/Feedback';
import Customers from '../src/pages/Customers';
import Dashboard from '../src/pages/Dashboard';
import NotFound from '../src/pages/NotFound';
import RentalForm from '../src/pages/RentalForm';
import Rentals from '../src/pages/Rentals';

const locations = [{ id: 1, name: 'Dermaga Tomok' }];
const customer = {
  id: 2,
  full_name: 'Budi Santoso',
  phone: '081234567890',
  email: 'budi@example.com',
  id_number: '12345',
  sim_number: 'SIM12345',
  origin: 'Medan',
  rental_count: 1,
};
const motorcycle = {
  id: 1,
  brand: 'Honda',
  model: 'Beat',
  plate: 'BB 3101 AA',
  price_per_day: 80000,
  location_id: 1,
};

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

function renderPage(ui, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackProvider>{ui}</FeedbackProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('Dashboard', () => {
  test('shows a retry action when dashboard loading fails', async () => {
    let failed = true;
    const fetchSpy = mockFetch(() => {
      if (failed) return Promise.reject(new TypeError('offline'));
      return respond({
        today: '2026-10-24',
        fleet: { available: 1, rented: 0, maintenance: 0, total: 1 },
        rentals: { overdue: 0, active: 0, booked: 0, completed_this_month: 0 },
        customers: 1,
        revenue_this_month: 0,
        fleet_by_type: [],
        upcoming_returns: [],
        recent_rentals: [],
      });
    });
    const user = userEvent.setup();

    renderPage(<Dashboard />);

    expect(await screen.findByText('Server tidak dapat dihubungi')).toBeInTheDocument();
    failed = false;
    await user.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(await screen.findByRole('heading', { name: 'Horas! Ringkasan hari ini' })).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('menampilkan ringkasan armada dan penyewaan terbaru', async () => {
    mockFetch(() =>
      respond({
        today: '2026-10-24',
        fleet: { available: 2, rented: 1, maintenance: 0, total: 3 },
        rentals: { overdue: 1, active: 1, booked: 2, completed_this_month: 3 },
        customers: 5,
        revenue_this_month: 240000,
        fleet_by_type: [{ type: 'matic', count: 3 }],
        upcoming_returns: [{
          id: 10,
          motorcycle_name: 'Honda Beat',
          motorcycle_plate: 'BB 3101 AA',
          customer_name: 'Budi Santoso',
          end_date: '2026-10-23',
          is_overdue: true,
        }],
        recent_rentals: [{
          id: 10,
          customer_name: 'Budi Santoso',
          motorcycle_name: 'Honda Beat',
          start_date: '2026-10-22',
          end_date: '2026-10-23',
          grand_total: 80000,
          status: 'berjalan',
        }],
      }),
    );

    renderPage(<Dashboard />);

    expect(await screen.findByText('Horas! Ringkasan hari ini')).toBeInTheDocument();
    expect(screen.getByText('1 motor terlambat dikembalikan.')).toBeInTheDocument();
    expect(screen.getByText('Kondisi armada')).toBeInTheDocument();
    expect(screen.getAllByText('Budi Santoso')).toHaveLength(2);
    expect(screen.getByText('Rp 240.000')).toBeInTheDocument();
    expect(screen.getByText('Terlambat')).toBeInTheDocument();
  });

  test('shows empty dashboard panels when there are no rentals', async () => {
    mockFetch(() =>
      respond({
        today: '2026-10-24',
        fleet: { available: 0, rented: 0, maintenance: 0, total: 0 },
        rentals: { overdue: 0, active: 0, booked: 0, completed_this_month: 0 },
        customers: 0,
        revenue_this_month: 0,
        fleet_by_type: [],
        upcoming_returns: [],
        recent_rentals: [],
      }),
    );

    renderPage(<Dashboard />);

    expect(await screen.findByText('Tidak ada motor yang sedang disewa')).toBeInTheDocument();
    expect(screen.getByText('Belum ada penyewaan')).toBeInTheDocument();
    expect(screen.queryByText(/motor terlambat dikembalikan/)).not.toBeInTheDocument();
  });

  test('shows an on-time upcoming return without overdue styling', async () => {
    mockFetch(() => respond({
      today: '2026-10-24',
      fleet: { available: 0, rented: 1, maintenance: 0, total: 1 },
      rentals: { overdue: 0, active: 1, booked: 0, completed_this_month: 0 },
      customers: 1,
      revenue_this_month: 0,
      fleet_by_type: [],
      upcoming_returns: [{
        id: 11,
        motorcycle_name: 'Honda Beat',
        motorcycle_plate: 'BB 3101 AA',
        customer_name: 'Budi Santoso',
        end_date: '2026-10-25',
        is_overdue: false,
      }],
      recent_rentals: [],
    }));

    renderPage(<Dashboard />);

    expect(await screen.findByText('Honda Beat')).toBeInTheDocument();
    expect(screen.queryByText('Terlambat')).not.toBeInTheDocument();
    expect(screen.queryByText(/motor terlambat dikembalikan/)).not.toBeInTheDocument();
  });
});

describe('NotFound', () => {
  test('offers a link back to the dashboard', () => {
    renderPage(<NotFound />);

    expect(screen.getByText('Halaman tidak ditemukan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/');
  });
});

describe('Customers', () => {
  test('menampilkan pelanggan dan menyimpan pelanggan baru', async () => {
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'POST') return respond({ ...customer, ...JSON.parse(options.body) });
      return respond([customer], { page: 1, limit: 10, total: 1, totalPages: 1 });
    });
    const user = userEvent.setup();

    renderPage(<Customers />);

    const row = await screen.findByText('Budi Santoso');
    expect(within(row.closest('tr')).getByText('Medan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tambah pelanggan/i }));
    await user.type(screen.getByLabelText('Nama lengkap'), 'Siti Aminah');
    await user.type(screen.getByLabelText('Nomor telepon'), '081298765432');
    await user.type(screen.getByLabelText('Nomor KTP / Paspor'), '98765');
    await user.type(screen.getByLabelText('Nomor SIM C'), 'SIM98765');
    await user.click(screen.getByRole('button', { name: 'Simpan pelanggan' }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/customers'),
      expect.objectContaining({ method: 'POST' }),
    ));
    expect(await screen.findByText('Pelanggan baru ditambahkan')).toBeInTheDocument();
    expect(JSON.parse(fetchSpy.mock.calls.find(([, options]) => options.method === 'POST')[1].body))
      .toMatchObject({ full_name: 'Siti Aminah', phone: '081298765432' });
  });
});

describe('Rentals', () => {
  test('meminta konfirmasi sebelum memulai pesanan sewa', async () => {
    const rental = {
      id: 4,
      code: 'SWA-0004',
      motorcycle_name: 'Honda Beat',
      motorcycle_plate: 'BB 3101 AA',
      customer_name: 'Budi Santoso',
      pickup_location_name: 'Dermaga Tomok',
      start_date: '2026-10-24',
      end_date: '2026-10-25',
      days: 1,
      grand_total: 80000,
      late_fee: 0,
      status: 'dipesan',
    };
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'PATCH') return respond({ ...rental });
      return respond([rental], { page: 1, limit: 10, total: 1, totalPages: 1 });
    });
    const user = userEvent.setup();

    renderPage(<Rentals />);

    expect(await screen.findByText('SWA-0004')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /mulai/i }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Mulai sewa?');
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Mulai sewa' }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/rentals/4/status'),
      expect.objectContaining({ method: 'PATCH' }),
    ));
    expect(await screen.findByText('Sewa dimulai')).toBeInTheDocument();
  });
});

describe('RentalForm', () => {
  test('menampilkan biaya estimasi untuk motor dan pelanggan dari query', async () => {
    mockFetch((url) => {
      if (url.includes('/locations')) return respond(locations);
      if (url.includes('/customers')) return respond([customer]);
      if (url.includes('/motorcycles')) return respond([motorcycle]);
      if (url.includes('/rentals/quote')) {
        return respond({ price_per_day: 80000, days: 1, subtotal: 80000, discount_percent: 0, discount_amount: 0, total_price: 80000 });
      }
      return respond(null);
    });

    renderPage(<RentalForm />, '/sewa/baru?motor=1&pelanggan=2');

    expect(await screen.findByRole('heading', { name: 'Buat sewa baru' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Rp 80.000').length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Motor')).toHaveValue('1');
    expect(screen.getByLabelText('Pelanggan')).toHaveValue('2');
    expect(screen.getByLabelText('Lokasi jemput')).toHaveValue('1');
  });
});
