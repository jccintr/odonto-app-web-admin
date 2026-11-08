import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clinic } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';

export default function SettingsPage() {
  const { clinic, updateClinic } = useAuth();
  const ui = useUI();
  const [form, setForm] = useState({ name: clinic.name, document: clinic.document ?? '', overdueGraceDays: String(clinic.overdueGraceDays ?? 7), cashDiscountPercent: String(clinic.cashDiscountPercent ?? 0) });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (form.name.trim().length < 2) { setError('Informe o nome da clínica.'); return; }
    const grace = Number(form.overdueGraceDays);
    if (!Number.isInteger(grace) || grace < 0 || grace > 60) { setError('A tolerância de atraso deve ser de 0 a 60 dias.'); return; }
    const cash = Number(form.cashDiscountPercent);
    if (!Number.isInteger(cash) || cash < 0 || cash > 50) { setError('O desconto à vista deve ser de 0 a 50%.'); return; }
    setBusy(true); setError(null);
    try { updateClinic(await Clinic.update({ name: form.name.trim(), document: form.document.trim() || null, overdueGraceDays: grace, cashDiscountPercent: cash })); ui.success('Dados da clínica salvos.'); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Dados da clínica" subtitle="Nome e documento aparecem nas fichas e orçamentos impressos." />
          <div className="flex flex-col gap-4 p-5">
            {error && <Alert tone="danger">{error}</Alert>}
            <Field label="Nome da clínica" required>{({ id }) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
            <Field label="CNPJ / CPF">{({ id }) => <Input id={id} maxLength={20} value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />}</Field>
            <Field label="Tolerância de atraso (dias)" hint="Com parcela vencida há mais dias que isso, o paciente fica bloqueado: sem novos agendamentos e sem iniciar atendimentos. Só o administrador libera.">
              {({ id }) => <Input id={id} type="number" min={0} max={60} inputMode="numeric" value={form.overdueGraceDays} onChange={(e) => setForm({ ...form, overdueGraceDays: e.target.value })} />}
            </Field>
            <Field label="Desconto à vista (%)" hint="Sugerido na aprovação do orçamento, para o paciente que paga tudo de uma vez. 0 desliga a sugestão.">
              {({ id }) => <Input id={id} type="number" min={0} max={50} inputMode="numeric" value={form.cashDiscountPercent} onChange={(e) => setForm({ ...form, cashDiscountPercent: e.target.value })} />}
            </Field>
            <div><Button loading={busy} onClick={save}>Salvar</Button></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Outras configurações" />
          <ul className="divide-y divide-border">
            {[['/avisos', 'Avisos aos pacientes', 'Lembrete automático de consulta, telefone e endereço nos e-mails.'], ['/repasse?aba=configuracao', 'Repasse aos dentistas', 'Quando liberar, descontar custo e taxa de cartão, percentual padrão.'], ['/equipe', 'Equipe', 'Usuários, perfis e dados dos dentistas.'], ['/procedimentos', 'Procedimentos', 'Tabela de preços e custos.']].map(([to, title, text]) => (
              <li key={to}><Link to={to} className="block px-5 py-3 hover:bg-surface-2"><span className="font-medium text-primary">{title}</span><span className="block text-sm text-muted">{text}</span></Link></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
