import { WifiOff, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import PropTypes from 'prop-types';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';
import { Field, Spinner, Ulos } from './critical-ui';

export { Field, Spinner, Ulos };

export function PageHeader({ title, subtitle, children }) {
  validateComponentProps(PageHeader, { title, subtitle, children });
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export const Badge = ({ tone = 'muted', children }) => {
  validateComponentProps(Badge, { tone, children });
  return <span className={`badge badge-${tone}`}>{children}</span>;
};

export function EmptyState({ title, text, action }) {
  validateComponentProps(EmptyState, { title, text, action });
  return (
    <div className="state empty">
      <p className="state-title">{title}</p>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  validateComponentProps(ErrorState, { error, onRetry });
  const network = error?.isNetwork;
  return (
    <div className="state error" role="alert">
      {network && <WifiOff size={32} />}
      <p className="state-title">{network ? 'Server tidak dapat dihubungi' : 'Data gagal dimuat'}</p>
      <p className="muted">{error?.message}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}><RefreshCw size={16} /> Coba lagi</button>
      )}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  validateComponentProps(Pagination, { meta, onPage });
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Halaman">
      <button className="btn btn-ghost btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        <ChevronLeft size={16} /> Sebelumnya
      </button>
      <span className="muted">Halaman {meta.page} dari {meta.totalPages} ({meta.total} data)</span>
      <button className="btn btn-ghost btn-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
        Berikutnya <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  validateComponentProps(SearchBox, { value, onChange, placeholder });
  return (
    <label className="searchbox">
      <Search size={18} aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: ReactNodePropType,
};

Badge.propTypes = {
  tone: PropTypes.string,
  children: ReactNodePropType.isRequired,
};

EmptyState.propTypes = {
  title: PropTypes.string.isRequired,
  text: PropTypes.string,
  action: ReactNodePropType,
};

ErrorState.propTypes = {
  error: PropTypes.shape({
    isNetwork: PropTypes.bool,
    message: PropTypes.string,
  }).isRequired,
  onRetry: PropTypes.func,
};

Pagination.propTypes = {
  meta: PropTypes.shape({
    page: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
  }),
  onPage: PropTypes.func.isRequired,
};

SearchBox.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
};
