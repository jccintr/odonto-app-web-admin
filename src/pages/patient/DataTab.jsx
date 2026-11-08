import { Badge, Card, CardHeader } from '../../components/ui.jsx';
import { ageOf, formatDay, formatDateTime } from '../../lib/dates.js';
import { maskCep, maskCpf, maskPhone } from '../../lib/masks.js';

function Item({ label, children }) {
  return <div><dt className="text-sm text-muted">{label}</dt><dd className="font-medium">{children || <span className="font-normal text-muted">—</span>}</dd></div>;
}

export default function DataTab({ patient: p }) {
  const a = p.address ?? {};
  const address = [a.street && `${a.street}${a.number ? `, ${a.number}` : ''}`, a.complement, a.district, a.city && `${a.city}${a.state ? `/${a.state}` : ''}`, a.zip && maskCep(a.zip)].filter(Boolean).join(' — ');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Dados pessoais" />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Item label="CPF">{p.cpf && maskCpf(p.cpf)}</Item>
          <Item label="Nascimento">{p.birthDate && `${formatDay(p.birthDate)} (${ageOf(p.birthDate)} anos)`}</Item>
          <Item label="Telefone / WhatsApp">{p.phone && maskPhone(p.phone)}</Item>
          <Item label="E-mail">{p.email}</Item>
          <div className="sm:col-span-2"><Item label="Endereço">{address}</Item></div>
        </dl>
      </Card>
      <Card>
        <CardHeader title="Responsável e contato" />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Item label="Responsável">{p.guardianName}</Item>
          <Item label="Telefone do responsável">{p.guardianPhone && maskPhone(p.guardianPhone)}</Item>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted">Autorização de contato (lembretes e orçamentos)</dt>
            <dd className="mt-1">{p.contactConsent ? <Badge tone="success">Autorizado{p.consentAt ? ` em ${formatDateTime(p.consentAt)}` : ''}</Badge> : <Badge tone="warning">Sem autorização</Badge>}</dd>
          </div>
        </dl>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Observações" />
        <p className="whitespace-pre-wrap p-5">{p.notes || <span className="text-muted">Nenhuma observação.</span>}</p>
      </Card>
    </div>
  );
}
