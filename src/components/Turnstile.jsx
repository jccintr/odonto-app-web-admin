import { useEffect, useRef } from 'react';

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading;
const loadScript = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = SCRIPT; tag.async = true;
    tag.onload = () => resolve(window.turnstile);
    tag.onerror = () => { loading = null; reject(new Error('Não foi possível carregar a verificação anti-robô.')); };
    document.head.appendChild(tag);
  });
  return loading;
};

/** Verificação anti-robô da Cloudflare (Turnstile). `onToken(token | null)`: null quando expira ou falha. */
export default function Turnstile({ siteKey, onToken }) {
  const box = useRef(null);
  const handler = useRef(onToken);
  handler.current = onToken;

  useEffect(() => {
    let widget; let alive = true;
    loadScript().then((turnstile) => {
      if (!alive) return;
      widget = turnstile.render(box.current, {
        sitekey: siteKey,
        callback: (token) => handler.current(token),
        'expired-callback': () => handler.current(null),
        'error-callback': () => handler.current(null),
      });
    }).catch(() => handler.current(null));
    return () => { alive = false; if (widget !== undefined) window.turnstile?.remove(widget); };
  }, [siteKey]);

  return <div ref={box} data-testid="turnstile" />;
}
