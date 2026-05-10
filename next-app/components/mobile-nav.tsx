'use client';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/sidebar';

/**
 * Mobile-only hamburger that opens a slide-in drawer with the same
 * nav items the desktop sidebar uses. Closes itself on link click via
 * `onNavigate`, since route changes don't auto-close Radix dialogs.
 */
export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[rgba(214,210,199,0.08)] text-[var(--color-gold)] hover:bg-[rgba(214,210,199,0.15)] md:hidden"
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="bg-gradient-to-b from-[#0d0d09] to-[#080806]"
      >
        <SheetTitle className="px-4 pt-4 font-[var(--font-arabic)] text-base text-[var(--color-gold-2)]">
          بَرَكَة ہب
        </SheetTitle>
        <SheetDescription className="sr-only">Main navigation</SheetDescription>
        <SidebarNav isAdmin={isAdmin} layoutIdSuffix="mobile" onNavigate={() => setOpen(false)} />
        <div className="border-t border-[var(--border)] p-3 text-center text-[10px] uppercase tracking-[1px] text-[var(--color-gold-4)] opacity-60">
          v3.0 · Barakah Hub
        </div>
      </SheetContent>
    </Sheet>
  );
}
