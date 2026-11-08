import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Notices } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { Alert, Button, Card, CardHeader, Checkbox, EmptyState, ErrorState, Field, Input, Loading, PageHeader, Pagination, Select, StatusBadge, Table, Textarea } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { formatDateTime } from '../lib/dates.js';
import { NOTICE_KIND, NOTICE_STATUS } from '../lib/labels.js';

function SettingsCard({ canEdit }) {
  const ui = useUI();
  const settings = useResource(() => Notices.settings(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (settings.data) setForm({ ...settings.data, contactPhone: settings.data.contactPhone ?? '', contactAddress: settings.data.contactAddress ?? '' }); }, [settings.data]);

  if (settings.loading && !settings.data) return <Card><Loading /></Card>;
  if (settings.error) return <ErrorState error={settings.error} onRetry={settings.reload} />;
  if (!form) return null;

  const save = async () => {
    const hours = Number(form.reminderHoursBefore);
    if (!Number.isInteger(hours) || hours < 1 || hours > 72) { setError('Informe de 1 a 72 horas.'); return; }
    setBusy(true); setError(null);
    try {
      settings.setData(await Notices.updateSettings({ remindersEnabled: form.remindersEnabled, reminderHoursBefore: hours, contactPhone: form.contactPhone.trim() || null, contactAddress: form.contactAddress.trim() || null }));
      ui.success('Configuração salva.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader title="Lembrete automático de consulta" subtitle="Enviado por e-mail aos pacientes que autorizaram contato." />
      <div className="flex flex-col gap-4 p-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <Checkbox label="Enviar lembretes automáticos" disabled={!canEdit} checked={form.remindersEnabled} onChange={(e) => setForm({ ...form, remindersEnabled: e.target.checked })} />
        <Field label="Horas de antecedência" hint="De 1 a 72 horas antes da consulta.">{({ id }) => <Input id={id} type="number" min={1} max={72} className="max-w-32" disabled={!canEdit} value={form.reminderHoursBefore} onChange={(e) => setForm({ ...form, reminderHoursBefore: e.target.value })} />}</Field>
        <Field label="Telefone da clínica nos e-mails">{({ id }) => <Input id={id} disabled={!canEdit} maxLength={20} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />}</Field>
        <Field label="Endereço da clínica nos e-mails">{({ id }) => <Textarea id={id} rows={2} disabled={!canEdit} maxLength={240} value={form.contactAddress} onChange={(e) => setForm({ ...form, contactAddress: e.target.value })} />}</Field>
        {canEdit && <div><Button loading={busy} onClick={save}>Salvar</Button></div>}
      </div>
    </Card>
  );
}

export default function NoticesPage() {
  const { isAdmin } = useAuth();
  const ui = useUI();
  const [params, setParams] = useSearchParams();
  const kind = params.get('tipo') ?? '';
  const status = params.get('situacao') ?? '';
  const page = Number(params.get('pagina') ?? 1);
  const [running, setRunning] = useState(false);
  const go = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const list = useResource(() => Notices.list({ kind: kind || undefined, status: status || undefined, page, perPage: 20 }), [kind, status, page]);

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await Notices.run();
      if (r.alreadyRunning) ui.success('Já há uma execução em andamento.');
      else ui.success(`${r.sent} enviados, ${r.failed} com falha. Ignorados: ${r.skipped.noEmail} sem e-mail, ${r.skipped.noConsent} sem autorização.`);
      list.reload();
    } catch (err) { ui.error(err); } finally { setRunning(false); }
  };

  return (
    <>
      <PageHeader title="Avisos" subtitle="Lembretes de consulta e orçamentos enviados aos pacientes" actions={isAdmin && <Button variant="secondary" icon="bell" loading={running} onClick={runNow}>Enviar lembretes agora</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader title="Histórico de envios" />
          <div className="flex flex-wrap gap-3 border-b border-border p-3">
            <Select aria-label="Tipo" className="w-auto" value={kind} onChange={(e) => go({ tipo: e.target.value, pagina: null })}><option value="">Todos os tipos</option>{Object.entries(NOTICE_KIND).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>
            <Select aria-label="Situação" className="w-auto" value={status} onChange={(e) => go({ situacao: e.target.value, pagina: null })}><option value="">Todas as situações</option>{Object.entries(NOTICE_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</Select>
          </div>
          {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
            : list.data.data.length === 0 ? <EmptyState icon="bell" title="Nenhum aviso enviado">Os lembretes e orçamentos enviados por e-mail aparecem aqui.</EmptyState> : (
              <>
                <Table head={['Quando', 'Tipo', 'Paciente', 'Enviado para', 'Situação']}>
                  {list.data.data.map((n) => (
                    <tr key={n.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(n.createdAt)}</td>
                      <td className="px-4 py-3">{NOTICE_KIND[n.kind]}{n.trigger === 'auto' && <span className="ml-1 text-xs text-muted">(automático)</span>}</td>
                      <td className="px-4 py-3 font-medium"><Link to={`/pacientes/${n.patient.id}`} className="hover:text-primary hover:underline">{n.patient.name}</Link></td>
                      <td className="px-4 py-3 text-muted">{n.recipient}</td>
                      <td className="px-4 py-3"><StatusBadge map={NOTICE_STATUS} value={n.status} />{n.lastError && <span className="mt-1 block max-w-56 truncate text-xs text-danger" title={n.lastError}>{n.lastError}</span>}</td>
                    </tr>
                  ))}
                </Table>
                <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={(n) => go({ pagina: n > 1 ? String(n) : null })} />
              </>
            )}
        </Card>
        <SettingsCard canEdit={isAdmin} />
      </div>
    </>
  );
}
