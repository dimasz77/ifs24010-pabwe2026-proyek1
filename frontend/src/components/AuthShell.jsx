import { Bike } from 'lucide-react';
import PropTypes from 'prop-types';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';
import { Ulos } from './ui';

export default function AuthShell({ title, subtitle, children, footer }) {
  validateComponentProps(AuthShell, { title, subtitle, children, footer });
  return (
    <div className="auth-page">
      <aside className="auth-side">
        <Ulos tall />
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true"><Bike size={26} /></span>
          <p className="auth-brand-name">Jenika Rental</p>
        </div>
        <p className="auth-tagline">Kelola armada, pelanggan, dan penyewaan motor di Samosir dalam satu tempat.</p>
        <p className="auth-places">Tomok &middot; Tuktuk &middot; Ambarita &middot; Pangururan &middot; Simanindo</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </main>
    </div>
  );
}

AuthShell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: ReactNodePropType.isRequired,
  footer: ReactNodePropType,
};
