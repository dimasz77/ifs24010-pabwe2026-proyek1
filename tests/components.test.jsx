import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createElement } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FeedbackProvider, useConfirm, useToast } from '../src/components/Feedback';
import Modal from '../src/components/Modal';
import { ReactNodePropType } from '../src/lib/validateComponentProps';
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Pagination,
  SearchBox,
  Spinner,
  Ulos,
} from '../src/components/ui';

afterEach(() => {
  document.body.style.overflow = '';
});

function FeedbackActions() {
  const toast = useToast();
  const confirm = useConfirm();
  const [result, setResult] = useState('');

  return (
    <>
      <button onClick={() => toast.success('Berhasil disimpan')}>Success toast</button>
      <button onClick={() => toast.error('Gagal menyimpan')}>Error toast</button>
      <button onClick={async () => setResult(String(await confirm({
        title: 'Konfirmasi',
        message: 'Lanjutkan tindakan?',
        confirmText: 'Lanjutkan',
      })))}>Open confirm</button>
      <button onClick={() => confirm({ title: 'Konfirmasi default', message: 'Lanjutkan?', tone: 'danger' })}>Open default confirm</button>
      <p>{result}</p>
    </>
  );
}

describe('UI components', () => {
  test('validates optional and required React node props', () => {
    expect(ReactNodePropType({ children: null }, 'children', 'Example', 'prop', 'children')).toBeNull();
    expect(ReactNodePropType({ children: [createElement('span'), 'text', 1] }, 'children', 'Example', 'prop', 'children')).toBeNull();
    expect(ReactNodePropType({ children: { invalid: true } }, 'children', 'Example', 'prop', 'children')).toBeInstanceOf(Error);
    expect(ReactNodePropType.isRequired({ children: undefined }, 'children', 'Example', 'prop', 'children')).toBeInstanceOf(Error);
  });

  test('renders headers, badges, empty states, and loading states', () => {
    render(
      <>
        <PageHeader title="Ringkasan" subtitle="Informasi hari ini"><button>Aksi</button></PageHeader>
        <PageHeader title="Tanpa detail" />
        <Badge tone="ok">Tersedia</Badge>
        <EmptyState title="Data kosong" text="Belum ada data." action={<button>Tambah</button>} />
        <EmptyState title="Kosong" />
        <Spinner label="Memuat ringkasan..." />
        <Ulos tall />
      </>,
    );

    expect(screen.getByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tanpa detail' })).toBeInTheDocument();
    expect(screen.getByText('Tersedia')).toHaveClass('badge-ok');
    expect(screen.getByText('Belum ada data.')).toBeInTheDocument();
    expect(screen.getByText('Memuat ringkasan...').closest('output')).toBeInTheDocument();
    expect(document.querySelector('.ulos-tall')).toBeInTheDocument();
  });

  test('renders network and server errors with retry actions', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<ErrorState error={{ isNetwork: true, message: 'Backend offline' }} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Server tidak dapat dihubungi');
    await user.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(retry).toHaveBeenCalledOnce();

    rerender(<ErrorState error={{ isNetwork: false, message: 'HTTP 500' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Data gagal dimuat');
    expect(screen.queryByRole('button', { name: /coba lagi/i })).not.toBeInTheDocument();
  });

  test('shows field errors before hints and updates search input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <>
        <Field label="Nama" htmlFor="name" error="Nama wajib diisi" hint="Masukkan nama">
          <input id="name" />
        </Field>
        <Field label="Telepon" htmlFor="phone" hint="Nomor aktif">
          <input id="phone" />
        </Field>
        <SearchBox value="" onChange={onChange} placeholder="Cari pelanggan" />
      </>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Nama wajib diisi');
    expect(screen.queryByText('Masukkan nama')).not.toBeInTheDocument();
    expect(screen.getByText('Nomor aktif')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Cari pelanggan' }), 'Budi');
    expect(onChange).toHaveBeenLastCalledWith('i');
  });

  test('paginates between pages and handles single-page data', async () => {
    const onPage = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Pagination meta={{ page: 2, totalPages: 3, total: 25 }} onPage={onPage} />);
    await user.click(screen.getByRole('button', { name: /sebelumnya/i }));
    await user.click(screen.getByRole('button', { name: /berikutnya/i }));
    expect(onPage.mock.calls).toEqual([[1], [3]]);

    rerender(<Pagination meta={{ page: 1, totalPages: 1, total: 1 }} onPage={onPage} />);
    expect(screen.queryByRole('navigation', { name: 'Halaman' })).not.toBeInTheDocument();
  });
});

describe('Feedback and modal behavior', () => {
  test('displays success and error toasts and dismisses a notification', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><FeedbackActions /></FeedbackProvider>);

    await user.click(screen.getByRole('button', { name: 'Success toast' }));
    await user.click(screen.getByRole('button', { name: 'Error toast' }));
    expect(screen.getByRole('status')).toHaveTextContent('Berhasil disimpan');
    expect(screen.getByRole('status')).toHaveTextContent('Gagal menyimpan');

    await user.click(screen.getAllByRole('button', { name: 'Tutup notifikasi' })[0]);
    await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent('Berhasil disimpan'));
  });

  test('automatically dismisses success and error notifications after their timeout', async () => {
    vi.useFakeTimers();
    render(<FeedbackProvider><FeedbackActions /></FeedbackProvider>);

    try {
      await act(async () => {
        screen.getByRole('button', { name: 'Success toast' }).click();
        screen.getByRole('button', { name: 'Error toast' }).click();
      });
      expect(screen.getByRole('status')).toHaveTextContent('Berhasil disimpan');
      expect(screen.getByRole('status')).toHaveTextContent('Gagal menyimpan');

      await act(async () => vi.advanceTimersByTime(4000));
      expect(screen.getByRole('status')).not.toHaveTextContent('Berhasil disimpan');
      expect(screen.getByRole('status')).toHaveTextContent('Gagal menyimpan');

      await act(async () => vi.advanceTimersByTime(3000));
      expect(screen.getByRole('status')).not.toHaveTextContent('Gagal menyimpan');
    } finally {
      vi.useRealTimers();
    }
  });

  test('resolves confirmations from buttons and Escape', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><FeedbackActions /></FeedbackProvider>);

    await user.click(screen.getByRole('button', { name: 'Open confirm' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Lanjutkan tindakan?');
    await user.keyboard('x');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Lanjutkan' }));
    expect(await screen.findByText('true')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open default confirm' }));
    expect(screen.getByRole('button', { name: 'Ya, lanjutkan' })).toHaveClass('btn-danger');
    await user.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));

    await user.click(screen.getByRole('button', { name: 'Open confirm' }));
    await user.keyboard('{Escape}');
    expect(await screen.findByText('false')).toBeInTheDocument();
  });

  test('traps keyboard focus and restores focus after closing', async () => {
    function ModalHost() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open modal</button>
          <button>Outside action</button>
          {open && (
            <Modal title="Edit data" onClose={() => setOpen(false)}>
              <input aria-label="Nama" />
              <button type="button">Simpan</button>
            </Modal>
          )}
        </>
      );
    }
    const user = userEvent.setup();
    render(<ModalHost />);
    const trigger = screen.getByRole('button', { name: 'Open modal' });
    await user.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Edit data' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nama')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    screen.getByRole('button', { name: 'Outside action' }).focus();
    expect(screen.getByLabelText('Nama')).toHaveFocus();

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Tutup' })).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Simpan' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Tutup' })).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });
});
