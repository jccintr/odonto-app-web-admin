import { useEffect, useState } from 'react';
import { Dentists, Payouts } from '../../api/index.js';
import { errorMessage } from '../../api/client.js';
import MoneyInput from '../../components/MoneyInput.jsx';
import { Alert, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Loading, Modal, Select, Table } from '../../components/ui.jsx';
import { useUI } from '../../context/UIContext.jsx';
import useResource from '../../hooks/useResource.js';
import { loadActiveProcedures } from '../../lib/budget.js';
import { RULE_SOURCE } from '../../lib/labels.js';
import { formatMoney } from '../../lib/money.js';
import { formatPercent, parsePercent } from '../../lib/percent.js';

const valueText = (r) => (r.type === 'percent' ? formatPercent(r.percent) : `${formatMoney(r.fixedCents)} por procedimento`);

function RuleModal({ rule, procedures, dentists, onClose, onSaved }) {
  const ui = useUI();
  const editing = Boolean(rule);
  const [form, setForm] = useState({ procedureId: '', dentistId: '', type: rule?.type ?? 'percent', percent: rule?.percent !== null && rule?.percent !== undefined ? String(rule.percent).replace('.', ',') : '', fixedCents: rule?.fixedCents ?? null });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!editing && !form.procedureId) { setError('Escolha o procedimento.'); return; }
    const value = form.type === 'percent' ? { percent: parsePercent(form.percent) } : { fixedCents: form.fixedCents };
    if (form.type === 'percent' && value.percent === null) { setError('Informe um percentual de 0 a 100 (até 2 casas).'); return; }
    if (form.type === 'fixed' && value.fixedCents === null) { setError('Informe o valor fixo.'); return; }
    setBusy(true); setError(null);
    try {
      if (editing) await Payouts.updateRule(rule.id, { type: form.type, ...value });
      else await Payouts.createRule({ procedureId: form.procedureId, dentistId: form.dentistId || undefined, type: form.type, ...value });
      ui.success('Regra salva.'); onSaved(); onClose();
    } catch (err) { setError(err.code === 'RULE_EXISTS' ? 'Já existe uma regra para este procedimento e dentista. Edite a existente.' : errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Editar regra' : 'Nova regra'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>Salvar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        {editing ? (
          <p className="font-medium">{rule.procedure.name}{rule.dentist ? ` — ${rule.dentist.name}` : ' — todos os dentistas'}</p>
        ) : (
          <>
            <Field label="Procedimento" required>{({ id }) => <Select id={id} value={form.procedureId} onChange={(e) => setForm({ ...form, procedureId: e.target.value })}><option value="">Escolha…</option>{procedures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>
            <Field label="Vale para" hint="Deixe em “todos” para a regra valer a qualquer dentista; escolha um dentista para uma exceção só dele.">{({ id }) => <Select id={id} value={form.dentistId} onChange={(e) => setForm({ ...form, dentistId: e.target.value })}><option value="">Todos os dentistas</option>{dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
          </>
        )}
        <Field label="Tipo de comissão">{({ id }) => <Select id={id} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percent">Percentual da base de cálculo</option><option value="fixed">Valor fixo por procedimento realizado</option></Select>}</Field>
        {form.type === 'percent'
          ? <Field label="Percentual (%)">{({ id }) => <Input id={id} inputMode="decimal" className="max-w-32" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} />}</Field>
          : <Field label="Valor fixo">{({ id }) => <MoneyInput id={id} value={form.fixedCents} onChange={(fixedCents) => setForm({ ...form, fixedCents })} />}</Field>}
      </div>
    </Modal>
  );
}

function Resolver({ procedures, dentists }) {
  const [dentistId, setDentistId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!dentistId || !procedureId) { setResult(null); return undefined; }
    let alive = true;
    Payouts.resolve({ dentistId, procedureId }).then((r) => { if (alive) { setResult(r); setError(null); } }).catch((e) => { if (alive) setError(errorMessage(e)); });
    return () => { alive = false; };
  }, [dentistId, procedureId]);
  return (
    <Card>
      <CardHeader title="Qual regra vale?" subtitle="Escolha um dentista e um procedimento para conferir." />
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <Select aria-label="Dentista" value={dentistId} onChange={(e) => setDentistId(e.target.value)}><option value="">Dentista…</option>{dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        <Select aria-label="Procedimento" value={procedureId} onChange={(e) => setProcedureId(e.target.value)}><option value="">Procedimento…</option>{procedures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        {error && <Alert tone="danger" className="sm:col-span-2">{error}</Alert>}
        {result && <Alert tone="info" className="sm:col-span-2"><strong>{valueText(result)}</strong> — {RULE_SOURCE[result.source]}</Alert>}
      </div>
    </Card>
  );
}

export default function RulesTab() {
  const ui = useUI();
  const rules = useResource(() => Payouts.rules(), []);
  const [procedures, setProcedures] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [editing, setEditing] = useState(null);
  useEffect(() => { loadActiveProcedures().then(setProcedures).catch(() => {}); Dentists.list({ active: true }).then(setDentists).catch(() => {}); }, []);

  const remove = async (rule) => {
    if (!(await ui.confirm({ title: 'Remover regra?', message: `${rule.procedure.name} — ${valueText(rule)}. Lançamentos já feitos não mudam.`, confirmLabel: 'Remover', danger: true }))) return;
    try { await Payouts.removeRule(rule.id); ui.success('Regra removida.'); rules.reload(); } catch (err) { ui.error(err); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">
        Ordem de prioridade: <strong>dentista + procedimento</strong>, depois <strong>procedimento</strong> (para todos), depois o <strong>percentual do dentista</strong> (em Equipe) e por fim o <strong>percentual padrão da clínica</strong> (em Configuração).
        Mudanças valem para os próximos procedimentos realizados; lançamentos antigos não são recalculados.
      </Alert>
      <Card>
        <CardHeader title="Regras por procedimento" action={<Button size="sm" icon="plus" onClick={() => setEditing('new')}>Nova regra</Button>} />
        {rules.loading && !rules.data ? <Loading /> : rules.error ? <div className="p-4"><ErrorState error={rules.error} onRetry={rules.reload} /></div>
          : rules.data.length === 0 ? <EmptyState icon="coin" title="Nenhuma regra por procedimento">Sem regras, vale o percentual do dentista ou o padrão da clínica.</EmptyState> : (
            <Table head={['Procedimento', 'Dentista', 'Comissão', '']}>
              {rules.data.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.procedure.name}</td><td className="px-4 py-3">{r.dentist?.name ?? <span className="text-muted">Todos</span>}</td><td className="px-4 py-3">{valueText(r)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Editar</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(r)}>Remover</Button></td>
                </tr>
              ))}
            </Table>
          )}
      </Card>
      <Resolver procedures={procedures} dentists={dentists} />
      {editing && <RuleModal rule={editing === 'new' ? null : editing} procedures={procedures} dentists={dentists} onClose={() => setEditing(null)} onSaved={rules.reload} />}
    </div>
  );
}
