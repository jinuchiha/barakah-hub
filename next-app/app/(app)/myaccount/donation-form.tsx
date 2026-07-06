'use client';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import { submitDonation } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DuaOverlay } from '@/components/dua-overlay';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

const currentMonth = () => `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;

interface DonationFormProps {
  easyPaiseName?: string | null;
  easyPaiseNumber?: string | null;
}

function PoolToggle({ pool, onChange }: { pool: 'sadaqah' | 'zakat'; onChange: (p: 'sadaqah' | 'zakat') => void }) {
  const opts = [
    { key: 'sadaqah' as const, label: 'Sadaqah · صدقہ' },
    { key: 'zakat' as const, label: 'Zakat · زکوٰۃ' },
  ];
  return (
    <div role="radiogroup" aria-label="Pool" className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[var(--surf-3)] p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={pool === o.key}
          onClick={() => onChange(o.key)}
          className="rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-all duration-200"
          style={
            pool === o.key
              ? { background: 'rgba(200,155,60,0.16)', color: 'var(--color-gold-2)', boxShadow: 'inset 0 0 0 1px rgba(200,155,60,0.35)' }
              : { color: 'var(--txt-3)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ReceiptPicker({ url, uploading, onPick, onClear }: {
  url: string | null; uploading: boolean; onPick: (f: File) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
      {url ? (
        <div className="flex items-center gap-3 rounded-xl border border-[rgba(45,138,95,0.4)] bg-[rgba(45,138,95,0.07)] px-3 py-2">
          <img src={url} alt="Receipt preview" className="size-10 rounded-lg object-cover" />
          <span className="flex-1 text-[12px] text-[#4ec38d]">Receipt attached</span>
          <button type="button" onClick={onClear} aria-label="Remove receipt" className="p-1 text-[var(--txt-3)] hover:text-[var(--txt-1)]">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-3 text-[12.5px] text-[var(--txt-3)] transition-colors hover:border-[rgba(200,155,60,0.4)] hover:text-[var(--color-gold-2)]"
        >
          <ImagePlus className="size-4" aria-hidden />
          {uploading ? 'Uploading…' : 'Attach receipt screenshot (optional)'}
        </button>
      )}
    </div>
  );
}

export default function DonationForm({ easyPaiseName, easyPaiseNumber }: DonationFormProps) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [duaFor, setDuaFor] = useState<'sadaqah' | 'zakat' | null>(null);
  const [amount, setAmount] = useState(0);
  const [pool, setPool] = useState<'sadaqah' | 'zakat'>('sadaqah');
  const [month, setMonth] = useState(currentMonth);
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setAmount(0);
    setNote('');
    setMonth(currentMonth());
    setPool('sadaqah');
    setReceiptUrl(null);
  }

  async function uploadReceipt(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('receipt', file);
      const res = await fetch('/api/payments/upload-receipt', { method: 'POST', body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed');
      setReceiptUrl(json.url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Receipt upload failed');
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error('Enter an amount');
      return;
    }
    start(async () => {
      try {
        await submitDonation({ amount, pool, monthLabel: month, note: note || undefined, receiptUrl: receiptUrl || undefined });
        toast.success('Submitted · admin will verify');
        setDuaFor(pool);
        reset();
        setOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Submission failed');
      }
    });
  }

  if (!open) {
    return (
      <>
        <Button variant="gold" size="sm" onClick={() => setOpen(true)}>
          + Submit Donation
        </Button>
        <DuaOverlay open={duaFor !== null} pool={duaFor ?? undefined} onClose={() => setDuaFor(null)} />
      </>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      {easyPaiseNumber && (
        <div className="md:col-span-2 rounded-xl border border-[rgba(200,155,60,0.30)] bg-[rgba(200,155,60,0.08)] p-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--color-gold-4)]">
            📱 Send Payment Via EasyPaisa
          </div>
          <div className="text-sm font-semibold text-[var(--color-cream)]">
            {easyPaiseName && <span>{easyPaiseName} · </span>}
            <span className="font-mono text-[var(--color-gold)]">{easyPaiseNumber}</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--txt-3)]">
            Pehle EasyPaisa se yeh number pe paisa bhejein, phir receipt attach karke submit karein.
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="don-amount">Amount (Rs.) *</Label>
        <Input
          id="don-amount"
          type="number"
          min={1}
          value={amount || ''}
          onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
          required
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              className="tabular rounded-full border px-3 py-1 text-[11.5px] transition-colors duration-200"
              style={
                amount === a
                  ? { borderColor: 'rgba(200,155,60,0.5)', background: 'rgba(200,155,60,0.12)', color: 'var(--color-gold-2)' }
                  : { borderColor: 'var(--border)', color: 'var(--txt-3)' }
              }
            >
              {a.toLocaleString('en-PK')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Pool</Label>
        <PoolToggle pool={pool} onChange={setPool} />
      </div>

      <div>
        <Label htmlFor="don-month">Month</Label>
        <Input id="don-month" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="e.g. May 2026" />
      </div>

      <div>
        <Label htmlFor="don-note">Note (optional)</Label>
        <Input id="don-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. JazzCash transfer ref #" />
      </div>

      <div className="md:col-span-2">
        <ReceiptPicker url={receiptUrl} uploading={uploading} onPick={uploadReceipt} onClear={() => setReceiptUrl(null)} />
      </div>

      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" variant="gold" disabled={pending || uploading}>
          {pending ? 'Submitting…' : 'Submit for verification'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => { reset(); setOpen(false); }}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
