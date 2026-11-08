import { useEffect, useState } from 'react';

/** Valor "atrasado": só muda depois que o usuário para de digitar (padrão 300 ms). */
export default function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
