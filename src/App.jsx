import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FeedbackProvider } from './components/Feedback';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spinner } from './components/ui';
import { ReactNodePropType, validateComponentProps } from './lib/validateComponentProps';
import Login from './pages/Login';

const Layout = lazy(() => import('./components/Layout'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Motorcycles = lazy(() => import('./pages/Motorcycles'));
const Customers = lazy(() => import('./pages/Customers'));
const Rentals = lazy(() => import('./pages/Rentals'));
const RentalForm = lazy(() => import('./pages/RentalForm'));
const NotFound = lazy(() => import('./pages/NotFound'));

function LoadingPage({ title }) {
  return (
    <main className="route-loading" aria-busy="true">
      <h1 className="sr-only">{title}</h1>
      <Spinner label={`${title}...`} />
    </main>
  );
}

function RequireAuth({ children }) {
  validateComponentProps(RequireAuth, { children });
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingPage title="Memeriksa sesi" />;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

RequireAuth.propTypes = {
  children: ReactNodePropType.isRequired,
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
          <Suspense fallback={<LoadingPage title="Memuat halaman" />}>
            <Routes>
              <Route path="auth/login" element={<Login />} />
              <Route path="auth/register" element={<Register />} />
              <Route path="masuk" element={<Navigate to="/auth/login" replace />} />
              <Route path="daftar" element={<Navigate to="/auth/register" replace />} />
              <Route element={<RequireAuth><Layout /></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="motor" element={<Motorcycles />} />
                <Route path="pelanggan" element={<Customers />} />
                <Route path="sewa" element={<Rentals />} />
                <Route path="sewa/baru" element={<RentalForm />} />
                <Route path="sewa/:id/ubah" element={<RentalForm />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
