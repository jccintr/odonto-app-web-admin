import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Field, PasswordInput } from '../../src/components/ui.jsx';

describe('PasswordInput', () => {
  it('começa oculto e o botão mostra e oculta a senha digitada', async () => {
    const u = userEvent.setup();
    render(<Field label="Senha">{({ id }) => <PasswordInput id={id} autoComplete="current-password" />}</Field>);
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');
    await u.type(input, 'segredo-123');

    await u.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('segredo-123');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');

    await u.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('repassa as demais propriedades e não envia o formulário ao clicar no olho', async () => {
    const u = userEvent.setup();
    let submitted = false;
    render(<form onSubmit={(e) => { e.preventDefault(); submitted = true; }}><PasswordInput aria-label="s" className="extra" placeholder="digite" /></form>);
    expect(screen.getByLabelText('s')).toHaveClass('extra');
    expect(screen.getByPlaceholderText('digite')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(submitted).toBe(false);
  });
});
