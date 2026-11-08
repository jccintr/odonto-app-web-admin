import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Button, Modal, Textarea, Field, cx } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { errorMessage } from '../api/client.js';

const Ctx = createContext(null);
export const useUI = () => useContext(Ctx);

const TOAST_TONE = { success: 'bg-success text-white', error: 'bg-danger text-white', info: 'bg-text text-bg' };

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const seq = useRef(0);

  const toast = useCallback((message, { kind = 'info', ms = 4500 } = {}) => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), ms);
  }, []);

  // confirm({ title, message, confirmLabel, danger, askReason }) → Promise<false | true | string (motivo digitado)>
  const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);

  const value = useMemo(() => ({
    toast,
    success: (message) => toast(message, { kind: 'success' }),
    error: (err) => toast(typeof err === 'string' ? err : errorMessage(err), { kind: 'error', ms: 7000 }),
    confirm,
  }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={cx('pointer-events-auto flex max-w-md animate-toast-in items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg', TOAST_TONE[t.kind])}>
            <Icon name={t.kind === 'error' ? 'alert' : 'check'} className="size-4 shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog {...dialog} onClose={(answer) => { dialog.resolve(answer); setDialog(null); }} />}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger, askReason, reasonLabel = 'Motivo (opcional)', onClose }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open size="sm" title={title} onClose={() => onClose(false)}
      footer={(
        <>
          <Button variant="secondary" onClick={() => onClose(false)}>Voltar</Button>
          <Button variant={danger ? 'danger' : 'primary'} data-autofocus onClick={() => onClose(askReason ? reason.trim() || true : true)}>{confirmLabel}</Button>
        </>
      )}>
      {message && <p className="text-muted">{message}</p>}
      {askReason && <Field label={reasonLabel} className="mt-3">{({ id }) => <Textarea id={id} value={reason} maxLength={240} onChange={(e) => setReason(e.target.value)} />}</Field>}
    </Modal>
  );
}
