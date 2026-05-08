'use client';
import { useState, useTransition, useRef } from 'react';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { updateProfile } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ini } from '@/lib/utils';
import type { Member } from '@/lib/db/schema';

const PROVINCES = ['', 'balochistan', 'sindh', 'punjab', 'kpk', 'gilgit', 'azadkashmir', 'islamabad', 'overseas', 'other'];
const PALETTE = ['#c9a84c', '#1f6e4a', '#2d5a8c', '#a83254', '#5e4691', '#a0671e', '#2d6a4f', '#3a4a7a', '#b85a2e', '#475569'];

export default function ProfileForm({ member }: { member: Member }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    nameUr: member.nameUr || '',
    nameEn: member.nameEn || '',
    phone: member.phone || '',
    city: member.city || '',
    province: member.province || '',
    color: member.color,
    photoUrl: member.photoUrl || '',
  });
  const [showColors, setShowColors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm({ ...form, [k]: v }); }

  async function uploadPhoto(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error('Image too large (>2MB)'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Image files only'); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Session expired'); return; }
    const ext = (file.name.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '').slice(0, 4);
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    set('photoUrl', data.publicUrl);
    toast.success('Photo uploaded');
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try { await updateProfile(form as any); toast.success('Profile saved ✓'); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <form onSubmit={save}>
      <div className="mb-4 flex items-center gap-4 rounded-md border border-[var(--border)] bg-[rgba(201,168,76,0.05)] p-4">
        <div className="relative">
          <button type="button" onClick={() => fileRef.current?.click()} className="grid size-16 place-items-center overflow-hidden rounded-full text-xl font-bold text-white shadow-[0_0_12px_rgba(201,168,76,0.2)]" style={{ background: form.color }}>
            {form.photoUrl ? <img src={form.photoUrl} alt="" className="size-full object-cover" /> : ini(form.nameEn || form.nameUr)}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-gold)] text-[10px] text-[var(--color-ink)]">
            <Camera className="size-3" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--color-cream)]">{form.nameEn || form.nameUr}</div>
          <div className="text-xs text-[var(--txt-3)]">{member.role === 'admin' ? 'Admin' : 'Member'}</div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setShowColors((s) => !s)} className="rounded-md border border-[var(--border)] px-3 py-1 text-xs">🎨 Color</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md border border-[var(--border)] px-3 py-1 text-xs">📷 Photo</button>
            {form.photoUrl && <button type="button" onClick={() => set('photoUrl', '')} className="rounded-md border border-red-500/40 px-3 py-1 text-xs text-red-400">✕ Remove</button>}
          </div>
        </div>
      </div>

      {showColors && (
        <div className="mb-4 flex flex-wrap justify-center gap-2 rounded-md border border-[var(--border)] p-3">
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => set('color', c)} aria-label={`Color ${c}`} className={`size-9 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surf-1)]' : ''}`} style={{ background: c }} />
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Urdu Name</Label><Input value={form.nameUr} onChange={(e) => set('nameUr', e.target.value)} dir="rtl" /></div>
        <div><Label>English Name</Label><Input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" /></div>
        <div><Label>City</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
        <div className="md:col-span-2">
          <Label>Province</Label>
          <select value={form.province} onChange={(e) => set('province', e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
            {PROVINCES.map((p) => <option key={p} value={p}>{p || '— Select —'}</option>)}
          </select>
        </div>
      </div>

      <Button type="submit" variant="gold" className="mt-4" disabled={pending}>
        {pending ? 'Saving…' : 'Save Profile'}
      </Button>
    </form>
  );
}
