'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateProfile } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '@/components/avatar-upload';
import type { Member } from '@/lib/db/schema';

const PROVINCES = ['', 'balochistan', 'sindh', 'punjab', 'kpk', 'gilgit', 'azadkashmir', 'islamabad', 'overseas', 'other'];
const PALETTE = ['#d6d2c7', '#1f6e4a', '#2d5a8c', '#a83254', '#5e4691', '#a0671e', '#2d6a4f', '#3a4a7a', '#b85a2e', '#475569'];

export default function ProfileForm({ member }: { member: Member }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    phone: member.phone || '',
    city: member.city || '',
    province: member.province || '',
    color: member.color,
    photoUrl: member.photoUrl ?? null,
  });
  const [showColors, setShowColors] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm({ ...form, [k]: v }); }

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try { await updateProfile(form); toast.success('Profile saved ✓'); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    });
  }

  return (
    <form onSubmit={save}>
      {/* ── Modern avatar upload ── */}
      <div className="mb-5 flex flex-col items-center gap-4 rounded-xl border border-[var(--border)] bg-[rgba(200,155,60,0.03)] p-6">
        <AvatarUpload
          name={member.nameEn || member.nameUr}
          color={form.color}
          photoUrl={form.photoUrl}
          onUploaded={(url) => set('photoUrl', url)}
        />
        <div className="text-center">
          <div className="text-sm font-semibold text-[var(--color-cream)]">{member.nameEn || member.nameUr}</div>
          <div className="mt-0.5 text-[11px] text-[var(--txt-3)]">
            {member.role === 'admin' ? 'Admin' : member.role === 'supervisor' ? 'Supervisor' : 'Member'}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowColors((s) => !s)} className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs transition-colors hover:border-[var(--color-gold)]">
            🎨 Color
          </button>
          {form.photoUrl && (
            <button type="button" onClick={() => set('photoUrl', null)} className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10">
              ✕ Remove photo
            </button>
          )}
        </div>
      </div>

      {showColors && (
        <div className="mb-4 flex flex-wrap justify-center gap-2 rounded-md border border-[var(--border)] p-3">
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => set('color', c)} aria-label={`Color ${c}`} className={`size-9 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surf-1)]' : ''}`} style={{ background: c }} />
          ))}
        </div>
      )}

      <div className="mb-3 rounded-md border border-[var(--border)] bg-[rgba(214,210,199,0.03)] px-3 py-2.5 text-xs text-[var(--txt-3)]">
        Name changes require admin approval — contact your administrator.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label htmlFor="prof-phone">Phone</Label><Input id="prof-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" /></div>
        <div><Label htmlFor="prof-city">City</Label><Input id="prof-city" value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
        <div className="md:col-span-2">
          <Label htmlFor="prof-province">Province</Label>
          <select id="prof-province" value={form.province} onChange={(e) => set('province', e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
            {PROVINCES.map((p) => <option key={p} value={p}>{p || 'Select province'}</option>)}
          </select>
        </div>
      </div>

      <Button type="submit" variant="gold" className="mt-4" disabled={pending}>
        {pending ? 'Saving…' : 'Save Profile'}
      </Button>
    </form>
  );
}
