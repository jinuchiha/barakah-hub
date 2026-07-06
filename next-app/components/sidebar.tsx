'use client';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, User, Users, GitBranch, Bell, Mail, Settings, Wallet,
  AlertTriangle, FileText, Megaphone, ScrollText, UserPlus, BookOpen, Bot, Wrench,
} from 'lucide-react';

const NAV: { href: string; label: string; labelUr: string; icon: React.ComponentType<{ className?: string }>; admin?: boolean; supervisor?: boolean }[] = [
  { href: '/dashboard',           label: 'Dashboard',       labelUr: 'ڈیش بورڈ',       icon: LayoutDashboard },
  { href: '/myaccount',           label: 'My Account',      labelUr: 'میرا کھاتہ',     icon: User },
  { href: '/tree',                label: 'Family Tree',     labelUr: 'خاندانی درخت',   icon: GitBranch },
  { href: '/cases',               label: 'Emergency Vote',  labelUr: 'ایمرجنسی ووٹ',   icon: AlertTriangle },
  { href: '/admin/fund',          label: 'Fund Approvals',  labelUr: 'فنڈ منظوری',     icon: Wallet,   supervisor: true },
  { href: '/ai',                   label: 'AI Assistant',    labelUr: 'اے آئی معاون',   icon: Bot },
  { href: '/notifications',       label: 'Notifications',   labelUr: 'اطلاعات',        icon: Bell },
  { href: '/messages',            label: 'Messages',        labelUr: 'پیغامات',        icon: Mail },
  { href: '/settings',            label: 'Settings',        labelUr: 'ترتیبات',        icon: Settings },
  { href: '/about',               label: 'About Fund',      labelUr: 'اس فنڈ کے بارے میں', icon: BookOpen },
  { href: '/tools',               label: 'Islamic Tools',   labelUr: 'اسلامی ٹولز',        icon: Wrench },
  { href: '/admin/members',       label: 'Members',         labelUr: 'اراکین',         icon: Users,    admin: true },
  { href: '/admin/invites',       label: 'Invites',         labelUr: 'دعوت نامے',     icon: UserPlus, admin: true },
  { href: '/admin/fund',          label: 'Fund Register',   labelUr: 'فنڈ رجسٹر',      icon: Wallet,   admin: true },
  { href: '/admin/loans',         label: 'Qarz-e-Hasana',   labelUr: 'قرض حسنہ',       icon: FileText, admin: true },
  { href: '/admin/broadcast',     label: 'Broadcast',       labelUr: 'اعلان',          icon: Megaphone, admin: true },
  { href: '/admin/annual-report', label: 'Annual Report',   labelUr: 'سالانہ رپورٹ',  icon: ScrollText, admin: true },
  { href: '/admin/audit',         label: 'Audit Log',       labelUr: 'آڈٹ لاگ',        icon: ScrollText, admin: true },
];

interface NavProps {
  isAdmin?: boolean;
  isSupervisor?: boolean;
  locale?: 'ur' | 'en';
  onNavigate?: () => void;
  layoutIdSuffix?: string;
  badges?: Record<string, number>;
}

export function SidebarNav({ isAdmin = false, isSupervisor = false, locale = 'en', onNavigate, layoutIdSuffix = 'desktop', badges = {} }: NavProps) {
  const pathname = usePathname();
  const items = NAV.filter((n) => {
    if (n.admin) return isAdmin;
    if (n.supervisor) return isSupervisor && !isAdmin;
    return true;
  });
  const adminStart = items.findIndex((n) => n.admin);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
      <SectionLabel label={locale === 'ur' ? 'مینو' : 'MAIN'} />
      {items.map((n, i) => {
        const itemKey = `${n.href}-${n.admin ? 'admin' : n.supervisor ? 'supervisor' : 'member'}`;
        const isActive = pathname === n.href || pathname.startsWith(n.href + '/');
        if (n.admin && i === adminStart) {
          return (
            <div key={itemKey}>
              <SectionLabel label={locale === 'ur' ? 'ایڈمن' : 'ADMIN'} />
              <NavItem n={n} isActive={isActive} locale={locale} onNavigate={onNavigate} badge={badges[n.href]} layoutId={`nav-pill-${layoutIdSuffix}`} />
            </div>
          );
        }
        return <NavItem key={itemKey} n={n} isActive={isActive} locale={locale} onNavigate={onNavigate} badge={badges[n.href]} layoutId={`nav-pill-${layoutIdSuffix}`} />;
      })}
    </nav>
  );
}

export function Sidebar({ isAdmin = false, isSupervisor = false, locale = 'en', badges = {} }: {
  isAdmin?: boolean; isSupervisor?: boolean; locale?: 'ur' | 'en'; badges?: Record<string, number>;
}) {
  return (
    <aside
      className="hidden w-[220px] shrink-0 flex-col md:flex"
      style={{ background: 'linear-gradient(180deg,#060b13 0%,#080e18 100%)', borderRight: '1px solid rgba(200,155,60,0.14)' }}
    >
      {/* Gold top accent line */}
      <div aria-hidden className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.35), transparent)' }} />

      <SidebarNav isAdmin={isAdmin} isSupervisor={isSupervisor} locale={locale} layoutIdSuffix="desktop" badges={badges} />

      {/* ── FOOTER ── */}
      <div className="px-4 py-3 text-[9px] uppercase tracking-[2px]"
        style={{ borderTop: '1px solid rgba(200,155,60,0.08)', color: 'rgba(236,235,230,0.22)' }}>
        v3.0 · Barakah Hub
      </div>
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-1 mt-4 px-2 text-[9.5px] font-bold uppercase tracking-[2.5px]" style={{ color: 'rgba(200,155,60,0.5)' }}>
      {label}
    </div>
  );
}

function NavItem({ n, isActive, locale, onNavigate, badge, layoutId }: {
  n: typeof NAV[number]; isActive: boolean; locale: 'ur' | 'en'; onNavigate?: () => void; badge?: number; layoutId: string;
}) {
  const Icon = n.icon;
  return (
    <Link
      href={n.href as Route}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative my-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors duration-150',
        isActive ? 'font-medium' : 'hover:bg-white/[0.04]',
      )}
      style={{ color: isActive ? '#ecebe6' : 'rgba(236,235,230,0.50)' }}
    >
      {/* Shared-layout pill glides between items on navigation. */}
      {isActive && (
        <motion.span
          layoutId={layoutId}
          aria-hidden
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(90deg,rgba(200,155,60,0.20) 0%,rgba(200,155,60,0.05) 100%)',
            boxShadow: 'inset 2.5px 0 0 #c89b3c',
          }}
        />
      )}
      <Icon className={cn('relative size-[15px] shrink-0', isActive ? 'text-[#c89b3c]' : 'text-[rgba(236,235,230,0.35)]')} />
      <span className="relative flex-1 truncate">{locale === 'ur' ? n.labelUr : n.label}</span>
      {!!badge && badge > 0 && (
        <span className="num relative ml-auto grid min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold"
          style={{ background: '#c89b3c', color: '#0a0f1a' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
