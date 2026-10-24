import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackProvider } from '../src/components/Feedback';
import Rentals from '../src/pages/Rentals';

const runningRental = {
  id: 7,
  code: 'SWA-0007',
  motorcycle_name: 'Honda Beat',
  motorcycle_plate: 'BB 3101 AA',
  customer_name: 'Budi Santoso',
  pickup_location_name: 'Dermaga Tomok',
  start_date: '2020-01-01',
  end_date: '2020-01-02',
  days: 1,
  grand_total: 80000,
  late_fee: 0,
  status: 'berjalan',
  is_overdue: true,
};

const bookedRental = {
  ...runningRental,
  id: 8,
  code: 'SWA-0008',
  status: 'dipesan',
  is_overdue: false,
};

const respond = (data, meta = {
  page: 1,
  limit: 10,
  total: Array.isArray(data) ? data.length : 0,
  totalPages: Array.isArray(data) && data.length > 0 ? 1 : 0,
}) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data, meta }),
});
const reject = () => ({
  ok: false,
  status: 409,
  json: () => Promise.resolve({ success: false, error: { message: 'Tindakan gagal' } }),
});

function mockFetch(handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) =>
    handler(String(url), options),
  );
}

function renderPage(path = '/sewa') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackProvider><Rentals /></FeedbackProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('Rental actions', () => {
  test('allows editing the return date and displays a failed return request', async () => {
    mockFetch((url, options) => {
      if (options.method === 'PATCH') return reject();
      return respond([runningRental]);
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: /kembalikan/i }));
    fireEvent.change(screen.getByLabelText('Tanggal pengembalian'), { target: { value: '2026-10-23' } });
    expect(screen.getByLabelText('Tanggal pengembalian')).toHaveValue('2026-10-23');
    await user.click(screen.getByRole('button', { name: 'Selesaikan sewa' }));

    expect(await screen.findByText('Tindakan gagal')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Terima pengembalian motor' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.queryByRole('dialog', { name: 'Terima pengembalian motor' })).not.toBeInTheDocument();
  });

  test('returns a motorcycle on time without a late fee', async () => {
    const dueLater = { ...runningRental, end_date: '2999-01-01' };
    const user = userEvent.setup();
    mockFetch((url, options) => {
      if (options.method === 'PATCH') return respond({ late_fee: 0 });
      return respond([dueLater]);
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: /kembalikan/i }));
    expect(screen.getByText('Tepat waktu: tanpa denda.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Selesaikan sewa' }));

    expect(await screen.findByText('Motor dikembalikan tanpa denda')).toBeInTheDocument();
  });

  test('returns an overdue rental and refreshes the list', async () => {
    let returned = false;
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'PATCH') {
        returned = true;
        return respond({ late_fee: 20000 });
      }
      return respond(returned ? [] : [runningRental]);
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('SWA-0007')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /kembalikan/i }));
    expect(screen.getByRole('dialog', { name: 'Terima pengembalian motor' })).toBeInTheDocument();
    expect(screen.getByText(/Melewati jatuh tempo/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Selesaikan sewa' }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/rentals/7/status'),
      expect.objectContaining({ method: 'PATCH' }),
    ));
    expect(await screen.findByText(/Denda keterlambatan Rp 20.000/)).toBeInTheDocument();
    expect(await screen.findByText('Tidak ada data sewa')).toBeInTheDocument();
  });

  test('cancels a booked rental and deletes it after confirmation', async () => {
    let removed = false;
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'PATCH') return respond(bookedRental);
      if (options.method === 'DELETE') {
        removed = true;
        return respond(null);
      }
      return respond(removed ? [] : [bookedRental]);
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('SWA-0008')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Batalkan SWA-0008' }));
    const cancelDialog = screen.getByRole('alertdialog');
    await user.click(within(cancelDialog).getByRole('button', { name: 'Batalkan pesanan' }));
    expect(await screen.findByText('Pesanan dibatalkan')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => options.body?.includes('"action":"cancel"'))).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Hapus SWA-0008' }));
    const deleteDialog = screen.getByRole('alertdialog');
    await user.click(within(deleteDialog).getByRole('button', { name: 'Hapus data' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/rentals/8'),
      expect.objectContaining({ method: 'DELETE' }),
    ));
    expect(await screen.findByText('Tidak ada data sewa')).toBeInTheDocument();
  });

  test('leaves a rental unchanged when cancellation or deletion is not confirmed', async () => {
    const fetchSpy = mockFetch(() => respond([bookedRental]));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Batalkan SWA-0008' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Batal' }));
    await user.click(screen.getByRole('button', { name: 'Hapus SWA-0008' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Batal' }));

    expect(screen.getByText('SWA-0008')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => ['PATCH', 'DELETE'].includes(options.method))).toBe(false);
  });


  test('shows empty overdue state and switches status tabs', async () => {
    const fetchSpy = mockFetch(() => respond([]));
    const user = userEvent.setup();

    renderPage('/sewa?overdue=true');

    expect(await screen.findByText('Tidak ada data sewa')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Terlambat' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Selesai' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('status=selesai'),
      expect.anything(),
    ));
    expect(screen.getByRole('tab', { name: 'Selesai' })).toHaveAttribute('aria-selected', 'true');
  });

  test('shows return date and late-fee details in rental history', async () => {
    const completed = {
      ...bookedRental,
      status: 'selesai',
      returned_date: '2026-10-23',
      late_fee: 20000,
    };
    mockFetch(() => respond([completed]));

    renderPage('/sewa?status=selesai');

    expect(await screen.findByText(/kembali/)).toBeInTheDocument();
    expect(screen.getByText('termasuk denda Rp 20.000')).toBeInTheDocument();
  });

  test('shows retryable errors and filters the rental list by search text', async () => {
    let attempts = 0;
    const fetchSpy = mockFetch((url) => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new TypeError('offline'));
      return respond([bookedRental]);
    });
    const user = userEvent.setup();

    renderPage();
    expect(await screen.findByText('Server tidak dapat dihubungi')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(await screen.findByText('SWA-0008')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Cari kode, pelanggan, atau motor' }), 'SWA');
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('q=SWA'),
      expect.anything(),
    ));
  });

  test('shows notifications when starting or deleting a rental fails', async () => {
    mockFetch((url, options) => {
      if (options.method === 'PATCH' || options.method === 'DELETE') return reject();
      return respond([bookedRental]);
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: /mulai/i }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Mulai sewa' }));
    expect(await screen.findByText('Tindakan gagal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hapus SWA-0008' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hapus data' }));
    expect(await screen.findAllByText('Tindakan gagal')).toHaveLength(2);
  });

  test('deletes the only rental from a later page and navigates to the previous page', async () => {
    const requestedPages = [];
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'DELETE') return respond(null);
      const page = new URL(url, 'http://localhost').searchParams.get('page') || '1';
      requestedPages.push(page);
      return respond([bookedRental], { page: Number(page), limit: 10, total: 11, totalPages: 2 });
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('SWA-0008');
    await user.click(screen.getByRole('button', { name: 'Berikutnya' }));
    await waitFor(() => expect(requestedPages.at(-1)).toBe('2'));
    await user.click(await screen.findByRole('button', { name: 'Hapus SWA-0008' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hapus data' }));

    await waitFor(() => expect(requestedPages.at(-1)).toBe('1'));
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'DELETE')).toBe(true);
  });

  test('supports the overdue tab and clears active tabs', async () => {
    const fetchSpy = mockFetch(() => respond([bookedRental]));
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('SWA-0008');
    await user.click(screen.getByRole('tab', { name: 'Terlambat' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('overdue=true'),
      expect.anything(),
    ));
    await user.click(screen.getByRole('tab', { name: 'Semua' }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.not.stringContaining('status='),
      expect.anything(),
    ));
  });
});
