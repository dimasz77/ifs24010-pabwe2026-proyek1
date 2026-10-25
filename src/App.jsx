import { lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useOutlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spinner } from './components/critical-ui';
import Login from './pages/Login';
import Home from './pages/Home';

const Layout = lazy(() => import('./components/Layout'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Motorcycles = lazy(() => import('./pages/Motorcycles'));
const Customers = lazy(() => import('./pages/Customers'));
const Rentals = lazy(() => import('./pages/Rentals'));
const RentalForm = lazy(() => import('./pages/RentalForm'));
const NotFound = lazy(() => import('./pages/NotFound'));

function HomeRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingPage title="Memeriksa sesi" />;
  if (!user) return <Home />;
  return <Layout><Dashboard /></Layout>;
}

function LoadingPage({ title }) {
  return (
    <main className="route-loading" aria-busy="true">
      <h1 className="sr-only">{title}</h1>
      <Spinner label={`${title}...`} />
    </main>
  );
}

LoadingPage.propTypes = {
  title: PropTypes.string.isRequired,
};

function ProtectedArea() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const outlet = useOutlet();

  if (!ready) return <LoadingPage title="Memeriksa sesi" />;

  if (!user) {
    const pageTitle = location.pathname.startsWith('/motor')
      ? 'Armada motor'
      : location.pathname.startsWith('/pelanggan')
        ? 'Pelanggan'
        : 'Penyewaan';

    return (
      <main className="public-home-main public-protected-info">
        <p className="public-home-eyebrow">Jenika Rental</p>
        <h1>{pageTitle}</h1>
        <p className="public-home-description">
          Masuk ke akun untuk melihat dan mengelola data {pageTitle.toLowerCase()}.
        </p>
        <div className="public-home-actions">
          <Link
            className="btn btn-primary"
            to="/auth/login"
            state={{ from: location.pathname + location.search }}
          >
            Masuk untuk melanjutkan
          </Link>
        </div>
      </main>
    );
  }

  return <Layout>{outlet}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingPage title="Memuat halaman" />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="auth/login" element={<Login />} />
            <Route path="auth/register" element={<Register />} />
            <Route path="masuk" element={<Navigate to="/auth/login" replace />} />
            <Route path="daftar" element={<Navigate to="/auth/register" replace />} />
            <Route element={<ProtectedArea />}>
              <Route path="motor" element={<Motorcycles />} />
              <Route path="pelanggan" element={<Customers />} />
              <Route path="sewa" element={<Rentals />} />
              <Route path="sewa/baru" element={<RentalForm />} />
              <Route path="sewa/:id/ubah" element={<RentalForm />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
