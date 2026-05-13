'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { bulkImportMembers } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * CSV header expected (case-insensitive, order-flexible):
 *   username, nameEn, nameUr, fatherName, relation, phone, city, province, monthlyPledge
 *
 * Minimum: username, nameEn, nameUr, fatherName. The rest are optional.
 */
const SAMPLE_CSV = `username,nameEn,nameUr,fatherName,relation,phone,city,province,monthlyPledge
ahmad_baloch,Ahmad Baloch,احمد بلوچ,Ali Baloch,son of Ali,03001234567,Karachi,sindh,1500
fatima_khan,Fatima Khan,فاطمہ خان,Ahmed Khan,daughter of Ahmed,03007654321,Lahore,punjab,1000`;

interface ParseResult {
  rows: Record<string, string>[];
  errors: string[];
}

function parseCSV(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['CSV needs at least one header row and one data row.'] };

  const headers = lines[0].split(',').map((h) => h.trim());
  const required = ['username', 'nameEn', 'nameUr', 'fatherName'];
  const missing = required.filter((r) => !headers.includes(r));
  if (missing.length) return { rows: [], errors: [`Missing required column(s): ${missing.join(', ')}`] };

  const rows: Record<string, string>[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    if (cells.length !== headers.length) {
      errors.push(`Row ${i + 1}: column count mismatch (${cells.length} vs ${headers.length})`);
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx]; });
    rows.push(row);
  }
  return { rows, errors };
}

function parseRow(line: string): string[] {
  // Minimal CSV row parser — handles quoted commas.
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export default function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  function submit() {
    const parsed = parseCSV(csv);
    if (parsed.errors.length) { toast.error(parsed.errors[0]); return; }
    if (parsed.rows.length === 0) { toast.error('No rows to import'); return; }

    const rows = parsed.rows.map((r) => ({
      username: r.username,
      nameEn: r.nameEn,
      nameUr: r.nameUr,
      fatherName: r.fatherName,
      relation: r.relation || undefined,
      phone: r.phone || undefined,
      city: r.city || undefined,
      province: r.province || undefined,
      monthlyPledge: r.monthlyPledge ? parseInt(r.monthlyPledge, 10) : 1000,
    }));

    start(async () => {
      try {
        const res = await bulkImportMembers({ rows });
        setResult(res);
        toast.success(`Imported ${res.imported}, skipped ${res.skipped}`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">📥 Bulk Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Members</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-[var(--color-gold-4)]">
          Required columns: <code className="text-[var(--color-gold-2)]">username, nameEn, nameUr, fatherName</code>.
          Optional: <code>relation, phone, city, province, monthlyPledge</code>.
          Imported members are <strong>approved</strong> by default and claim their account on first sign-up using the same username.
        </p>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="Paste CSV content here…"
          className="h-64 w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3 font-[var(--font-en)] text-xs text-[var(--color-cream)] outline-none focus:border-[var(--color-gold)]"
        />

        <div className="flex items-center justify-between text-xs text-[var(--color-gold-4)]">
          <button type="button" onClick={() => setCsv(SAMPLE_CSV)} className="underline-offset-2 hover:underline">📋 Paste sample</button>
          <span>{csv.split('\n').filter(Boolean).length - 1} data row(s)</span>
        </div>

        {result && (
          <div className="rounded-md border border-[var(--border)] bg-[rgba(214,210,199,0.06)] p-3 text-xs">
            <div className="font-bold text-[var(--color-gold-2)]">Imported {result.imported} · Skipped {result.skipped}</div>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[var(--txt-3)]">
                {result.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                {result.errors.length > 10 && <li>… and {result.errors.length - 10} more</li>}
              </ul>
            )}
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button variant="gold" onClick={submit} disabled={pending || !csv.trim()}>
            {pending ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
