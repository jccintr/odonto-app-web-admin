import { useState } from 'react';
import { Budgets } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';
import { formatMoney } from '../lib/money.js';
import MoneyInput from './MoneyInput.jsx';
import { Alert, Button, Checkbox, Field, Modal, Textarea } from './ui.jsx';

/**
 * O paciente aprovou alguns procedimentos: a secretária marca quais e combina o desconto DESTA rodada.
 * Cada rodada tem desconto e parcelas próprios e não mexe nas anteriores.
 */
export default function ApprovalModal({ budget, onClose, onDone }) {
  const { clinic } = useAuth();
  const proposed = budget.items.filter((item) => item.status === 'pending' && !item.approvalId);
  const [chosen, setChosen] = useState(() => new Set(proposed.map((item) => item.id)));
  const [discount, setDiscount] = useState(budget.status === 'open' ? budget.discountCents : 0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const picked = proposed.filter((item) => chosen.has(item.id));
  const subtotal = picked.reduce((sum, item) => sum + item.priceCents, 0);
  const percent = clinic.cashDiscountPercent ?? 0; // desconto sugerido para quem paga tudo à vista
  const toggle = (id) => setChosen((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const save = async () => {
    setBusy(true); setError(null);
    try {
      onDone(await Budgets.approve(budget.id, { itemIds: picked.map((item) => item.id), discountCents: discount ?? 0, notes: notes.trim() || undefined }));
      onClose();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Aprovação do paciente"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={picked.length === 0 || (discount ?? 0) > subtotal} onClick={save}>Aprovar</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Procedimentos aprovados</legend>
          {proposed.map((item) => (
            <Checkbox key={item.id} checked={chosen.has(item.id)} onChange={() => toggle(item.id)}
              label={`${item.procedure.name}${item.tooth ? ` — dente ${item.tooth}` : ''} · ${formatMoney(item.priceCents)}`} />
          ))}
        </fieldset>
        <Field label="Desconto desta aprovação" hint={`Valor dos procedimentos escolhidos: ${formatMoney(subtotal)}`}>{({ id }) => <MoneyInput id={id} value={discount} onChange={setDiscount} />}</Field>
        {percent > 0 && (
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setDiscount(Math.round((subtotal * percent) / 100))}>
            Pagamento à vista: {percent}% ({formatMoney(Math.round((subtotal * percent) / 100))})
          </Button>
        )}
        <Field label="Observações">{({ id }) => <Textarea id={id} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        <p className="rounded-lg bg-surface-2 p-3 text-sm">Total desta aprovação: <strong>{formatMoney(Math.max(subtotal - (discount ?? 0), 0))}</strong>. As parcelas são geradas depois, só para esta aprovação.</p>
      </div>
    </Modal>
  );
}
