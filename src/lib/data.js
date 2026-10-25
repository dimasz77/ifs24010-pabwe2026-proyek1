import { useAsync } from './hooks';
import { api } from './api';

/** Daftar lokasi jemput (data master, jarang berubah). */
export function useLocations() {
  return useAsync(() => api.get('/locations'));
}
