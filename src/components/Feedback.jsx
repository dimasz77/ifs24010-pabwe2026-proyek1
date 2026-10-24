import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

export function FeedbackProvider({ children }) {
  validateComponentProps(FeedbackProvider, { children });
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((kind, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
  }), [push]);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (result) => { dialog.resolve(result); setDialog(null); };

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { dialog.resolve(false); setDialog(null); } };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <output className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.kind}`}>
              {t.kind === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
              <span>{t.message}</span>
              <button className="icon-btn" aria-label="Tutup notifikasi" onClick={() => dismiss(t.id)}><X size={16} /></button>
            </div>
          ))}
        </output>
        {dialog && (
          <div className="overlay">
            <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
              <h3 id="confirm-title">{dialog.title}</h3>
              <p>{dialog.message}</p>
              <div className="dialog-actions">
                <button className="btn btn-ghost" onClick={() => close(false)}>Batal</button>
                <button className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} autoFocus onClick={() => close(true)}>
                  {dialog.confirmText || 'Ya, lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

FeedbackProvider.propTypes = {
  children: ReactNodePropType.isRequired,
};
