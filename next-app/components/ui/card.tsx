import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative overflow-hidden card-premium animate-enter', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-between gap-3 px-5 py-4', className)}
    style={{ borderBottom: '1px solid var(--border)' }}
    {...p}
  />
);

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <h3 className={cn('text-[13px] font-semibold text-[var(--color-cream)]', className)} {...p} />
);

export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...p} />
);
