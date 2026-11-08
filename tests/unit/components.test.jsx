import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import BarChart from '../../src/components/BarChart.jsx';
import MoneyInput from '../../src/components/MoneyInput.jsx';
import Odontogram from '../../src/components/Odontogram.jsx';
import ToothFacesPicker from '../../src/components/ToothFacesPicker.jsx';
import { Field, Input, Modal, Pagination, StatusBadge, Tabs } from '../../src/components/ui.jsx';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext.jsx';
import { UIProvider, useUI } from '../../src/context/UIContext.jsx';

describe('Modal', () => {
  it('fecha com Esc e devolve o foco a quem abriu', async () => {
    const u = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Abrir</button><Modal open={open} onClose={() => setOpen(false)} title="Teste"><input aria-label="campo" /></Modal></>;
    }
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await u.click(opener);
    expect(screen.getByRole('dialog', { name: 'Teste' })).toBeInTheDocument();
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('quem digita dentro do modal NÃO perde o foco quando o pai renderiza de novo (defeito que existiu)', async () => {
    const u = userEvent.setup();
    function Host() {
      const [text, setText] = useState('');
      return <Modal open onClose={() => {}} title="Digitar" footer={<button>Salvar</button>}><textarea aria-label="motivo" value={text} onChange={(e) => setText(e.target.value)} /></Modal>;
    }
    render(<Host />);
    const box = screen.getByLabelText('motivo');
    await u.click(box);
    await u.keyboard('Paciente avisou que não vem');
    expect(box).toHaveValue('Paciente avisou que não vem');
    expect(box).toHaveFocus();
  });

  it('não fecha com Esc nem clique fora quando não pode ser dispensado', async () => {
    const u = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open dismissible={false} onClose={onClose} title="Enviando">conteúdo</Modal>);
    await u.keyboard('{Escape}');
    await u.click(screen.getByRole('dialog').parentElement);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
  });

  it('clique fora fecha', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x">y</Modal>);
    await userEvent.setup().click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('MoneyInput', () => {
  function Host({ start = null }) {
    const [value, setValue] = useState(start);
    return <><MoneyInput aria-label="valor" value={value} onChange={setValue} /><output>{String(value)}</output></>;
  }

  it('converte o texto digitado em centavos e formata ao sair do campo', async () => {
    const u = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText('valor');
    await u.type(input, '1.234,5');
    expect(screen.getByRole('status', { hidden: true }) ?? null).toBeDefined;
    expect(document.querySelector('output')).toHaveTextContent('123450');
    await u.tab();
    expect(input).toHaveValue('1234,50');
  });

  it('texto inválido vira null e o campo fica marcado como inválido', async () => {
    const u = userEvent.setup();
    render(<Host />);
    await u.type(screen.getByLabelText('valor'), '12,345');
    expect(document.querySelector('output')).toHaveTextContent('null');
    expect(screen.getByLabelText('valor')).toHaveAttribute('aria-invalid', 'true');
  });

  it('acompanha o valor quando o pai o troca e seleciona tudo ao focar', async () => {
    const u = userEvent.setup();
    const { rerender } = render(<MoneyInput aria-label="valor" value={1000} onChange={() => {}} />);
    expect(screen.getByLabelText('valor')).toHaveValue('10,00');
    rerender(<MoneyInput aria-label="valor" value={25050} onChange={() => {}} />);
    expect(screen.getByLabelText('valor')).toHaveValue('250,50');
    await u.click(screen.getByLabelText('valor'));
    expect(screen.getByLabelText('valor').selectionEnd - screen.getByLabelText('valor').selectionStart).toBe(6);
  });
});

describe('ToothFacesPicker', () => {
  function Host() {
    const [v, setV] = useState({ tooth: null, faces: '' });
    return <><ToothFacesPicker tooth={v.tooth} faces={v.faces} onChange={setV} /><output>{JSON.stringify(v)}</output></>;
  }

  it('as faces só liberam depois de escolher o dente, e saem na ordem canônica', async () => {
    const u = userEvent.setup();
    render(<Host />);
    expect(screen.getByRole('button', { name: 'Oclusal/Incisal' })).toBeDisabled();
    await u.selectOptions(screen.getByLabelText('Dente'), '16');
    await u.click(screen.getByRole('button', { name: 'Oclusal/Incisal' }));
    await u.click(screen.getByRole('button', { name: 'Distal' }));
    expect(document.querySelector('output')).toHaveTextContent('"faces":"DO"');
    await u.click(screen.getByRole('button', { name: 'Distal' })); // desmarca
    expect(document.querySelector('output')).toHaveTextContent('"faces":"O"');
  });

  it('voltar para "sem dente" limpa as faces', async () => {
    const u = userEvent.setup();
    render(<Host />);
    await u.selectOptions(screen.getByLabelText('Dente'), '26');
    await u.click(screen.getByRole('button', { name: 'Vestibular' }));
    await u.selectOptions(screen.getByLabelText('Dente'), '');
    expect(document.querySelector('output')).toHaveTextContent('{"tooth":null,"faces":""}');
  });
});

describe('Odontogram', () => {
  const teeth = { 16: [{ id: '1', tooth: 16, faces: 'O', condition: 'caries' }], 11: [{ id: '2', tooth: 11, faces: null, condition: 'missing' }], 21: [{ id: '3', tooth: 21, faces: null, condition: 'crown' }] };

  it('descreve cada dente para leitores de tela, com as condições marcadas', () => {
    render(<Odontogram teeth={teeth} />);
    expect(screen.getByRole('img', { name: 'Dente 16: Cárie (O)' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dente 11: Ausente' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dente 12' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(32); // permanentes
  });

  it('dentes de leite só aparecem quando pedido; o clique seleciona o dente', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<Odontogram teeth={{}} interactive onSelect={onSelect} selected={16} />);
    expect(screen.queryByRole('button', { name: /Dente 55/ })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dente 16' }));
    expect(onSelect).toHaveBeenCalledWith(16);
    expect(screen.getByRole('button', { name: 'Dente 16' })).toHaveAttribute('aria-pressed', 'true');
    rerender(<Odontogram teeth={{}} interactive onSelect={onSelect} deciduous />);
    expect(screen.getByRole('button', { name: 'Dente 55' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(52);
  });
});

describe('BarChart', () => {
  it('traz um resumo acessível com os valores de cada mês', () => {
    render(<BarChart data={[{ label: 'out', values: [100000, 50000] }, { label: 'nov', values: [0, 0] }]} series={[{ name: 'Recebido', color: 'red' }, { name: 'Produzido', color: 'blue' }]} />);
    const chart = screen.getByRole('img');
    expect(chart.getAttribute('aria-label')).toContain('out: Recebido R$ 1.000,00, Produzido R$ 500,00');
    expect(screen.getByText('Recebido', { selector: 'figcaption span' })).toBeInTheDocument();
  });

  it('sem nenhum valor não quebra (eixo mínimo)', () => {
    render(<BarChart data={[]} series={[{ name: 'A', color: 'red' }]} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

describe('peças de interface', () => {
  it('Field liga o rótulo ao campo e mostra o erro', () => {
    render(<Field label="Nome" required error="Informe o nome.">{({ id, invalid }) => <Input id={id} invalid={invalid} />}</Field>);
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome.');
  });

  it('Tabs e Pagination', async () => {
    const u = userEvent.setup();
    const onTab = vi.fn(); const onPage = vi.fn();
    render(<><Tabs tabs={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B', count: 3 }]} value="a" onChange={onTab} /><Pagination page={2} totalPages={3} total={50} onChange={onPage} /></>);
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'true');
    await u.click(screen.getByRole('tab', { name: /B/ }));
    expect(onTab).toHaveBeenCalledWith('b');
    await u.click(screen.getByRole('button', { name: /Anterior/ }));
    await u.click(screen.getByRole('button', { name: /Próxima/ }));
    expect(onPage.mock.calls).toEqual([[1], [3]]);
  });

  it('Pagination com uma página só mostra apenas o total', () => {
    render(<Pagination page={1} totalPages={1} total={1} onChange={() => {}} />);
    expect(screen.getByText('1 registro')).toBeInTheDocument();
  });

  it('StatusBadge usa o rótulo do mapa e cai no valor bruto se desconhecido', () => {
    render(<><StatusBadge map={{ open: { label: 'Em aberto', tone: 'info' } }} value="open" /><StatusBadge map={{}} value="estranho" /></>);
    expect(screen.getByText('Em aberto')).toBeInTheDocument();
    expect(screen.getByText('estranho')).toBeInTheDocument();
  });
});

describe('confirmação (UIContext)', () => {
  function Host({ options }) {
    const ui = useUI();
    const [answer, setAnswer] = useState('—');
    return <><button onClick={async () => setAnswer(String(await ui.confirm(options)))}>Perguntar</button><output>{answer}</output></>;
  }

  it('Confirmar devolve true; Voltar devolve false', async () => {
    const u = userEvent.setup();
    render(<UIProvider><Host options={{ title: 'Apagar?', confirmLabel: 'Apagar' }} /></UIProvider>);
    await u.click(screen.getByRole('button', { name: 'Perguntar' }));
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Apagar' }));
    expect(document.querySelector('output')).toHaveTextContent('true');
    await u.click(screen.getByRole('button', { name: 'Perguntar' }));
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Voltar' }));
    expect(document.querySelector('output')).toHaveTextContent('false');
  });

  it('com motivo, devolve o texto digitado (inteiro, mesmo com espaços)', async () => {
    const u = userEvent.setup();
    render(<UIProvider><Host options={{ title: 'Cancelar', askReason: true, confirmLabel: 'Cancelar atendimento' }} /></UIProvider>);
    await u.click(screen.getByRole('button', { name: 'Perguntar' }));
    await u.type(screen.getByLabelText(/Motivo/), 'Paciente avisou que viajou');
    await u.click(screen.getByRole('button', { name: 'Cancelar atendimento' }));
    expect(document.querySelector('output')).toHaveTextContent('Paciente avisou que viajou');
  });

  it('com motivo vazio, confirma com true', async () => {
    const u = userEvent.setup();
    render(<UIProvider><Host options={{ title: 'Cancelar', askReason: true, confirmLabel: 'Sim' }} /></UIProvider>);
    await u.click(screen.getByRole('button', { name: 'Perguntar' }));
    await u.click(screen.getByRole('button', { name: 'Sim' }));
    expect(document.querySelector('output')).toHaveTextContent('true');
  });
});

describe('tema', () => {
  function Host() { const { theme, toggle } = useTheme(); return <button onClick={toggle}>{theme}</button>; }

  it('começa pelo que o aparelho prefere e lembra a escolha', async () => {
    const u = userEvent.setup();
    window.matchMedia = (query) => ({ matches: query.includes('dark'), media: query, addEventListener() {}, removeEventListener() {} });
    render(<ThemeProvider><Host /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    await u.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('odonto:theme')).toBe('light');
  });

  it('a escolha salva vence a preferência do aparelho', () => {
    localStorage.setItem('odonto:theme', 'light');
    window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} });
    render(<ThemeProvider><Host /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });
});
