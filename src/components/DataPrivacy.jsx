import { useState } from 'react';
import { Account } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { dayOf, formatDay } from '../lib/dates.js';
import { exportFileName } from '../lib/billing.js';
import { Billing } from '../api/index.js';
import { Alert, Button, Card, CardHeader, Field, Input, Modal, PasswordInput } from './ui.jsx';

/** LGPD (administrador): exportar todos os dados da clínica e pedir a exclusão da conta. Funciona mesmo com a assinatura suspensa. */
export default function DataPrivacy() {
  const { clinic } = useAuth();
  const ui = useUI();
  const billing = useResource(() => Billing.get(), []);
  const [exporting, setExporting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const requested = billing.data?.deletionRequestedAt;

  const download = async () => {
    setExporting(true);
    try {
      const data = await Account.export();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = exportFileName(clinic, dayOf());
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      ui.success('Exportação pronta. Guarde o arquivo em local seguro: ele tem dados de pacientes.');
    } catch (err) { ui.error(err); } finally { setExporting(false); }
  };

  const requestDeletion = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await Account.requestDeletion(password);
      setAsking(false); setPassword('');
      await billing.reload();
      ui.success('Pedido de exclusão registrado.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const cancel = async () => {
    try { await Account.cancelDeletion(); await billing.reload(); ui.success('Pedido de exclusão cancelado.'); } catch (err) { ui.error(err); }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Meus dados e privacidade" subtitle="Seus dados e os dos seus pacientes são da clínica (LGPD)." />
      <div className="grid gap-6 p-5 md:grid-cols-2">
        <div>
          <h3 className="font-medium">Exportar todos os dados</h3>
          <p className="mt-1 text-sm text-muted">Baixa um arquivo com pacientes, atendimentos, orçamentos, pagamentos e repasses. Faça uma cópia de tempos em tempos.</p>
          <Button className="mt-3" icon="download" variant="secondary" loading={exporting} onClick={download}>Exportar meus dados</Button>
        </div>
        <div>
          <h3 className="font-medium">Excluir a conta e os dados</h3>
          {requested ? (
            <>
              <Alert tone="warning" className="mt-2">Pedido de exclusão registrado em {formatDay(dayOf(requested))}. Nós apagamos os dados e avisamos você. Mudou de ideia?</Alert>
              <Button className="mt-3" variant="secondary" onClick={cancel}>Cancelar o pedido</Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Pede a exclusão definitiva da clínica. Exporte os dados antes: o prontuário tem prazo de guarda previsto em lei e a decisão é da clínica.</p>
              <Button className="mt-3" variant="danger" onClick={() => setAsking(true)}>Pedir exclusão da conta</Button>
            </>
          )}
        </div>
      </div>
      <Modal open={asking} onClose={() => setAsking(false)} title="Pedir exclusão da conta">
        <form onSubmit={requestDeletion} className="flex flex-col gap-4" noValidate>
          <Alert tone="warning">Isso registra o pedido para apagar a clínica, os pacientes e todo o histórico. Digite sua senha para confirmar.</Alert>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Sua senha">{({ id }) => <PasswordInput id={id} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAsking(false)}>Voltar</Button>
            <Button type="submit" variant="danger" loading={busy} disabled={!password}>Confirmar pedido</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
