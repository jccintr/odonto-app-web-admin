import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Patients } from '../api/index.js';
import PatientForm from '../components/PatientForm.jsx';
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Input, Loading, PageHeader, Pagination, Table } from '../components/ui.jsx';
import useDebounced from '../hooks/useDebounced.js';
import useResource from '../hooks/useResource.js';
import { ageOf, formatDay } from '../lib/dates.js';
import { maskCpf, maskPhone } from '../lib/masks.js';

export default function PatientsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [text, setText] = useState(params.get('q') ?? '');
  const q = useDebounced(text.trim(), 300);
  const page = Number(params.get('pagina') ?? 1);
  const archived = params.get('arquivados') === '1';
  const [creating, setCreating] = useState(false);

  const go = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const list = useResource(() => Patients.list({ q: q || undefined, active: archived ? undefined : true, page, perPage: 20 }), [q, page, archived]);

  return (
    <>
      <PageHeader title="Pacientes" actions={<Button icon="plus" onClick={() => setCreating(true)}>Novo paciente</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="relative min-w-60 flex-1">
            <Input aria-label="Buscar paciente" placeholder="Buscar por nome, CPF ou telefone" value={text} onChange={(e) => { setText(e.target.value); go({ pagina: null }); }} />
          </div>
          <Checkbox label="Incluir arquivados" checked={archived} onChange={(e) => go({ arquivados: e.target.checked ? '1' : null, pagina: null })} />
        </div>
        {list.loading && !list.data ? <Loading />
          : list.error ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div>
            : list.data.data.length === 0 ? (
              <EmptyState icon="users" title={q ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                action={!q && <Button icon="plus" onClick={() => setCreating(true)}>Cadastrar o primeiro paciente</Button>}>
                {q ? 'Confira a grafia ou busque pelo CPF ou telefone.' : 'Cadastre o primeiro paciente para começar a agendar e fazer orçamentos.'}
              </EmptyState>
            ) : (
              <>
                <Table head={['Paciente', 'CPF', 'Telefone', 'Nascimento', '']}>
                  {list.data.data.map((p) => (
                    <tr key={p.id} className="cursor-pointer hover:bg-surface-2" onClick={() => navigate(`/pacientes/${p.id}`)}>
                      <td className="px-4 py-3 font-medium"><a href={`/pacientes/${p.id}`} onClick={(e) => e.preventDefault()}>{p.name}</a> {!p.active && <Badge className="ml-1">Arquivado</Badge>}</td>
                      <td className="px-4 py-3 text-muted">{p.cpf ? maskCpf(p.cpf) : '—'}</td>
                      <td className="px-4 py-3 text-muted">{p.phone ? maskPhone(p.phone) : '—'}</td>
                      <td className="px-4 py-3 text-muted">{p.birthDate ? `${formatDay(p.birthDate)} (${ageOf(p.birthDate)} anos)` : '—'}</td>
                      <td className="px-4 py-3 text-right text-primary">Abrir</td>
                    </tr>
                  ))}
                </Table>
                <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onChange={(n) => go({ pagina: n > 1 ? String(n) : null })} />
              </>
            )}
      </Card>
      <PatientForm open={creating} onClose={() => setCreating(false)} onSaved={(p) => navigate(`/pacientes/${p.id}`)} />
    </>
  );
}
