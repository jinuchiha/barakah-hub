import type { Member } from '@/lib/db/schema';

export interface FormState {
  phone: string;
  city: string;
  province: string;
  color: string;
  photoUrl: string | null;
}

export function toFormState(member: Member): FormState {
  return {
    phone: member.phone || '',
    city: member.city || '',
    province: member.province || '',
    color: member.color,
    photoUrl: member.photoUrl ?? null,
  };
}
