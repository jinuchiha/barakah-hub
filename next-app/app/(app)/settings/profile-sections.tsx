'use client';
import { Input, Label } from '@/components/ui/input';
import { AvatarUpload } from '@/components/avatar-upload';
import { cn } from '@/lib/utils';
import type { Member } from '@/lib/db/schema';

export const PROVINCES = ['', 'balochistan', 'sindh', 'punjab', 'kpk', 'gilgit', 'azadkashmir', 'islamabad', 'overseas', 'other'];
export const PALETTE = ['#d6d2c7', '#1f6e4a', '#2d5a8c', '#a83254', '#5e4691', '#a0671e', '#2d6a4f', '#3a4a7a', '#b85a2e', '#475569'];

/** Reserved-height error slot so a field's layout never jumps when a message appears. */
export function FieldError({ message }: { message?: string }) {
  return <p className="mt-1 min-h-4 text-[11px] text-red-400">{message ?? ''}</p>;
}

/** One shared style for every in-card explanatory note — quiet bordered strip. */
export function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-[var(--border)] bg-[rgba(214,210,199,0.03)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--txt-3)]">
      {children}
    </p>
  );
}

function ReadOnlyField({ label, value, lang }: { label: string; value: string; lang?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div
        lang={lang}
        dir={lang === 'ur' ? 'rtl' : undefined}
        className="rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-4 py-2.5 text-sm text-[var(--txt-2)]"
      >
        {value}
      </div>
    </div>
  );
}

function LinkBadge({ label, linked }: { label: string; linked: boolean }) {
  return (
    <div className="rounded-md border border-[var(--border)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--txt-4)]">{label}</div>
      <div className={cn('mt-0.5 text-xs font-medium', linked ? 'text-[var(--color-emerald-2)]' : 'text-[var(--txt-3)]')}>
        {linked ? 'Linked' : 'Not linked'}
      </div>
    </div>
  );
}

function ColorSwatches({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 rounded-md border border-[var(--border)] p-3">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className={cn(
            'size-8 rounded-full transition-transform hover:scale-110',
            color === c && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surf-1)]',
          )}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

interface ProfileSectionProps {
  member: Member;
  photoUrl: string | null;
  color: string;
  showColors: boolean;
  onToggleColors: () => void;
  onColorChange: (c: string) => void;
  onPhotoChange: (url: string | null) => void;
}

export function ProfileSection({ member, photoUrl, color, showColors, onToggleColors, onColorChange, onPhotoChange }: ProfileSectionProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AvatarUpload name={member.nameEn || member.nameUr} color={color} photoUrl={photoUrl} onUploaded={onPhotoChange} />
      <div className="text-center">
        <div lang="ur" dir="rtl" className="text-base font-semibold text-[var(--color-gold-2)]">{member.nameUr}</div>
        <div className="mt-0.5 text-sm text-[var(--txt-2)]">{member.nameEn}</div>
        <div className="mt-1 text-[11px] uppercase tracking-wide text-[var(--txt-4)]">
          {member.role === 'admin' ? 'Admin' : member.role === 'supervisor' ? 'Supervisor' : 'Member'}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onToggleColors} className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs transition-colors hover:border-[var(--color-gold)]">
          Color
        </button>
        {photoUrl && (
          <button type="button" onClick={() => onPhotoChange(null)} className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10">
            Remove photo
          </button>
        )}
      </div>
      {showColors && <ColorSwatches color={color} onChange={onColorChange} />}
      <SectionNote>Name changes require admin approval — contact your administrator.</SectionNote>
    </div>
  );
}

export function FamilySection({ member }: { member: Member }) {
  return (
    <div className="grid gap-3">
      <ReadOnlyField label="Father's Name" value={member.fatherName} lang="ur" />
      <ReadOnlyField label="Relation" value={member.relation || '—'} />
      <div className="grid grid-cols-2 gap-3">
        <LinkBadge label="Parent link" linked={!!member.parentId} />
        <LinkBadge label="Spouse link" linked={!!member.spouseId} />
      </div>
      <SectionNote>
        Lineage and family relationships are managed by admin — contact your administrator to update these.
      </SectionNote>
    </div>
  );
}

interface ContactAddressSectionProps {
  phone: string;
  city: string;
  province: string;
  phoneError?: string;
  cityError?: string;
  onPhoneChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onProvinceChange: (v: string) => void;
}

/** Phone + city + province in one card — three lonely fields in two
 *  half-empty cards read as clutter, together they make one clean unit. */
export function ContactAddressSection({
  phone, city, province, phoneError, cityError, onPhoneChange, onCityChange, onProvinceChange,
}: ContactAddressSectionProps) {
  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor="prof-phone">Phone</Label>
        <Input id="prof-phone" value={phone} maxLength={30} onChange={(e) => onPhoneChange(e.target.value)} placeholder="03xx-xxxxxxx" />
        <FieldError message={phoneError} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="prof-city">City</Label>
          <Input id="prof-city" value={city} maxLength={60} onChange={(e) => onCityChange(e.target.value)} />
          <FieldError message={cityError} />
        </div>
        <div>
          <Label htmlFor="prof-province">Province</Label>
          <select
            id="prof-province"
            value={province}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
          >
            {PROVINCES.map((p) => <option key={p} value={p}>{p || 'Select province'}</option>)}
          </select>
          <FieldError />
        </div>
      </div>
    </div>
  );
}
