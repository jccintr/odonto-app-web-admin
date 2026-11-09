import PrintPortal from './PrintPortal.jsx';
import Odontogram, { OdontogramLegend } from './Odontogram.jsx';
import { ageOf, dayOf, formatDay } from '../lib/dates.js';
import { CONDITION } from '../lib/labels.js';
import { maskCep, maskCpf, maskPhone } from '../lib/masks.js';
import { conditionLabels, readAnamnesis } from '../lib/patient.js';

/** Ficha do paciente para imprimir (A4), com ou sem odontograma. Só aparece na impressão. */
export default function PatientPrint({ patient: p, clinic, options, odontogram }) {
  const a = p.address ?? {};
  const address = [a.street && `${a.street}${a.number ? `, ${a.number}` : ''}`, a.complement, a.district, a.city && `${a.city}${a.state ? `/${a.state}` : ''}`, a.zip && maskCep(a.zip)].filter(Boolean).join(' — ');
  const anamnesis = readAnamnesis(p.anamnesis);
  const records = Object.values(odontogram?.teeth ?? {}).flat().sort((x, y) => x.tooth - y.tooth);
  const planned = Object.entries(odontogram?.planned ?? {}).flatMap(([tooth, list]) => list.map((x) => ({ ...x, tooth: Number(tooth) }))).sort((x, y) => x.tooth - y.tooth);
  const row = (label, value) => <p><strong>{label}:</strong> {value || '—'}</p>;

  return (
    <PrintPortal>
    <div className="print-area print-only text-[12px] leading-snug" aria-hidden="true" data-testid="patient-print">
      <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
        <div><p className="text-xl font-bold">{clinic.name}</p>{clinic.document && <p>{clinic.document}</p>}</div>
        <div className="text-right"><p className="text-lg font-semibold">FICHA DO PACIENTE</p><p>Impressa em {formatDay(dayOf())}</p></div>
      </div>

      <section className="mb-3"><h2 className="mb-1 border-b border-gray-400 font-bold uppercase">Dados pessoais</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <p className="col-span-2 text-base"><strong>{p.name}</strong></p>
          {row('CPF', p.cpf && maskCpf(p.cpf))}{row('Nascimento', p.birthDate && `${formatDay(p.birthDate)} (${ageOf(p.birthDate)} anos)`)}
          {row('Telefone', p.phone && maskPhone(p.phone))}{row('E-mail', p.email)}
          <div className="col-span-2">{row('Endereço', address)}</div>
          {row('Responsável', p.guardianName)}{row('Tel. do responsável', p.guardianPhone && maskPhone(p.guardianPhone))}
        </div>
      </section>

      {options.anamnese && (
        <section className="mb-3"><h2 className="mb-1 border-b border-gray-400 font-bold uppercase">Anamnese</h2>
          {row('Condições', [...conditionLabels(anamnesis.conditions), anamnesis.smoker && 'Fumante', anamnesis.pregnant && 'Gestante'].filter(Boolean).join(', '))}
          {row('Alergias', anamnesis.allergies)}{row('Medicamentos em uso', anamnesis.medications)}{row('Observações', anamnesis.notes)}
        </section>
      )}

      {options.odontogram && (
        <section className="mb-3 break-inside-avoid"><h2 className="mb-1 border-b border-gray-400 font-bold uppercase">Odontograma</h2>
          <Odontogram teeth={odontogram?.teeth ?? {}} planned={odontogram?.planned ?? {}} deciduous={records.some((r) => r.tooth >= 51)} />
          <div className="mt-1"><OdontogramLegend /></div>
          {records.length > 0 && (
            <table className="mt-2 w-full border-collapse">
              <thead><tr className="border-b border-black text-left"><th className="py-0.5">Dente</th><th>Condição</th><th>Faces</th><th>Data</th><th>Observações</th></tr></thead>
              <tbody>{records.map((r) => <tr key={r.id} className="border-b border-gray-300"><td className="py-0.5">{r.tooth}</td><td>{CONDITION[r.condition]?.label ?? r.condition}</td><td>{r.faces ?? ''}</td><td>{formatDay(r.recordedOn)}</td><td>{r.notes ?? ''}</td></tr>)}</tbody>
            </table>
          )}
          {planned.length > 0 && (
            <table className="mt-2 w-full border-collapse">
              <thead><tr className="border-b border-black text-left"><th className="py-0.5">Dente</th><th>Planejado</th><th>Faces</th><th>Situação</th></tr></thead>
              <tbody>{planned.map((x) => <tr key={x.itemId} className="border-b border-gray-300"><td className="py-0.5">{x.tooth}</td><td>{x.procedure.name}</td><td>{x.faces ?? ''}</td><td>{x.approved ? 'Aprovado' : 'Proposto'}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      )}

      {p.notes && <section className="mb-3"><h2 className="mb-1 border-b border-gray-400 font-bold uppercase">Observações</h2><p className="whitespace-pre-wrap">{p.notes}</p></section>}
      <div className="mt-14 grid grid-cols-2 gap-12 text-center"><div className="border-t border-black pt-1">Assinatura do paciente ou responsável</div><div className="border-t border-black pt-1">Cirurgião-dentista</div></div>
    </div>
    </PrintPortal>
  );
}
