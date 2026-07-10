'use client';
import type { ReactNode } from 'react';
import { User, Users, Phone, Palette } from 'lucide-react';
import type { Member } from '@/lib/db/schema';
import { SectionCard } from './profile-section-card';
import type { NavSection } from './profile-mini-nav';
import { ProfileSection, FamilySection, ContactAddressSection } from './profile-sections';
import type { FormState } from './profile-form-types';

export const PROFILE_SECTIONS: NavSection[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'contact', label: 'Contact & Address', icon: Phone },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

interface SectionsGridProps {
  member: Member;
  form: FormState;
  errors: { phone?: string; city?: string };
  showColors: boolean;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onToggleColors: () => void;
  /** Theme picker slot — buttons only (type=button), safe inside the profile form. */
  appearance: ReactNode;
}

export function SectionsGrid({ member, form, errors, showColors, set, onToggleColors, appearance }: SectionsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionCard id="profile" title="Profile" icon={User} index={0}>
        <ProfileSection
          member={member}
          photoUrl={form.photoUrl}
          color={form.color}
          showColors={showColors}
          onToggleColors={onToggleColors}
          onColorChange={(c) => set('color', c)}
          onPhotoChange={(url) => set('photoUrl', url)}
        />
      </SectionCard>
      <SectionCard id="family" title="Family" icon={Users} index={1}>
        <FamilySection member={member} />
      </SectionCard>
      <SectionCard id="contact" title="Contact & Address" icon={Phone} index={2}>
        <ContactAddressSection
          phone={form.phone}
          city={form.city}
          province={form.province}
          phoneError={errors.phone}
          cityError={errors.city}
          onPhoneChange={(v) => set('phone', v)}
          onCityChange={(v) => set('city', v)}
          onProvinceChange={(v) => set('province', v)}
        />
      </SectionCard>
      <SectionCard id="appearance" title="Appearance" icon={Palette} index={3}>
        {appearance}
      </SectionCard>
    </div>
  );
}
