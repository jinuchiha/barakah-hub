export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--color-gold-4)] border-t-[var(--color-gold)]" />
        <p className="font-[var(--font-display)] text-[10px] uppercase tracking-[3px] text-[var(--color-gold-4)]">Loading…</p>
      </div>
    </div>
  );
}
