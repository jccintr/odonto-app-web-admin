import { useEffect, useState } from 'react';
import { Payouts } from '../../api/index.js';
import { errorMessage } from '../../api/client.js';
import { Alert, Button, Card, CardHeader, Checkbox, ErrorState, Field, Input, Loading, Select } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { RELEASE_ON } from '../../lib/labels.js';
import { parsePercent } from '../../lib/percent.js';

const text = (n) => String(n).replace('.', ',');

export default function SettingsTab() {
  const ui = useUI();
  const settings = useResource(() => Payouts.settings(), []);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = settings.data;
    if (s) setForm({ releaseOn: s.releaseOn, deductCosts: s.deductCosts, deductCardFees: s.deductCardFees, creditCardFeePercent: text(s.creditCardFeePercent), debitCardFeePercent: text(s.debitCardFeePercent), defaultPercent: text(s.defaultPercent) });
  }, [settings.data]);

  if (settings.loading && !settings.data) return <Loading />;
  if (settings.error) return <ErrorState error={settings.error} onRetry={settings.reload} />;
  if (!form) return null;

  const save = async () => {
    const values = { defaultPercent: parsePercent(form.defaultPercent), creditCardFeePercent: parsePercent(form.creditCardFeePercent), debitCardFeePercent: parsePercent(form.debitCardFeePercent) };
    if (Object.values(values).some((v) => v === null)) { setError('Os percentuais devem estar entre 0 e 100, com até 2 casas decimais.'); return; }
    setBusy(true); setError(null);
    try {
      settings.setData(await Payouts.updateSettings({ releaseOn: form.releaseOn, deductCosts: form.deductCosts, deductCardFees: form.deductCardFees, ...values }));
      ui.success('Configuração do repasse salva. Vale para os próximos procedimentos realizados.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader title="Como a clínica repassa" subtitle="Vale para os próximos procedimentos realizados; lançamentos antigos não mudam." />
      <div className="flex flex-col gap-5 p-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Quando a comissão é liberada" hint={form.releaseOn === 'payment' ? 'A comissão é liberada na proporção do que o paciente já pagou do orçamento.' : 'A comissão é liberada por inteiro quando o procedimento é realizado, mesmo que o paciente ainda não tenha pago.'}>
          {({ id }) => <Select id={id} value={form.releaseOn} onChange={(e) => setForm({ ...form, releaseOn: e.target.value })}>{Object.entries(RELEASE_ON).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>}
        </Field>
        <Field label="Percentual padrão da clínica (%)" hint="Usado quando não há regra do procedimento nem percentual do dentista.">{({ id }) => <Input id={id} inputMode="decimal" className="max-w-32" value={form.defaultPercent} onChange={(e) => setForm({ ...form, defaultPercent: e.target.value })} />}</Field>
        <Checkbox label="Descontar o custo do procedimento (laboratório/material) antes de calcular a comissão" checked={form.deductCosts} onChange={(e) => setForm({ ...form, deductCosts: e.target.checked })} />
        <div className="flex flex-col gap-3">
          <Checkbox label="Descontar a taxa do cartão (só quando a comissão é liberada conforme o paciente paga, e só em comissões em %)" checked={form.deductCardFees} onChange={(e) => setForm({ ...form, deductCardFees: e.target.checked })} />
          {form.deductCardFees && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Taxa do cartão de crédito (%)">{({ id }) => <Input id={id} inputMode="decimal" value={form.creditCardFeePercent} onChange={(e) => setForm({ ...form, creditCardFeePercent: e.target.value })} />}</Field>
              <Field label="Taxa do cartão de débito (%)">{({ id }) => <Input id={id} inputMode="decimal" value={form.debitCardFeePercent} onChange={(e) => setForm({ ...form, debitCardFeePercent: e.target.value })} />}</Field>
            </div>
          )}
        </div>
        <div><Button loading={busy} onClick={save}>Salvar</Button></div>
      </div>
    </Card>
  );
}
