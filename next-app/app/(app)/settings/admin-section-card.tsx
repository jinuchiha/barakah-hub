'use client';
import type { ReactNode } from 'react';
import { Settings2 } from 'lucide-react';
import { SectionCard } from './profile-section-card';

/**
 * Client wrapper so the server page never passes the icon COMPONENT (a
 * function) across the server→client boundary — that crashes the RSC
 * render with "Functions cannot be passed directly to Client Components".
 * The icon is imported and referenced entirely on the client side here.
 */
export function AdminSectionCard({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <SectionCard id="admin" title="Admin Configuration" icon={Settings2} index={4} action={action}>
      {children}
    </SectionCard>
  );
}
