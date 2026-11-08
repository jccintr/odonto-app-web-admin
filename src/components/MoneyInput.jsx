import { useEffect, useState } from 'react';
import { centsToInput, parseMoney } from '../lib/money.js';
import { Input } from './ui.jsx';

/** Campo de valor em reais. `value` e `onChange` trabalham em centavos (null = vazio/inválido). */
export default function MoneyInput({ id, value, onChange, invalid, ...rest }) {
  const [text, setText] = useState(centsToInput(value));
  // se o pai troca o valor (ex.: escolheu outro procedimento), o texto acompanha
  useEffect(() => { if (parseMoney(text) !== value) setText(centsToInput(value)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
      <Input id={id} inputMode="decimal" className="pl-9 text-right tabular-nums" invalid={invalid || (text !== '' && parseMoney(text) === null)} value={text}
        onChange={(e) => { setText(e.target.value); onChange(parseMoney(e.target.value)); }}
        onFocus={(e) => e.target.select()}
        onBlur={() => { const cents = parseMoney(text); if (cents !== null) setText(centsToInput(cents)); }} {...rest} />
    </div>
  );
}
