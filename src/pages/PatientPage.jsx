import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Patients } from '../api/index.js';
import AppointmentModal from '../components/AppointmentModal.jsx';
import PatientPrint from '../components/PatientPrint.jsx';
import PatientForm from '../components/PatientForm.jsx';
import StandingBanner from '../components/StandingBanner.jsx';
import { Badge, Button, Checkbox, ErrorState, Loading, Modal, PageHeader, Tabs } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { ageOf } from '../lib/dates.js';
import { PATIENT_TABS } from './patient/tabs.jsx';

export default function PatientPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const ui = useUI();
  const auth = useAuth();
  const tab = params.get('aba') ?? 'dados';
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [printOptions, setPrintOptions] = useState(null); // null = fechado; objeto = modal aberto
  const [printing, setPrinting] = useState(null); // { options, odontogram } enquanto a ficha é impressa
  const patient = useResource(() => Patients.get(id), [id]);
  // a situação financeira é da administração e da secretária (o dentista não a recebe)
  const standing = useResource(() => (auth.role === 'dentist' ? Promise.resolve(null) : Patients.standing(id)), [id]);

  // imprime assim que a ficha (com ou sem odontograma) está montada; some da tela quando a impressão termina
  useEffect(() => {
    if (!printing) return undefined;
    const clear = () => setPrinting(null);
    window.addEventListener('afterprint', clear);
    const t = setTimeout(() => { window.print(); clear(); }, 150);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', clear); };
  }, [printing]);

  const startPrint = async () => {
    const options = printOptions;
    try {
      const odontogram = options.odontogram ? await Patients.odontogram(id) : null;
      setPrintOptions(null);
      setPrinting({ options, odontogram });
    } catch (err) { ui.error(err); }
  };

  if (patient.loading && !patient.data) return <Loading />;
  if (patient.error) {
    return <ErrorState error={patient.error.status === 404 ? { message: 'Paciente não encontrado.' } : patient.error} onRetry={patient.error.status === 404 ? () => navigate('/pacientes') : patient.reload} />;
  }
  const p = patient.data;
  const refresh = (saved) => patient.setData(saved);

  const toggleArchive = async () => {
    const archive = p.active;
    if (archive && !(await ui.confirm({ title: 'Arquivar paciente?', message: 'O paciente deixa de aparecer nas buscas e na agenda, mas o histórico é mantido. Você pode reativar quando quiser.', confirmLabel: 'Arquivar', danger: true }))) return;
    try { refresh(await Patients.update(p.id, { active: !archive })); ui.success(archive ? 'Paciente arquivado.' : 'Paciente reativado.'); } catch (err) { ui.error(err); }
  };

  const visibleTabs = PATIENT_TABS.filter((t) => !t.adminOnly || auth.isAdmin);
  const tabs = visibleTabs.map(({ id: tid, label }) => ({ id: tid, label }));
  const Current = (visibleTabs.find((t) => t.id === tab) ?? visibleTabs[0]).component;

  return (
    <>
      <p className="no-print mb-2 text-sm"><Link to="/pacientes" className="text-primary hover:underline">← Pacientes</Link></p>
      <StandingBanner standing={standing.data} patientId={p.id} isAdmin={auth.isAdmin} onChanged={standing.setData} />
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{p.name}{!p.active && <Badge>Arquivado</Badge>}</span>}
        subtitle={[p.birthDate && `${ageOf(p.birthDate)} anos`, p.phone].filter(Boolean).join(' · ') || undefined}
        actions={(
          <div className="no-print flex flex-wrap gap-2">
            <Button icon="calendar" onClick={() => setScheduling(true)} disabled={!p.active}>Agendar</Button>
            <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>Editar</Button>
            <Button variant="secondary" icon="print" onClick={() => setPrintOptions({ anamnese: true, odontogram: true })}>Imprimir ficha</Button>
            <Button variant="secondary" onClick={toggleArchive}>{p.active ? 'Arquivar' : 'Reativar'}</Button>
          </div>
        )}
      />
      <Tabs tabs={tabs} value={tab} onChange={(t) => { const next = new URLSearchParams(params); next.set('aba', t); setParams(next, { replace: true }); }} />
      <div role="tabpanel" className="mt-5"><Current patient={p} onSaved={refresh} reload={patient.reload} auth={auth} /></div>
      {printOptions && (
        <Modal open size="sm" onClose={() => setPrintOptions(null)} title="Imprimir ficha"
          footer={<><Button variant="secondary" onClick={() => setPrintOptions(null)}>Cancelar</Button><Button icon="print" onClick={startPrint}>Imprimir</Button></>}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Escolha o que vai na ficha. Os dados pessoais sempre vão.</p>
            <Checkbox label="Incluir anamnese" checked={printOptions.anamnese} onChange={(e) => setPrintOptions({ ...printOptions, anamnese: e.target.checked })} />
            <Checkbox label="Incluir odontograma" checked={printOptions.odontogram} onChange={(e) => setPrintOptions({ ...printOptions, odontogram: e.target.checked })} />
          </div>
        </Modal>
      )}
      {printing && <PatientPrint patient={p} clinic={auth.clinic} options={printing.options} odontogram={printing.odontogram} />}
      <PatientForm open={editing} patient={p} onClose={() => setEditing(false)} onSaved={refresh} />
      <AppointmentModal open={scheduling} initial={{ patient: { id: p.id, name: p.name } }} onClose={() => setScheduling(false)} onSaved={() => setParams(new URLSearchParams({ aba: 'atendimentos' }))} />
    </>
  );
}
