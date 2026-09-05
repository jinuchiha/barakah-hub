import type { PaymentStatus } from '@/lib/db/schema';

/**
 * One payment-status badge for the whole app, built on the design system's
 * `.pill` classes (globals.css). Replaces four independent hand-rolled
 * implementations — one of which used emoji prefixes that screen readers
 * announce verbatim and platforms render inconsistently.
 */
const STATUS_PILL: Record<PaymentStatus, { cls: string; label: string }> = {
  submitted: { cls: 'pill-warn', label: 'Pending' },
  supervisor_approved: { cls: 'pill-info', label: 'Awaiting admin' },
  supervisor_rejected: { cls: 'pill-danger', label: 'Rejected' },
  verified: { cls: 'pill-success', label: 'Verified' },
  voided: { cls: 'pill-muted', label: 'Voided' },
};

export function PaymentStatusPill({ status, className = '' }: { status: PaymentStatus; className?: string }) {
  const s = STATUS_PILL[status] ?? STATUS_PILL.submitted;
  return <span className={`pill ${s.cls} ${className}`}>{s.label}</span>;
}
