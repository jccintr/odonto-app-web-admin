import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);
const KEY = 'odonto:theme';

const initial = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch { /* sem armazenamento */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Tema claro/escuro: começa pelo que o aparelho prefere, e a escolha do usuário fica salva. */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initial);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  const setTheme = useCallback((next) => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignora */ }
  }, []);
  const value = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }), [theme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
