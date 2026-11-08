import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

const BUTTON = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'text-text hover:bg-surface-2',
  soft: 'bg-primary-soft text-primary hover:opacity-90',
};
const SIZE = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-base' };

export function Button({ variant = 'primary', size = 'md', icon, loading, className, children, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={loading || rest.disabled}
      className={cx('inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-60', BUTTON[variant], SIZE[size], className)}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon && <Icon name={icon} className="size-4" />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className, variant = 'ghost', ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-50', BUTTON[variant], className)} {...rest}>
      <Icon name={icon} className="size-5" />
    </button>
  );
}

export function Spinner({ className = 'size-5' }) {
  return <span role="status" aria-label="Carregando" className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)} />;
}

export function Loading({ label = 'Carregando…' }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-muted"><Spinner /><span>{label}</span></div>;
}

const FIELD = 'w-full rounded-lg border border-border-strong bg-surface px-3 text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-surface-2 disabled:opacity-70';

/** Rótulo + controle + dica/erro. Passe o controle como filho (use `inputId` do render-prop se precisar). */
export function Field({ label, error, hint, required, className, children }) {
  const id = useId();
  const control = typeof children === 'function' ? children({ id, invalid: Boolean(error) }) : children;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={id} className="text-sm font-medium">{label}{required && <span className="text-danger"> *</span>}</label>}
      {control}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ id, invalid, className, ...rest }) {
  return <input id={id} aria-invalid={invalid || undefined} className={cx(FIELD, 'h-10', invalid && 'border-danger', className)} {...rest} />;
}
/** Campo de senha com botão para mostrar/ocultar o que foi digitado. */
export function PasswordInput({ className, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cx('pr-11', className)} {...rest} />
      <button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} title={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <Icon name={visible ? 'eyeOff' : 'eye'} className="size-5" />
      </button>
    </div>
  );
}
export function Select({ id, invalid, className, children, ...rest }) {
  return <select id={id} aria-invalid={invalid || undefined} className={cx(FIELD, 'h-10 pr-8', invalid && 'border-danger', className)} {...rest}>{children}</select>;
}
export function Textarea({ id, invalid, className, rows = 3, ...rest }) {
  return <textarea id={id} rows={rows} aria-invalid={invalid || undefined} className={cx(FIELD, 'py-2', invalid && 'border-danger', className)} {...rest} />;
}

export function Checkbox({ label, className, ...rest }) {
  return (
    <label className={cx('flex cursor-pointer items-center gap-2 text-sm', className)}>
      <input type="checkbox" className="size-4 accent-[var(--primary)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function Card({ className, children, ...rest }) {
  return <section className={cx('rounded-xl border border-border bg-surface shadow-card', className)} {...rest}>{children}</section>;
}
export function CardHeader({ title, action, subtitle }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <div><h2 className="font-semibold">{title}</h2>{subtitle && <p className="text-sm text-muted">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

const TONE = {
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};
export function Badge({ tone = 'neutral', className, children }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE[tone], className)}>{children}</span>;
}
/** Badge a partir de um mapa de rótulos ({ chave: { label, tone } }) */
export function StatusBadge({ map, value }) {
  const info = map[value] ?? { label: value, tone: 'neutral' };
  return <Badge tone={info.tone}>{info.label}</Badge>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon name={icon} className="size-6" /></span>
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-8 text-center text-danger">
      <Icon name="alert" className="size-6" />
      <p className="font-medium">{error?.message ?? 'Não foi possível carregar.'}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Tentar de novo</Button>}
    </div>
  );
}

export function Alert({ tone = 'info', className, children }) {
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-lg px-4 py-3 text-sm', TONE[tone], className)}>{children}</div>;
}

/** Modal acessível: Esc fecha, foco volta ao botão que abriu, clique fora fecha. */
export function Modal({ open, onClose, title, children, footer, size = 'md', dismissible = true }) {
  const ref = useRef(null);
  const titleId = useId();
  // onClose/dismissible mudam a cada renderização do pai; guardá-los em ref evita refazer o efeito (e roubar o foco de quem está digitando)
  const latest = useRef({ onClose, dismissible });
  latest.current = { onClose, dismissible };
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape' && latest.current.dismissible) latest.current.onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('[data-autofocus], input, select, textarea, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 animate-fade-in sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose?.(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx('flex max-h-[92vh] w-full animate-pop-in flex-col rounded-t-2xl border border-border bg-surface shadow-pop sm:rounded-2xl', width)}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {dismissible && <IconButton icon="x" label="Fechar" onClick={onClose} />}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="no-print flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition', value === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text')}>
          {tab.label}{tab.count !== undefined && <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 text-xs">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onChange }) {
  if (!totalPages || totalPages <= 1) return total !== undefined ? <p className="px-4 py-3 text-sm text-muted">{total} {total === 1 ? 'registro' : 'registros'}</p> : null;
  return (
    <div className="no-print flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-muted">{total} registros</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" icon="chevronLeft" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button>
        <span>Página {page} de {totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Próxima<Icon name="chevronRight" className="size-4" /></Button>
      </div>
    </div>
  );
}

/** Tabela responsiva: rola na horizontal em telas estreitas. */
export function Table({ head, children, className }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h, i) => <th key={i} className={cx('whitespace-nowrap px-4 py-2.5 font-semibold', h.right && 'text-right')}>{h.label ?? h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border [&>tr:hover]:bg-surface-2/50">{children}</tbody>
      </table>
    </div>
  );
}

const STAT_TONE = { danger: 'bg-danger-soft text-danger', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning' };
export function Stat({ label, value, hint, tone, icon }) {
  return (
    <Card className="flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className={cx('mt-1 text-2xl font-bold tracking-tight', tone && { danger: 'text-danger', success: 'text-success', warning: 'text-warning' }[tone])}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      {icon && <span aria-hidden className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', STAT_TONE[tone] ?? 'bg-primary-soft text-primary')}><Icon name={icon} className="size-5" /></span>}
    </Card>
  );
}

/** Bloco cinza animado que ocupa o lugar do conteúdo enquanto ele carrega. */
export function Skeleton({ className }) {
  return <span aria-hidden className={cx('relative block overflow-hidden rounded-md bg-surface-2 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/5', className)} />;
}
