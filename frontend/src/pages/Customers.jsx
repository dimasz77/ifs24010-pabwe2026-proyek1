import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Phone } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAsync, useDebounce } from '../lib/hooks';
import { validateCustomer } from '../lib/validators';
import { PageHeader, Spinner, ErrorState, EmptyState, Pagination, SearchBox, Field } from '../components/ui';
import Modal from '../components/Modal';
import { useConfirm, useToast } from '../components/Feedback';

const EMPTY = { full_name: '', phone: '', email: '', id_number: '', sim_number: '', origin: '' };

function CustomerForm({ customer, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState(customer ? { ...EMPTY, ...Object.fromEntries(Object.entries(customer).map(([k, x]) => [k, x ?? ''])) } : EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = validateCustomer(v);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = { full_name: v.full_name, phone: v.phone, email: v.email, id_number: v.id_number, sim_number: v.sim_number, origin: v.origin };
      const res = customer ? await api.put(`/customers/${customer.id}`, payload) : await api.post('/customers', payload);
      toast.success(customer ? 'Data pelanggan diperbarui' : 'Pelanggan baru ditambahkan');
      onSaved(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setFormError(err.message);
    } finally { setSaving(false); }
  }

  return (
    <Modal title={customer ? 'Ubah data pelanggan' : 'Tambah pelanggan'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <div className="span-2"><Field label="Nama lengkap" error={errors.full_name} htmlFor="full_name">
            <input id="full_name" value={v.full_name} onChange={set('full_name')} /></Field></div>
          <Field label="Nomor telepon" error={errors.phone} htmlFor="phone">
            <input id="phone" type="tel" value={v.phone} onChange={set('phone')} /></Field>
          <Field label="Email (opsional)" error={errors.email} htmlFor="email">
            <input id="email" type="email" value={v.email} onChange={set('email')} /></Field>
          <Field label="Nomor KTP / Paspor" error={errors.id_number} htmlFor="id_number">
            <input id="id_number" value={v.id_number} onChange={set('id_number')} /></Field>
          <Field label="Nomor SIM C" error={errors.sim_number} htmlFor="sim_number">
            <input id="sim_number" value={v.sim_number} onChange={set('sim_number')} /></Field>
          <div className="span-2"><Field label="Asal (opsional)" error={errors.origin} htmlFor="origin">
            <input id="origin" value={v.origin} onChange={set('origin')} placeholder="Kota atau negara asal" /></Field></div>
        </div>
        {formError && !Object.keys(errors).length && <p className="form-error" role="alert">{formError}</p>}
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan pelanggan'}</button>
        </footer>
      </form>
    </Modal>
  );
}

export default function Customers() {
  const confirm = useConfirm();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const dq = useDebounce(q);
  const { data, meta, loading, error, reload } = useAsync(() => api.get('/customers', { q: dq, page, limit: 10 }), [dq, page]);

  useEffect(() => {
    if (params.get('baru') === '1') { setForm({ customer: null }); setParams({}, { replace: true }); }
  }, [params, setParams]);

  async function remove(c) {
    const ok = await confirm({
      title: 'Hapus pelanggan?', tone: 'danger', confirmText: 'Hapus pelanggan',
      message: `Data ${c.full_name} akan dihapus permanen.`,
    });
    if (!ok) return;
    try {
      await api.del(`/customers/${c.id}`);
      toast.success('Pelanggan berhasil dihapus');
      if (data.length === 1 && page > 1) setPage(page - 1); else reload();
    } catch (err) { toast.error(err.message); }
  }

  return (
    <>
      <PageHeader title="Pelanggan" subtitle="Data penyewa untuk keperluan administrasi dan jaminan">
        <button className="btn btn-primary" onClick={() => setForm({ customer: null })}><Plus size={18} /> Tambah pelanggan</button>
      </PageHeader>
      <section className="filters">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Cari nama, telepon, atau nomor identitas" />
      </section>

      {loading && !data ? <Spinner /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : data.length === 0 ? (
        <EmptyState title={q ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
          text={q ? 'Coba kata kunci lain.' : 'Tambahkan data penyewa sebelum membuat penyewaan.'}
          action={!q && <button className="btn btn-primary" onClick={() => setForm({ customer: null })}>Tambah pelanggan</button>} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Nama</th><th>Kontak</th><th>Identitas</th><th>Asal</th><th>Sewa</th><th><span className="sr-only">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Nama"><strong>{c.full_name}</strong></td>
                    <td data-label="Kontak"><Phone size={14} /> {c.phone}{c.email && <div className="muted">{c.email}</div>}</td>
                    <td data-label="Identitas">{c.id_number}<div className="muted">SIM {c.sim_number}</div></td>
                    <td data-label="Asal">{c.origin || '-'}</td>
                    <td data-label="Sewa">{c.rental_count}x</td>
                    <td className="cell-actions">
                      <Link className="btn btn-ghost btn-sm" to={`/sewa/baru?pelanggan=${c.id}`}>Sewakan</Link>
                      <button className="icon-btn" aria-label={`Ubah ${c.full_name}`} onClick={() => setForm({ customer: c })}><Pencil size={18} /></button>
                      <button className="icon-btn icon-danger" aria-label={`Hapus ${c.full_name}`} onClick={() => remove(c)}><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPage={setPage} />
        </>
      )}
      {form && <CustomerForm customer={form.customer} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
    </>
  );
}
