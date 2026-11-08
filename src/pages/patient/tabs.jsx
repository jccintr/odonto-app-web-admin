// Abas da ficha do paciente. Cada aba é um componente que recebe { patient, onSaved, reload }.
import AnamnesisTab from './AnamnesisTab.jsx';
import AppointmentsTab from './AppointmentsTab.jsx';
import BudgetsTab from './BudgetsTab.jsx';
import DataTab from './DataTab.jsx';
import EvolutionsTab from './EvolutionsTab.jsx';
import ImagesTab from './ImagesTab.jsx';
import OdontogramTab from './OdontogramTab.jsx';
import PaymentsTab from './PaymentsTab.jsx';

export const PATIENT_TABS = [
  { id: 'dados', label: 'Dados', component: DataTab },
  { id: 'anamnese', label: 'Anamnese', component: AnamnesisTab },
  { id: 'odontograma', label: 'Odontograma', component: OdontogramTab },
  { id: 'atendimentos', label: 'Atendimentos', component: AppointmentsTab },
  // o prontuário é clínico: o dentista registra no app; aqui só a administração lê (a secretária não vê)
  { id: 'prontuario', label: 'Prontuário', component: EvolutionsTab, adminOnly: true },
  { id: 'orcamentos', label: 'Orçamentos', component: BudgetsTab },
  { id: 'pagamentos', label: 'Pagamentos', component: PaymentsTab },
  { id: 'imagens', label: 'Imagens', component: ImagesTab },
];
