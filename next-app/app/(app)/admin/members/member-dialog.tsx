'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { addMember, editMember } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
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
  onClose: () => void;
}

const PROVINCES = ['', 'balochistan', 'sindh', 'punjab', 'kpk', 'gilgit', 'azadkashmir', 'islamabad', 'overseas', 'other'];

interface FormState {
  username: string;
  nameEn: string;
  nameUr: string;
  fatherName: string;
  relation: string;
  phone: string;
  city: string;
  province: string;
  monthlyPledge: number;
  role: 'admin' | 'member';
  status: 'pending' | 'approved' | 'rejected';
}

const blank: FormState = {
  username: '',
  nameEn: '',
  nameUr: '',
  fatherName: '',
  relation: '',
  phone: '',
  city: '',
  province: '',
  monthlyPledge: 1000,
  role: 'member',
  status: 'approved',
};

function fromMember(m: Member): FormState {
  return {
    username: m.username,
    nameEn: m.nameEn,
    nameUr: m.nameUr,
    fatherName: m.fatherName,
    relation: m.relation ?? '',
    phone: m.phone ?? '',
    city: m.city ?? '',
    province: m.province ?? '',
    monthlyPledge: m.monthlyPledge,
    role: m.role,
    status: m.status,
  };
}

export default function MemberDialog({ mode, onClose }: Props) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(() =>
    mode.kind === 'edit' ? fromMember(mode.member) : blank,
  );

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

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
            relation: form.relation.trim() || undefined,
            phone: form.phone.trim() || undefined,
            city: form.city.trim() || undefined,
            province: form.province || undefined,
            monthlyPledge: form.monthlyPledge,
          });
          toast.success('Member added');
        } else {
          await editMember({
            id: mode.member.id,
            nameEn: form.nameEn.trim(),
            nameUr: form.nameUr.trim() || form.nameEn.trim(),
            fatherName: form.fatherName.trim(),
            relation: form.relation.trim() || null,
            phone: form.phone.trim() || null,
            city: form.city.trim() || null,
            province: form.province || null,
            monthlyPledge: form.monthlyPledge,
            role: form.role,
            status: form.status,
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
              <Label>Username *</Label>
              <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="e.g. ahmad_baloch" required />
            </div>
          )}
          <div><Label>English Name *</Label><Input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} required /></div>
          <div><Label>Urdu Name</Label><Input value={form.nameUr} onChange={(e) => set('nameUr', e.target.value)} dir="rtl" /></div>
          <div className="md:col-span-2"><Label>Father&apos;s Name *</Label><Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} required /></div>
          <div><Label>Relation</Label><Input value={form.relation} onChange={(e) => set('relation', e.target.value)} placeholder="e.g. Son of Abu Baker" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" /></div>
          <div><Label>City</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div>
            <Label>Province</Label>
            <select
              value={form.province}
              onChange={(e) => set('province', e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
            >
              {PROVINCES.map((p) => <option key={p} value={p}>{p || '— Select —'}</option>)}
            </select>
          </div>
          <div>
            <Label>Monthly pledge</Label>
            <Input type="number" min={0} value={form.monthlyPledge} onChange={(e) => set('monthlyPledge', parseInt(e.target.value, 10) || 0)} />
          </div>
          {mode.kind === 'edit' && (
            <>
              <div>
                <Label>Role</Label>
                <select value={form.role} onChange={(e) => set('role', e.target.value as 'admin' | 'member')} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => set('status', e.target.value as FormState['status'])} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
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
