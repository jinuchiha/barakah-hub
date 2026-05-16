'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, User, Users, GitBranch, Bell, Mail, Settings, Wallet,
  AlertTriangle, FileText, Megaphone, ScrollText, UserPlus,
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
  { href: '/admin/invites',   label: 'Invites',         labelUr: 'دعوت نامے',     icon: UserPlus, admin: true },
  { href: '/admin/fund',      label: 'Fund Register',   labelUr: 'فنڈ رجسٹر',      icon: Wallet,   admin: true },
  { href: '/admin/loans',     label: 'Qarz-e-Hasana',   labelUr: 'قرض حسنہ',       icon: FileText, admin: true },
  { href: '/admin/broadcast', label: 'Broadcast',       labelUr: 'اعلان',          icon: Megaphone, admin: true },
  { href: '/admin/annual-report', label: 'Annual Report', labelUr: 'سالانہ رپورٹ',  icon: ScrollText, admin: true },
  { href: '/admin/audit',     label: 'Audit Log',       labelUr: 'آڈٹ لاگ',        icon: ScrollText, admin: true },
];

interface NavProps {
  isAdmin?: boolean;
  /** Supervisor role — fund collector. Sees only the fund register link;
   *  all other nav items (including non-admin "main" items) are hidden
   *  per the explicit spec: "baqi kuch bhe nahi pata chalana chaye". */
  isSupervisor?: boolean;
  locale?: 'ur' | 'en';
  /** Called after a nav link is activated. Used by the mobile drawer to close itself. */
  onNavigate?: () => void;
  /** Distinct layoutId per render context so motion.span animations don't collide between desktop + drawer. */
  layoutIdSuffix?: string;
  /** href → badge count (e.g. pending members, pending payments). 0 or undefined = no badge. */
  badges?: Record<string, number>;
}

/** Inner nav list — shared between desktop `<Sidebar>` and the mobile drawer. */
export function SidebarNav({ isAdmin = false, isSupervisor = false, locale = 'en', onNavigate, layoutIdSuffix = 'desktop', badges = {} }: NavProps) {
  const pathname = usePathname();
  const items = isSupervisor
    ? NAV.filter((n) => n.href === '/admin/fund')
    : NAV.filter((n) => !n.admin || isAdmin);
  const adminStart = items.findIndex((n) => n.admin);

  return (
    <nav className="flex-1 overflow-y-auto py-3" aria-label="Main">
      <SectionLabel label={locale === 'ur' ? 'مینو' : 'MAIN'} />
      {items.map((n, i) => {
        const isActive = pathname === n.href || pathname.startsWith(n.href + '/');
        if (n.admin && i === adminStart) {
          return (
            <div key={n.href}>
              <SectionLabel label={locale === 'ur' ? 'ایڈمن' : 'ADMIN'} />
              <NavItem n={n} isActive={isActive} locale={locale} onNavigate={onNavigate} layoutIdSuffix={layoutIdSuffix} badge={badges[n.href]} />
            </div>
          );
        }
        return <NavItem key={n.href} n={n} isActive={isActive} locale={locale} onNavigate={onNavigate} layoutIdSuffix={layoutIdSuffix} badge={badges[n.href]} />;
      })}
    </nav>
  );
}

export function Sidebar({
  isAdmin = false,
  isSupervisor = false,
  locale = 'en',
  badges = {},
}: {
  isAdmin?: boolean;
  isSupervisor?: boolean;
  locale?: 'ur' | 'en';
  badges?: Record<string, number>;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surf-2)] md:flex">
      <SidebarNav isAdmin={isAdmin} isSupervisor={isSupervisor} locale={locale} layoutIdSuffix="desktop" badges={badges} />
      <div className="border-t border-[var(--border)] px-4 py-3 text-[10px] uppercase tracking-[2px] text-[var(--txt-4)]">
        v3.0 · Barakah Hub
      </div>
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div className="px-4 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[2px] text-[var(--txt-4)]">{label}</div>;
}

function NavItem({
  n,
  isActive,
  locale,
  onNavigate,
  layoutIdSuffix,
  badge,
}: {
  n: typeof NAV[number];
  isActive: boolean;
  locale: 'ur' | 'en';
  onNavigate?: () => void;
  layoutIdSuffix: string;
  badge?: number;
}) {
  const Icon = n.icon;
  return (
    <Link
      href={n.href as any}
      onClick={onNavigate}
      className={cn(
        'group relative mx-2 my-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] transition-colors',
        isActive
          ? 'bg-[rgba(200,155,60,0.10)] font-medium text-[var(--color-cream)]'
          : 'text-[var(--txt-2)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--txt-1)]',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <motion.span
          layoutId={`sidebar-active-indicator-${layoutIdSuffix}`}
          aria-hidden="true"
          className="absolute left-0 top-[18%] h-[64%] w-[2px] rounded-r-full bg-[var(--color-gold)]"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <Icon className={cn('size-[15px] shrink-0', isActive ? 'text-[var(--color-gold)]' : 'text-[var(--txt-3)]')} />
      <span className="flex-1 truncate">{locale === 'ur' ? n.labelUr : n.label}</span>
      {!!badge && badge > 0 && (
        <span className="num ml-auto grid min-w-[20px] place-items-center rounded-full bg-[var(--color-gold)] px-1.5 text-[10px] font-semibold text-[var(--color-ink)]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
