'use client';
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/use-locale';
import {
  LayoutDashboard, User, Users, GitBranch, Bell, Mail, Settings, Wallet,
  AlertTriangle, FileText, Megaphone, ScrollText, UserPlus, BookOpen, Bot, Wrench,
  ChevronsLeft,
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
  onNavigate?: () => void;
  layoutIdSuffix?: string;
  badges?: Record<string, number>;
  collapsed?: boolean;
}

export function SidebarNav({ isAdmin = false, isSupervisor = false, onNavigate, layoutIdSuffix = 'desktop', badges = {}, collapsed = false }: NavProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const items = NAV.filter((n) => {
    if (n.admin) return isAdmin;
    if (n.supervisor) return isSupervisor && !isAdmin;
    return true;
  });
  const adminStart = items.findIndex((n) => n.admin);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
      {!collapsed && <SectionLabel label={locale === 'ur' ? 'مینو' : 'MAIN'} />}
      {items.map((n, i) => {
        const itemKey = `${n.href}-${n.admin ? 'admin' : n.supervisor ? 'supervisor' : 'member'}`;
        const isActive = pathname === n.href || pathname.startsWith(n.href + '/');
        if (n.admin && i === adminStart) {
          return (
            <div key={itemKey}>
              {collapsed ? <div aria-hidden className="mx-2 my-2 h-px bg-[rgba(200,155,60,0.18)]" /> : <SectionLabel label={locale === 'ur' ? 'ایڈمن' : 'ADMIN'} />}
              <NavItem n={n} isActive={isActive} locale={locale} onNavigate={onNavigate} badge={badges[n.href]} layoutId={`nav-pill-${layoutIdSuffix}`} collapsed={collapsed} />
            </div>
          );
        }
        return <NavItem key={itemKey} n={n} isActive={isActive} locale={locale} onNavigate={onNavigate} badge={badges[n.href]} layoutId={`nav-pill-${layoutIdSuffix}`} collapsed={collapsed} />;
      })}
    </nav>
  );
}

const COLLAPSE_KEY = 'barakah_sidebar_collapsed';

// External-store read so SSR renders expanded and the client corrects
// itself without a setState-in-effect cascade (same pattern as topbar).
const collapseStore = {
  subscribe: (cb: () => void) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', cb);
    return () => window.removeEventListener('storage', cb);
  },
  getSnapshot: () => typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1',
  getServerSnapshot: () => false,
};

// locale is read via useLocale() inside SidebarNav — a locale prop here was
// accepted, threaded, and silently discarded.
export function Sidebar({ isAdmin = false, isSupervisor = false, badges = {} }: {
  isAdmin?: boolean; isSupervisor?: boolean; badges?: Record<string, number>;
}) {
  const collapsed = useSyncExternalStore(collapseStore.subscribe, collapseStore.getSnapshot, collapseStore.getServerSnapshot);
  const toggle = () => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '0' : '1');
    window.dispatchEvent(new StorageEvent('storage', { key: COLLAPSE_KEY }));
  };

  return (
    <aside
      className="app-sidebar hidden shrink-0 flex-col transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex"
      style={{ width: collapsed ? 64 : 220 }}
    >
      {/* Gold top accent line */}
      <div aria-hidden className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.35), transparent)' }} />

      <SidebarNav isAdmin={isAdmin} isSupervisor={isSupervisor} layoutIdSuffix="desktop" badges={badges} collapsed={collapsed} />

      {/* ── FOOTER: collapse toggle + version ── */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5"
        style={{ borderTop: '1px solid rgba(200,155,60,0.08)' }}
      >
        {!collapsed && (
          <span className="text-[9px] uppercase tracking-[2px]" style={{ color: 'rgba(236,235,230,0.22)' }}>
            v3.0 · Barakah Hub
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="grid size-7 place-items-center rounded-lg text-[rgba(236,235,230,0.4)] transition-colors hover:bg-white/[0.05] hover:text-[var(--color-gold-2)]"
        >
          <ChevronsLeft
            className="size-4 transition-transform duration-300"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
          />
        </button>
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

function NavItem({ n, isActive, locale, onNavigate, badge, layoutId, collapsed = false }: {
  n: typeof NAV[number]; isActive: boolean; locale: 'ur' | 'en'; onNavigate?: () => void; badge?: number; layoutId: string; collapsed?: boolean;
}) {
  const Icon = n.icon;
  return (
    <Link
      href={n.href as Route}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? (locale === 'ur' ? n.labelUr : n.label) : undefined}
      className={cn(
        'group relative my-0.5 flex items-center gap-2.5 rounded-xl py-2 text-[13px] transition-colors duration-150',
        collapsed ? 'justify-center px-0' : 'px-3',
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
      {!collapsed && <span className="relative flex-1 truncate">{locale === 'ur' ? n.labelUr : n.label}</span>}
      {collapsed && !!badge && badge > 0 && (
        <span aria-hidden className="absolute right-1.5 top-1.5 size-1.5 rounded-full" style={{ background: '#c89b3c' }} />
      )}
      {!collapsed && !!badge && badge > 0 && (
        <span className="num relative ml-auto grid min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold"
          style={{ background: '#c89b3c', color: '#0a0f1a' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
