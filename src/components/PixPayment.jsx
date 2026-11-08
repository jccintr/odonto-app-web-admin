import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { pixProblem } from '../lib/billing.js';
import { Alert, Button } from './ui.jsx';

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Como pagar uma fatura: QR Code, "copia e cola" e a chave Pix da plataforma. `pix` vem da fatura (null = Pix não configurado). */
export default function PixPayment({ pix }) {
  const ui = useUI();
  const [svg, setSvg] = useState(null);
  const payload = pix?.payload ?? null;

  useEffect(() => {
    setSvg(null);
    if (!payload) return undefined;
    let alive = true;
    QRCode.toString(payload, { type: 'svg', margin: 1, width: 192, errorCorrectionLevel: 'M' }).then((markup) => { if (alive) setSvg(markup); }).catch(() => {});
    return () => { alive = false; };
  }, [payload]);

  if (!pix) return <Alert tone="warning">O pagamento por Pix ainda não está configurado. Fale com o suporte para receber a chave.</Alert>;

  const copyText = async (text, what) => ((await copy(text)) ? ui.success(`${what} copiado.`) : ui.error('Não foi possível copiar. Selecione o texto e copie manualmente.'));

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {payload && (
        <div className="flex shrink-0 flex-col items-center gap-2">
          {svg ? <div role="img" aria-label="QR Code do Pix" className="size-48 rounded-lg bg-white p-1 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="size-48 animate-pulse rounded-lg bg-surface-2" />}
          <span className="text-xs text-muted">Aponte a câmera do app do seu banco</span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {payload ? (
          <div>
            <p className="mb-1 text-sm font-medium">Pix "copia e cola"</p>
            <textarea readOnly rows={4} value={payload} aria-label="Pix copia e cola" onFocus={(e) => e.target.select()} className="w-full rounded-lg border border-border-strong bg-surface-2 p-2 font-mono text-xs" />
            <Button className="mt-2" size="sm" variant="secondary" icon="copy" onClick={() => copyText(payload, 'Código Pix')}>Copiar código</Button>
          </div>
        ) : <Alert tone="warning">{pixProblem(pix.reason)}</Alert>}
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-muted">Chave Pix</dt><dd className="flex flex-wrap items-center gap-2 font-medium break-all">{pix.key}<Button size="sm" variant="ghost" icon="copy" onClick={() => copyText(pix.key, 'Chave')}>Copiar chave</Button></dd></div>
          <div><dt className="text-muted">Favorecido</dt><dd className="font-medium">{pix.beneficiary}</dd></div>
        </dl>
        {pix.instructions && <Alert tone="info">{pix.instructions}</Alert>}
      </div>
    </div>
  );
}
