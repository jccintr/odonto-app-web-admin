import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasSession, setSession, setUnauthorizedHandler } from '../api/client.js';
import { Auth } from '../api/index.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null); // { user, clinic }
  const [booting, setBooting] = useState(hasSession());

  const clear = useCallback(() => { setSession(null); setProfile(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setProfile(null));
    if (!hasSession()) return undefined;
    let alive = true;
    Auth.me().then((p) => { if (alive) setProfile(p); }).catch(() => {}).finally(() => { if (alive) setBooting(false); });
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => ({
    user: profile?.user ?? null,
    clinic: profile?.clinic ?? null,
    role: profile?.user?.role ?? null,
    isAdmin: profile?.user?.role === 'admin',
    booting,
    async login(email, password) {
      const session = await Auth.login(email, password);
      setSession(session);
      setProfile({ user: session.user, clinic: session.clinic });
    },
    async logout() {
      const refresh = localStorage.getItem('odonto:refresh');
      clear();
      if (refresh) await Auth.logout(refresh).catch(() => {});
    },
    /** depois de trocar a senha a API devolve uma sessão nova */
    adopt(session) { setSession(session); setProfile({ user: session.user, clinic: session.clinic }); },
    updateClinic: (clinic) => setProfile((p) => (p ? { ...p, clinic } : p)),
  }), [profile, booting, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
