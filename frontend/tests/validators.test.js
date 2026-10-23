import { validateMotor, validateCustomer, validateRental } from '../src/lib/validators';

const motor = { plate: 'BB 1234 AB', brand: 'Honda', model: 'Beat', type: 'matic', engine_cc: 110, year: 2023, price_per_day: 80000, location_id: 1 };

describe('validateMotor', () => {
  test('data valid -> tanpa error', () => expect(validateMotor(motor)).toEqual({}));
  test('data kosong -> semua kolom wajib terdeteksi', () => {
    const e = validateMotor({});
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['plate', 'brand', 'model', 'engine_cc', 'year', 'price_per_day', 'location_id']));
  });
  test('plat, tarif, dan tahun tidak valid', () => {
    expect(validateMotor({ ...motor, plate: '###' }).plate).toMatch(/tidak valid/);
    expect(validateMotor({ ...motor, price_per_day: 5000 }).price_per_day).toMatch(/minimal/);
    expect(validateMotor({ ...motor, year: 1990 }).year).toBeDefined();
  });
});

describe('validateCustomer', () => {
  const c = { full_name: 'Budi Santoso', phone: '0812 3456 7890', id_number: '1234567890', sim_number: 'SIM12345' };
  test('valid', () => expect(validateCustomer(c)).toEqual({}));
  test('email dan telepon salah', () => {
    const e = validateCustomer({ ...c, email: 'x', phone: 'abc' });
    expect(e.email).toBeDefined();
    expect(e.phone).toBeDefined();
  });
  test('nama terlalu pendek', () => expect(validateCustomer({ ...c, full_name: 'Bu' }).full_name).toBeDefined());
});

describe('validateRental', () => {
  const r = { motorcycle_id: '1', customer_id: '2', pickup_location_id: '3', start_date: '2026-10-25', end_date: '2026-10-27' };
  test('valid', () => expect(validateRental(r, '2026-10-21')).toEqual({}));
  test('tanggal lampau dan terbalik', () => {
    expect(validateRental({ ...r, start_date: '2026-10-01' }, '2026-10-21').start_date).toBeDefined();
    expect(validateRental({ ...r, end_date: '2026-10-25' }, '2026-10-21').end_date).toBeDefined();
  });
  test('durasi lebih dari 90 hari ditolak', () => {
    expect(validateRental({ ...r, end_date: '2027-03-01' }, '2026-10-21').end_date).toMatch(/maksimal 90 hari/);
  });
  test('mode ubah mengizinkan tanggal mulai asli yang sudah lewat', () => {
    const v = { ...r, start_date: '2026-10-20', end_date: '2026-10-23' };
    expect(validateRental(v, '2026-10-21', { isEdit: true, originalStart: '2026-10-20' })).toEqual({});
  });
});
