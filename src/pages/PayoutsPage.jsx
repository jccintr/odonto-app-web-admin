import { useSearchParams } from 'react-router-dom';
import { PageHeader, Tabs } from '../components/ui.jsx';
import BalancesTab from './payouts/BalancesTab.jsx';
import EntriesTab from './payouts/EntriesTab.jsx';
import PayoutsTab from './payouts/PayoutsTab.jsx';
import RulesTab from './payouts/RulesTab.jsx';
import SettingsTab from './payouts/SettingsTab.jsx';

const TABS = [
  { id: 'saldos', label: 'Saldos', component: BalancesTab },
  { id: 'lancamentos', label: 'Lançamentos', component: EntriesTab },
  { id: 'fechamentos', label: 'Fechamentos', component: PayoutsTab },
  { id: 'regras', label: 'Regras', component: RulesTab },
  { id: 'configuracao', label: 'Configuração', component: SettingsTab },
];

export default function PayoutsPage() {
  const [params, setParams] = useSearchParams();
  const current = TABS.find((t) => t.id === params.get('aba')) ?? TABS[0];
  const Current = current.component;
  return (
    <>
      <PageHeader title="Repasse aos dentistas" subtitle="Comissões, saldos e pagamentos" />
      <Tabs tabs={TABS} value={current.id} onChange={(id) => setParams(id === 'saldos' ? {} : { aba: id }, { replace: true })} />
      <div role="tabpanel" className="mt-5"><Current /></div>
    </>
  );
}
