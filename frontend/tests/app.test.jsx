import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import App from '../src/App';

const respond = (data) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data }),
});

afterEach(() => {
  cleanup();
  localStorage.removeItem('jenika_token');
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('App routes and authenticated layout', () => {
  test('redirects unauthenticated users to the login page', async () => {
    window.history.replaceState({}, '', '/sewa');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  test('restores the session, displays the offline warning, and logs out', async () => {
    localStorage.setItem('jenika_token', 'test-session-token');
    window.history.replaceState({}, '', '/');
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/auth/me')) return Promise.resolve(respond({ name: 'Admin', username: 'admin' }));
      if (String(url).includes('/health')) return Promise.reject(new TypeError('Network unavailable'));
      if (String(url).includes('/dashboard/summary')) {
        return Promise.resolve(respond({
          today: '2026-10-24',
          fleet: { available: 0, rented: 0, maintenance: 0, total: 0 },
          rentals: { overdue: 0, active: 0, booked: 0, completed_this_month: 0 },
          customers: 0,
          revenue_this_month: 0,
          fleet_by_type: [],
          upcoming_returns: [],
          recent_rentals: [],
        }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Horas! Ringkasan hari ini' })).toBeInTheDocument();
    expect(screen.getByText('@admin')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Server backend tidak merespons');
    expect(screen.getByRole('navigation', { name: 'Menu utama' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /keluar/i }));
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument();
    expect(localStorage.getItem('jenika_token')).toBeNull();
  });
});
