import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAsync, useDebounce } from '../lib/hooks';
import { useLocations } from '../lib/data';
import { validateRental } from '../lib/validators';
import { rupiah, todayWib, addDays, diffDays, formatDate } from '../lib/format';
import { PageHeader, Spinner, ErrorState, Field } from '../components/ui';
import { useToast } from '../components/Feedback';

export default function RentalForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const today = todayWib();

  const locs = useLocations();
  const customers = useAsync(() => api.get('/customers', { limit: 100 }), []);
  const existing = useAsync(() => (isEdit ? api.get(`/rentals/${id}`) : Promise.resolve({ data: null })), [id]);

  const [v, setV] = useState({
    motorcycle_id: params.get('motor') || '', customer_id: params.get('pelanggan') || '', pickup_location_id: '',
    start_date: today, end_date: addDays(today, 1), notes: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState({ data: null, error: '' });

  useEffect(() => {
    const r = existing.data;
    if (r) {
      setV({ motorcycle_id: String(r.motorcycle_id), customer_id: String(r.customer_id), pickup_location_id: String(r.pickup_location_id),
        start_date: r.start_date, end_date: r.end_date, notes: r.notes || '' });
    }
  }, [existing.data]);

  const rangeOk = v.start_date && v.end_date && diffDays(v.start_date, v.end_date) >= 1;
  const motors = useAsync(
    () => api.get('/motorcycles', { status: 'tersedia', limit: 100, sort: 'brand', ...(rangeOk ? { available_from: v.start_date, available_to: v.end_date } : {}) }),
    [rangeOk ? v.start_date : '', rangeOk ? v.end_date : ''],
  );

  const motorOptions = useMemo(() => {
    const list = motors.data || [];
    const r = existing.data;
    if (r && !list.some((m) => m.id === r.motorcycle_id)) {
      return [{ id: r.motorcycle_id, brand: r.motorcycle_name, model: '', plate: r.motorcycle_plate, price_per_day: r.price_per_day, location_id: r.pickup_location_id }, ...list];
    }
    return list;
  }, [motors.data, existing.data]);

  const selectedMotor = motorOptions.find((m) => String(m.id) === String(v.motorcycle_id));
  useEffect(() => {
    if (selectedMotor && !v.pickup_location_id && selectedMotor.location_id) {
      setV((s) => ({ ...s, pickup_location_id: String(selectedMotor.location_id) }));
    }
  }, [selectedMotor, v.pickup_location_id]);

  const dKey = useDebounce(`${v.motorcycle_id}|${v.start_date}|${v.end_date}`, 300);
  useEffect(() => {
    const [m, s, e] = dKey.split('|');
    if (!m || !s || !e || diffDays(s, e) < 1) { setQuote({ data: null, error: '' }); return undefined; }
    let alive = true;
    api.get('/rentals/quote', { motorcycle_id: m, start_date: s, end_date: e })
      .then((res) => alive && setQuote({ data: res.data, error: '' }))
      .catch((err) => alive && setQuote({ data: null, error: err.message }));
    return () => { alive = false; };
  }, [dKey]);

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const original = existing.data?.start_date || null;

  async function submit(e) {
    e.preventDefault();
    const errs = validateRental(v, today, { isEdit, originalStart: original });
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = { ...v, motorcycle_id: Number(v.motorcycle_id), customer_id: Number(v.customer_id), pickup_location_id: Number(v.pickup_location_id) };
      const res = isEdit ? await api.put(`/rentals/${id}`, payload) : await api.post('/rentals', payload);
      toast.success(isEdit ? 'Data sewa berhasil diperbarui' : `Sewa ${res.data.code} berhasil dibuat`);
      navigate('/sewa');
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setFormError(err.message);
    } finally { setSaving(false); }
  }

  if (isEdit && existing.loading && !existing.data) return <Spinner />;
  if (isEdit && existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />;
  if (customers.error && !customers.data) return <ErrorState error={customers.error} onRetry={customers.reload} />;
  if ((customers.loading && !customers.data) || (locs.loading && !locs.data)) return <Spinner />;

  const noCustomers = (customers.data || []).length === 0;

  return (
    <>
      <PageHeader title={isEdit ? 'Ubah pesanan' : 'Buat sewa baru'} subtitle={isEdit ? existing.data?.code : 'Pilih motor, pelanggan, dan tanggal sewa'} />
      <form className="rental-layout" onSubmit={submit} noValidate>
        <div className="panel">
          <div className="form-grid">
            <Field label="Tanggal mulai" error={errors.start_date} htmlFor="start_date">
              <input id="start_date" type="date" value={v.start_date} min={isEdit ? undefined : today} onChange={set('start_date')} />
            </Field>
            <Field label="Tanggal kembali" error={errors.end_date} htmlFor="end_date" hint="Hari pengembalian tidak dihitung sebagai hari sewa tambahan.">
              <input id="end_date" type="date" value={v.end_date} min={v.start_date ? addDays(v.start_date, 1) : undefined} onChange={set('end_date')} />
            </Field>
            <div className="span-2">
              <Field label="Motor" error={errors.motorcycle_id} htmlFor="motorcycle_id"
                hint={motors.loading ? 'Memeriksa ketersediaan...' : `${motorOptions.length} motor tersedia pada tanggal ini`}>
                <select id="motorcycle_id" value={v.motorcycle_id} onChange={(e) => setV((s) => ({ ...s, motorcycle_id: e.target.value, pickup_location_id: '' }))}>
                  <option value="">Pilih motor</option>
                  {motorOptions.map((m) => <option key={m.id} value={m.id}>{m.brand} {m.model} - {m.plate} ({rupiah(m.price_per_day)}/hari)</option>)}
                </select>
              </Field>
            </div>
            <div className="span-2">
              <Field label="Pelanggan" error={errors.customer_id} htmlFor="customer_id"
                hint={noCustomers ? undefined : <>Belum terdaftar? <Link className="link" to="/pelanggan?baru=1">Tambah pelanggan</Link></>}>
                <select id="customer_id" value={v.customer_id} onChange={set('customer_id')}>
                  <option value="">Pilih pelanggan</option>
                  {(customers.data || []).map((c) => <option key={c.id} value={c.id}>{c.full_name} - {c.phone}</option>)}
                </select>
              </Field>
              {noCustomers && <p className="field-hint">Belum ada pelanggan. <Link className="link" to="/pelanggan?baru=1">Tambah pelanggan</Link> terlebih dahulu.</p>}
            </div>
            <div className="span-2">
              <Field label="Lokasi jemput" error={errors.pickup_location_id} htmlFor="pickup_location_id">
                <select id="pickup_location_id" value={v.pickup_location_id} onChange={set('pickup_location_id')}>
                  <option value="">Pilih lokasi</option>
                  {(locs.data || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="span-2">
              <Field label="Catatan (opsional)" error={errors.notes} htmlFor="notes">
                <textarea id="notes" rows={3} maxLength={300} value={v.notes} onChange={set('notes')} placeholder="Contoh: butuh 2 helm, jemput di dermaga" />
              </Field>
            </div>
          </div>
        </div>

        <aside className="panel quote" aria-live="polite">
          <h2>Rincian biaya</h2>
          {quote.data ? (
            <dl className="quote-list">
              <div><dt>Tarif harian</dt><dd>{rupiah(quote.data.price_per_day)}</dd></div>
              <div><dt>Lama sewa</dt><dd>{quote.data.days} hari</dd></div>
              <div><dt>Subtotal</dt><dd>{rupiah(quote.data.subtotal)}</dd></div>
              {quote.data.discount_percent > 0 && <div className="discount"><dt>Diskon sewa {quote.data.discount_percent}%</dt><dd>- {rupiah(quote.data.discount_amount)}</dd></div>}
              <div className="total"><dt>Total</dt><dd>{rupiah(quote.data.total_price)}</dd></div>
            </dl>
          ) : (
            <p className="muted">{quote.error || (rangeOk ? 'Pilih motor untuk melihat total biaya.' : 'Isi tanggal sewa yang valid untuk melihat total biaya.')}</p>
          )}
          <p className="field-hint">Diskon 10% mulai 7 hari dan 15% mulai 14 hari. Keterlambatan dikenai denda per hari.</p>
          {v.start_date && v.end_date && rangeOk && <p className="muted">{formatDate(v.start_date)} s/d {formatDate(v.end_date)}</p>}
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button className="btn btn-primary btn-block" disabled={saving}>{saving ? 'Menyimpan...' : isEdit ? 'Simpan perubahan' : 'Buat pesanan'}</button>
          <Link to="/sewa" className="btn btn-ghost btn-block">Batal</Link>
        </aside>
      </form>
    </>
  );
}
