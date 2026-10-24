import { addDays, diffDays } from './format';

export const MAX_RENTAL_DAYS = 90;
const PLATE_RE = /^[A-Za-z]{1,2}\s?\d{1,4}\s?[A-Za-z]{0,3}$/;
const PHONE_RE = /^\+?\d[\d\s-]{6,18}$/;
const s = (v) => (v === undefined || v === null ? '' : String(v).trim());

function isAsciiAlphaNumeric(code) {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

export function isValidEmail(value) {
  const email = s(value);
  if (!email || email.length > 254) return false;

  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@') || at === email.length - 1) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || domain.length > 253) {
    return false;
  }

  const localSymbols = "!#$%&'*+/=?^_`{|}~-";
  for (const char of local) {
    const code = char.codePointAt(0);
    if (!isAsciiAlphaNumeric(code) && char !== '.' && !localSymbols.includes(char)) return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2 || labels.at(-1).length < 2) return false;

  return labels.every((label) => {
    if (label.length === 0 || label.length > 63 || label.startsWith('-') || label.endsWith('-')) return false;
    for (const char of label) {
      const code = char.codePointAt(0);
      if (!isAsciiAlphaNumeric(code) && char !== '-') return false;
    }
    return true;
  });
}

export function validateMotor(v, year = new Date().getFullYear()) {
  const e = {};
  if (!s(v.plate)) e.plate = 'Plat nomor wajib diisi';
  else if (!PLATE_RE.test(s(v.plate))) e.plate = 'Plat nomor tidak valid (contoh: BB 1234 AB)';
  if (!s(v.brand)) e.brand = 'Merek wajib diisi';
  if (!s(v.model)) e.model = 'Model wajib diisi';
  if (!s(v.type)) e.type = 'Tipe wajib dipilih';
  const cc = Number(v.engine_cc);
  if (!s(v.engine_cc)) e.engine_cc = 'Kapasitas mesin wajib diisi';
  else if (!Number.isInteger(cc) || cc < 50 || cc > 1000) e.engine_cc = 'Kapasitas mesin harus 50-1000 cc';
  const y = Number(v.year);
  if (!s(v.year)) e.year = 'Tahun wajib diisi';
  else if (!Number.isInteger(y) || y < 2000 || y > year + 1) e.year = `Tahun harus antara 2000 dan ${year + 1}`;
  const price = Number(v.price_per_day);
  if (!s(v.price_per_day)) e.price_per_day = 'Tarif per hari wajib diisi';
  else if (!Number.isInteger(price) || price < 20000) e.price_per_day = 'Tarif minimal Rp 20.000';
  else if (price > 2000000) e.price_per_day = 'Tarif maksimal Rp 2.000.000';
  if (!s(v.location_id)) e.location_id = 'Lokasi wajib dipilih';
  return e;
}

export function validateCustomer(v) {
  const e = {};
  if (s(v.full_name).length < 3) e.full_name = 'Nama lengkap minimal 3 karakter';
  if (!s(v.phone)) e.phone = 'Nomor telepon wajib diisi';
  else if (!PHONE_RE.test(s(v.phone))) e.phone = 'Nomor telepon tidak valid';
  if (s(v.email) && !isValidEmail(v.email)) e.email = 'Email tidak valid';
  if (s(v.id_number).length < 5) e.id_number = 'Nomor KTP/Paspor minimal 5 karakter';
  if (s(v.sim_number).length < 5) e.sim_number = 'Nomor SIM C minimal 5 karakter';
  return e;
}

export function validateRental(v, today, { isEdit = false, originalStart = null } = {}) {
  const e = {};
  if (!s(v.motorcycle_id)) e.motorcycle_id = 'Motor wajib dipilih';
  if (!s(v.customer_id)) e.customer_id = 'Pelanggan wajib dipilih';
  if (!s(v.pickup_location_id)) e.pickup_location_id = 'Lokasi jemput wajib dipilih';
  if (!s(v.start_date)) e.start_date = 'Tanggal mulai wajib diisi';
  else if (v.start_date < today && !(isEdit && v.start_date === originalStart)) {
    e.start_date = 'Tanggal mulai tidak boleh sebelum hari ini';
  }
  if (!s(v.end_date)) e.end_date = 'Tanggal kembali wajib diisi';
  else if (s(v.start_date) && diffDays(v.start_date, v.end_date) < 1) {
    e.end_date = 'Tanggal kembali harus setelah tanggal mulai';
  } else if (s(v.start_date) && diffDays(v.start_date, v.end_date) > MAX_RENTAL_DAYS) {
    e.end_date = `Lama sewa maksimal ${MAX_RENTAL_DAYS} hari per transaksi`;
  }
  return e;
}

export const minEndDate = (start) => (start ? addDays(start, 1) : undefined);
