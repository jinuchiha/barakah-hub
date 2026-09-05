import Image from 'next/image';
import { ini } from '@/lib/utils';

/**
 * The member avatar circle: photo when present, tinted initials otherwise.
 *
 * This exact block (grid place-items-center rounded-full + member color +
 * photo/initials fallback) was hand-copied 13+ times with only the size
 * varying. One component, and the one place next/image sizing is enforced —
 * previously every copy downloaded the full-resolution upload into a tiny
 * circle with no width/height (a CLS source each time).
 */
const SIZES = { xs: 28, sm: 32, md: 36, lg: 56 } as const;
type AvatarSize = keyof typeof SIZES;

const TEXT_SIZE: Record<AvatarSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-[11px]',
  md: 'text-[12px]',
  lg: 'text-[18px]',
};

export function Avatar({
  member,
  size = 'sm',
  className = '',
}: {
  member: { photoUrl?: string | null; color?: string | null; nameEn?: string | null; nameUr?: string | null };
  size?: AvatarSize;
  className?: string;
}) {
  const px = SIZES[size];
  const name = member.nameEn || member.nameUr || '';
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-[var(--color-ink)] ${TEXT_SIZE[size]} ${className}`}
      style={{ width: px, height: px, background: member.color || 'var(--color-gold-4)' }}
      aria-hidden={!name}
    >
      {member.photoUrl ? (
        <Image
          src={member.photoUrl}
          alt={name}
          width={px}
          height={px}
          className="size-full object-cover"
        />
      ) : (
        ini(name)
      )}
    </span>
  );
}
