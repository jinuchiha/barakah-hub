'use client';
import { useId, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { addMember, editMember } from '@/app/actions';
import { Field, Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Member } from '@/lib/db/schema';

type Mode =
  | { kind: 'add' }
  | { kind: 'edit'; member: Member };

interface Props {
  mode: Mode;
  allMembers: Member[];
  onClose: () => void;
}

const PROVINCES = ['', 'balochistan', 'sindh', 'punjab', 'kpk', 'gilgit', 'azadkashmir', 'islamabad', 'overseas', 'other'];

interface FormState {
  username: string;
  nameEn: string;
  nameUr: string;
  fatherName: string;
  fatherDeceased: boolean;
  relation: string;
  phone: string;
  city: string;
  province: string;
  monthlyPledge: number;
  role: 'admin' | 'member' | 'supervisor';
  status: 'pending' | 'approved' | 'rejected';
  spouseId: string;
  parentId: string;
  deceased: boolean;
}

const blank: FormState = {
  username: '',
  nameEn: '',
  nameUr: '',
  fatherName: '',
  fatherDeceased: false,
  relation: '',
  phone: '',
  city: '',
  province: '',
  monthlyPledge: 1000,
  role: 'member',
  status: 'approved',
  spouseId: '',
  parentId: '',
  deceased: false,
};

function fromMember(m: Member): FormState {
  return {
    username: m.username,
    nameEn: m.nameEn,
    nameUr: m.nameUr,
    // "—" is the placeholder for "unknown father" — show as empty so admins
    // can type a real name without deleting the dash first.
    fatherName: m.fatherName === '—' ? '' : m.fatherName,
    fatherDeceased: m.fatherDeceased,
    relation: m.relation ?? '',
    phone: m.phone ?? '',
    city: m.city ?? '',
    province: m.province ?? '',
    monthlyPledge: m.monthlyPledge,
    role: m.role,
    status: m.status,
    spouseId: m.spouseId ?? '',
    parentId: m.parentId ?? '',
    deceased: m.deceased,
  };
}

export default function MemberDialog({ mode, allMembers, onClose }: Props) {
  const childrenLabelId = useId();
  // For the spouse dropdown — exclude the member themselves and (when
  // editing) anyone already married to someone else (keeps pairing 1:1 and
  // avoids accidentally breaking another couple). Marhoom members ARE
  // eligible: ancestor couples in the family tree are usually both deceased.
  const spouseCandidates = allMembers.filter((m) => {
    if (mode.kind === 'edit' && m.id === mode.member.id) return false;
    if (m.status === 'rejected') return false;
    if (mode.kind === 'edit' && m.spouseId && m.spouseId !== mode.member.id) return false;
    return true;
  });
  // Parent link allows deceased members (most ancestors are) — only
  // self-parenting and rejected accounts are excluded.
  const parentCandidates = allMembers
    .filter((m) => {
      if (mode.kind === 'edit' && m.id === mode.member.id) return false;
      if (m.status === 'rejected') return false;
      return true;
    })
    .sort((a, b) => (a.nameEn || a.nameUr).localeCompare(b.nameEn || b.nameUr));
  const [pending, start] = useTransition();
  const [childPending, startChild] = useTransition();
  const [childEn, setChildEn] = useState('');
  const [childUr, setChildUr] = useState('');
  const [addedKids, setAddedKids] = useState<string[]>([]);
  const existingKids = mode.kind === 'edit'
    ? allMembers.filter((m) => m.parentId === mode.member.id && m.status !== 'rejected')
    : [];
  const [form, setForm] = useState<FormState>(() =>
    mode.kind === 'edit' ? fromMember(mode.member) : blank,
  );

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function addChild() {
    if (mode.kind !== 'edit') return;
    const nameEn = childEn.trim();
    if (nameEn.length < 2) { toast.error('Child name: at least 2 characters'); return; }
    const parent = mode.member;
    // Username just needs to be unique — a random suffix avoids collisions
    // with siblings/cousins sharing a name. An admin can rename it later if
    // the child ever claims an account.
    const base = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'child';
    startChild(async () => {
      try {
        await addMember({
          username: `${base}_${Math.random().toString(36).slice(-4)}`,
          nameEn,
          nameUr: childUr.trim() || nameEn,
          fatherName: parent.nameEn || parent.nameUr,
          parentId: parent.id,
          city: parent.city ?? undefined,
          province: parent.province ?? undefined,
          monthlyPledge: 0,
        });
        setAddedKids((p) => [...p, nameEn]);
        setChildEn('');
        setChildUr('');
        toast.success(`${nameEn} added to the family tree`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed to add child');
      }
    });
  }

  // If the typed father's name exactly matches an existing member, offer a
  // one-click link — the explicit parentId beats fuzzy text matching (two
  // members can share a name; the link is unambiguous).
  const suggestedParent = useMemo(() => {
    if (form.parentId) return null;
    const norm = (s: string | null) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const fn = norm(form.fatherName);
    if (!fn || fn === '—') return null;
    return parentCandidates.find((c) => norm(c.nameEn) === fn || norm(c.nameUr) === fn) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.parentId, form.fatherName, allMembers]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nameEn.trim() || !form.fatherName.trim()) {
      toast.error('English name and father name are required');
      return;
    }
    start(async () => {
      try {
        if (mode.kind === 'add') {
          if (!/^[a-z0-9_]{2,40}$/i.test(form.username)) {
            toast.error('Username: 2-40 chars, letters/digits/underscore');
            return;
          }
          await addMember({
            username: form.username.trim(),
            nameEn: form.nameEn.trim(),
            nameUr: form.nameUr.trim() || form.nameEn.trim(),
            fatherName: form.fatherName.trim(),
            fatherDeceased: form.fatherDeceased,
            relation: form.relation.trim() || undefined,
            phone: form.phone.trim() || undefined,
            city: form.city.trim() || undefined,
            province: form.province || undefined,
            monthlyPledge: form.monthlyPledge,
            parentId: form.parentId || undefined,
            deceased: form.deceased,
          });
          toast.success('Member added');
        } else {
          await editMember({
            id: mode.member.id,
            nameEn: form.nameEn.trim(),
            nameUr: form.nameUr.trim() || form.nameEn.trim(),
            // Empty field → send undefined so Drizzle skips updating fatherName.
            // "—" placeholder is stored in DB when no father name is known.
            fatherName: form.fatherName.trim() || undefined,
            fatherDeceased: form.fatherDeceased,
            relation: form.relation.trim() || null,
            phone: form.phone.trim() || null,
            city: form.city.trim() || null,
            province: form.province || null,
            monthlyPledge: form.monthlyPledge,
            role: form.role,
            status: form.status,
            spouseId: form.spouseId || null,
            parentId: form.parentId || null,
            deceased: form.deceased,
          });
          toast.success('Member updated');
        }
        onClose();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode.kind === 'add' ? 'Add Member' : `Edit ${mode.member.nameEn || mode.member.nameUr}`}
          </DialogTitle>
          <DialogDescription>
            {mode.kind === 'add'
              ? 'Create a new member record. They claim the account on first login.'
              : 'Update profile, role, or status.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 p-5 md:grid-cols-2">
          {mode.kind === 'add' && (
            <div className="md:col-span-2">
              <Field label="Username *">
                <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="e.g. ahmad_baloch" required />
              </Field>
              <p className="mt-1 text-[10.5px] text-[var(--txt-3)]">
                For a living member without an account yet: use their future email&apos;s prefix
                (e.g. <span className="text-[var(--color-gold-4)]">ahmadkhan</span> for ahmadkhan@gmail.com) —
                when they register with that email later, this record links to their account automatically.
              </p>
            </div>
          )}
          <Field label="English Name *"><Input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} required /></Field>
          <Field label="Urdu Name"><Input value={form.nameUr} onChange={(e) => set('nameUr', e.target.value)} dir="rtl" /></Field>
          <Field className="md:col-span-2" label={<>Father&apos;s Name *</>}><Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} required /></Field>
          <div className="md:col-span-2">
            <Field label="Link to parent (optional)">
              <select
                value={form.parentId}
                onChange={(e) => set('parentId', e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
              >
                <option value="">Not linked · father&apos;s name above is text only</option>
                {parentCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn || c.nameUr}{c.deceased ? ' (marhoom)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            {suggestedParent && (
              <button
                type="button"
                onClick={() => set('parentId', suggestedParent.id)}
                className="mt-1 block text-[11px] text-[var(--color-gold-2)] underline hover:text-[var(--color-gold)]"
              >
                ↳ Father&apos;s name matches &ldquo;{suggestedParent.nameEn || suggestedParent.nameUr}&rdquo; — click to link
              </button>
            )}
            <p className="mt-1 text-[10.5px] text-[var(--txt-3)]">
              Pick either parent in a married couple — the family tree shows this member under both automatically.
            </p>
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-[var(--txt-2)]">
            <input type="checkbox" checked={form.fatherDeceased} onChange={(e) => set('fatherDeceased', e.target.checked)} />
            Father has passed away (Marhoom)
          </label>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-[var(--txt-2)]">
            <input type="checkbox" checked={form.deceased} onChange={(e) => set('deceased', e.target.checked)} />
            This member is marhoom — tree record only, no login account needed
          </label>
          <Field label="Relation"><Input value={form.relation} onChange={(e) => set('relation', e.target.value)} placeholder="e.g. Son of / Daughter of" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Province">
            <select
              value={form.province}
              onChange={(e) => set('province', e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
            >
              {PROVINCES.map((p) => <option key={p} value={p}>{p || 'Select province'}</option>)}
            </select>
          </Field>
          <Field label="Monthly pledge">
            <Input type="number" min={0} value={form.monthlyPledge} onChange={(e) => set('monthlyPledge', parseInt(e.target.value, 10) || 0)} />
          </Field>
          {mode.kind === 'edit' && (
            <>
              <Field label="Role">
                <select value={form.role} onChange={(e) => set('role', e.target.value as FormState['role'])} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
                  <option value="member">Member</option>
                  <option value="supervisor">Supervisor (fund collector)</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value as FormState['status'])} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Spouse (husband/wife)">
                  <select
                    value={form.spouseId}
                    onChange={(e) => set('spouseId', e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
                  >
                    <option value="">None</option>
                    {spouseCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn || c.nameUr}{c.deceased ? ' (marhoom)' : ''}{c.fatherName && c.fatherName !== '—' ? ` · s/o ${c.fatherName}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="mt-1 text-[10.5px] text-[var(--txt-3)]">
                  Setting a spouse links both members automatically. Family tree will show them paired.
                </p>
              </div>
              <div role="group" aria-labelledby={childrenLabelId} className="md:col-span-2 rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3">
                <Label id={childrenLabelId}>Children — tree only (no account, e.g. under 18)</Label>
                {(existingKids.length > 0 || addedKids.length > 0) && (
                  <div className="mb-2 mt-1 flex flex-wrap gap-1.5">
                    {existingKids.map((k) => (
                      <span key={k.id} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--txt-2)]">
                        {k.nameEn || k.nameUr}{k.deceased ? ' (marhoom)' : ''}
                      </span>
                    ))}
                    {addedKids.map((n, i) => (
                      <span key={`new-${i}`} className="rounded-full border border-[var(--border-accent)] px-2 py-0.5 text-[11px] text-[var(--color-gold-2)]">
                        {n} ✓
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 flex gap-2">
                  <Input value={childEn} onChange={(e) => setChildEn(e.target.value)} placeholder="Child's name (English)" />
                  <Input value={childUr} onChange={(e) => setChildUr(e.target.value)} placeholder="اردو نام" dir="rtl" />
                  <Button type="button" variant="ghost" onClick={addChild} disabled={childPending}>
                    {childPending ? 'Adding…' : '+ Add'}
                  </Button>
                </div>
                <p className="mt-1.5 text-[10.5px] text-[var(--txt-3)]">
                  Appears in the family tree under {form.nameEn || 'this member'}{form.spouseId ? ' and their spouse' : ''} right away.
                  No login, no pledge — an account can be linked by an admin when they&apos;re old enough.
                </p>
              </div>
            </>
          )}
          <div className="md:col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="gold" disabled={pending}>
              {pending ? 'Saving…' : mode.kind === 'add' ? 'Add Member' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
