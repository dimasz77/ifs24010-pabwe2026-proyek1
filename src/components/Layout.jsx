import { useEffect, useState } from 'react';
import { NavLink, Outlet, useOutlet } from 'react-router-dom';
import { LayoutDashboard, Bike, Users, ClipboardList, WifiOff, LogOut } from 'lucide-react';
import { FeedbackProvider } from './Feedback';
import { api } from '../lib/api';
import { Ulos } from './ui';
import { useAuth } from '../context/AuthContext';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';

const NAV = [
  { to: '/', label: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/motor', label: 'Armada Motor', icon: Bike },
  { to: '/sewa', label: 'Penyewaan', icon: ClipboardList },
  { to: '/pelanggan', label: 'Pelanggan', icon: Users },
];

function useBackendStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let alive = true;
    const ping = () => api.get('/health').then(() => alive && setOnline(true)).catch(() => alive && setOnline(false));
    ping();
    const t = setInterval(ping, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return online;
}

export default function Layout({ children }) {
  validateComponentProps(Layout, { children });
  const online = useBackendStatus();
  const { user, logout } = useAuth();
  const outlet = useOutlet();
  return (
    <FeedbackProvider>
      <div className="shell">
        <aside className="sidebar">
          <Ulos />
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"><Bike size={22} /></span>
            <div>
              <p className="brand-name">Jenika Rental</p>
              <p className="brand-sub">Rental motor Samosir</p>
            </div>
          </div>
          <nav className="nav" aria-label="Menu utama">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={20} aria-hidden="true" /> <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="user-box">
            <div className="user-info">
              <p className="user-name">{user?.name}</p>
              <p className="user-email">@{user?.username}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={logout}><LogOut size={16} /> Keluar</button>
          </div>
          <p className="sidebar-foot">Tomok, Tuktuk, Ambarita, Pangururan, dan Simanindo</p>
        </aside>

        <div className="main">
          {!online && (
            <div className="banner" role="alert">
              <WifiOff size={18} /> Server backend tidak merespons. Data mungkin tidak terbarui; sistem mencoba menghubungi ulang otomatis.
            </div>
          )}
          <main className="content">{children ?? outlet}</main>
        </div>
      </div>
    </FeedbackProvider>
  );
}

Layout.propTypes = {
  children: ReactNodePropType,
};
