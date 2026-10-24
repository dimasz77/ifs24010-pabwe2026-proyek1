import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FeedbackProvider } from '../src/components/Feedback';
import Customers from '../src/pages/Customers';

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

const respond = (data, meta = { page: 1, limit: 10, total: data.length, totalPages: 1 }, status = 200) => ({
  ok: status < 400,
  status,
  json: () => Promise.resolve(status < 400
    ? { success: true, data, meta }
    : { success: false, error: { code: 'INVALID', message: 'Data pelanggan tidak valid', details: { phone: 'Nomor telepon sudah digunakan' } } }),
});

function mockFetch(handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) =>
    handler(String(url), options),
  );
}

function renderPage(path = '/pelanggan') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackProvider><Customers /></FeedbackProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('Customers flows', () => {
  test('offers the add action when the customer list is empty', async () => {
    mockFetch(() => respond([]));
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('Belum ada pelanggan')).toBeInTheDocument();
    await user.click(within(screen.getByText('Belum ada pelanggan').parentElement).getByRole('button', { name: 'Tambah pelanggan' }));
    expect(screen.getByRole('dialog', { name: 'Tambah pelanggan' })).toBeInTheDocument();
  });

  test('shows a search-specific empty state', async () => {
    mockFetch((url) => respond([], { page: 1, limit: 10, total: 0, totalPages: 1 }));
    const user = userEvent.setup();

    renderPage();
    await user.type(screen.getByRole('searchbox'), 'tidak ada');

    expect(await screen.findByText('Pelanggan tidak ditemukan')).toBeInTheDocument();
    expect(screen.getByText('Coba kata kunci lain.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Tambah pelanggan' })).toHaveLength(1);
  });

  test('shows a load error and retries the customer request', async () => {
    let attempts = 0;
    mockFetch(() => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new TypeError('offline'));
      return respond([customer]);
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('Server tidak dapat dihubungi')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  test('opens the form from the baru query parameter and can cancel it', async () => {
    mockFetch(() => respond([customer]));
    const user = userEvent.setup();

    renderPage('/pelanggan?baru=1');

    expect(await screen.findByRole('dialog', { name: 'Tambah pelanggan' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('validates new customer fields before sending a request', async () => {
    const fetchSpy = mockFetch(() => respond([customer]));
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Budi Santoso');
    await user.click(screen.getByRole('button', { name: /tambah pelanggan/i }));
    await user.click(screen.getByRole('button', { name: 'Simpan pelanggan' }));

    expect(await screen.findByText('Nama lengkap minimal 3 karakter')).toBeInTheDocument();
    expect(screen.getByText('Nomor telepon wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Nomor KTP/Paspor minimal 5 karakter')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
  });

  test('edits a customer and displays field validation returned by the API', async () => {
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'PUT') return respond(null, { page: 1, limit: 10, total: 1, totalPages: 1 }, 409);
      return respond([customer]);
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ubah Budi Santoso' }));
    expect(screen.getByRole('dialog', { name: 'Ubah data pelanggan' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Nomor telepon'));
    await user.type(screen.getByLabelText('Nomor telepon'), '081200000000');
    await user.click(screen.getByRole('button', { name: 'Simpan pelanggan' }));

    expect(await screen.findByText('Nomor telepon sudah digunakan')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'PUT')).toBe(true);
  });

  test('normalizes empty customer fields and saves an edit successfully', async () => {
    const customerWithEmptyFields = { ...customer, email: null, id_number: null, sim_number: null, origin: null };
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'PUT') return respond({ ...customerWithEmptyFields, ...JSON.parse(options.body) });
      return respond([customerWithEmptyFields]);
    });
    const user = userEvent.setup();

    renderPage();
    const name = await screen.findByText('Budi Santoso');
    expect(within(name.closest('tr')).getByText('-')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ubah Budi Santoso' }));
    expect(screen.getByLabelText('Email (opsional)')).toHaveValue('');
    await user.type(screen.getByLabelText('Nomor KTP / Paspor'), '12345');
    await user.type(screen.getByLabelText('Nomor SIM C'), 'SIM123');
    await user.click(screen.getByRole('button', { name: 'Simpan pelanggan' }));

    expect(await screen.findByText('Data pelanggan diperbarui')).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'PUT')).toBe(true);
  });

  test('shows API network errors on the form', async () => {
    mockFetch((url, options) => {
      if (options.method === 'POST') return Promise.reject(new TypeError('offline'));
      return respond([customer]);
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: /tambah pelanggan/i }));
    await user.type(screen.getByLabelText('Nama lengkap'), 'Siti Aminah');
    await user.type(screen.getByLabelText('Nomor telepon'), '081298765432');
    await user.type(screen.getByLabelText('Nomor KTP / Paspor'), '98765');
    await user.type(screen.getByLabelText('Nomor SIM C'), 'SIM98765');
    await user.click(screen.getByRole('button', { name: 'Simpan pelanggan' }));

    expect(await screen.findByText(/Server tidak dapat dihubungi/)).toBeInTheDocument();
  });

  test('only deletes a customer after confirmation and reports success', async () => {
    const fetchSpy = mockFetch((url, options) => {
      if (options.method === 'DELETE') return respond(null, { page: 1, limit: 10, total: 0, totalPages: 1 });
      return respond([customer]);
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Hapus Budi Santoso' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Data Budi Santoso akan dihapus permanen.');
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Batal' }));
    expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'DELETE')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Hapus Budi Santoso' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hapus pelanggan' }));
    expect(await screen.findByText('Pelanggan berhasil dihapus')).toBeInTheDocument();
    await waitFor(() => expect(fetchSpy.mock.calls.some(([, options]) => options.method === 'DELETE')).toBe(true));
  });

  test('shows an error when customer deletion fails', async () => {
    mockFetch((url, options) => {
      if (options.method === 'DELETE') return Promise.reject(new TypeError('offline'));
      return respond([customer]);
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Hapus Budi Santoso' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hapus pelanggan' }));

    expect(await screen.findByText(/Server tidak dapat dihubungi/)).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
  });

  test('returns to the previous page after deleting its only customer', async () => {
    const requestedPages = [];
    mockFetch((url, options) => {
      if (options.method === 'DELETE') return respond(null, { page: 2, limit: 10, total: 10, totalPages: 1 });
      const page = new URL(url, 'http://localhost').searchParams.get('page') || '1';
      requestedPages.push(page);
      return respond([customer], { page: Number(page), limit: 10, total: 11, totalPages: 2 });
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Budi Santoso');
    await user.click(screen.getByRole('button', { name: 'Berikutnya' }));
    await waitFor(() => expect(requestedPages.at(-1)).toBe('2'));
    await user.click(await screen.findByRole('button', { name: 'Hapus Budi Santoso' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hapus pelanggan' }));

    await waitFor(() => expect(requestedPages.at(-1)).toBe('1'));
    expect(await screen.findByText('Pelanggan berhasil dihapus')).toBeInTheDocument();
  });
});
