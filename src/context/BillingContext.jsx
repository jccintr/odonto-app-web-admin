import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setSuspendedHandler } from '../api/client.js';
import { Billing } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';

const Ctx = createContext(null);
export const useBilling = () => useContext(Ctx);

/** Situação da assinatura para o painel (aviso de teste/atraso e bloqueio). Atualiza também quando a API responde 402 no meio do uso. */
export function BillingProvider({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);

  const reload = useCallback(async () => {
    try { setStatus(await Billing.status()); } catch { /* sem a situação, o painel segue sem aviso */ }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    reload();
    setSuspendedHandler(reload);
    return () => setSuspendedHandler(null);
  }, [user, reload]);

  const value = useMemo(() => ({ status, blocked: Boolean(status?.blocked), reload }), [status, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
