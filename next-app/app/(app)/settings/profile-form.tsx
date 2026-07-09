'use client';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateProfile } from '@/app/actions';
import type { Member } from '@/lib/db/schema';
import { ProfileMiniNav } from './profile-mini-nav';
import { ProfileSaveBar } from './profile-save-bar';
import { PROFILE_SECTIONS, SectionsGrid } from './profile-sections-grid';
import { toFormState, type FormState } from './profile-form-types';

interface FieldErrors {
  phone?: string;
  city?: string;
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.phone.length > 30) errors.phone = 'Phone must be 30 characters or fewer.';
  if (form.city.length > 60) errors.city = 'City must be 60 characters or fewer.';
  return errors;
}

export default function ProfileForm({ member }: { member: Member }) {
  const [pending, start] = useTransition();
  const [initial] = useState(() => toFormState(member));
  const [form, setForm] = useState(initial);
  const [showColors, setShowColors] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setForm(initial);
    setErrors({});
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    start(async () => {
      try { await updateProfile(form); toast.success('Profile saved ✓'); }
      catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    });
  }

  return (
    <form onSubmit={save} className="xl:flex xl:items-start xl:gap-8">
      <ProfileMiniNav sections={PROFILE_SECTIONS} />
      <div className="min-w-0 flex-1">
        <SectionsGrid
          member={member}
          form={form}
          errors={errors}
          showColors={showColors}
          set={set}
          onToggleColors={() => setShowColors((s) => !s)}
        />
        <ProfileSaveBar visible={dirty} pending={pending} onReset={reset} />
      </div>
    </form>
  );
}
