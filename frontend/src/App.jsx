import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { FeedbackProvider } from './components/Feedback';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Motorcycles from './pages/Motorcycles';
import Customers from './pages/Customers';
import Rentals from './pages/Rentals';
import RentalForm from './pages/RentalForm';
import NotFound from './pages/NotFound';

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner label="Memeriksa sesi..." />;
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
          <Routes>
            <Route path="masuk" element={<Login />} />
            <Route path="daftar" element={<Register />} />
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
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
