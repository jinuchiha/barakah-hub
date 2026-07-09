'use client';
import { User, Users, Phone, MapPin } from 'lucide-react';
import type { Member } from '@/lib/db/schema';
import { SectionCard } from './profile-section-card';
import type { NavSection } from './profile-mini-nav';
import { ProfileSection, FamilySection, ContactSection, AddressSection } from './profile-sections';
import type { FormState } from './profile-form-types';

export const PROFILE_SECTIONS: NavSection[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'address', label: 'Address', icon: MapPin },
];

interface SectionsGridProps {
  member: Member;
  form: FormState;
  errors: { phone?: string; city?: string };
  showColors: boolean;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onToggleColors: () => void;
}

export function SectionsGrid({ member, form, errors, showColors, set, onToggleColors }: SectionsGridProps) {
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
      <SectionCard id="contact" title="Contact" icon={Phone} index={2}>
        <ContactSection phone={form.phone} error={errors.phone} onChange={(v) => set('phone', v)} />
      </SectionCard>
      <SectionCard id="address" title="Address" icon={MapPin} index={3}>
        <AddressSection
          city={form.city}
          province={form.province}
          cityError={errors.city}
          onCityChange={(v) => set('city', v)}
          onProvinceChange={(v) => set('province', v)}
        />
      </SectionCard>
    </div>
  );
}
