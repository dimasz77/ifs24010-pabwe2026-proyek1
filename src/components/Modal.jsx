import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';

export default function Modal({ title, onClose, children, wide = false }) {
  validateComponentProps(Modal, { title, onClose, children, wide });
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const focusable = () => [...dialog.querySelectorAll(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
    const items = focusable();
    const initialFocus = dialog.querySelector('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
    (initialFocus || items[0] || dialog).focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const currentItems = focusable();
      const first = currentItems[0];
      const last = currentItems[currentItems.length - 1];
      if (!first) {
        event.preventDefault();
      } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event) => {
      if (!dialog.contains(event.target)) {
        (initialFocus || items[0] || dialog).focus();
      }
    };
    globalThis.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      globalThis.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = prev;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className="overlay">
      <dialog open tabIndex={-1} className={`modal ${wide ? 'modal-wide' : ''}`} aria-modal="true" aria-label={title} ref={ref}>
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
