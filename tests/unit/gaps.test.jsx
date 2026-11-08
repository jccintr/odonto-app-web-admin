import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MoneyInput from '../../src/components/MoneyInput.jsx';
import Odontogram, { OdontogramLegend } from '../../src/components/Odontogram.jsx';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext.jsx';
import { isValidCpf } from '../../src/lib/masks.js';
import { toForm } from '../../src/lib/patient.js';
import { toothLabel } from '../../src/lib/tooth.js';

afterEach(() => vi.restoreAllMocks());

describe('casos de borda', () => {
  it('CPF cujo dígito verificador calculado é 10 vale 0', () => {
    expect(isValidCpf('000.000.006-04')).toBe(true); // 1º dígito: resto 10 → 0
    expect(isValidCpf('000.000.018-30')).toBe(true); // 2º dígito: resto 10 → 0
    expect(isValidCpf('000.000.006-14')).toBe(false);
  });

  it('dente inexistente não quebra o rótulo; paciente sem nada vira formulário vazio', () => {
    expect(toothLabel(99)).toBe('Dente 99 —');
    expect(toForm({}).name).toBe('');
  });

  it('campo de valor aceita ser marcado como inválido de fora', () => {
    render(<MoneyInput aria-label="v" value={100} onChange={() => {}} invalid />);
    expect(screen.getByLabelText('v')).toHaveAttribute('aria-invalid', 'true');
  });

  it('legenda do odontograma lista todas as condições', () => {
    render(<OdontogramLegend />);
    expect(screen.getByRole('list', { name: 'Legenda' }).children).toHaveLength(13);
    expect(screen.getByText('Cárie')).toBeInTheDocument();
  });

  it('tema: sem armazenamento (modo privado) e sem matchMedia, usa o claro e não quebra ao salvar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const original = window.matchMedia;
    window.matchMedia = undefined;
    function Host() { const { theme, setTheme } = useTheme(); return <button onClick={() => setTheme('dark')}>{theme}</button>; }
    render(<ThemeProvider><Host /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('light');
    screen.getByRole('button').click();
    window.matchMedia = original;
  });

  it('sair do campo de valor com texto inválido não "corrige" o que foi digitado', async () => {
    const u = userEvent.setup();
    render(<MoneyInput aria-label="v" value={null} onChange={() => {}} />);
    await u.type(screen.getByLabelText('v'), 'abc');
    await u.tab();
    expect(screen.getByLabelText('v')).toHaveValue('abc');
  });

  it('odontograma tolera condição desconhecida e marcações que não pintam o dente inteiro', () => {
    render(<Odontogram teeth={{
      11: [{ id: '1', tooth: 11, faces: null, condition: 'novidade' }],
      12: [{ id: '2', tooth: 12, faces: null, condition: 'sealant' }],
      13: [{ id: '3', tooth: 13, faces: null, condition: 'restoration' }],
    }} />);
    expect(screen.getByRole('img', { name: 'Dente 11: novidade' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dente 12: Selante' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dente 13: Restauração' })).toBeInTheDocument();
  });

  it('tema: alterna nos dois sentidos', async () => {
    const u = userEvent.setup();
    function Host() { const { theme, toggle } = useTheme(); return <button onClick={toggle}>{theme}</button>; }
    render(<ThemeProvider><Host /></ThemeProvider>);
    await u.click(screen.getByRole('button'));
    await u.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });
});
