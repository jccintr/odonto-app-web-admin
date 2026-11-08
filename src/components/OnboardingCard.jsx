import { Link } from 'react-router-dom';
import { Clinic } from '../api/index.js';
import useResource from '../hooks/useResource.js';
import { useUI } from '../context/UIContext.jsx';
import { Button, Card, CardHeader } from './ui.jsx';
import Icon from './Icon.jsx';

const LINK = { prices: '/procedimentos', team: '/equipe', patient: '/pacientes', appointment: '/agenda' };

/** Primeiros passos da clínica nova (administrador). Some sozinho quando tudo está feito. */
export default function OnboardingCard() {
  const ui = useUI();
  const res = useResource(() => Clinic.onboarding(), []);
  if (!res.data || res.data.completed) return null;

  const confirmPrices = async () => {
    try { await Clinic.pricesReviewed(); await res.reload(); ui.success('Preços conferidos.'); } catch (err) { ui.error(err); }
  };
  const done = res.data.steps.filter((s) => s.done).length;

  return (
    <Card className="mb-6">
      <CardHeader title="Primeiros passos" subtitle={`${done} de ${res.data.steps.length} concluídos`} />
      <ul className="divide-y divide-border">
        {res.data.steps.map((step) => (
          <li key={step.key} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-success text-white' : 'border border-border text-transparent'}`}><Icon name="check" className="size-4" /></span>
            <span className={`flex-1 ${step.done ? 'text-muted line-through' : 'font-medium'}`}>{step.label}</span>
            {!step.done && <Link to={LINK[step.key]} className="text-sm font-medium text-primary hover:underline">Abrir</Link>}
            {!step.done && step.key === 'prices' && <Button size="sm" variant="soft" onClick={confirmPrices}>Já conferi</Button>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
