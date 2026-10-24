import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAsync, useDebounce } from '../lib/hooks';
import { useLocations } from '../lib/data';
import { validateRental } from '../lib/validators';
import { rupiah, todayWib, addDays, diffDays, formatDate } from '../lib/format';
import { PageHeader, Spinner, ErrorState, Field } from '../components/ui';
import { useToast } from '../components/Feedback';

function useRentalData(id, isEdit, values, setValues) {
  const locations = useLocations();
  const customers = useAsync(() => api.get('/customers', { limit: 100 }), []);
  const existing = useAsync(() => (isEdit ? api.get(`/rentals/${id}`) : Promise.resolve({ data: null })), [id]);

  useEffect(() => {
    const rental = existing.data;
    if (!rental) return;
    setValues({
      motorcycle_id: String(rental.motorcycle_id),
      customer_id: String(rental.customer_id),
      pickup_location_id: String(rental.pickup_location_id),
      start_date: rental.start_date,
      end_date: rental.end_date,
      notes: rental.notes || '',
    });
  }, [existing.data, setValues]);

  const rangeOk = values.start_date && values.end_date && diffDays(values.start_date, values.end_date) >= 1;
  const motors = useAsync(
    () => api.get('/motorcycles', {
      status: 'tersedia',
      limit: 100,
      sort: 'brand',
      ...(rangeOk ? { available_from: values.start_date, available_to: values.end_date } : {}),
    }),
    [rangeOk ? values.start_date : '', rangeOk ? values.end_date : ''],
  );

  const motorOptions = useMemo(() => {
    const list = motors.data || [];
    const rental = existing.data;
    const motorIsListed = rental && list.some((motor) => motor.id === rental.motorcycle_id);
    if (!rental || motorIsListed) return list;
    const unavailableMotor = {
      id: rental.motorcycle_id,
      brand: rental.motorcycle_name,
      model: '',
      plate: rental.motorcycle_plate,
      price_per_day: rental.price_per_day,
      location_id: rental.pickup_location_id,
    };
    return [unavailableMotor, ...list];
  }, [motors.data, existing.data]);

  const selectedMotor = motorOptions.find((motor) => String(motor.id) === String(values.motorcycle_id));
  useEffect(() => {
    if (!selectedMotor || values.pickup_location_id || !selectedMotor.location_id) return;
    setValues((current) => ({ ...current, pickup_location_id: String(selectedMotor.location_id) }));
  }, [selectedMotor, values.pickup_location_id, setValues]);

  return { locations, customers, existing, motors, motorOptions, rangeOk };
}

function useRentalQuote(values) {
  const debouncedKey = useDebounce(`${values.motorcycle_id}|${values.start_date}|${values.end_date}`, 300);
  const [quote, setQuote] = useState({ data: null, error: '' });

  useEffect(() => {
    const [motorId, startDate, endDate] = debouncedKey.split('|');
    const validRange = motorId && startDate && endDate && diffDays(startDate, endDate) >= 1;
    if (!validRange) {
      setQuote({ data: null, error: '' });
      return undefined;
    }

    let active = true;
    api.get('/rentals/quote', { motorcycle_id: motorId, start_date: startDate, end_date: endDate })
      .then((response) => {
        if (active) setQuote({ data: response.data, error: '' });
      })
      .catch((error) => {
        if (active) setQuote({ data: null, error: error.message });
      });
    return () => { active = false; };
  }, [debouncedKey]);

  return quote;
}

function renderRentalFields({ values, errors, locations, customers, motors, motorOptions, noCustomers, isEdit, today, setField, setValues }) {
  return (
    <div className="panel">
      <div className="form-grid">
        <Field label="Tanggal mulai" error={errors.start_date} htmlFor="start_date">
          <input id="start_date" type="date" value={values.start_date} min={isEdit ? undefined : today} onChange={setField('start_date')} />
        </Field>
        <Field label="Tanggal kembali" error={errors.end_date} htmlFor="end_date" hint="Hari pengembalian tidak dihitung sebagai hari sewa tambahan.">
          <input id="end_date" type="date" value={values.end_date} min={values.start_date ? addDays(values.start_date, 1) : undefined} onChange={setField('end_date')} />
        </Field>
        <div className="span-2">
          <Field label="Motor" error={errors.motorcycle_id} htmlFor="motorcycle_id"
            hint={motors.loading ? 'Memeriksa ketersediaan...' : `${motorOptions.length} motor tersedia pada tanggal ini`}>
            <select id="motorcycle_id" value={values.motorcycle_id} onChange={(event) => setValues((current) => ({
              ...current,
              motorcycle_id: event.target.value,
              pickup_location_id: '',
            }))}>
              <option value="">Pilih motor</option>
              {motorOptions.map((motor) => (
                <option key={motor.id} value={motor.id}>
                  {motor.brand} {motor.model} - {motor.plate} ({rupiah(motor.price_per_day)}/hari)
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="span-2">
          <Field label="Pelanggan" error={errors.customer_id} htmlFor="customer_id"
            hint={noCustomers ? undefined : <>Belum terdaftar? <Link className="link" to="/pelanggan?baru=1">Tambah pelanggan</Link></>}>
            <select id="customer_id" value={values.customer_id} onChange={setField('customer_id')}>
              <option value="">Pilih pelanggan</option>
              {(customers.data || []).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.full_name} - {customer.phone}</option>
              ))}
            </select>
          </Field>
          {noCustomers && <p className="field-hint">Belum ada pelanggan. <Link className="link" to="/pelanggan?baru=1">Tambah pelanggan</Link> terlebih dahulu.</p>}
        </div>
        <div className="span-2">
          <Field label="Lokasi jemput" error={errors.pickup_location_id} htmlFor="pickup_location_id">
            <select id="pickup_location_id" value={values.pickup_location_id} onChange={setField('pickup_location_id')}>
              <option value="">Pilih lokasi</option>
              {(locations.data || []).map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="span-2">
          <Field label="Catatan (opsional)" error={errors.notes} htmlFor="notes">
            <textarea id="notes" rows={3} maxLength={300} value={values.notes} onChange={setField('notes')} placeholder="Contoh: butuh 2 helm, jemput di dermaga" />
          </Field>
        </div>
      </div>
    </div>
  );
}

function renderQuotePanel({ quote, rangeOk, values, formError, saving, submitLabel }) {
  let quoteMessage = 'Isi tanggal sewa yang valid untuk melihat total biaya.';
  if (rangeOk) quoteMessage = 'Pilih motor untuk melihat total biaya.';
  if (quote.error) quoteMessage = quote.error;

  return (
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
      ) : <p className="muted">{quoteMessage}</p>}
      <p className="field-hint">Diskon 10% mulai 7 hari dan 15% mulai 14 hari. Keterlambatan dikenai denda per hari.</p>
      {values.start_date && values.end_date && rangeOk && <p className="muted">{formatDate(values.start_date)} s/d {formatDate(values.end_date)}</p>}
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <button className="btn btn-primary btn-block" disabled={saving}>{submitLabel}</button>
      <Link to="/sewa" className="btn btn-ghost btn-block">Batal</Link>
    </aside>
  );
}

function getRentalLoadingState(isEdit, existing, customers, locations) {
  if (isEdit && existing.loading && !existing.data) return <Spinner />;
  if (isEdit && existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />;
  if (customers.error && !customers.data) return <ErrorState error={customers.error} onRetry={customers.reload} />;
  if ((customers.loading && !customers.data) || (locations.loading && !locations.data)) return <Spinner />;
  return null;
}

async function submitRental(event, { values, today, isEdit, originalStart, id, setErrors, setFormError, setSaving, toast, navigate }) {
  event.preventDefault();
  const validationErrors = validateRental(values, today, { isEdit, originalStart });
  setErrors(validationErrors);
  setFormError('');
  if (Object.keys(validationErrors).length) return;

  setSaving(true);
  try {
    const payload = {
      ...values,
      motorcycle_id: Number(values.motorcycle_id),
      customer_id: Number(values.customer_id),
      pickup_location_id: Number(values.pickup_location_id),
    };
    const response = isEdit
      ? await api.put(`/rentals/${id}`, payload)
      : await api.post('/rentals', payload);
    const message = isEdit ? 'Data sewa berhasil diperbarui' : `Sewa ${response.data.code} berhasil dibuat`;
    toast.success(message);
    navigate('/sewa');
  } catch (error) {
    if (error instanceof ApiError && error.details) setErrors(error.details);
    setFormError(error.message);
  } finally {
    setSaving(false);
  }
}

export default function RentalForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const today = todayWib();

  const [v, setV] = useState({
    motorcycle_id: params.get('motor') || '', customer_id: params.get('pelanggan') || '', pickup_location_id: '',
    start_date: today, end_date: addDays(today, 1), notes: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const { locations, customers, existing, motors, motorOptions, rangeOk } = useRentalData(id, isEdit, v, setV);
  const quote = useRentalQuote(v);
  const setField = (key) => (event) => setV((current) => ({ ...current, [key]: event.target.value }));
  const original = existing.data?.start_date || null;

  const loadingState = getRentalLoadingState(isEdit, existing, customers, locations);
  if (loadingState) return loadingState;
  const noCustomers = (customers.data || []).length === 0;
  let submitLabel = 'Buat pesanan';
  if (isEdit) submitLabel = 'Simpan perubahan';
  if (saving) submitLabel = 'Menyimpan...';
  const pageTitle = isEdit ? 'Ubah pesanan' : 'Buat sewa baru';
  const pageSubtitle = isEdit ? existing.data?.code : 'Pilih motor, pelanggan, dan tanggal sewa';
  const submit = (event) => submitRental(event, {
    values: v,
    today,
    isEdit,
    originalStart: original,
    id,
    setErrors,
    setFormError,
    setSaving,
    toast,
    navigate,
  });

  return (
    <>
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />
      <form className="rental-layout" onSubmit={submit} noValidate>
        {renderRentalFields({
          values: v,
          errors,
          locations,
          customers,
          motors,
          motorOptions,
          noCustomers,
          isEdit,
          today,
          setField,
          setValues: setV,
        })}
        {renderQuotePanel({ quote, rangeOk, values: v, formError, saving, submitLabel })}
      </form>
    </>
  );
}
