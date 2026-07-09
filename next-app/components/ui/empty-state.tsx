import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div
        className="grid size-12 shrink-0 place-items-center rounded-full text-[var(--color-gold)] [&>svg]:size-5"
        style={{ background: 'color-mix(in srgb, var(--color-gold) 10%, transparent)' }}
      >
        {icon}
      </div>
      <div className="text-sm font-semibold text-[var(--color-cream)]">{title}</div>
      {description && <p className="max-w-xs text-xs text-[var(--txt-3)]">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
