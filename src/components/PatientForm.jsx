import { useEffect, useState } from 'react';
import { Patients } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import { useUI } from '../context/UIContext.jsx';
import { maskCep, maskCpf, maskPhone } from '../lib/masks.js';
import { EMPTY_FORM, toForm, toPayload, validatePatient } from '../lib/patient.js';
import { Alert, Button, Checkbox, Field, Input, Modal, Textarea } from './ui.jsx';

/** Cadastro e edição de paciente. */
export default function PatientForm({ open, patient, onClose, onSaved }) {
  const ui = useUI();
  const editing = Boolean(patient);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(patient ? toForm(patient) : EMPTY_FORM);
    setErrors({}); setFormError(null);
  }, [open, patient]);

  if (!open) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const bind = (name, mask) => ({ value: form[name], onChange: (e) => set({ [name]: mask ? mask(e.target.value) : e.target.value }) });

  const submit = async (e) => {
    e?.preventDefault();
    const found = validatePatient(form);
    setErrors(found); setFormError(null);
    if (Object.keys(found).length) { setFormError('Revise os campos destacados.'); return; }
    setBusy(true);
    try {
      const body = toPayload(form, editing);
      const saved = editing ? await Patients.update(patient.id, body) : await Patients.create(body);
      ui.success(editing ? 'Cadastro atualizado.' : 'Paciente cadastrado.');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const fromApi = fieldErrors(err);
      // a API devolve "address.zip"; a tela usa "zip"
      setErrors(Object.fromEntries(Object.entries(fromApi).map(([k, v]) => [k.replace('address.', ''), v])));
      setFormError(err.status === 409 ? 'Já existe um paciente com este CPF.' : errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={editing ? 'Editar paciente' : 'Novo paciente'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={submit}>Salvar</Button></>}>
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-muted">Dados pessoais</legend>
          <Field label="Nome completo" required error={errors.name} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} autoComplete="off" {...bind('name')} />}</Field>
          <Field label="CPF" error={errors.cpf}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="numeric" placeholder="000.000.000-00" {...bind('cpf', maskCpf)} />}</Field>
          <Field label="Data de nascimento" error={errors.birthDate}>{({ id, invalid }) => <Input id={id} type="date" invalid={invalid} {...bind('birthDate')} />}</Field>
          <Field label="Telefone / WhatsApp" error={errors.phone}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="tel" placeholder="(00) 00000-0000" {...bind('phone', maskPhone)} />}</Field>
          <Field label="E-mail" error={errors.email}>{({ id, invalid }) => <Input id={id} type="email" invalid={invalid} {...bind('email')} />}</Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-6">
          <legend className="mb-2 text-sm font-semibold text-muted">Endereço</legend>
          <Field label="CEP" error={errors.zip} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="numeric" placeholder="00000-000" {...bind('zip', maskCep)} />}</Field>
          <Field label="Rua" error={errors.street} className="sm:col-span-3">{({ id }) => <Input id={id} {...bind('street')} />}</Field>
          <Field label="Número" error={errors.number}>{({ id }) => <Input id={id} {...bind('number')} />}</Field>
          <Field label="Complemento" className="sm:col-span-2">{({ id }) => <Input id={id} {...bind('complement')} />}</Field>
          <Field label="Bairro" className="sm:col-span-2">{({ id }) => <Input id={id} {...bind('district')} />}</Field>
          <Field label="Cidade" className="sm:col-span-1">{({ id }) => <Input id={id} {...bind('city')} />}</Field>
          <Field label="UF" error={errors.state} className="sm:col-span-1">{({ id, invalid }) => <Input id={id} invalid={invalid} maxLength={2} {...bind('state', (v) => v.toUpperCase())} />}</Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-muted">Responsável (menores de idade)</legend>
          <Field label="Nome do responsável">{({ id }) => <Input id={id} {...bind('guardianName')} />}</Field>
          <Field label="Telefone do responsável" error={errors.guardianPhone}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="tel" {...bind('guardianPhone', maskPhone)} />}</Field>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-semibold text-muted">Outros</legend>
          <Field label="Observações" error={errors.notes}>{({ id }) => <Textarea id={id} maxLength={4000} {...bind('notes')} />}</Field>
          <div>
            <Checkbox label="O paciente autoriza contato por e-mail e WhatsApp (lembretes de consulta e orçamentos)" checked={form.contactConsent} onChange={(e) => set({ contactConsent: e.target.checked })} />
            {errors.contactConsent && <p role="alert" className="mt-1 text-sm text-danger">{errors.contactConsent}</p>}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
