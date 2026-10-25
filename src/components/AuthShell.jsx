import PropTypes from 'prop-types';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';
import { Ulos } from './critical-ui';

export default function AuthShell({ title, subtitle, children, footer }) {
  validateComponentProps(AuthShell, { title, subtitle, children, footer });
  return (
    <div className="auth-page">
      <aside className="auth-side">
        <Ulos tall />
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5" />
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="15" cy="5" r="1" />
              <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
            </svg>
          </span>
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
