import PropTypes from 'prop-types';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';

export function Ulos({ tall = false }) {
  validateComponentProps(Ulos, { tall });
  return <div className={tall ? 'ulos ulos-tall' : 'ulos'} aria-hidden="true" />;
}

export function Spinner({ label = 'Memuat data...' }) {
  validateComponentProps(Spinner, { label });
  return (
    <output className="state">
      <div className="spinner" />
      <p className="muted">{label}</p>
    </output>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  validateComponentProps(Field, { label, error, hint, children, htmlFor });
  let message = null;
  if (error) message = <p className="field-error" role="alert">{error}</p>;
  else if (hint) message = <p className="field-hint">{hint}</p>;
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {message}
    </div>
  );
}

Ulos.propTypes = {
  tall: PropTypes.bool,
};

Spinner.propTypes = {
  label: PropTypes.string,
};

Field.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  hint: ReactNodePropType,
  children: ReactNodePropType.isRequired,
  htmlFor: PropTypes.string.isRequired,
};
