import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';

export default function Modal({ title, onClose, children, wide = false }) {
  validateComponentProps(Modal, { title, onClose, children, wide });
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    globalThis.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector('input, select, textarea');
    first?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      globalThis.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="overlay">
      <dialog open className={`modal ${wide ? 'modal-wide' : ''}`} aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={20} /></button>
        </header>
        {children}
      </dialog>
    </div>
  );
}

Modal.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: ReactNodePropType.isRequired,
  wide: PropTypes.bool,
};
