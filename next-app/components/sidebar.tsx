'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, User, Users, GitBranch, Bell, Mail, Settings, Wallet,
  AlertTriangle, FileText, Megaphone, ScrollText,
} from 'lucide-react';

const NAV: { href: string; label: string; labelUr: string; icon: React.ComponentType<{ className?: string }>; admin?: boolean }[] = [
  { href: '/dashboard',       label: 'Dashboard',       labelUr: 'ڈیش بورڈ',       icon: LayoutDashboard },
  { href: '/myaccount',       label: 'My Account',      labelUr: 'میرا کھاتہ',     icon: User },
  { href: '/tree',            label: 'Family Tree',     labelUr: 'خاندانی درخت',   icon: GitBranch },
  { href: '/cases',           label: 'Emergency Vote',  labelUr: 'ایمرجنسی ووٹ',   icon: AlertTriangle },
  { href: '/notifications',   label: 'Notifications',   labelUr: 'اطلاعات',        icon: Bell },
  { href: '/messages',        label: 'Messages',        labelUr: 'پیغامات',        icon: Mail },
  { href: '/settings',        label: 'Settings',        labelUr: 'ترتیبات',        icon: Settings },
  { href: '/admin/members',   label: 'Members',         labelUr: 'اراکین',         icon: Users,    admin: true },
  { href: '/admin/fund',      label: 'Fund Register',   labelUr: 'فنڈ رجسٹر',      icon: Wallet,   admin: true },
  { href: '/admin/loans',     label: 'Qarz-e-Hasana',   labelUr: 'قرض حسنہ',       icon: FileText, admin: true },
  { href: '/admin/broadcast', label: 'Broadcast',       labelUr: 'اعلان',          icon: Megaphone, admin: true },
  { href: '/admin/audit',     label: 'Audit Log',       labelUr: 'آڈٹ لاگ',        icon: ScrollText, admin: true },
];

export function Sidebar({ isAdmin = false, locale = 'en' }: { isAdmin?: boolean; locale?: 'ur' | 'en' }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.admin || isAdmin);
  const adminStart = items.findIndex((n) => n.admin);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-gradient-to-b from-[#0d0d09] to-[#080806]">
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Main">
        <SectionLabel label={locale === 'ur' ? 'مینو' : 'MAIN'} />
        {items.map((n, i) => {
          const isActive = pathname === n.href || pathname.startsWith(n.href + '/');
          if (n.admin && i === adminStart) {
            return (
              <div key={n.href}>
                <SectionLabel label={locale === 'ur' ? 'ایڈمن' : 'ADMIN'} />
                <NavItem n={n} isActive={isActive} locale={locale} />
              </div>
            );
          }
          return <NavItem key={n.href} n={n} isActive={isActive} locale={locale} />;
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-3 text-center text-[10px] uppercase tracking-[1px] text-[var(--color-gold-4)] opacity-60">
        v3.0 · BalochSath
      </div>
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div className="px-4 pt-4 pb-1.5 font-[var(--font-display)] text-[9px] font-bold uppercase tracking-[3px] text-[var(--color-gold-4)] opacity-70">{label}</div>;
}

function NavItem({ n, isActive, locale }: { n: typeof NAV[number]; isActive: boolean; locale: 'ur' | 'en' }) {
  const Icon = n.icon;
  return (
    <Link
      href={n.href as any}
      className={cn(
        'group relative mx-2 my-0.5 flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm transition-all',
        isActive
          ? 'border-[var(--border)] bg-[rgba(201,168,76,0.1)] text-[var(--color-gold-2)]'
          : 'text-[var(--txt-3)] hover:border-[var(--border)] hover:bg-[rgba(201,168,76,0.06)] hover:text-[var(--txt-1)]',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && <span className="absolute left-0 top-[20%] h-[60%] w-0.5 rounded-r-sm bg-[var(--color-gold)]" />}
      <Icon className="size-4 shrink-0 text-[var(--color-gold)]" />
      <span>{locale === 'ur' ? n.labelUr : n.label}</span>
    </Link>
  );
}
