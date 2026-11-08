import { useState } from 'react';
import { Billing } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import PixPayment from '../components/PixPayment.jsx';
import { Alert, Badge, Button, Card, CardHeader, ErrorState, Field, Loading, Modal, PageHeader, Table, Textarea } from '../components/ui.jsx';
import { useBilling } from '../context/BillingContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { BILLING_STATE, dentistLimitLabel, pluralDays, periodLabel } from '../lib/billing.js';
import { dayOf, formatDateTime, formatDay } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';

function StatusSummary({ data }) {
  const info = BILLING_STATE[data.state];
  let text;
  if (data.state === 'trial') text = `Seu teste grátis termina em ${formatDay(data.endsOn)} (${pluralDays(data.daysLeft)}). Escolha um plano para continuar depois disso.`;
  else if (data.state === 'active') text = `${data.plan?.name ? `Plano ${data.plan.name}: p` : 'P'}ago até ${formatDay(data.endsOn)}.`;
  else if (data.state === 'courtesy') text = data.endsOn ? `Uso gratuito concedido até ${formatDay(data.endsOn)}.` : 'Uso gratuito concedido, sem prazo.';
  else if (data.state === 'past_due') text = `O pagamento venceu em ${formatDay(data.endsOn)}. Você ainda pode usar o sistema até ${formatDay(data.graceEndsOn)}; depois disso o acesso é suspenso.`;
  else text = `O acesso está ${data.state === 'canceled' ? 'cancelado' : 'suspenso'} desde ${formatDay(data.endsOn)}. Pague a fatura abaixo para voltar a usar o sistema.`;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
      <Badge tone={info.tone}>{info.label}</Badge>
      <p className="min-w-0 flex-1">{text}</p>
    </div>
  );
}

export default function SubscriptionPage() {
  const ui = useUI();
  const status = useBilling();
  const res = useResource(() => Billing.get(), []);
  const [choosing, setChoosing] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (res.loading && !res.data) return <Loading />;
  if (res.error && !res.data) return <ErrorState error={res.error} onRetry={res.reload} />;
  const data = res.data;

  const refresh = async () => { await res.reload(); await status?.reload(); };

  const choose = async (plan) => {
    setChoosing(plan.id);
    try {
      await Billing.choosePlan(plan.id);
      await refresh();
      ui.success(`Plano ${plan.name} escolhido. Pague a fatura abaixo para ativá-lo.`);
    } catch (err) { ui.error(err); } finally { setChoosing(null); }
  };

  const reportPaid = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await Billing.reportPaid(data.invoice.id, note.trim());
      setReporting(false); setNote('');
      await refresh();
      ui.success('Obrigado! Vamos conferir o Pix e liberar o período.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const { invoice } = data;
  return (
    <>
      <PageHeader title="Assinatura" subtitle="Plano, pagamento por Pix e histórico." />
      <Card className="mb-6"><StatusSummary data={data} /></Card>

      <h2 className="mb-3 text-lg font-semibold">Planos</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {data.plans.map((plan) => {
          const current = data.plan?.id === plan.id;
          return (
            <Card key={plan.id} className={`flex flex-col gap-3 p-5 ${current ? 'border-primary ring-1 ring-primary' : ''}`} aria-label={`Plano ${plan.name}`}>
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{plan.name}</h3>{current && <Badge tone="primary">Plano atual</Badge>}</div>
              <p><span className="text-3xl font-bold">{formatMoney(plan.priceCents)}</span><span className="text-muted"> / mês</span></p>
              <p className="text-sm text-muted">{plan.description}</p>
              <p className="text-sm font-medium">{dentistLimitLabel(plan.maxDentists)}</p>
              <Button className="mt-auto" variant={current ? 'secondary' : 'primary'} disabled={current} loading={choosing === plan.id} onClick={() => choose(plan)}>
                {current ? 'Em uso' : data.plan ? 'Trocar para este plano' : 'Assinar este plano'}
              </Button>
            </Card>
          );
        })}
      </div>

      {!invoice && !data.plan && data.state !== 'courtesy' && <Alert tone="info" className="mb-6">Escolha um plano acima para gerar a fatura. No teste grátis, o primeiro mês pago só começa depois do último dia do teste.</Alert>}

      {invoice && (
        <Card className="mb-6">
          <CardHeader title="Fatura em aberto" subtitle={`Período ${periodLabel(invoice)} · vence em ${formatDay(invoice.dueOn)}`}
            action={<span className="text-xl font-bold">{formatMoney(invoice.amountCents)}</span>} />
          <div className="flex flex-col gap-4 p-5">
            {invoice.reportedPaidAt ? (
              <Alert tone="info">Você avisou o pagamento em {formatDateTime(invoice.reportedPaidAt)}. Estamos conferindo o Pix; assim que for confirmado, o período é liberado.</Alert>
            ) : (
              <>
                <PixPayment pix={invoice.pix} />
                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <Button onClick={() => setReporting(true)}>Já paguei</Button>
                  <span className="text-sm text-muted">Depois de pagar, clique aqui para nos avisar.</span>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Pagamentos confirmados" />
        {data.invoices.length === 0 ? <p className="p-5 text-sm text-muted">Nenhum pagamento confirmado ainda.</p> : (
          <Table head={['Período', 'Valor', 'Pago em']}>
            {data.invoices.map((i) => (
              <tr key={i.id}><td className="px-4 py-3">{periodLabel(i)}</td><td className="px-4 py-3">{formatMoney(i.amountCents)}</td><td className="px-4 py-3">{formatDay(dayOf(i.paidAt))}</td></tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={reporting} onClose={() => setReporting(false)} title="Já paguei">
        <form onSubmit={reportPaid} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted">Vamos conferir o Pix na nossa conta e liberar o período. Se quiser, deixe uma observação (horário, nome de quem pagou).</p>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Observação (opcional)">{({ id }) => <Textarea id={id} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReporting(false)}>Voltar</Button>
            <Button type="submit" loading={busy}>Avisar pagamento</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
