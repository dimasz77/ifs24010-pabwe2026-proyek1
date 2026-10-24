import { act, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { useAsync, useDebounce } from '../src/lib/hooks';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function AsyncHarness({ requestId, load }) {
  const result = useAsync(() => load(requestId), [requestId]);
  return <p>{result.loading ? 'loading' : result.error ? `error:${result.error.message}` : `data:${result.data.value}`}</p>;
}

function DebounceHarness() {
  const [value, setValue] = useState('first');
  const debounced = useDebounce(value, 200);
  return (
    <>
      <p>{debounced}</p>
      <button onClick={() => setValue('second')}>Change value</button>
    </>
  );
}

describe('async hooks', () => {
  test('ignores responses from requests superseded by newer dependencies', async () => {
    const requests = [deferred(), deferred()];
    const load = vi.fn((id) => requests[id - 1].promise);
    const { rerender } = render(<AsyncHarness requestId={1} load={load} />);

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender(<AsyncHarness requestId={2} load={load} />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    await act(async () => requests[0].resolve({ data: { value: 'stale' } }));
    expect(screen.getByText('loading')).toBeInTheDocument();
    await act(async () => requests[1].resolve({ data: { value: 'current' } }));

    expect(await screen.findByText('data:current')).toBeInTheDocument();
  });

  test('ignores abort errors without changing the loading state', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const load = vi.fn(() => Promise.reject(abort));

    render(<AsyncHarness requestId={1} load={load} />);
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    await act(async () => Promise.resolve());

    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  test('cancels an old debounce timer when the value changes again', async () => {
    vi.useFakeTimers();
    const { unmount } = render(<DebounceHarness />);

    try {
      await act(async () => vi.advanceTimersByTime(200));
      expect(screen.getByText('first')).toBeInTheDocument();
      await act(async () => screen.getByRole('button', { name: 'Change value' }).click());
      await act(async () => vi.advanceTimersByTime(100));
      expect(screen.getByText('first')).toBeInTheDocument();
      await act(async () => vi.advanceTimersByTime(100));
      expect(screen.getByText('second')).toBeInTheDocument();
    } finally {
      unmount();
      vi.useRealTimers();
    }
  });
});
