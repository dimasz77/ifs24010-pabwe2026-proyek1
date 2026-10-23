import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, MapPin, Gauge, Calendar, Wrench, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync, useDebounce } from '../lib/hooks';
import { useLocations } from '../lib/data';
import { rupiah, MOTOR_TYPES, typeLabel } from '../lib/format';
import { PageHeader, Spinner, ErrorState, EmptyState, Pagination, SearchBox, Badge } from '../components/ui';
import { useConfirm, useToast } from '../components/Feedback';
import MotorForm from './MotorForm';

export default function Motorcycles() {
  const confirm = useConfirm();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [f, setF] = useState({ type: '', status: '', location_id: '', sort: 'newest', available_from: '', available_to: '' });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | {motor: null|object}
  const dq = useDebounce(q);
  const locs = useLocations();

  useEffect(() => {
    if (params.get('baru') === '1') {
      setForm({ motor: null });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const rangeOk = f.available_from && f.available_to && f.available_to > f.available_from;
  const query = {
    q: dq, type: f.type, status: f.status, location_id: f.location_id, sort: f.sort, page, limit: 9,
    ...(rangeOk ? { available_from: f.available_from, available_to: f.available_to } : {}),
  };
  const { data, meta, loading, error, reload } = useAsync(() => api.get('/motorcycles', query), [JSON.stringify(query)]);

  const setFilter = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setPage(1); };
  const hasFilter = q || f.type || f.status || f.location_id || f.available_from || f.available_to;
  const reset = () => { setQ(''); setF({ type: '', status: '', location_id: '', sort: 'newest', available_from: '', available_to: '' }); setPage(1); };

  async function remove(m) {
    const ok = await confirm({
      title: 'Hapus motor?', tone: 'danger', confirmText: 'Hapus motor',
      message: `${m.brand} ${m.model} (${m.plate}) akan dihapus permanen dari armada.`,
    });
    if (!ok) return;
    try {
      await api.del(`/motorcycles/${m.id}`);
      toast.success('Motor berhasil dihapus');
      if (data.length === 1 && page > 1) setPage(page - 1); else reload();
    } catch (err) { toast.error(err.message); }
  }

  return (
    <>
      <PageHeader title="Armada motor" subtitle="Kelola unit yang disewakan di Samosir">
        <button className="btn btn-primary" onClick={() => setForm({ motor: null })}><Plus size={18} /> Tambah motor</button>
      </PageHeader>

      <section className="filters" aria-label="Filter motor">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Cari merek, model, atau plat" />
        <select value={f.type} onChange={setFilter('type')} aria-label="Filter tipe">
          <option value="">Semua tipe</option>
          {MOTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={f.location_id} onChange={setFilter('location_id')} aria-label="Filter lokasi">
          <option value="">Semua lokasi</option>
          {(locs.data || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={f.status} onChange={setFilter('status')} aria-label="Filter status">
          <option value="">Semua status</option>
          <option value="tersedia">Tersedia</option>
          <option value="perawatan">Perawatan</option>
        </select>
        <select value={f.sort} onChange={setFilter('sort')} aria-label="Urutkan">
          <option value="newest">Terbaru</option>
          <option value="brand">Merek A-Z</option>
          <option value="price_asc">Termurah</option>
          <option value="price_desc">Termahal</option>
        </select>
        <div className="range">
          <label>Kosong dari <input type="date" value={f.available_from} onChange={setFilter('available_from')} /></label>
          <label>sampai <input type="date" value={f.available_to} min={f.available_from} onChange={setFilter('available_to')} /></label>
        </div>
        {hasFilter && <button className="btn btn-ghost btn-sm" onClick={reset}><X size={16} /> Hapus filter</button>}
      </section>
      {f.available_from && f.available_to && !rangeOk && (
        <p className="field-error">Tanggal akhir harus setelah tanggal awal agar filter ketersediaan berlaku.</p>
      )}

      {loading && !data ? <Spinner /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : data.length === 0 ? (
        <EmptyState
          title={hasFilter ? 'Tidak ada motor yang cocok' : 'Belum ada motor'}
          text={hasFilter ? 'Ubah atau hapus filter untuk melihat lebih banyak unit.' : 'Tambahkan motor pertama untuk mulai menerima penyewaan.'}
          action={hasFilter ? <button className="btn btn-ghost" onClick={reset}>Hapus filter</button> : <button className="btn btn-primary" onClick={() => setForm({ motor: null })}>Tambah motor</button>}
        />
      ) : (
        <>
          <ul className={`motor-grid ${loading ? 'is-loading' : ''}`}>
            {data.map((m) => (
              <li key={m.id} className={`motor-card type-${m.type}`}>
                <div className="motor-top">
                  <span className="plate" aria-label={`Plat nomor ${m.plate}`}>{m.plate}</span>
                  {m.status === 'perawatan' ? <Badge tone="warn"><Wrench size={12} /> Perawatan</Badge>
                    : m.rented_now ? <Badge tone="brand">Sedang disewa</Badge> : <Badge tone="ok">Tersedia</Badge>}
                </div>
                <h3>{m.brand} {m.model}</h3>
                <p className="motor-meta">
                  <span><Gauge size={14} /> {m.engine_cc} cc</span>
                  <span><Calendar size={14} /> {m.year}</span>
                  <span>{typeLabel(m.type)}{m.color ? `, ${m.color}` : ''}</span>
                </p>
                <p className="motor-loc"><MapPin size={14} /> {m.location_name}</p>
                <div className="motor-bottom">
                  <p className="price">{rupiah(m.price_per_day)}<small> / hari</small></p>
                  <div className="row-actions">
                    {m.status === 'tersedia' && <Link className="btn btn-primary btn-sm" to={`/sewa/baru?motor=${m.id}`}>Sewakan</Link>}
                    <button className="icon-btn" aria-label={`Ubah ${m.brand} ${m.model}`} onClick={() => setForm({ motor: m })}><Pencil size={18} /></button>
                    <button className="icon-btn icon-danger" aria-label={`Hapus ${m.brand} ${m.model}`} onClick={() => remove(m)}><Trash2 size={18} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination meta={meta} onPage={setPage} />
        </>
      )}

      {form && locs.data && (
        <MotorForm motor={form.motor} locations={locs.data} onClose={() => setForm(null)}
          onSaved={() => { setForm(null); reload(); }} />
      )}
    </>
  );
}
