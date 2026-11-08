import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBilling } from '../context/BillingContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { isOpenWhenBlocked } from '../lib/billing.js';
import { ROLE_LABEL } from '../lib/labels.js';
import Brand from './Brand.jsx';
import { BillingBanner, BlockedScreen } from './BillingBanner.jsx';
import Icon from './Icon.jsx';
import { IconButton, cx } from './ui.jsx';

// `admin: true` = só o administrador vê
const NAV = [
  { to: '/', label: 'Painel', icon: 'home', end: true },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/pacientes', label: 'Pacientes', icon: 'users' },
  { to: '/orcamentos', label: 'Orçamentos', icon: 'clipboard' },
  { to: '/financeiro', label: 'Financeiro', icon: 'wallet' },
  { to: '/procedimentos', label: 'Procedimentos', icon: 'tooth' },
  { to: '/avisos', label: 'Avisos', icon: 'bell' },
  { to: '/repasse', label: 'Repasse', icon: 'coin', admin: true },
  { to: '/relatorios', label: 'Relatórios', icon: 'chart', admin: true },
  { to: '/equipe', label: 'Equipe', icon: 'user', admin: true },
  { to: '/assinatura', label: 'Assinatura', icon: 'card', admin: true },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings', admin: true },
];

// com a assinatura suspensa só estas telas abrem
const NAV_BLOCKED = NAV.filter((item) => item.to === '/assinatura');

function NavItems({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu principal">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-primary-soft font-semibold text-primary shadow-[inset_3px_0_0_var(--primary)]' : 'text-muted hover:bg-surface-2 hover:text-text')}>
          <Icon name={item.icon} className="size-5" />{item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} onClick={toggle} />;
}

export default function AppShell() {
  const { user, clinic, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  const { blocked } = useBilling();
  const items = (blocked ? NAV_BLOCKED : NAV).filter((item) => !item.admin || isAdmin);

  const account = (
    <div className="border-t border-border pt-3">
      <button onClick={() => navigate('/conta')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">{user.name.charAt(0).toUpperCase()}</span>
        <span className="min-w-0"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span></span>
      </button>
      <button onClick={async () => { await logout(); navigate('/login'); }} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
        <Icon name="logout" className="size-5" />Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Brand className="px-2" />
        <div className="flex-1 overflow-y-auto"><NavItems items={items} /></div>
        {account}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface/90 px-4 py-2.5 backdrop-blur lg:px-8">
          <IconButton icon="menu" label="Abrir menu" className="lg:hidden" onClick={() => setOpen(true)} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{clinic?.name}</p></div>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          <BillingBanner />
          {blocked && !isOpenWhenBlocked(location.pathname) ? <BlockedScreen /> : <Outlet />}
        </main>
      </div>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-fade-in flex-col gap-6 bg-surface p-4 shadow-xl">
            <div className="flex items-center justify-between"><Brand className="px-2" /><IconButton icon="x" label="Fechar menu" onClick={() => setOpen(false)} /></div>
            <div className="flex-1 overflow-y-auto"><NavItems items={items} onNavigate={() => setOpen(false)} /></div>
            {account}
          </aside>
        </div>
      )}
    </div>
  );
}
