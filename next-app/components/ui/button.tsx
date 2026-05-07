import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-2 transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-gold)] disabled:pointer-events-none disabled:opacity-40 cursor-pointer tracking-wide font-[var(--font-display)] uppercase',
  {
    variants: {
      variant: {
        gold: 'bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] text-[var(--color-ink)] hover:shadow-[0_8px_24px_rgba(201,168,76,0.35)] hover:-translate-y-0.5',
        emerald: 'bg-[rgba(31,110,74,0.12)] text-[var(--color-emerald-2)] border border-[rgba(31,110,74,0.3)] hover:bg-[rgba(31,110,74,0.2)]',
        red: 'bg-[rgba(220,50,50,0.12)] text-[#f87171] border border-[rgba(220,50,50,0.3)] hover:bg-[rgba(220,50,50,0.2)]',
        ghost: 'bg-transparent text-[var(--txt-2)] border border-[var(--border)] hover:bg-[rgba(201,168,76,0.06)] hover:text-[var(--txt-1)]',
        outline: 'border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[rgba(201,168,76,0.1)]',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'gold', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
