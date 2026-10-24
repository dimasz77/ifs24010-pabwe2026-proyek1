import { useState } from 'react';
import PropTypes from 'prop-types';
import { api, ApiError } from '../lib/api';
import { validateComponentProps } from '../lib/validateComponentProps';
import { validateMotor } from '../lib/validators';
import { MOTOR_TYPES } from '../lib/format';
import { Field } from '../components/ui';
import Modal from '../components/Modal';
import { useToast } from '../components/Feedback';

const EMPTY = {
  plate: '', brand: '', model: '', type: 'matic', engine_cc: '', year: new Date().getFullYear(),
  color: '', price_per_day: '', status: 'tersedia', location_id: '', notes: '',
};

export default function MotorForm({ motor, locations, onClose, onSaved }) {
  validateComponentProps(MotorForm, { motor, locations, onClose, onSaved });
  const toast = useToast();
  const [v, setV] = useState(motor ? { ...EMPTY, ...motor, color: motor.color || '', notes: motor.notes || '' } : EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = validateMotor(v);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = {
        ...v, engine_cc: Number(v.engine_cc), year: Number(v.year),
        price_per_day: Number(v.price_per_day), location_id: Number(v.location_id),
      };
      if (motor) await api.put(`/motorcycles/${motor.id}`, payload);
      else await api.post('/motorcycles', payload);
      toast.success(motor ? 'Data motor berhasil diperbarui' : 'Motor baru berhasil ditambahkan');
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={motor ? 'Ubah data motor' : 'Tambah motor'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Plat nomor" error={errors.plate} htmlFor="plate" hint="Contoh: BB 1234 AB">
            <input id="plate" value={v.plate} onChange={set('plate')} maxLength={12} />
          </Field>
          <Field label="Merek" error={errors.brand} htmlFor="brand">
            <input id="brand" value={v.brand} onChange={set('brand')} />
          </Field>
          <Field label="Model" error={errors.model} htmlFor="model">
            <input id="model" value={v.model} onChange={set('model')} />
          </Field>
          <Field label="Tipe" error={errors.type} htmlFor="type">
            <select id="type" value={v.type} onChange={set('type')}>
              {MOTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Kapasitas mesin (cc)" error={errors.engine_cc} htmlFor="engine_cc">
            <input id="engine_cc" type="number" inputMode="numeric" value={v.engine_cc} onChange={set('engine_cc')} />
          </Field>
          <Field label="Tahun" error={errors.year} htmlFor="year">
            <input id="year" type="number" inputMode="numeric" value={v.year} onChange={set('year')} />
          </Field>
          <Field label="Warna" error={errors.color} htmlFor="color">
            <input id="color" value={v.color} onChange={set('color')} />
          </Field>
          <Field label="Tarif per hari (Rp)" error={errors.price_per_day} htmlFor="price_per_day">
            <input id="price_per_day" type="number" inputMode="numeric" step="1000" value={v.price_per_day} onChange={set('price_per_day')} />
          </Field>
          <Field label="Lokasi penyimpanan" error={errors.location_id} htmlFor="location_id">
            <select id="location_id" value={v.location_id} onChange={set('location_id')}>
              <option value="">Pilih lokasi</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Status" error={errors.status} htmlFor="status">
            <select id="status" value={v.status} onChange={set('status')}>
              <option value="tersedia">Tersedia</option>
              <option value="perawatan">Perawatan</option>
            </select>
          </Field>
          <div className="span-2">
            <Field label="Catatan" error={errors.notes} htmlFor="notes">
              <textarea id="notes" rows={2} maxLength={300} value={v.notes} onChange={set('notes')} />
            </Field>
          </div>
        </div>
        {formError && !Object.keys(errors).length && <p className="form-error" role="alert">{formError}</p>}
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan motor'}</button>
        </footer>
      </form>
    </Modal>
  );
}

MotorForm.propTypes = {
  motor: PropTypes.oneOfType([
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      plate: PropTypes.string,
      brand: PropTypes.string,
      model: PropTypes.string,
      type: PropTypes.string,
      engine_cc: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      year: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      color: PropTypes.string,
      price_per_day: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      status: PropTypes.string,
      location_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      notes: PropTypes.string,
    }),
    PropTypes.oneOf([null]),
  ]),
  locations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};
