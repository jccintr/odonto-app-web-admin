import Brand from './Brand.jsx';
import { ThemeToggle } from './AppShell.jsx';
import { Card, cx } from './ui.jsx';

// Foto da tela de entrada (public/login-hero.jpg). Pode ser trocada via VITE_LOGIN_HERO_URL.
const HERO_PHOTO = import.meta.env.VITE_LOGIN_HERO_URL || '/login-hero.jpg';
const HERO_ALT = 'Dentista de touca azul atendendo uma paciente no consultório';

const POINTS = ['Agenda, prontuário e odontograma num só lugar', 'Orçamentos, recebimentos e repasse aos dentistas', '14 dias grátis, sem cartão de crédito'];

function Hero() {
  return (
    <aside className="relative hidden overflow-hidden bg-slate-900 lg:block">
      <img src={HERO_PHOTO} alt={HERO_ALT} className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/40" />
      <div className="relative flex h-full flex-col justify-between p-12 text-white">
        <Brand />
        <div className="max-w-lg">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">Sorrisos bem cuidados começam numa clínica bem organizada.</h2>
          <ul className="mt-5 space-y-2 text-white/90">{POINTS.map((p) => <li key={p} className="flex gap-2"><span aria-hidden className="text-sky-300">✓</span>{p}</li>)}</ul>
        </div>
      </div>
    </aside>
  );
}

/** Moldura das telas de acesso. `hero` mostra a foto do consultório ao lado (e como faixa no topo no celular). */
export default function AuthLayout({ title, subtitle, children, hero = false, wide = false }) {
  const card = (
    <Card className={cx('w-full p-6 sm:p-8', wide ? 'max-w-xl' : 'max-w-md')}>
      <h1 className="text-xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </Card>
  );

  if (!hero) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <Brand className="mb-6" />
        {card}
      </div>
    );
  }
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <Hero />
      <main className="relative flex flex-col items-center justify-center px-4 pb-10 lg:py-10">
        <div className="absolute right-4 top-4 z-10"><ThemeToggle /></div>
        <div className="relative -mx-4 mb-6 h-44 w-[calc(100%+2rem)] overflow-hidden bg-slate-900 sm:h-56 lg:hidden">
          <img src={HERO_PHOTO} alt={HERO_ALT} className="h-full w-full object-cover object-top" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
          <div className="absolute bottom-3 left-4 text-white"><Brand /></div>
        </div>
        {card}
      </main>
    </div>
  );
}
