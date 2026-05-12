'use client';
import { useState, useMemo, useTransition } from 'react';
import { Search, Pencil, Trash2, MessageCircle, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fmtRs } from '@/lib/i18n/dict';
import { ini, normalizePkPhone } from '@/lib/utils';
import { hardDeleteMember } from '@/app/actions';
import { toast } from 'sonner';
import type { Member } from '@/lib/db/schema';
import MemberDialog from './member-dialog';

interface Props { initial: Member[] }

const PROVINCES = [
  { key: '', label: 'All Provinces' },
  { key: 'balochistan', label: 'Balochistan' },
  { key: 'sindh', label: 'Sindh' },
  { key: 'punjab', label: 'Punjab' },
  { key: 'kpk', label: 'KPK' },
  { key: 'gilgit', label: 'Gilgit-Baltistan' },
  { key: 'azadkashmir', label: 'Azad Kashmir' },
  { key: 'islamabad', label: 'Islamabad' },
  { key: 'overseas', label: 'Overseas' },
  { key: 'other', label: 'Other' },
];

export default function MembersTable({ initial }: Props) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | 'admin' | 'approved' | 'pending'>('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ kind: 'add' } | { kind: 'edit'; member: Member } | null>(null);

  const cities = useMemo(
    () => [...new Set(initial.map((m) => m.city).filter(Boolean) as string[])].sort(),
    [initial],
  );

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return initial.filter((m) => {
      if (term) {
        const hay = `${m.nameEn} ${m.nameUr} ${m.fatherName} ${m.city || ''} ${m.phone || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (status === 'admin' && m.role !== 'admin') return false;
      if (status === 'approved' && m.status !== 'approved') return false;
      if (status === 'pending' && m.status !== 'pending') return false;
      if (province && m.province !== province) return false;
      if (city && m.city !== city) return false;
      return true;
    });
  }, [initial, q, status, province, city]);

  function reset() { setQ(''); setStatus(''); setProvince(''); setCity(''); }

  function whatsapp(m: Member) {
    const p = normalizePkPhone(m.phone);
    if (!p) { toast.error('No phone'); return; }
    const text = `بسم اللہ الرحمن الرحیم\n\nالسلام علیکم ${m.nameUr}\nماہانہ ادائیگی یاد دہانی\n\nجزاک اللہ خیر`;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, '_blank');
  }

  function onDelete(m: Member) {
    if (!confirm(`Delete ${m.nameEn || m.nameUr}? Children will be re-parented to admin.`)) return;
    startTransition(async () => {
      try { await hardDeleteMember(m.id); toast.success('Deleted'); }
      catch (e: any) { toast.error(e.message || 'Failed'); }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{filtered.length} of {initial.length} members</CardTitle>
        <Button variant="gold" size="sm" onClick={() => setDialog({ kind: 'add' })}>
          <Plus className="size-3" />Add Member
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--txt-4)]" />
            <Input className="pl-9" placeholder="Search name, father, city, phone..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onChange={setStatus} options={[
            { value: '', label: 'All Status' },
            { value: 'admin', label: 'Admin' },
            { value: 'approved', label: 'Approved' },
            { value: 'pending', label: 'Pending' },
          ]} />
          <Select value={province} onChange={setProvince} options={PROVINCES.map(p => ({ value: p.key, label: p.label }))} />
          <Select value={city} onChange={setCity} options={[{ value: '', label: 'All Cities' }, ...cities.map(c => ({ value: c, label: c }))]} />
          <Button variant="ghost" size="sm" onClick={reset}>↺</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[rgba(214,210,199,0.06)] text-left text-[10px] uppercase tracking-[1px] text-[var(--color-gold-4)]">
                <th className="px-4 py-2.5 w-12">#</th>
                <th className="px-4 py-2.5">Member</th>
                <th className="px-4 py-2.5">Father</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5 text-right">Monthly</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 w-44">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="border-b border-[rgba(214,210,199,0.06)] hover:bg-[rgba(214,210,199,0.03)]">
                  <td className="px-4 py-2 font-[var(--font-en)] text-xs text-[var(--color-gold-4)]">{i + 1}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: m.color }}>
                        {m.photoUrl ? <img src={m.photoUrl} alt="" className="size-full rounded-full object-cover" /> : ini(m.nameEn || m.nameUr)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-cream)]">{m.nameEn || m.nameUr}</div>
                        <div className="text-[10px] text-[var(--txt-3)]">{m.relation || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--txt-2)]">{m.fatherName}</td>
                  <td className="px-4 py-2 text-xs text-[var(--txt-3)]">{m.city || '—'}{m.province ? <><br /><span className="opacity-70">{m.province}</span></> : null}</td>
                  <td className="px-4 py-2 text-right font-[var(--font-display)] text-[var(--color-gold)]">{fmtRs(m.monthlyPledge)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.role === 'admin' ? 'bg-[rgba(214,210,199,0.15)] text-[var(--color-gold)]' : m.status === 'approved' ? 'bg-[rgba(30,42,74,0.15)] text-[var(--color-emerald-2)]' : 'bg-[rgba(214,210,199,0.1)] text-[var(--color-gold-2)]'}`}>
                      {m.deceased ? 'Deceased' : m.role === 'admin' ? 'Admin' : m.status === 'approved' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Edit"
                        aria-label={`Edit ${m.nameEn || m.nameUr}`}
                        onClick={() => setDialog({ kind: 'edit', member: m })}
                        className="rounded p-1.5 hover:bg-[rgba(214,210,199,0.1)]"
                      >
                        <Pencil className="size-3.5 text-[var(--txt-2)]" />
                      </button>
                      {m.phone && (
                        <button title="WhatsApp" onClick={() => whatsapp(m)} className="rounded p-1.5 hover:bg-[rgba(37,211,102,0.15)]">
                          <MessageCircle className="size-3.5 text-[#25d366]" />
                        </button>
                      )}
                      {m.role !== 'admin' && (
                        <button title="Delete" onClick={() => onDelete(m)} disabled={pending} className="rounded p-1.5 hover:bg-[rgba(220,50,50,0.15)] disabled:opacity-50">
                          <Trash2 className="size-3.5 text-[#f87171]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center italic text-[var(--txt-3)]">No members match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
      {dialog && (
        <MemberDialog
          key={dialog.kind === 'edit' ? `edit-${dialog.member.id}` : 'add'}
          mode={dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </Card>
  );
}

function Select<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--color-gold)]">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
