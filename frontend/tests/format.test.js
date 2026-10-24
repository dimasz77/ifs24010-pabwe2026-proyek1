import { rupiah, formatDate, formatLongDate, todayWib, addDays, diffDays, typeLabel } from '../src/lib/format';

describe('format', () => {
  test('rupiah memakai pemisah ribuan Indonesia', () => {
    expect(rupiah(1425000)).toBe('Rp 1.425.000');
    expect(rupiah(0)).toBe('Rp 0');
    expect(rupiah(undefined)).toBe('Rp 0');
  });
  test('formatDate', () => {
    expect(formatDate('2026-10-21')).toMatch(/21/);
    expect(formatDate('2026-10-21')).toMatch(/2026/);
    expect(formatDate(null)).toBe('-');
    expect(formatDate('bukan-tanggal')).toBe('-');
  });
  test('formatLongDate and unknown motorcycle types have safe fallbacks', () => {
    expect(formatLongDate('2026-10-21')).toMatch(/2026/);
    expect(formatLongDate('bukan-tanggal')).toBe('');
    expect(typeLabel('unknown')).toBe('unknown');
  });
  test('todayWib memakai zona waktu Asia/Jakarta', () => {
    expect(todayWib(new Date('2026-10-21T20:00:00Z'))).toBe('2026-10-22');
    expect(todayWib(new Date('2026-10-21T10:00:00Z'))).toBe('2026-10-21');
  });
  test('addDays dan diffDays', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(diffDays('2026-10-01', '2026-10-08')).toBe(7);
  });
  test('typeLabel', () => {
    expect(typeLabel('trail')).toBe('Trail');
  });
});
