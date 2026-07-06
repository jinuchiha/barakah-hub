'use client';
import { useState, useMemo, useTransition } from 'react';
import { Search, Pencil, Trash2, MessageCircle, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fmtRs } from '@/lib/i18n/dict';
import { ini, normalizePkPhone } from '@/lib/utils';
import { hardDeleteMember } from '@/app/actions';
import { toast } from 'sonner';
import type { Member } from '@/lib/db/schema';
import MemberDialog from './member-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Props { initial: Member[] }

type SortKey = 'name' | 'father' | 'city' | 'pledge' | 'status';
type SortDir = 'asc' | 'desc';

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
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ kind: 'add' } | { kind: 'edit'; member: Member } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const cities = useMemo(
    () => [...new Set(initial.map((m) => m.city).filter(Boolean) as string[])].sort(),
    [initial],
  );

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const list = initial.filter((m) => {
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

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'name':   return dir * (a.nameEn || a.nameUr || '').localeCompare(b.nameEn || b.nameUr || '');
        case 'father': return dir * (a.fatherName || '').localeCompare(b.fatherName || '');
        case 'city':   return dir * (a.city || '').localeCompare(b.city || '');
        case 'pledge': return dir * ((a.monthlyPledge ?? 0) - (b.monthlyPledge ?? 0));
        case 'status': return dir * (a.status || '').localeCompare(b.status || '');
        default:       return 0;
      }
    });
  }, [initial, q, status, province, city, sortKey, sortDir]);

  function reset() { setQ(''); setStatus(''); setProvince(''); setCity(''); }

  function whatsapp(m: Member) {
    const p = normalizePkPhone(m.phone);
    if (!p) { toast.error('No phone'); return; }
    const text = `بسم اللہ الرحمن الرحیم\n\nالسلام علیکم ${m.nameUr}\nماہانہ ادائیگی یاد دہانی\n\nجزاک اللہ خیر`;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, '_blank');
  }

  function confirmDelete(m: Member) { setDeleteTarget(m); }

  function doDelete(m: Member) {
    startTransition(async () => {
      try { await hardDeleteMember(m.id); toast.success('Deleted'); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
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
              <tr className="border-b border-[var(--border)] bg-[rgba(214,210,199,0.04)] text-left">
                <th className="w-10 px-4 py-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--txt-4)]">#</th>
                <SortTh label="Member"   col="name"   sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Father"   col="father" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Location" col="city"   sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Monthly"  col="pledge" sortKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                <SortTh label="Status"   col="status" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="w-32 px-4 py-3 text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--txt-4)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="table-row-hover border-b border-[rgba(214,210,199,0.06)]">
                  <td className="px-4 py-2 font-[var(--font-en)] text-xs text-[var(--color-gold-4)]">{i + 1}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full text-[10px] font-bold text-white" style={{ background: m.color }}>
                        {m.photoUrl ? <img src={m.photoUrl} alt={m.nameEn || m.nameUr || 'Member photo'} className="size-full rounded-full object-cover" /> : ini(m.nameEn || m.nameUr)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-cream)]">{m.nameEn || m.nameUr}</div>
                        {m.relation ? <div className="text-[10px] text-[var(--txt-3)]">{m.relation}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--txt-2)]">{m.fatherName === '—' ? '' : m.fatherName}</td>
                  <td className="px-4 py-2 text-xs text-[var(--txt-3)]">{m.city ?? ''}{m.province ? <><br /><span className="opacity-70">{m.province}</span></> : null}</td>
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
                        <button type="button" title="WhatsApp" aria-label={`Send WhatsApp to ${m.nameEn || m.nameUr}`} onClick={() => whatsapp(m)} className="rounded p-1.5 hover:bg-[rgba(37,211,102,0.15)]">
                          <MessageCircle className="size-3.5 text-[#25d366]" />
                        </button>
                      )}
                      {m.role !== 'admin' && (
                        <button type="button" title="Delete" aria-label={`Delete ${m.nameEn || m.nameUr}`} onClick={() => confirmDelete(m)} disabled={pending} className="rounded p-1.5 hover:bg-[rgba(220,50,50,0.15)] disabled:opacity-50">
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
          allMembers={initial}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete Member"
        description={`Delete ${(deleteTarget?.nameEn || deleteTarget?.nameUr) ?? 'this member'}? Children will be re-parented to admin.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) doDelete(deleteTarget); }}
      />
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

function SortTh({ label, col, sortKey, dir, onSort, right }: {
  label: string; col: SortKey; sortKey: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void; right?: boolean;
}) {
  const active = sortKey === col;
  const Icon = active ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      className={`px-4 py-3 ${right ? 'text-right' : 'text-left'}`}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      tabIndex={0}
      onClick={() => onSort(col)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort(col); } }}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[1.5px] transition-colors ${active ? 'text-[var(--color-gold)]' : 'text-[var(--txt-4)] hover:text-[var(--txt-2)]'}`}>
        {right && <Icon className="size-3" aria-hidden />}
        {label}
        {!right && <Icon className="size-3" aria-hidden />}
      </span>
    </th>
  );
}
