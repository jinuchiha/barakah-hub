'use client';
import { Search, Bell, Sun, Moon, LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { signOut } from '@/lib/auth-client';
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
  badges?: Record<string, number>;
}

const THEME_KEY = 'barakah_theme';

const themeStore = {
  subscribe: (cb: () => void) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', cb);
    return () => window.removeEventListener('storage', cb);
  },
  getSnapshot: (): 'dark' | 'light' => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null) ?? 'dark';
  },
  getServerSnapshot: (): 'dark' | 'light' => 'dark',
};

export function Topbar({ user, unreadCount = 0, isAdmin = false, badges = {} }: TopbarProps) {
  const [q, setQ] = useState('');
  const mode = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
  const router = useRouter();

  // DOM-only side effect: keep <html> classList synced with the persisted theme.
  useEffect(() => {
    document.documentElement.classList.toggle('light', mode === 'light');
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  async function logout() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  function toggleMode() {
    const next = mode === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle('light', next === 'light');
    document.documentElement.classList.toggle('dark', next === 'dark');
    // Manually fire so other tabs' subscribers (and ours) re-read.
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: next }));
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}` as Route);
  }

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surf-2)]/95 px-3 backdrop-blur-md md:px-5">
      <div className="flex items-center gap-2.5 md:gap-3">
        <MobileNav isAdmin={isAdmin} badges={badges} />
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-[rgba(200,155,60,0.12)] ring-1 ring-inset ring-[rgba(200,155,60,0.30)]">
          <Crescent />
        </div>
        <div className="hidden sm:block">
          <div className="text-[13px] font-semibold leading-tight text-[var(--color-cream)]">Barakah Hub</div>
          <div className="font-[var(--font-arabic)] text-[11px] leading-tight text-[var(--color-gold)]">بَرَكَة ہب</div>
        </div>
      </div>

      <form onSubmit={onSearchSubmit} className="relative mx-2 hidden max-w-md flex-1 md:block md:mx-6" role="search">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--txt-4)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members, payments, cases…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surf-3)] py-1.5 pl-9 pr-3 text-[13px] text-[var(--color-cream)] outline-none transition-colors placeholder:text-[var(--txt-4)] focus:border-[var(--border-accent)] focus:bg-[var(--surf-1)]"
          aria-label="Global search"
        />
        <kbd className="num pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--surf-1)] px-1.5 py-0.5 text-[10px] text-[var(--txt-4)] lg:inline-block">
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
        <button
          type="button"
          onClick={toggleMode}
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          className="hidden size-9 place-items-center rounded-lg text-[var(--txt-2)] transition-colors hover:bg-[var(--surf-3)] hover:text-[var(--color-cream)] sm:grid"
        >
          {mode === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <Link
          href="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative grid size-9 place-items-center rounded-lg text-[var(--txt-2)] transition-colors hover:bg-[var(--surf-3)] hover:text-[var(--color-cream)]"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="num absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#dc5252] px-1 text-[9px] font-semibold text-white ring-2 ring-[var(--surf-2)]">
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
                  user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
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
  return <CrescentMark className="size-[18px] text-[var(--color-gold)]" title="" />;
}
