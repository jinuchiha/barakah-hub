import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-4 py-2.5 text-[var(--color-cream)] outline-none transition-all placeholder:text-[var(--txt-4)] focus:border-[var(--color-gold)] focus:shadow-[0_0_0_3px_rgba(214,210,199,0.18)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-gold-4)]', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
