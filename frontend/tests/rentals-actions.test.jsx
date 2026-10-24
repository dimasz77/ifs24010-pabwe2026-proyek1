import { render, screen, waitFor, within } from '@testing-library/react';
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
});
