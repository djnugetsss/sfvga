import React from 'react';

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[14px] border border-border bg-surface p-4 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase leading-[18px] tracking-[1.5px] text-muted">SFVGA Administration</p>
        <div aria-hidden="true" className="mb-3 h-0.5 w-[34px] bg-accent" />
        <h1 className="font-editorial text-[40px] font-semibold leading-[46px] tracking-[-0.5px] text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-base leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="text-base font-semibold text-ink">{label}</span>
      {children}
      {hint && !error ? <span className="text-sm leading-5 text-warmGray400">{hint}</span> : null}
      {error ? <span className="text-sm leading-5 text-error">{error}</span> : null}
    </label>
  );
}

const inputClasses =
  'min-h-12 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-0';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`${inputClasses} ${className}`} {...rest} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`${inputClasses} min-h-28 resize-y ${className}`} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <select className={`${inputClasses} ${className}`} {...rest}>
      {children}
    </select>
  );
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'error';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surfaceMuted text-muted',
  success: 'border-success/20 bg-successSoft text-success',
  warning: 'border-accent/25 bg-warningSoft text-warning',
  info: 'border-brand/15 bg-brandSoft text-brand',
  error: 'border-error/20 bg-errorSoft text-error',
};

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold capitalize ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-y border-border px-6 py-8 text-center">
      <p className="text-base leading-6 text-muted">{message}</p>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4 p-6 sm:p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <Skeleton className="h-7 w-1/2 max-w-64" />
      <Skeleton className="h-4 w-3/4 max-w-md" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/** Quiet shape placeholder; compose several to match the content being loaded. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`motion-safe:animate-pulse rounded-lg bg-surfaceMuted ${className}`}
    />
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-error/15 bg-errorSoft p-4 text-base text-error"
      role="alert"
    >
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 shrink-0 rounded-md border border-error/40 px-3 py-2 font-semibold text-error transition-colors hover:bg-error/10"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
