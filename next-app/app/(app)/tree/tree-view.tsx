'use client';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { fmtRs } from '@/lib/i18n/dict';
import { ini, cn } from '@/lib/utils';
import type { Member } from '@/lib/db/schema';

interface Props {
  members: Member[];
  paidBy: Record<string, number>;
  viewerId: string;
  viewerIsAdmin: boolean;
}

function nameLower(s: string | null | undefined) {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Build childrenOf map using:
 *  1. Explicit parentId (highest priority)
 *  2. fatherName case-insensitive match to another member's nameEn / nameUr
 *  3. Falls back to __root
 */
function buildChildrenOf(members: Member[]): Map<string, Member[]> {
  const byName = new Map<string, string>();
  for (const m of members) {
    if (m.nameEn) byName.set(nameLower(m.nameEn), m.id);
    if (m.nameUr) byName.set(nameLower(m.nameUr), m.id);
  }

  const map = new Map<string, Member[]>();
  for (const m of members) {
    let parentKey: string;
    if (m.parentId) {
      parentKey = m.parentId;
    } else if (m.fatherName) {
      const auto = byName.get(nameLower(m.fatherName));
      parentKey = auto && auto !== m.id ? auto : '__root';
    } else {
      parentKey = '__root';
    }
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey)!.push(m);
  }
  return map;
}

export default function TreeView({ members, paidBy, viewerId, viewerIsAdmin }: Props) {
  const [q, setQ] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(members.map((m) => m.id)));
  const [selected, setSelected] = useState<string | null>(null);

  const cities = useMemo(
    () => [...new Set(members.map((m) => m.city).filter(Boolean) as string[])].sort(),
    [members],
  );

  // Apply search + city filter while keeping the full member list for tree-building
  const visible = useMemo(() => {
    const term = q.toLowerCase();
    return new Set(
      members
        .filter((m) => {
          if (cityFilter && m.city !== cityFilter) return false;
          if (!term) return true;
          return `${m.nameEn} ${m.nameUr} ${m.fatherName} ${m.city ?? ''}`.toLowerCase().includes(term);
        })
        .map((m) => m.id),
    );
  }, [members, q, cityFilter]);

  const childrenOf = useMemo(() => buildChildrenOf(members), [members]);

  const roots = (childrenOf.get('__root') ?? [])
    .filter((m) => visible.has(m.id) || hasVisibleDescendant(m.id, childrenOf, visible));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedMember = selected ? members.find((m) => m.id === selected) : null;

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--txt-4)]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] py-2 pl-9 pr-3 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--color-gold)]"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--color-gold)]"
        >
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setExpanded(new Set(members.map((m) => m.id)))} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--surf-3)]">⊞ Expand all</button>
        <button onClick={() => setExpanded(new Set())} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--surf-3)]">⊟ Collapse all</button>
        {(q || cityFilter) && (
          <button onClick={() => { setQ(''); setCityFilter(''); }} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--color-gold-4)] hover:bg-[var(--surf-3)]">↺ Reset</button>
        )}
      </div>

      <div className="overflow-x-auto pb-6">
        <div className="inline-flex min-w-full flex-col items-center gap-0 pt-4">
          {roots.length === 0 ? (
            <p className="py-10 text-sm italic text-[var(--txt-3)]">No members match the filter</p>
          ) : (
            roots.map((r) => (
              <Branch
                key={r.id}
                m={r}
                childrenOf={childrenOf}
                visible={visible}
                expanded={expanded}
                onToggle={toggle}
                onSelect={setSelected}
                selectedId={selected}
                paidBy={paidBy}
                viewerIsAdmin={viewerIsAdmin}
                viewerId={viewerId}
                isRoot
              />
            ))
          )}
        </div>
      </div>

      {selectedMember && (
        <div className="mt-6 rounded-lg border border-[var(--border-2)] bg-[var(--surf-2)] p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full text-base font-bold text-white" style={{ background: selectedMember.color }}>
              {selectedMember.photoUrl ? <img src={selectedMember.photoUrl} alt="" className="size-full rounded-full object-cover" /> : ini(selectedMember.nameEn || selectedMember.nameUr)}
            </div>
            <div>
              <div className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">{selectedMember.nameUr || selectedMember.nameEn}</div>
              <div className="text-sm text-[var(--color-gold-4)]">{selectedMember.nameEn}</div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Father</dt><dd className="mt-0.5">{selectedMember.fatherName}</dd></div>
            <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Relation</dt><dd className="mt-0.5">{selectedMember.relation || '—'}</dd></div>
            <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">City</dt><dd className="mt-0.5">{selectedMember.city || '—'}</dd></div>
            <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Province</dt><dd className="mt-0.5">{selectedMember.province || '—'}</dd></div>
            <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Phone</dt><dd className="mt-0.5">{selectedMember.phone || '—'}</dd></div>
            {(viewerIsAdmin || selectedMember.id === viewerId) && (
              <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Total Paid</dt><dd className="mt-0.5 font-[var(--font-display)] text-[var(--color-gold)]">{fmtRs(paidBy[selectedMember.id] || 0)}</dd></div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

/** Returns true if this member or any descendant is in the visible set. */
function hasVisibleDescendant(id: string, childrenOf: Map<string, Member[]>, visible: Set<string>): boolean {
  if (visible.has(id)) return true;
  for (const child of childrenOf.get(id) ?? []) {
    if (hasVisibleDescendant(child.id, childrenOf, visible)) return true;
  }
  return false;
}

interface BranchProps {
  m: Member;
  childrenOf: Map<string, Member[]>;
  visible: Set<string>;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  paidBy: Record<string, number>;
  viewerIsAdmin: boolean;
  viewerId: string;
  isRoot?: boolean;
}

function Branch({ m, childrenOf, visible, expanded, onToggle, onSelect, selectedId, paidBy, viewerIsAdmin, viewerId, isRoot }: BranchProps) {
  const allKids = childrenOf.get(m.id) ?? [];
  const kids = allKids.filter((k) => hasVisibleDescendant(k.id, childrenOf, visible));
  const isExpanded = expanded.has(m.id);
  const isSelected = selectedId === m.id;
  const isHidden = !visible.has(m.id);

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div
        onClick={() => !isHidden && onSelect(m.id)}
        aria-selected={isSelected}
        className={cn(
          'relative flex w-40 cursor-pointer flex-col items-center rounded-lg border bg-gradient-to-br from-[var(--surf-1)] to-[var(--surf-2)] p-3 text-center transition-all hover:border-[var(--color-gold)]',
          isSelected && 'border-[var(--color-gold)] shadow-[0_0_0_3px_rgba(214,210,199,0.18)]',
          isRoot && !isSelected && 'border-[var(--color-gold-2)]/60',
          m.deceased && 'opacity-60',
          !isRoot && !isSelected && !m.deceased && 'border-[var(--border)]',
          isHidden && 'opacity-30 pointer-events-none',
        )}
      >
        {kids.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(m.id); }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-[var(--border)] bg-[var(--surf-3)] text-[10px] font-bold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10"
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        <div
          className="mb-2 grid size-10 place-items-center rounded-full text-xs font-bold text-white shadow-sm"
          style={{ background: m.color, filter: m.deceased ? 'grayscale(0.7)' : 'none' }}
        >
          {m.photoUrl ? <img src={m.photoUrl} alt="" className="size-full rounded-full object-cover" /> : ini(m.nameEn || m.nameUr)}
        </div>
        <div className="text-[13px] font-semibold leading-tight text-[var(--color-cream)]">{m.nameUr || m.nameEn}</div>
        {m.nameUr && m.nameEn && <div className="mt-0.5 text-[10px] text-[var(--txt-3)]">{m.nameEn}</div>}
        {m.city && <div className="mt-0.5 text-[9px] text-[var(--color-gold-4)]">📍 {m.city}</div>}
        {m.deceased && <div className="mt-0.5 text-[9px] text-[var(--color-gold-4)] italic">مرحوم</div>}
        {(viewerIsAdmin || m.id === viewerId) && paidBy[m.id] > 0 && (
          <div className="mt-1 font-[var(--font-display)] text-xs text-[var(--color-gold)]">{fmtRs(paidBy[m.id])}</div>
        )}
        {kids.length > 0 && (
          <div className="mt-0.5 text-[9px] text-[var(--color-emerald-2)]">{kids.length} child{kids.length > 1 ? 'ren' : ''}</div>
        )}
      </div>

      {/* Children subtree */}
      {kids.length > 0 && isExpanded && (
        <div className="flex flex-col items-center">
          {/* Trunk: vertical line from card to horizontal bar */}
          <div className="h-6 w-px bg-[var(--color-gold-4)]/50" />
          {/* Children row with connecting lines */}
          <div className="relative flex items-start">
            {/* Horizontal bar — rendered only when more than 1 child */}
            {kids.length > 1 && (
              <div
                className="absolute top-0 h-px bg-[var(--color-gold-4)]/40"
                style={{ left: `calc(50% / ${kids.length} + 20px)`, right: `calc(50% / ${kids.length} + 20px)` }}
              />
            )}
            {kids.map((k) => (
              <div key={k.id} className="flex flex-col items-center px-2">
                {/* Stub: vertical line from horizontal bar down to child */}
                <div className="h-6 w-px bg-[var(--color-gold-4)]/50" />
                <Branch
                  m={k}
                  childrenOf={childrenOf}
                  visible={visible}
                  expanded={expanded}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  selectedId={selectedId}
                  paidBy={paidBy}
                  viewerIsAdmin={viewerIsAdmin}
                  viewerId={viewerId}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
