import { useCallback, useEffect, useRef, useState } from 'react';

/** Memuat data async dengan state loading/error dan reload manual. Hasil lama diabaikan bila ada permintaan baru. */
export function useAsync(fn, deps = []) {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
    return () => { counter.current += 1; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, reload: run };
}

export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
