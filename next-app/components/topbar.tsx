'use client';
import { Search, Bell, LogOut, User as UserIcon, Settings as SettingsIcon, Globe } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { signOut } from '@/lib/auth-client';
import { ini } from '@/lib/utils';
import { Crescent as CrescentMark } from '@/components/icons/crescent';
import { MobileNav } from '@/components/mobile-nav';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

interface TopbarProps {
  user: { name: string; role: string; color?: string; photoUrl?: string | null };
  unreadCount?: number;
  isAdmin?: boolean;
  isSupervisor?: boolean;
  badges?: Record<string, number>;
}

const THEME_KEY = 'barakah_theme';
const LANG_KEY = 'barakah_lang';

const langStore = {
  subscribe: (cb: () => void) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', cb);
    return () => window.removeEventListener('storage', cb);
  },
  getSnapshot: (): 'en' | 'ur' => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem(LANG_KEY) as 'en' | 'ur' | null) ?? 'en';
  },
  getServerSnapshot: (): 'en' | 'ur' => 'en',
};

export function Topbar({ user, unreadCount = 0, isAdmin = false, isSupervisor = false, badges = {} }: TopbarProps) {
  const [q, setQ] = useState('');
  const lang = useSyncExternalStore(langStore.subscribe, langStore.getSnapshot, langStore.getServerSnapshot);
  const [langOpen, setLangOpen] = useState(false);
  const router = useRouter();

  // The design system is dark-only luxury — a half-implemented light
  // theme shipped once and broke every hardcoded surface. Clear any
  // persisted 'light' preference so those users land back on dark.
  useEffect(() => {
    localStorage.removeItem(THEME_KEY);
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }, []);

  // Close language dropdown on outside click.
  useEffect(() => {
    if (!langOpen) return;
    function handleClick() { setLangOpen(false); }
    document.addEventListener('click', handleClick, { capture: true, once: true });
    return () => document.removeEventListener('click', handleClick, true);
  }, [langOpen]);

  async function logout() {
    try {
      await signOut();
    } catch {
      // Force navigation even if signOut throws
    }
    router.push('/login');
    router.refresh();
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}` as Route);
  }

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[rgba(200,155,60,0.10)] bg-[var(--surf-2)]/80 px-3 shadow-[0_1px_0_rgba(200,155,60,0.06),0_4px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl md:px-5">
      {/* Subtle gold shimmer at bottom of header */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(200,155,60,0.25)] to-transparent" />

      <div className="flex items-center gap-2.5 md:gap-3">
        <MobileNav isAdmin={isAdmin} isSupervisor={isSupervisor} badges={badges} />
        {/* Premium brand mark */}
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[rgba(200,155,60,0.22)] to-[rgba(200,155,60,0.06)] shadow-[0_0_0_1px_rgba(200,155,60,0.25),0_2px_8px_rgba(200,155,60,0.15)]">
          <Crescent />
        </div>
        <div className="hidden sm:block">
          <div className="text-[13px] font-semibold leading-tight tracking-[-0.01em] text-[var(--color-cream)]">Barakah Hub</div>
          <div className="font-[var(--font-arabic)] text-[10px] leading-tight text-[var(--color-gold-4)]">بَرَكَة ہب</div>
        </div>
      </div>

      <form onSubmit={onSearchSubmit} className="relative mx-2 hidden max-w-md flex-1 md:block md:mx-6" role="search">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--txt-4)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members, payments, cases…"
          className="w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] py-1.5 pl-9 pr-12 text-[13px] text-[var(--color-cream)] outline-none ring-0 transition-all placeholder:text-[var(--txt-4)] focus:border-[rgba(200,155,60,0.35)] focus:bg-[rgba(200,155,60,0.04)] focus:shadow-[0_0_0_3px_rgba(200,155,60,0.08)]"
          aria-label="Global search"
        />
        <kbd className="num pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-[var(--border)] bg-[var(--surf-1)] px-1.5 py-0.5 text-[9px] text-[var(--txt-4)] lg:inline-block">
          ⌘ K
        </kbd>
      </form>

      <div className="flex items-center gap-1.5">
        <Link
          href={'/search' as Route}
          aria-label="Search"
          className="grid size-9 place-items-center rounded-lg text-[var(--txt-2)] transition-colors hover:bg-[var(--surf-3)] hover:text-[var(--color-cream)] md:hidden"
        >
          <Search className="size-[18px]" />
        </Link>
        {/* Language picker */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            aria-label="Language settings"
            aria-expanded={langOpen}
            className="flex h-9 items-center gap-1 rounded-lg px-2 text-[var(--txt-2)] transition-colors hover:bg-[var(--surf-3)] hover:text-[var(--color-cream)]"
          >
            <Globe className="size-[16px]" />
            <span className="text-[11px] font-medium">{lang === 'ur' ? 'اردو' : 'EN'}</span>
          </button>
          {langOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--surf-1)] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  localStorage.setItem(LANG_KEY, 'en');
                  window.dispatchEvent(new StorageEvent('storage', { key: LANG_KEY, newValue: 'en' }));
                  setLangOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surf-3)] ${lang === 'en' ? 'text-[var(--color-gold)]' : 'text-[var(--txt-2)]'}`}
              >
                English {lang === 'en' && <span className="ml-auto text-[10px]">✓</span>}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  localStorage.setItem(LANG_KEY, 'ur');
                  window.dispatchEvent(new StorageEvent('storage', { key: LANG_KEY, newValue: 'ur' }));
                  setLangOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left font-[var(--font-arabic)] text-[13px] transition-colors hover:bg-[var(--surf-3)] ${lang === 'ur' ? 'text-[var(--color-gold)]' : 'text-[var(--txt-2)]'}`}
              >
                اردو {lang === 'ur' && <span className="ml-auto text-[10px]">✓</span>}
              </button>
              <div className="mt-1 border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--txt-4)]">
                Full Urdu UI available in mobile app
              </div>
            </div>
          )}
        </div>
        <Link
          href="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative grid size-9 place-items-center rounded-xl text-[var(--txt-2)] transition-all hover:bg-[rgba(200,155,60,0.08)] hover:text-[var(--color-gold)] hover:shadow-[0_0_12px_rgba(200,155,60,0.12)]"
        >
          <Bell className="size-[17px]" />
          {unreadCount > 0 && (
            <span className="num absolute right-1.5 top-1.5 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-[#dc5252] px-1 text-[8px] font-bold text-white shadow-[0_0_6px_rgba(220,82,82,0.5)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account menu for ${user.name}`}
              className="ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1 outline-none transition-colors hover:bg-[var(--surf-3)] focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/40"
            >
              <span
                className="grid size-7 place-items-center overflow-hidden rounded-full text-[10px] font-semibold text-white ring-1 ring-[var(--border)]"
                style={{ background: user.color || '#475569' }}
                aria-hidden="true"
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  ini(user.name)
                )}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-[12px] font-medium text-[var(--color-cream)]">{user.name}</span>
                <span className="text-[10px] text-[var(--txt-3)]">{user.role}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/myaccount" className="cursor-pointer">
                <UserIcon className="size-3.5" /> My account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <SettingsIcon className="size-3.5" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-300">
              <LogOut className="size-3.5" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function Crescent() {
  return <CrescentMark className="size-[18px] text-[var(--color-gold)]" aria-hidden={true} />;
}
