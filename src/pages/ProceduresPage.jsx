import { useEffect, useState } from 'react';
import { Procedures } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import MoneyInput from '../components/MoneyInput.jsx';
import { Alert, Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, Loading, Modal, PageHeader, Pagination, Select, Table } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useDebounced from '../hooks/useDebounced.js';
import useResource from '../hooks/useResource.js';
import { CONDITION } from '../lib/labels.js';
import { formatMoney } from '../lib/money.js';

function ProcedureModal({ procedure, onClose, onSaved }) {
  const ui = useUI();
  const editing = Boolean(procedure);
  const [form, setForm] = useState({ name: '', category: '', priceCents: 0, costCents: 0, odontogramCondition: '', active: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (procedure) setForm({ name: procedure.name, category: procedure.category ?? '', priceCents: procedure.priceCents, costCents: procedure.costCents, odontogramCondition: procedure.odontogramCondition ?? '', active: procedure.active });
  }, [procedure]);

  const submit = async () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Informe o nome do procedimento.';
    if (form.priceCents === null) next.priceCents = 'Valor inválido.';
    if (form.costCents === null) next.costCents = 'Valor inválido.';
    setErrors(next); setFormError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const body = { name: form.name.trim(), category: form.category.trim() || null, priceCents: form.priceCents, costCents: form.costCents, odontogramCondition: form.odontogramCondition || null };
      const saved = editing ? await Procedures.update(procedure.id, { ...body, active: form.active }) : await Procedures.create(body);
      ui.success(editing ? 'Procedimento atualizado.' : 'Procedimento cadastrado.');
      onSaved(saved); onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(err.status === 409 ? 'Já existe um procedimento com este nome.' : errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Editar procedimento' : 'Novo procedimento'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>Salvar</Button></>}>
      <div className="flex flex-col gap-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Nome" required error={errors.name}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="Categoria" error={errors.category}>{({ id }) => <Input id={id} placeholder="Ex.: Dentística, Endodontia" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço cobrado" error={errors.priceCents}>{({ id, invalid }) => <MoneyInput id={id} invalid={invalid} value={form.priceCents} onChange={(priceCents) => setForm({ ...form, priceCents })} />}</Field>
          <Field label="Custo (laboratório/material)" error={errors.costCents} hint="Usado no repasse, se a clínica optar por descontar custos.">{({ id, invalid }) => <MoneyInput id={id} invalid={invalid} value={form.costCents} onChange={(costCents) => setForm({ ...form, costCents })} />}</Field>
        </div>
        <Field label="Marca no odontograma ao ser realizado" hint="Quando o procedimento é feito em um dente, a condição é marcada automaticamente.">
          {({ id }) => (
            <Select id={id} value={form.odontogramCondition} onChange={(e) => setForm({ ...form, odontogramCondition: e.target.value })}>
              <option value="">Não marca</option>
              {Object.entries(CONDITION).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </Select>
          )}
        </Field>
        {editing && <Checkbox label="Procedimento ativo (aparece nos orçamentos)" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />}
      </div>
    </Modal>
  );
}

export default function ProceduresPage() {
  const { isAdmin } = useAuth();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const [page, setPage] = useState(1);
  const [inactive, setInactive] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | procedimento
  const list = useResource(() => Procedures.list({ q: q || undefined, active: inactive ? undefined : true, page, perPage: 20 }), [q, page, inactive]);

  return (
    <>
      <PageHeader title="Procedimentos" subtitle="Tabela de preços da clínica" actions={isAdmin && <Button icon="plus" onClick={() => setEditing('new')}>Novo procedimento</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Input aria-label="Buscar procedimento" className="min-w-60 flex-1" placeholder="Buscar por nome ou categoria" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} />
          <Checkbox label="Incluir inativos" checked={inactive} onChange={(e) => { setInactive(e.target.checked); setPage(1); }} />
        </div>
        {list.loading && !list.data ? <Loading /> : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
          : list.data.data.length === 0 ? <EmptyState icon="tooth" title="Nenhum procedimento">{q ? 'Nada encontrado com essa busca.' : 'Cadastre os procedimentos e preços da clínica.'}</EmptyState> : (
            <>
              <Table head={['Procedimento', 'Categoria', { label: 'Preço', right: true }, ...(isAdmin ? [{ label: 'Custo', right: true }] : []), 'Odontograma', '']}>
                {list.data.data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.name} {!p.active && <Badge className="ml-1">Inativo</Badge>}</td>
                    <td className="px-4 py-3 text-muted">{p.category ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.priceCents)}</td>
                    {isAdmin && <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(p.costCents)}</td>}
                    <td className="px-4 py-3 text-muted">{p.odontogramCondition ? CONDITION[p.odontogramCondition]?.label : '—'}</td>
                    <td className="px-4 py-3 text-right">{isAdmin && <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>}</td>
                  </tr>
                ))}
              </Table>
              <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={setPage} />
            </>
          )}
      </Card>
      {editing && <ProcedureModal procedure={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
}
