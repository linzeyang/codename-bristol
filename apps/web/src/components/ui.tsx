import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon, SparklesIcon } from './Icons';

export function Section({
  kicker,
  title,
  action,
  children,
  className = '',
  id,
}: {
  kicker?: string;
  title: string;
  action?: { label: string; to: string } | ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`section ${className}`} id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <header className="section-head">
        <div>
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
        </div>
        {action ? (
          <div className="section-action">
            {typeof action === 'object' && action !== null && 'to' in action && 'label' in action ? (
              <Link to={action.to} className="text-link">
                {action.label}
                <ArrowRightIcon size={16} />
              </Link>
            ) : (
              action
            )}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function Shelf({ children, label }: { children: ReactNode; label: string }) {
  const id = `shelf-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const scroll = (direction: number) => {
    const region = document.getElementById(id) as HTMLDivElement | null;
    region?.scrollBy({ left: direction * (region.clientWidth * 0.8), behavior: 'smooth' });
  };
  return (
    <div className="shelf-wrap">
      <button type="button" className="shelf-nav shelf-nav-left" onClick={() => scroll(-1)} aria-label="向左滚动">
        <ChevronLeftIcon />
      </button>
      <div className="shelf" id={id} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <button type="button" className="shelf-nav shelf-nav-right" onClick={() => scroll(1)} aria-label="向右滚动">
        <ChevronRightIcon />
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-art" aria-hidden="true">
        {icon ?? <SparklesIcon size={38} />}
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          <RefreshIcon size={18} />
          重新加载
        </button>
      ) : null}
    </div>
  );
}

export function Spinner({ label = '加载中' }: { label?: string }) {
  return (
    <div className="spinner" role="status" aria-label={label}>
      <span className="spinner-ring" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className = '', count = 1 }: { className?: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={`skeleton ${className}`} aria-hidden="true" />
      ))}
    </>
  );
}

export function PageShell({
  kicker,
  title,
  description,
  actions,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {description ? <p className="page-desc">{description}</p> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Chip({
  children,
  active = false,
  tone,
  onClick,
  as = 'span',
}: {
  children: ReactNode;
  active?: boolean;
  tone?: 'accent' | 'teal' | 'ink';
  onClick?: () => void;
  as?: 'span' | 'button';
}) {
  const className = `chip${active ? ' is-active' : ''}${tone ? ` chip-${tone}` : ''}`;
  if (as === 'button' || onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-pressed={active}>
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}