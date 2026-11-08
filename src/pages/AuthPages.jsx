import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Auth } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import { Alert, Button, Field, Input, Loading, PasswordInput } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setUnverified(false); setResent(false);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') setUnverified(true);
      setError(err.status === 429 ? `Muitas tentativas. Tente de novo em ${Math.ceil((err.retryAfterSeconds ?? 60) / 60)} min.` : errorMessage(err));
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true);
    try { await Auth.resendVerification(form.email.trim()); setResent(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout hero title="Entrar" subtitle="Acesse o painel da sua clínica.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        {unverified && !resent && <Button variant="secondary" loading={busy} onClick={resend} type="button">Reenviar e-mail de confirmação</Button>}
        {resent && <Alert tone="success">Se o e-mail estiver cadastrado, enviamos um novo link de confirmação.</Alert>}
        <Field label="E-mail">{({ id }) => <Input id={id} type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Senha">{({ id }) => <PasswordInput id={id} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
        <Button type="submit" size="lg" loading={busy} disabled={!form.email || !form.password}>Entrar</Button>
        <Link to="/esqueci-senha" className="text-center text-sm text-primary hover:underline">Esqueci minha senha</Link>
        <p className="border-t border-border pt-4 text-center text-sm text-muted">Ainda não tem conta? <Link to="/cadastro" className="font-semibold text-primary hover:underline">Criar clínica grátis</Link></p>
      </form>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? 'loading' : 'missing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let alive = true;
    Auth.verifyEmail(token)
      .then(() => alive && setState('ok'))
      .catch((err) => { if (alive) { setState('error'); setMessage(errorMessage(err)); } });
    return () => { alive = false; };
  }, [token]);

  return (
    <AuthLayout title="Confirmação de e-mail">
      {state === 'loading' && <Loading label="Confirmando…" />}
      {state === 'ok' && <div className="flex flex-col gap-4"><Alert tone="success">E-mail confirmado! Agora você já pode entrar.</Alert><Link to="/login"><Button className="w-full" size="lg">Ir para o login</Button></Link></div>}
      {state === 'error' && <div className="flex flex-col gap-4"><Alert tone="danger">{message} O link pode ter expirado ou já ter sido usado.</Alert><Link to="/login" className="text-center text-sm text-primary hover:underline">Voltar ao login e pedir um novo link</Link></div>}
      {state === 'missing' && <Alert tone="danger">Link inválido. Abra o link completo enviado por e-mail.</Alert>}
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await Auth.forgotPassword(email.trim()); setSent(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Esqueci minha senha" subtitle="Informe seu e-mail e enviaremos um link para criar uma nova senha.">
      {sent ? (
        <div className="flex flex-col gap-4"><Alert tone="success">Se o e-mail estiver cadastrado, você receberá as instruções em instantes.</Alert><Link to="/login" className="text-center text-sm text-primary hover:underline">Voltar ao login</Link></div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="E-mail">{({ id }) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Button type="submit" size="lg" loading={busy} disabled={!email}>Enviar link</Button>
          <Link to="/login" className="text-center text-sm text-primary hover:underline">Voltar ao login</Link>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mismatch = form.confirm && form.password !== form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await Auth.resetPassword(token, form.password); setDone(true); } catch (err) { setError(fieldErrors(err).newPassword ?? errorMessage(err)); } finally { setBusy(false); }
  };

  if (!token) return <AuthLayout title="Nova senha"><Alert tone="danger">Link inválido. Peça um novo em “Esqueci minha senha”.</Alert></AuthLayout>;
  return (
    <AuthLayout title="Criar nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres.">
      {done ? (
        <div className="flex flex-col gap-4"><Alert tone="success">Senha alterada! Você já pode entrar com a nova senha.</Alert><Link to="/login"><Button className="w-full" size="lg">Ir para o login</Button></Link></div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Nova senha">{({ id }) => <PasswordInput id={id} autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
          <Field label="Repita a nova senha" error={mismatch ? 'As senhas não conferem.' : null}>{({ id, invalid }) => <PasswordInput id={id} autoComplete="new-password" invalid={invalid} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}</Field>
          <Button type="submit" size="lg" loading={busy} disabled={form.password.length < 8 || form.password !== form.confirm}>Salvar nova senha</Button>
        </form>
      )}
    </AuthLayout>
  );
}
