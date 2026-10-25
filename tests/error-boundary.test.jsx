import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import AppErrorBoundary from '../src/components/AppErrorBoundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AppErrorBoundary', () => {
  test('shows a recovery action when a descendant throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenPage() {
      throw new Error('render failed');
    }

    render(
      <AppErrorBoundary>
        <BrokenPage />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Aplikasi mengalami gangguan');
    expect(screen.getByRole('button', { name: 'Muat ulang halaman' })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  test('renders children when there is no error', () => {
    render(<AppErrorBoundary><p>Halaman tersedia</p></AppErrorBoundary>);

    expect(screen.getByText('Halaman tersedia')).toBeInTheDocument();
  });
});
