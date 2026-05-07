'use client';
import { Search, Bell, Sun, Moon, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';

interface TopbarProps {
  user: { name: string; role: string; color?: string; photoUrl?: string | null };
  unreadCount?: number;
}

export function Topbar({ user, unreadCount = 0 }: TopbarProps) {
  const [q, setQ] = useState('');
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push('/login');
  }

  function toggleMode() {
    const html = document.documentElement;
    html.classList.toggle('light');
    html.classList.toggle('dark');
  }

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-gradient-to-r from-[var(--color-ink)] via-[#111108] to-[var(--color-ink)] px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] shadow-[0_0_12px_rgba(201,168,76,0.35)]">
          <Crescent />
        </div>
        <div>
          <div className="font-[var(--font-arabic)] text-base text-[var(--color-gold-2)]">بیت المال بلوچ ساتھ</div>
          <div className="font-[var(--font-display)] text-[9px] uppercase tracking-[3px] text-[var(--color-gold-4)]">Bait ul Maal BalochSath</div>
        </div>
      </div>

      <div className="relative mx-6 max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--txt-3)]" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members, payments, cases..."
          className="w-full rounded-full border border-[var(--border)] bg-white/5 py-2 pl-10 pr-4 text-sm text-[var(--color-cream)] outline-none transition-all placeholder:text-[var(--txt-4)] focus:border-[var(--color-gold)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.18)]"
          aria-label="Global search"
        />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleMode} aria-label="Toggle theme" className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[rgba(201,168,76,0.08)] text-[var(--color-gold)] hover:bg-[rgba(201,168,76,0.15)]">
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </button>
        <button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[rgba(201,168,76,0.08)] text-[var(--color-gold)] hover:bg-[rgba(201,168,76,0.15)]">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-red-600 text-[8px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(201,168,76,0.06)] px-3 py-1">
          <div
            className="grid size-7 place-items-center rounded-full text-[11px] font-bold text-white"
            style={{ background: user.color || '#c9a84c' }}
            aria-hidden="true"
          >
            {user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-[var(--color-cream-2)]">{user.name}</span>
            <span className="font-[var(--font-en)] text-[10px] text-[var(--color-gold-4)]">{user.role}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} aria-label="Logout">
          <LogOut className="size-3" />
        </Button>
      </div>
    </header>
  );
}

function Crescent() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-[var(--color-ink)]" fill="currentColor" aria-hidden="true">
      <path d="M14 4 a8 8 0 1 0 0 16 a6 6 0 1 1 0 -16 z" />
    </svg>
  );
}
