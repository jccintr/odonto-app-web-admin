import { describe, expect, it } from 'vitest';
import { demo, renderApp, screen, user, waitFor } from './helpers.jsx';

describe('entrada no sistema', () => {
  it('quem não entrou é levado ao login; o login com a senha certa abre o painel', async () => {
    const u = user();
    renderApp('/pacientes');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();

    await u.type(screen.getByLabelText('E-mail'), demo().secretary.email);
    await u.type(screen.getByLabelText('Senha'), demo().secretary.password);
    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    // volta para onde queria ir (Pacientes) e mostra a clínica no topo
    expect(await screen.findByRole('heading', { name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.getAllByText('Clínica Sorriso').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Painel/ })).toBeInTheDocument();
  });

  it('senha errada mostra o erro e não entra', async () => {
    const u = user();
    renderApp('/login');
    await u.type(await screen.findByLabelText('E-mail'), demo().admin.email);
    await u.type(screen.getByLabelText('Senha'), 'senha-errada-123');
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/inválid/i);
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('a secretária não vê o que é só da administração; o administrador vê', async () => {
    const u = user();
    renderApp('/login');
    await u.type(await screen.findByLabelText('E-mail'), demo().secretary.email);
    await u.type(screen.getByLabelText('Senha'), demo().secretary.password);
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('heading', { level: 1, name: /Olá, Maria/ });
    expect(screen.queryByRole('link', { name: /Repasse/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Equipe/ })).not.toBeInTheDocument();
  });

  it('o dentista é avisado de que usa o aplicativo', async () => {
    const u = user();
    renderApp('/login');
    await u.type(await screen.findByLabelText('E-mail'), demo().dentists[0].email);
    await u.type(screen.getByLabelText('Senha'), demo().dentists[0].password);
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText(/aplicativo OdontoApp/)).toBeInTheDocument());
  });
});
