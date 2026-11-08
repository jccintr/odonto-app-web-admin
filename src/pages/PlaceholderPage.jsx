import { EmptyState, PageHeader } from '../components/ui.jsx';

export default function PlaceholderPage({ title }) {
  return (<><PageHeader title={title} /><EmptyState icon="settings" title="Em construção">Esta tela será liberada em breve.</EmptyState></>);
}
