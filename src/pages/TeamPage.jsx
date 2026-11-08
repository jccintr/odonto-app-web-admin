import { useEffect, useState } from 'react';
import { Dentists, Users } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import { Alert, Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, Loading, Modal, PageHeader, Pagination, PasswordInput, Select, Table } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { ROLE_LABEL } from '../lib/labels.js';

function UserModal({ user, onClose, onSaved }) {
  const ui = useUI();
  const editing = Boolean(user);
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', password: '', role: user?.role ?? 'secretary', active: user?.active ?? true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Informe o nome.';
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'E-mail inválido.';
    if (!editing && form.password.length < 8) next.password = 'A senha deve ter ao menos 8 caracteres.';
    setErrors(next); setFormError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const saved = editing ? await Users.update(user.id, { name: form.name.trim(), role: form.role, active: form.active }) : await Users.create({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      ui.success(editing ? 'Usuário atualizado.' : 'Usuário criado. Ele precisa confirmar o e-mail para entrar.');
      onSaved(saved); onClose();
    } catch (err) { setErrors(fieldErrors(err)); setFormError(err.status === 409 ? 'Já existe um usuário com este e-mail.' : errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Editar usuário' : 'Novo usuário'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>Salvar</Button></>}>
      <div className="flex flex-col gap-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Nome" required error={errors.name}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="E-mail" required error={errors.email}>{({ id, invalid }) => <Input id={id} type="email" invalid={invalid} disabled={editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        {!editing && <Field label="Senha inicial" required error={errors.password} hint="O usuário pode trocar depois, em Minha conta.">{({ id, invalid }) => <PasswordInput id={id} autoComplete="new-password" invalid={invalid} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>}
        <Field label="Perfil">{({ id }) => <Select id={id} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{Object.entries(ROLE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>}</Field>
        {editing && <Checkbox label="Usuário ativo (pode entrar no sistema)" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />}
      </div>
    </Modal>
  );
}

function DentistModal({ dentist, onClose, onSaved }) {
  const ui = useUI();
  const [form, setForm] = useState({ cro: dentist.cro ?? '', specialty: dentist.specialty ?? '', color: dentist.color, payoutPercent: dentist.payoutPercent ?? '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const percent = form.payoutPercent === '' ? null : Number(String(form.payoutPercent).replace(',', '.'));
    if (percent !== null && !(percent >= 0 && percent <= 100)) { setError('O percentual deve estar entre 0 e 100.'); return; }
    setBusy(true); setError(null);
    try {
      onSaved(await Dentists.update(dentist.id, { cro: form.cro.trim() || null, specialty: form.specialty.trim() || null, color: form.color, payoutPercent: percent }));
      ui.success('Dados do dentista salvos.'); onClose();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Dentista: ${dentist.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>Salvar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CRO">{({ id }) => <Input id={id} maxLength={30} placeholder="CRO-MG 12345" value={form.cro} onChange={(e) => setForm({ ...form, cro: e.target.value })} />}</Field>
          <Field label="Especialidade">{({ id }) => <Input id={id} maxLength={80} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />}</Field>
        </div>
        <Field label="Cor na agenda">{({ id }) => <input id={id} type="color" className="h-10 w-20 cursor-pointer rounded-lg border border-border-strong bg-surface p-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />}</Field>
        <Field label="Percentual de repasse padrão (%)" hint="Usado quando não há regra específica do procedimento. Veja as regras em Repasse.">{({ id }) => <Input id={id} inputMode="decimal" className="max-w-32" value={form.payoutPercent} onChange={(e) => setForm({ ...form, payoutPercent: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

export default function TeamPage() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const users = useResource(() => Users.list({ role: role || undefined, page, perPage: 20 }), [role, page]);
  const dentists = useResource(() => Dentists.list(), []);
  const [editing, setEditing] = useState(null); // 'new' | usuário
  const [editingDentist, setEditingDentist] = useState(null);
  const dentistOf = (u) => (dentists.data ?? []).find((d) => d.userId === u.id);

  return (
    <>
      <PageHeader title="Equipe" subtitle="Usuários da clínica e dados dos dentistas" actions={<Button icon="plus" onClick={() => setEditing('new')}>Novo usuário</Button>} />
      <Card>
        <div className="flex gap-3 border-b border-border p-3">
          <Select aria-label="Perfil" className="w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">Todos os perfis</option>{Object.entries(ROLE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Select>
        </div>
        {users.loading && !users.data ? <Loading /> : users.error ? <div className="p-4"><ErrorState error={users.error} onRetry={users.reload} /></div>
          : users.data.data.length === 0 ? <EmptyState icon="user" title="Nenhum usuário" /> : (
            <>
              <Table head={['Nome', 'E-mail', 'Perfil', 'Situação', '']}>
                {users.data.data.map((u) => {
                  const d = dentistOf(u);
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium">{u.name}{u.id === me.id && <span className="ml-1 text-xs text-muted">(você)</span>}</td>
                      <td className="px-4 py-3 text-muted">{u.email}</td>
                      <td className="px-4 py-3">{ROLE_LABEL[u.role]}{d?.cro && <span className="ml-1 text-xs text-muted">{d.cro}</span>}</td>
                      <td className="px-4 py-3">{!u.active ? <Badge tone="danger">Inativo</Badge> : !u.emailVerified ? <Badge tone="warning">E-mail não confirmado</Badge> : <Badge tone="success">Ativo</Badge>}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {u.role === 'dentist' && d && <Button size="sm" variant="soft" onClick={() => setEditingDentist(d)}>Dados do dentista</Button>}
                        <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>Editar</Button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
              <Pagination page={users.data.page} totalPages={users.data.totalPages} total={users.data.total} onChange={setPage} />
            </>
          )}
      </Card>
      {editing && <UserModal user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { users.reload(); dentists.reload(); }} />}
      {editingDentist && <DentistModal dentist={editingDentist} onClose={() => setEditingDentist(null)} onSaved={() => dentists.reload()} />}
    </>
  );
}
