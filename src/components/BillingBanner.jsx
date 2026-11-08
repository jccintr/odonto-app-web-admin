import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBilling } from '../context/BillingContext.jsx';
import { bannerFor } from '../lib/billing.js';
import { Alert, Button, Card } from './ui.jsx';
import Icon from './Icon.jsx';

/** Faixa no topo do painel: teste acabando, pagamento em atraso ou vencimento próximo. */
export function BillingBanner() {
  const { isAdmin } = useAuth();
  const { status } = useBilling();
  const banner = bannerFor(status);
  if (!banner) return null;
  return (
    <Alert tone={banner.tone} className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
      <span>{banner.text}</span>
      {isAdmin && <Link to="/assinatura" className="font-semibold underline">Ver planos e pagamento</Link>}
    </Alert>
  );
}

/** No lugar da tela pedida quando a assinatura está suspensa: só a tela de assinatura e a conta continuam abertas. */
export function BlockedScreen() {
  const { isAdmin } = useAuth();
  const { status } = useBilling();
  const canceled = status?.state === 'canceled';
  return (
    <Card className="mx-auto mt-8 max-w-xl p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger"><Icon name="lock" className="size-7" /></span>
      <h1 className="mt-4 text-xl font-bold">{canceled ? 'Assinatura cancelada' : 'Assinatura suspensa'}</h1>
      {isAdmin ? (
        <>
          <p className="mt-2 text-muted">O acesso ao painel foi pausado por falta de pagamento. Regularize a assinatura para voltar a usar o sistema — seus dados continuam guardados e você pode exportá-los a qualquer momento em Minha conta.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/assinatura"><Button size="lg">Regularizar assinatura</Button></Link>
            <Link to="/conta"><Button size="lg" variant="secondary">Minha conta e meus dados</Button></Link>
          </div>
        </>
      ) : (
        <p className="mt-2 text-muted">O acesso da clínica está pausado por falta de pagamento. Avise o administrador da clínica para regularizar a assinatura.</p>
      )}
    </Card>
  );
}
