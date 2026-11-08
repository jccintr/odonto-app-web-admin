import { useState } from 'react';
import { Auth } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import DataPrivacy from '../components/DataPrivacy.jsx';
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader, PasswordInput } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { ROLE_LABEL } from '../lib/labels.js';

export default function AccountPage() {
  const { user, clinic, adopt, isAdmin } = useAuth();
  const ui = useUI();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const mismatch = form.confirm && form.next !== form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      adopt(await Auth.changePassword(form.current, form.next));
      setForm({ current: '', next: '', confirm: '' });
      ui.success('Senha alterada. As outras sessões foram encerradas.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Minha conta" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Meus dados" />
          <dl className="grid gap-4 p-5">
            <div><dt className="text-sm text-muted">Nome</dt><dd className="font-medium">{user.name}</dd></div>
            <div><dt className="text-sm text-muted">E-mail</dt><dd className="font-medium">{user.email}</dd></div>
            <div><dt className="text-sm text-muted">Perfil</dt><dd className="font-medium">{ROLE_LABEL[user.role]}</dd></div>
            <div><dt className="text-sm text-muted">Clínica</dt><dd className="font-medium">{clinic.name}</dd></div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Trocar a senha" />
          <form onSubmit={submit} className="flex flex-col gap-4 p-5" noValidate>
            {error && <Alert tone="danger">{error}</Alert>}
            <Field label="Senha atual">{({ id }) => <PasswordInput id={id} autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />}</Field>
            <Field label="Nova senha" hint="No mínimo 8 caracteres.">{({ id }) => <PasswordInput id={id} autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />}</Field>
            <Field label="Repita a nova senha" error={mismatch ? 'As senhas não conferem.' : null}>{({ id, invalid }) => <PasswordInput id={id} autoComplete="new-password" invalid={invalid} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}</Field>
            <Button type="submit" loading={busy} disabled={!form.current || form.next.length < 8 || form.next !== form.confirm}>Alterar senha</Button>
          </form>
        </Card>
        {isAdmin && <DataPrivacy />}
      </div>
    </>
  );
}
