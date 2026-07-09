'use client';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** Watches each section for scroll position, highlights the nearest one. */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-15% 0px -60% 0px', threshold: 0.1 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function ProfileMiniNav({ sections }: { sections: NavSection[] }) {
  const active = useActiveSection(sections.map((s) => s.id));

  return (
    <nav aria-label="Profile sections" className="sticky top-6 hidden h-fit w-40 shrink-0 xl:block">
      <ul className="flex flex-col gap-1 border-l border-[var(--border)] pl-3">
        {sections.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => scrollToSection(id)}
              aria-current={active === id ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
                active === id ? 'text-[var(--color-gold)]' : 'text-[var(--txt-3)] hover:text-[var(--txt-1)]',
              )}
            >
              <Icon size={13} className="shrink-0" aria-hidden />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
