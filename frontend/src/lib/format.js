const rupiahFmt = new Intl.NumberFormat('id-ID');
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const longDateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const rupiah = (n) => `Rp ${rupiahFmt.format(Number(n) || 0)}`;

export function formatDate(s) {
  if (!s) return '-';
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '-' : dateFmt.format(d);
}
export function formatLongDate(s) {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : longDateFmt.format(d);
}

/** Tanggal hari ini (YYYY-MM-DD) menurut WIB. */
export function todayWib(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
}

export function addDays(s, n) {
  return new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}
export function diffDays(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export const MOTOR_TYPES = [
  { value: 'matic', label: 'Matic' },
  { value: 'bebek', label: 'Bebek' },
  { value: 'sport', label: 'Sport' },
  { value: 'trail', label: 'Trail' },
];
export const typeLabel = (v) => MOTOR_TYPES.find((t) => t.value === v)?.label || v;

export const RENTAL_STATUS = {
  dipesan: { label: 'Dipesan', tone: 'info' },
  berjalan: { label: 'Berjalan', tone: 'brand' },
  selesai: { label: 'Selesai', tone: 'ok' },
  dibatalkan: { label: 'Dibatalkan', tone: 'muted' },
};
