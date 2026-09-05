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

/**
 * Label + control, associated automatically.
 *
 * The bare `Label` renders a `<label>` with no `htmlFor`, and the omission is
 * silent — which is how 62 of the app's 78 labels ended up unassociated
 * (screen readers announce "edit text, blank"; clicking the label does
 * nothing). `Field` generates the id once and wires both sides, so the
 * association cannot be forgotten:
 *
 *   <Field label="Amount (Rs)">
 *     <Input name="amount" type="number" />
 *   </Field>
 *
 * Works with any single element that takes an `id` — Input, select, textarea.
 */
export function Field({
  label,
  hint,
  className,
  labelClassName,
  children,
}: {
  label: React.ReactNode;
  /** Small helper text under the control. */
  hint?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  const id = React.useId();
  return (
    <div className={className}>
      <Label htmlFor={id} className={labelClassName}>{label}</Label>
      {React.cloneElement(children, { id: children.props.id ?? id })}
      {hint ? <p className="mt-1 text-[10.5px] text-[var(--txt-4)]">{hint}</p> : null}
    </div>
  );
}
