'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import {
  Search,
  LayoutDashboard,
  User,
  GitBranch,
  AlertTriangle,
  Mail,
  Wrench,
  Settings,
  Bell,
  Users,
  Wallet,
  FileText,
  UserPlus,
  Megaphone,
  ScrollText,
} from 'lucide-react';

interface PaletteItem {
  label: string;
  href: Route;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: PaletteItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Account', href: '/myaccount', icon: User },
  { label: 'Cases', href: '/cases', icon: AlertTriangle },
  { label: 'Family Tree', href: '/tree', icon: GitBranch },
  { label: 'Messages', href: '/messages', icon: Mail },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Islamic Tools', href: '/tools', icon: Wrench },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];

const ADMIN_ITEMS: PaletteItem[] = [
  { label: 'Members', href: '/admin/members', icon: Users },
  { label: 'Fund Register', href: '/admin/fund', icon: Wallet },
  { label: 'Loans', href: '/admin/loans', icon: FileText },
  { label: 'Invites', href: '/admin/invites', icon: UserPlus },
  { label: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
  { label: 'Annual Report', href: '/admin/annual-report', icon: ScrollText },
];

const GROUP_HEADING_CLASS =
  'px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-gold-4)]';

/** Lets the Topbar trigger button open the palette without lifting state
 * up through the server-rendered layout. */
export const COMMAND_PALETTE_OPEN_EVENT = 'barakah:command-palette-open';

export function CommandPalette({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvent);
    };
  }, []);

  function go(href: Route) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-[100] bg-[rgba(6,11,19,0.7)] backdrop-blur-sm animate-fade-in"
      contentClassName="cmdk-panel-in fixed left-1/2 top-[14%] z-[101] w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-[var(--radius-r-lg)] border border-[var(--border)] bg-[var(--surf-1)] shadow-[var(--shadow-card)]"
      className="flex flex-col"
    >
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4">
        <Search className="size-4 shrink-0 text-[var(--txt-4)]" />
        <CommandInput
          placeholder="Search pages…"
          className="h-12 w-full bg-transparent text-sm text-[var(--txt-1)] outline-none placeholder:text-[var(--txt-4)]"
        />
      </div>
      <CommandList className="max-h-[360px] overflow-y-auto overscroll-contain p-2">
        <CommandEmpty className="py-8 text-center text-sm text-[var(--txt-3)]">
          No results found.
        </CommandEmpty>
        <CommandGroup heading={<span className={GROUP_HEADING_CLASS}>Navigate</span>}>
          {NAV_ITEMS.map((item) => (
            <PaletteRow key={item.href} item={item} onSelect={go} />
          ))}
        </CommandGroup>
        {isAdmin && (
          <CommandGroup heading={<span className={GROUP_HEADING_CLASS}>Admin</span>}>
            {ADMIN_ITEMS.map((item) => (
              <PaletteRow key={item.href} item={item} onSelect={go} />
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--txt-4)]">
        <span className="flex items-center gap-1">
          <Kbd>↑↓</Kbd> navigate
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> open
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Kbd>esc</Kbd> close
        </span>
      </div>
    </CommandDialog>
  );
}

function PaletteRow({ item, onSelect }: { item: PaletteItem; onSelect: (href: Route) => void }) {
  const Icon = item.icon;
  return (
    <CommandItem
      value={item.label}
      onSelect={() => onSelect(item.href)}
      className="group flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-r-sm)] px-2.5 py-2 text-sm text-[var(--txt-2)] outline-none data-[selected=true]:bg-[rgba(200,155,60,0.12)] data-[selected=true]:text-[var(--color-cream)]"
    >
      <Icon className="size-4 shrink-0 text-[var(--color-gold-4)] group-data-[selected=true]:text-[var(--color-gold)]" />
      <span>{item.label}</span>
    </CommandItem>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--txt-3)]">
      {children}
    </kbd>
  );
}
