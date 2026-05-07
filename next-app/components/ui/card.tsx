import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-r)] border border-[var(--border)] bg-[var(--surf-1)] shadow-[var(--shadow-card)]',
        className,
      )}
      style={{ background: 'linear-gradient(145deg, var(--surf-1), var(--surf-2))' }}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between border-b border-[var(--border)] bg-[rgba(201,168,76,0.04)] px-5 py-3', className)} {...p} />
);

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <h3 className={cn('text-sm font-semibold text-[var(--color-gold)]', className)} {...p} />
);

export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...p} />
);
