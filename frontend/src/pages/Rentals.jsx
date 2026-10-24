import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Play, Undo2, Pencil, Ban, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { api } from '../lib/api';
import { useAsync, useDebounce } from '../lib/hooks';
import { validateComponentProps } from '../lib/validateComponentProps';
import { rupiah, formatDate, todayWib, RENTAL_STATUS } from '../lib/format';
import { PageHeader, Spinner, ErrorState, EmptyState, Pagination, SearchBox, Badge, Field } from '../components/ui';
import Modal from '../components/Modal';
import { useConfirm, useToast } from '../components/Feedback';

const TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'dipesan', label: 'Dipesan' },
  { key: 'berjalan', label: 'Berjalan' },
  { key: 'overdue', label: 'Terlambat' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'dibatalkan', label: 'Dibatalkan' },
];

function ReturnDialog({ rental, onClose, onDone }) {
  validateComponentProps(ReturnDialog, { rental, onClose, onDone });
  const toast = useToast();
  const today = todayWib();
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/rentals/${rental.id}/status`, { action: 'return', returned_date: date });
      toast.success(res.data.late_fee > 0
        ? `Motor dikembalikan. Denda keterlambatan ${rupiah(res.data.late_fee)}`
        : 'Motor dikembalikan tanpa denda');
      onDone();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  const late = date > rental.end_date;
  return (
    <Modal title="Terima pengembalian motor" onClose={onClose}>
      <form onSubmit={submit}>
        <p><strong>{rental.motorcycle_name}</strong> ({rental.motorcycle_plate}) disewa oleh {rental.customer_name}.</p>
        <p className="muted">Jatuh tempo: {formatDate(rental.end_date)}</p>
        <Field label="Tanggal pengembalian" htmlFor="returned_date" error={error}
          hint={late ? 'Melewati jatuh tempo: denda dihitung otomatis oleh sistem.' : 'Tepat waktu: tanpa denda.'}>
          <input id="returned_date" type="date" value={date} min={rental.start_date} max={today} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={saving || !date}>{saving ? 'Memproses...' : 'Selesaikan sewa'}</button>
        </footer>
      </form>
    </Modal>
  );
}

ReturnDialog.propTypes = {
  rental: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    start_date: PropTypes.string.isRequired,
    end_date: PropTypes.string.isRequired,
    motorcycle_name: PropTypes.string.isRequired,
    motorcycle_plate: PropTypes.string.isRequired,
    customer_name: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default function Rentals() {
  const confirm = useConfirm();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('overdue') === 'true' ? 'overdue' : params.get('status') || 'all';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [returning, setReturning] = useState(null);
  const dq = useDebounce(q);

  let filters = {};
  if (tab === 'overdue') filters = { overdue: 'true' };
  else if (tab !== 'all') filters = { status: tab };
  const query = { q: dq, page, limit: 10, ...filters };
  const { data, meta, loading, error, reload } = useAsync(() => api.get('/rentals', query), [JSON.stringify(query)]);

  const setTab = (key) => {
    setPage(1);
    let nextParams = {};
    if (key === 'overdue') nextParams = { overdue: 'true' };
    else if (key !== 'all') nextParams = { status: key };
    setParams(nextParams);
  };

  async function act(r, action) {
    const text = {
      start: { title: 'Mulai sewa?', message: `${r.customer_name} mengambil ${r.motorcycle_name}. Status berubah menjadi berjalan.`, confirmText: 'Mulai sewa', tone: 'primary', done: 'Sewa dimulai' },
      cancel: { title: 'Batalkan pesanan?', message: `Pesanan ${r.code} akan dibatalkan dan motor kembali tersedia untuk tanggal tersebut.`, confirmText: 'Batalkan pesanan', tone: 'danger', done: 'Pesanan dibatalkan' },
    }[action];
    const confirmed = await confirm(text);
    if (confirmed) {
      try {
        await api.patch(`/rentals/${r.id}/status`, { action });
        toast.success(text.done);
        reload();
      } catch (err) { toast.error(err.message); }
    }
  }

  async function remove(r) {
    const ok = await confirm({ title: 'Hapus data sewa?', tone: 'danger', confirmText: 'Hapus data', message: `Data sewa ${r.code} akan dihapus permanen dan tidak dapat dikembalikan.` });
    if (ok) {
      try {
        await api.del(`/rentals/${r.id}`);
        toast.success('Data sewa dihapus');
        if (data.length === 1 && page > 1) setPage(page - 1); else reload();
      } catch (err) { toast.error(err.message); }
    }
  }

  let rentalsContent;
  if (loading && !data) {
    rentalsContent = <Spinner />;
  } else if (error && !data) {
    rentalsContent = <ErrorState error={error} onRetry={reload} />;
  } else if (data.length === 0) {
    const hasSearchOrFilter = Boolean(q) || tab !== 'all';
    const emptyText = hasSearchOrFilter
      ? 'Tidak ada sewa yang cocok dengan filter ini.'
      : 'Buat penyewaan pertama untuk memulai.';
    rentalsContent = (
      <EmptyState
        title="Tidak ada data sewa"
        text={emptyText}
        action={<Link to="/sewa/baru" className="btn btn-primary">Buat sewa baru</Link>}
      />
    );
  } else {
    rentalsContent = (
      <>
        <div className="table-wrap">
          <table className="table responsive">
            <thead><tr><th>Kode</th><th>Motor</th><th>Pelanggan</th><th>Periode</th><th>Total</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td data-label="Kode"><strong>{r.code}</strong></td>
                  <td data-label="Motor">{r.motorcycle_name}<div className="muted">{r.motorcycle_plate}</div></td>
                  <td data-label="Pelanggan">{r.customer_name}<div className="muted">{r.pickup_location_name}</div></td>
                  <td data-label="Periode">{formatDate(r.start_date)} s/d {formatDate(r.end_date)}<div className="muted">{r.days} hari{r.returned_date ? `, kembali ${formatDate(r.returned_date)}` : ''}</div></td>
                  <td data-label="Total">{rupiah(r.grand_total)}{r.late_fee > 0 && <div className="muted">termasuk denda {rupiah(r.late_fee)}</div>}</td>
                  <td data-label="Status">
                    <Badge tone={RENTAL_STATUS[r.status].tone}>{RENTAL_STATUS[r.status].label}</Badge>
                    {r.is_overdue && <Badge tone="danger">Terlambat</Badge>}
                  </td>
                  <td className="cell-actions">
                    {r.status === 'dipesan' && (<>
                      <button className="btn btn-primary btn-sm" onClick={() => act(r, 'start')}><Play size={14} /> Mulai</button>
                      <Link className="icon-btn" aria-label={`Ubah ${r.code}`} to={`/sewa/${r.id}/ubah`}><Pencil size={18} /></Link>
                      <button className="icon-btn" aria-label={`Batalkan ${r.code}`} onClick={() => act(r, 'cancel')}><Ban size={18} /></button>
                    </>)}
                    {r.status === 'berjalan' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setReturning(r)}><Undo2 size={14} /> Kembalikan</button>
                    )}
                    {r.status !== 'berjalan' && (
                      <button className="icon-btn icon-danger" aria-label={`Hapus ${r.code}`} onClick={() => remove(r)}><Trash2 size={18} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPage={setPage} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Penyewaan" subtitle="Pesanan, sewa berjalan, dan riwayat pengembalian">
        <Link to="/sewa/baru" className="btn btn-primary"><Plus size={18} /> Buat sewa baru</Link>
      </PageHeader>

      <div className="tabs" role="tablist" aria-label="Status sewa">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <section className="filters">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Cari kode, pelanggan, atau motor" />
      </section>

      {rentalsContent}
      {returning && <ReturnDialog rental={returning} onClose={() => setReturning(null)} onDone={() => { setReturning(null); reload(); }} />}
    </>
  );
}
