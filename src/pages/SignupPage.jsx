import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Signup } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import AuthLayout from '../components/AuthLayout.jsx';
import Turnstile from '../components/Turnstile.jsx';
import { Alert, Button, Checkbox, Field, Input, Loading, PasswordInput, cx } from '../components/ui.jsx';
import useResource from '../hooks/useResource.js';
import { dentistLimitLabel } from '../lib/billing.js';
import { formatDay } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const EMPTY = { clinicName: '', document: '', name: '', email: '', password: '', confirm: '', template: 'general', accept: false };

function TemplatePicker({ templates, value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Como você quer começar?</legend>
      {templates.map((t) => (
        <label key={t.code} className={cx('flex cursor-pointer gap-3 rounded-lg border p-3 transition', value === t.code ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-2')}>
          <input type="radio" name="template" value={t.code} checked={value === t.code} onChange={() => onChange(t.code)} className="mt-1 accent-[var(--primary)]" />
          <span><span className="block font-medium">{t.name}</span><span className="block text-sm text-muted">{t.description}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

function Done({ result }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="success">{result.message}</Alert>
      <p className="text-sm text-muted">Seu teste grátis vai até <strong>{formatDay(result.trialEndsOn)}</strong>. Depois da confirmação do e-mail, é só entrar e começar pelos “Primeiros passos” do painel.</p>
      <Link to="/login"><Button className="w-full" size="lg">Ir para o login</Button></Link>
    </div>
  );
}

export default function SignupPage() {
  const options = useResource(() => Signup.options(), []);
  const [form, setForm] = useState(EMPTY);
  const [captcha, setCaptcha] = useState(null);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (options.loading && !options.data) return <AuthLayout hero title="Criar clínica"><Loading /></AuthLayout>;
  if (options.error) return <AuthLayout hero title="Criar clínica"><Alert tone="danger">{errorMessage(options.error)}</Alert></AuthLayout>;
  const o = options.data;
  if (!o.signupEnabled) {
    return <AuthLayout hero title="Criar clínica"><Alert tone="info">O cadastro de novas clínicas está fechado no momento. <Link to="/login" className="font-semibold underline">Voltar ao login</Link></Alert></AuthLayout>;
  }
  if (result) return <AuthLayout hero title="Quase lá!" subtitle="Falta só confirmar o seu e-mail."><Done result={result} /></AuthLayout>;

  const needsCaptcha = o.captchaRequired;
  const mismatch = form.confirm && form.password !== form.confirm;
  const ready = form.clinicName.trim().length >= 2 && form.name.trim().length >= 2 && form.email && form.password.length >= 8
    && form.password === form.confirm && form.accept && (!needsCaptcha || captcha);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setErrors({});
    try {
      setResult(await Signup.create({
        clinicName: form.clinicName.trim(),
        ...(form.document.trim() && { document: form.document.trim() }),
        admin: { name: form.name.trim(), email: form.email.trim(), password: form.password },
        template: form.template,
        acceptTerms: form.accept,
        ...(captcha && { captchaToken: captcha }),
      }));
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout hero wide title="Criar minha clínica" subtitle={`${o.trialDays} dias grátis, sem cartão. Você escolhe o plano só depois do teste.`}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Nome da clínica" required error={errors.clinicName}>{({ id, invalid }) => <Input id={id} invalid={invalid} autoComplete="organization" value={form.clinicName} onChange={set('clinicName')} />}</Field>
        <Field label="CNPJ ou CPF (opcional)" error={errors.document}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="numeric" value={form.document} onChange={set('document')} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seu nome" required error={errors['admin.name']}>{({ id, invalid }) => <Input id={id} invalid={invalid} autoComplete="name" value={form.name} onChange={set('name')} />}</Field>
          <Field label="Seu e-mail" required error={errors['admin.email']}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="email" autoComplete="email" value={form.email} onChange={set('email')} />}</Field>
          <Field label="Senha" required hint="No mínimo 8 caracteres." error={errors['admin.password']}>{({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" value={form.password} onChange={set('password')} />}</Field>
          <Field label="Repita a senha" required error={mismatch ? 'As senhas não conferem.' : null}>{({ id, invalid }) => <PasswordInput id={id} invalid={invalid} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />}</Field>
        </div>

        <TemplatePicker templates={o.templates} value={form.template} onChange={(template) => setForm({ ...form, template })} />
        <p className="text-sm text-muted">Os preços dos modelos são apenas exemplos — você confere e ajusta tudo no painel.</p>

        <details className="rounded-lg border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Quanto custa depois do teste?</summary>
          <ul className="mt-2 space-y-1">{o.plans.map((p) => <li key={p.id}><strong>{p.name}</strong>: {formatMoney(p.priceCents)}/mês — {dentistLimitLabel(p.maxDentists).toLowerCase()}</li>)}</ul>
        </details>

        <Checkbox checked={form.accept} onChange={(e) => setForm({ ...form, accept: e.target.checked })}
          label={<>Li e aceito os <Link to="/termos" target="_blank" className="font-medium text-primary underline">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" className="font-medium text-primary underline">Política de Privacidade</Link>.</>} />
        {errors.acceptTerms && <p role="alert" className="text-sm text-danger">{errors.acceptTerms}</p>}

        {needsCaptcha && (SITE_KEY ? <Turnstile siteKey={SITE_KEY} onToken={setCaptcha} /> : <Alert tone="warning">A verificação anti-robô não está configurada neste site (VITE_TURNSTILE_SITE_KEY).</Alert>)}

        <Button type="submit" size="lg" loading={busy} disabled={!ready}>Criar minha clínica</Button>
        <p className="text-center text-sm text-muted">Já tem conta? <Link to="/login" className="font-semibold text-primary hover:underline">Entrar</Link></p>
      </form>
    </AuthLayout>
  );
}
