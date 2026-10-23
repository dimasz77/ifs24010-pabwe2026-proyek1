import { WifiOff, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export const Ulos = ({ tall = false }) => <div className={tall ? 'ulos ulos-tall' : 'ulos'} aria-hidden="true" />;

export function PageHeader({ title, subtitle, children }) {
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

export const Badge = ({ tone = 'muted', children }) => <span className={`badge badge-${tone}`}>{children}</span>;

export function Spinner({ label = 'Memuat data...' }) {
  return (
    <div className="state" role="status">
      <div className="spinner" />
      <p className="muted">{label}</p>
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="state empty">
      <p className="state-title">{title}</p>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
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
  return (
    <label className="searchbox">
      <Search size={18} aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
