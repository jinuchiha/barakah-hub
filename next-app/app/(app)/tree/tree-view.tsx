'use client';
import { useMemo, useState } from 'react';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';
import type { Member } from '@/lib/db/schema';

interface Props {
  members: Member[];
  paidBy: Record<string, number>;
  viewerId: string;
  viewerIsAdmin: boolean;
}

/** Cluster members by father name (case-insensitive, normalized). */
function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, '').trim();
}

export default function TreeView({ members, paidBy, viewerId, viewerIsAdmin }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(members.filter((m) => !m.parentId).map((m) => m.id)));
  const [selected, setSelected] = useState<string | null>(null);

  const childrenOf = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of members) {
      const k = m.parentId || '__root';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return map;
  }, [members]);

  const siblingsByFather = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of members) {
      if (!m.fatherName) continue;
      const k = normalize(m.fatherName);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return map;
  }, [members]);

  const roots = childrenOf.get('__root') || [];

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
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setExpanded(new Set(members.map((m) => m.id)))} className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--surf-3)]">⊞ Expand all</button>
        <button onClick={() => setExpanded(new Set())} className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--surf-3)]">⊟ Collapse all</button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex flex-col items-center gap-3 min-w-fit">
          {roots.map((r) => (
            <Branch
              key={r.id}
              m={r}
              childrenOf={childrenOf}
              siblingsByFather={siblingsByFather}
              expanded={expanded}
              onToggle={toggle}
              onSelect={setSelected}
              selectedId={selected}
              paidBy={paidBy}
              viewerIsAdmin={viewerIsAdmin}
              viewerId={viewerId}
            />
          ))}
        </div>
      </div>

      {selectedMember && (
        <div className="mt-6 rounded-md border border-[var(--border-2)] bg-[var(--surf-2)] p-4">
          <h3 className="mb-2 font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">{selectedMember.nameUr || selectedMember.nameEn}</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs uppercase text-[var(--color-gold-4)]">Father</dt><dd>{selectedMember.fatherName}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--color-gold-4)]">Relation</dt><dd>{selectedMember.relation || '—'}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--color-gold-4)]">City</dt><dd>{selectedMember.city || '—'}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--color-gold-4)]">Province</dt><dd>{selectedMember.province || '—'}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--color-gold-4)]">Phone</dt><dd>{selectedMember.phone || '—'}</dd></div>
            {(viewerIsAdmin || selectedMember.id === viewerId) && (
              <div><dt className="text-xs uppercase text-[var(--color-gold-4)]">Total Paid</dt><dd className="font-[var(--font-display)] text-[var(--color-gold)]">{fmtRs(paidBy[selectedMember.id] || 0)}</dd></div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

interface BranchProps {
  m: Member;
  childrenOf: Map<string, Member[]>;
  siblingsByFather: Map<string, Member[]>;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  paidBy: Record<string, number>;
  viewerIsAdmin: boolean;
  viewerId: string;
}

function Branch({ m, childrenOf, siblingsByFather, expanded, onToggle, onSelect, selectedId, paidBy, viewerIsAdmin, viewerId }: BranchProps) {
  const kids = childrenOf.get(m.id) || [];
  const isExpanded = expanded.has(m.id);
  const isSelected = selectedId === m.id;
  const isHead = !m.parentId;
  const sibKey = m.fatherName ? normalize(m.fatherName) : '';
  const siblings = sibKey ? (siblingsByFather.get(sibKey) || []).filter((s) => s.id !== m.id) : [];

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => onSelect(m.id)}
        aria-current={isSelected ? 'true' : undefined}
        className={`relative flex w-44 flex-col items-center rounded-md border bg-gradient-to-br from-[var(--surf-1)] to-[var(--surf-2)] p-3 text-center transition-all hover:border-[var(--color-gold)] ${
          isSelected ? 'border-[var(--color-gold)] shadow-[0_0_0_3px_rgba(214,210,199,0.18)]'
          : isHead ? 'border-[var(--color-gold-2)]/60'
          : m.deceased ? 'border-[var(--border)] opacity-75'
          : 'border-[var(--border)]'
        }`}
      >
        {kids.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(m.id); }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full border border-[var(--border)] bg-[var(--surf-3)] text-xs font-bold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10"
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        <div className="mb-2 grid size-10 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m.color, filter: m.deceased ? 'grayscale(0.6)' : 'none' }}>
          {m.photoUrl ? <img src={m.photoUrl} alt="" className="size-full rounded-full object-cover" /> : ini(m.nameEn || m.nameUr)}
        </div>
        <div className="text-sm font-semibold text-[var(--color-cream)]">{m.nameEn || m.nameUr}</div>
        {m.fatherName && <div className="mt-0.5 text-[10px] italic text-[var(--color-gold)]">s/o {m.fatherName}</div>}
        <div className="mt-0.5 text-[10px] text-[var(--txt-3)]">{m.relation || ''}</div>
        {siblings.length > 0 && <div className="mt-0.5 text-[9px] italic text-[var(--color-emerald-2)]">👥 {siblings.length} siblings</div>}
        {m.city && <div className="mt-0.5 text-[9px] text-[var(--txt-3)]">📍 {m.city}</div>}
        {m.deceased && <div className="mt-1 text-[10px] text-[var(--color-gold-4)]">مرحوم</div>}
        {(viewerIsAdmin || m.id === viewerId) && (
          <div className="mt-1.5 font-[var(--font-display)] text-xs text-[var(--color-gold)]">{fmtRs(paidBy[m.id] || 0)}</div>
        )}
      </button>

      {kids.length > 0 && isExpanded && (
        <>
          <div className="my-1 h-4 w-px bg-[var(--color-gold-4)]/40" />
          <div className="flex gap-3 relative">
            <div className="absolute -top-1 left-[10%] right-[10%] h-px bg-[var(--color-gold-4)]/30" />
            {kids.map((k) => (
              <Branch
                key={k.id}
                m={k}
                childrenOf={childrenOf}
                siblingsByFather={siblingsByFather}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedId={selectedId}
                paidBy={paidBy}
                viewerIsAdmin={viewerIsAdmin}
                viewerId={viewerId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
