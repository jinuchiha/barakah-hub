'use client';
import { Search, Bell, Sun, Moon, LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { signOut } from '@/lib/auth-client';
import { Crescent as CrescentMark } from '@/components/icons/crescent';
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

export function Topbar({ user, unreadCount = 0 }: TopbarProps) {
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
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-ink)] via-[#111108] to-[var(--color-ink)] px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] shadow-[0_0_12px_rgba(201,168,76,0.35)]">
          <Crescent />
        </div>
        <div>
          <div className="font-[var(--font-arabic)] text-base text-[var(--color-gold-2)]">بَرَكَة ہب</div>
          <div className="font-[var(--font-display)] text-[9px] uppercase tracking-[3px] text-[var(--color-gold-4)]">Barakah Hub</div>
        </div>
      </div>

      <form onSubmit={onSearchSubmit} className="relative mx-6 max-w-md flex-1" role="search">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--txt-3)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members, payments, cases..."
          className="w-full rounded-full border border-[var(--border)] bg-white/5 py-2 pl-10 pr-4 text-sm text-[var(--color-cream)] outline-none transition-all placeholder:text-[var(--txt-4)] focus:border-[var(--color-gold)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.18)]"
          aria-label="Global search"
        />
      </form>

      <div className="flex items-center gap-2">
        <button type="button" onClick={toggleMode} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`} className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[rgba(201,168,76,0.08)] text-[var(--color-gold)] hover:bg-[rgba(201,168,76,0.15)]">
          {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <Link
          href="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[rgba(201,168,76,0.08)] text-[var(--color-gold)] hover:bg-[rgba(201,168,76,0.15)]"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-red-600 text-[8px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account menu for ${user.name}`}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(201,168,76,0.06)] px-3 py-1 outline-none transition-colors hover:bg-[rgba(201,168,76,0.12)] focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/40"
            >
              <span
                className="grid size-7 place-items-center overflow-hidden rounded-full text-[11px] font-bold text-white"
                style={{ background: user.color || '#c9a84c' }}
                aria-hidden="true"
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="hidden flex-col leading-tight sm:flex">
                <span className="text-xs text-[var(--color-cream-2)]">{user.name}</span>
                <span className="font-[var(--font-en)] text-[10px] text-[var(--color-gold-4)]">{user.role}</span>
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
  return <CrescentMark className="size-5 text-[var(--color-ink)]" title="" />;
}
