import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@rentflow/core';

type Variant = 'primary' | 'secondary' | 'outline-brand' | 'danger-outline' | 'ghost' | 'mint';
type Size = 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover border border-transparent',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-canvas',
  'outline-brand': 'bg-surface text-brand border border-brand hover:bg-brand-soft',
  'danger-outline': 'bg-surface text-danger-strong border border-danger-line hover:bg-danger-soft',
  ghost: 'bg-canvas text-ink border border-transparent hover:bg-line-soft',
  mint: 'bg-brand-mint text-nav-deep border border-transparent font-bold hover:brightness-95',
};

const sizes: Record<Size, string> = {
  md: 'min-h-touch px-4 text-sm rounded-md', // admin default (44px)
  lg: 'min-h-[48px] px-5 text-[15px] rounded-md', // panel submit
  xl: 'min-h-[52px] px-5 text-base rounded-[12px]', // mobile primary
};

interface Common {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

const classes = ({ variant = 'secondary', size = 'md', block }: Common, extra?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 font-medium no-underline transition-colors disabled:opacity-50 disabled:pointer-events-none',
    variant === 'primary' || variant === 'mint' ? 'font-semibold' : '',
    variants[variant],
    sizes[size],
    block && 'w-full',
    extra,
  );

export type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={classes({ variant, size, block }, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

/** A router link styled as a button (navigation, not an action). */
export function ButtonLink({ variant, size, block, icon, className, children, ...rest }: Common & LinkProps) {
  return (
    <Link className={classes({ variant, size, block }, cn('hover:text-inherit', className))} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** Square icon-only button. `label` is required for screen readers. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: { label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn('grid h-touch w-touch shrink-0 place-items-center rounded-md', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
