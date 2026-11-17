import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'border border-primary bg-primary text-onPrimary hover:border-primaryHover hover:bg-primaryHover disabled:opacity-60',
  secondary:
    'border border-brand/35 bg-transparent text-brand hover:border-brand hover:bg-brandSoft disabled:opacity-60',
  danger: 'border border-error bg-error text-white hover:bg-error/90 disabled:opacity-60',
  ghost: 'border border-transparent text-brand hover:bg-brandSoft disabled:opacity-60',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-12 px-4 py-2 text-sm',
  md: 'min-h-12 px-5 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex max-w-full items-center justify-center gap-2 rounded-xl text-center font-semibold leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

export default Button;
