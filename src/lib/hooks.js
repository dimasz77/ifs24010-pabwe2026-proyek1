import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from './constants';

/** Memuat data async; key stabil menentukan kapan request diulang setelah render. */
export function useAsync(fn, key = '') {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const counter = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    const id = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef.current()
      .then((res) => {
        if (id === counter.current) setState({ data: res.data, meta: res.meta, loading: false, error: null });
      })
      .catch((error) => {
        if (id === counter.current && error.name !== 'AbortError') {
          setState((s) => ({ ...s, loading: false, error }));
        }
      });
  }, []);

  useEffect(() => {
    run();
    return () => { counter.current += 1; };
  }, [run, key]);

  return { ...state, reload: run };
}

export function useDebounce(value, delay = DEFAULT_DEBOUNCE_MS) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
