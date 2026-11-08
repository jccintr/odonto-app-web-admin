import { Link } from 'react-router-dom';
import { Signup } from '../api/index.js';
import Brand from '../components/Brand.jsx';
import { ThemeToggle } from '../components/AppShell.jsx';
import { Card, ErrorState, Loading } from '../components/ui.jsx';
import useResource from '../hooks/useResource.js';
import { formatDay } from '../lib/dates.js';

/** Termos de Uso e Política de Privacidade: o texto vem da API (versionado), então o aceite registrado bate com o que foi lido. */
export default function LegalPage({ type }) {
  const res = useResource(() => Signup.legal(type), [type]);
  const doc = res.data;
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/login"><Brand /></Link>
          <ThemeToggle />
        </div>
        <Card className="p-6 sm:p-10">
          {res.loading && !doc ? <Loading /> : res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : (
            <article>
              <h1 className="text-2xl font-bold">{doc.title}</h1>
              <p className="mt-1 text-sm text-muted">Versão de {formatDay(doc.updatedOn)}</p>
              <p className="mt-4">{doc.intro}</p>
              {doc.sections.map((section) => (
                <section key={section.title} className="mt-6">
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  {section.paragraphs.map((text) => <p key={text} className="mt-2 text-muted">{text}</p>)}
                  {section.items.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-6 text-muted">{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
                </section>
              ))}
            </article>
          )}
        </Card>
        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/termos" className="hover:underline">Termos de Uso</Link> · <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link> · <Link to="/cadastro" className="hover:underline">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
