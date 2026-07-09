'use client';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { Search } from 'lucide-react';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';
import type { Member } from '@/lib/db/schema';
import { PhotoLightbox } from '@/components/photo-lightbox';
import { resolveMarriages, buildTreeData } from './family-tree/tree-data';
import { buildFlowGraph } from './family-tree/build-graph';
import { layoutTree } from './family-tree/dagre-layout';
import { NODE_W_SINGLE, NODE_W_COUPLE, NODE_H } from './family-tree/constants';
import PersonNode, { type PersonNodeData } from './family-tree/person-node';
import FamilyEdge from './family-tree/family-edge';
import MemberDialog from '../admin/members/member-dialog';
import styles from './family-tree/tree.module.css';

interface Props {
  members: Member[];
  paidBy: Record<string, number>;
  viewerId: string;
  viewerIsAdmin: boolean;
}

const nodeTypes = { person: PersonNode };
const edgeTypes = { family: FamilyEdge };

// Ambient gold dust drifting up the canvas — fixed positions (not random)
// so server and client render identically.
const DUST = [
  { left: '6%', top: '78%', delay: '0s', dur: '11s' },
  { left: '14%', top: '32%', delay: '2.4s', dur: '14s' },
  { left: '23%', top: '64%', delay: '5s', dur: '10s' },
  { left: '34%', top: '22%', delay: '1.2s', dur: '13s' },
  { left: '45%', top: '85%', delay: '3.6s', dur: '12s' },
  { left: '55%', top: '40%', delay: '6.5s', dur: '15s' },
  { left: '64%', top: '70%', delay: '0.8s', dur: '11s' },
  { left: '73%', top: '28%', delay: '4.2s', dur: '13s' },
  { left: '82%', top: '58%', delay: '7s', dur: '10s' },
  { left: '91%', top: '80%', delay: '2s', dur: '14s' },
  { left: '38%', top: '55%', delay: '8s', dur: '12s' },
  { left: '68%', top: '90%', delay: '5.8s', dur: '15s' },
];

function TreeCanvas({ members, paidBy, viewerId, viewerIsAdmin }: Props) {
  const [q, setQ] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  // Single source of truth: which nodes the user has collapsed. Default is
  // everything expanded (empty set) — including virtual-father placeholders.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const { setCenter, getZoom } = useReactFlow();

  // Living-tree growth: play the generation-staggered entrance once per
  // page open, then hand animation duties to the reflow transitions.
  const [reduced] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const [entered, setEntered] = useState(reduced);

  const cities = useMemo(
    () => [...new Set(members.map((m) => m.city).filter(Boolean) as string[])].sort(),
    [members],
  );

  const { primaryToSpouse, claimedAsSpouse } = useMemo(() => resolveMarriages(members), [members]);
  const { entities, childrenOf, parentOf } = useMemo(
    () => buildTreeData(members, claimedAsSpouse, primaryToSpouse),
    [members, claimedAsSpouse, primaryToSpouse],
  );
  const roots = useMemo(() => childrenOf.get('__root') ?? [], [childrenOf]);

  const visible = useMemo(() => {
    if (!cityFilter) return new Set(members.map((m) => m.id));
    return new Set(members.filter((m) => m.city === cityFilter).map((m) => m.id));
  }, [members, cityFilter]);

  const matchedIds = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return new Set<string>();
    return new Set(
      members
        .filter((m) => `${m.nameEn} ${m.nameUr} ${m.fatherName} ${m.city ?? ''}`.toLowerCase().includes(term))
        .map((m) => m.id),
    );
  }, [members, q]);

  // Ancestors of search matches render expanded even if the user collapsed
  // them — a collapsed ancestor removes its whole subtree from the graph,
  // which would bury the match entirely. The user's collapsed set is left
  // untouched; this only overrides the view while the search is active.
  const autoExpanded = useMemo(() => {
    const set = new Set<string>();
    for (const id of matchedIds) {
      let cur = parentOf.get(id);
      while (cur && cur !== '__root') { set.add(cur); cur = parentOf.get(cur); }
    }
    return set;
  }, [matchedIds, parentOf]);

  const effectiveExpanded = useMemo(() => {
    const next = new Set<string>();
    for (const e of entities) {
      if (!collapsed.has(e.id) || autoExpanded.has(e.id)) next.add(e.id);
    }
    return next;
  }, [entities, collapsed, autoExpanded]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Bloodline of the selected person: their ancestor chain up to the root
  // plus every descendant, with each couple's partner included. Everything
  // outside it fades so the selected line glows through the whole tree.
  const secondaryToPrimary = useMemo(() => {
    const map = new Map<string, string>();
    for (const [primaryId, spouse] of primaryToSpouse) map.set(spouse.id, primaryId);
    return map;
  }, [primaryToSpouse]);

  const bloodline = useMemo(() => {
    if (!selected) return null;
    const prim = (id: string) => secondaryToPrimary.get(id) ?? id;
    const set = new Set<string>();
    const addCouple = (id: string) => {
      set.add(id);
      const sp = primaryToSpouse.get(id);
      if (sp) set.add(sp.id);
    };
    let cur: string | undefined = prim(selected);
    while (cur && cur !== '__root') {
      addCouple(cur);
      cur = parentOf.get(cur);
    }
    const queue = [prim(selected)];
    while (queue.length) {
      const id = queue.shift()!;
      for (const child of childrenOf.get(id) ?? []) {
        const cid = prim(child.id);
        if (set.has(cid)) continue;
        addCouple(cid);
        queue.push(cid);
      }
    }
    return set;
  }, [selected, secondaryToPrimary, primaryToSpouse, parentOf, childrenOf]);

  // Members that appeared since the previous data load bloom in from their
  // branch instead of the whole tree replaying its entrance. Uses the
  // setState-during-render "derived from previous props" pattern — the
  // extra render happens before commit, so the bloom class is present in
  // the first painted frame.
  const curIds = useMemo(() => new Set(entities.map((e) => e.id)), [entities]);
  const [tracked, setTracked] = useState<{ ids: Set<string>; fresh: Set<string> | null }>({ ids: curIds, fresh: null });
  if (tracked.ids !== curIds) {
    const fresh = new Set<string>();
    for (const id of curIds) if (!tracked.ids.has(id)) fresh.add(id);
    setTracked({ ids: curIds, fresh: fresh.size > 0 && !reduced ? fresh : null });
  }
  const newIds = tracked.ids === curIds ? tracked.fresh : null;

  const growAll = !entered && !reduced;

  const { nodes, edges } = useMemo(() => {
    const raw = buildFlowGraph({
      roots, childrenOf, primaryToSpouse, expanded: effectiveExpanded, visible,
      selectedId: selected, matchedIds, bloodline, growAll, newIds,
      paidBy, viewerIsAdmin, viewerId,
      onToggle: toggle, onSelect: setSelected,
    });
    return layoutTree(raw.nodes, raw.edges);
  }, [roots, childrenOf, primaryToSpouse, effectiveExpanded, visible, selected, matchedIds, bloodline, growAll, newIds, paidBy, viewerIsAdmin, viewerId, toggle]);

  // End the entrance once the deepest generation has bloomed. Depth delays
  // cap at 8 generations, so a fixed ceiling covers any family size.
  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setEntered(true), 8 * 380 + 1400);
    return () => clearTimeout(t);
  }, [reduced]);

  // Keep the first search match centered as ancestor-expansion reflows the tree.
  useEffect(() => {
    if (matchedIds.size === 0) return;
    const firstId = [...matchedIds][0];
    const node = nodes.find((n) => n.id === firstId || (n.data as PersonNodeData).spouse?.id === firstId);
    if (!node) return;
    const width = (node.data as PersonNodeData).spouse ? NODE_W_COUPLE : NODE_W_SINGLE;
    setCenter(node.position.x + width / 2, node.position.y + NODE_H / 2, { zoom: 1.15, duration: 650 });
  }, [nodes, matchedIds, setCenter]);

  // Focus the selected branch: glide the camera to the clicked couple
  // without changing the user's zoom level. Latest nodes are mirrored into
  // a ref (inside an effect, per react-hooks/refs) so selecting doesn't
  // re-center on every unrelated relayout.
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => {
    if (!selected) return;
    const node = nodesRef.current.find((n) => n.id === selected || (n.data as PersonNodeData).spouse?.id === selected);
    if (!node) return;
    const width = (node.data as PersonNodeData).spouse ? NODE_W_COUPLE : NODE_W_SINGLE;
    setCenter(node.position.x + width / 2, node.position.y + NODE_H / 2, { zoom: getZoom(), duration: 550 });
  }, [selected, setCenter, getZoom]);

  const selectedMember = selected ? entities.find((m) => m.id === selected) : null;
  const selectedSpouse = selectedMember?.spouseId ? entities.find((m) => m.id === selectedMember.spouseId) : null;

  return (
    <div>
      <Toolbar
        q={q} setQ={setQ} cityFilter={cityFilter} setCityFilter={setCityFilter} cities={cities}
        onExpandAll={() => setCollapsed(new Set())}
        onCollapseAll={() => setCollapsed(new Set(entities.map((m) => m.id)))}
      />

      <div className={styles.wrapper} style={{ height: 'min(74vh, 720px)' }}>
        {!reduced && DUST.map((p, i) => (
          <span
            key={i}
            className={styles.dust}
            style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.dur }}
          />
        ))}
        {nodes.length === 0 ? (
          <p className="grid h-full place-items-center text-sm italic text-[var(--txt-3)]">No members match the filter</p>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.15}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(200,155,60,0.10)" />
            <Controls showInteractive={false} className={styles.controls} />
            {/* The minimap only earns its corner once the tree outgrows one
                screen — on a small family it's just a stray box. */}
            {nodes.length > 12 && (
              <MiniMap
                pannable
                zoomable
                className={styles.minimap}
                bgColor="var(--surf-1)"
                maskColor="color-mix(in srgb, var(--surf-2) 75%, transparent)"
                nodeColor="var(--color-gold-4)"
                nodeStrokeColor="transparent"
              />
            )}
          </ReactFlow>
        )}
      </div>

      {selectedMember && (
        <DetailPanel
          member={selectedMember}
          spouse={selectedSpouse}
          paidBy={paidBy}
          viewerIsAdmin={viewerIsAdmin}
          viewerId={viewerId}
          onEdit={viewerIsAdmin && !selectedMember.id.startsWith('virtual:') ? () => setEditTarget(selectedMember) : undefined}
        />
      )}

      {editTarget && (
        <MemberDialog
          key={`tree-edit-${editTarget.id}`}
          mode={{ kind: 'edit', member: editTarget }}
          allMembers={members}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function Toolbar({
  q, setQ, cityFilter, setCityFilter, cities, onExpandAll, onCollapseAll,
}: {
  q: string; setQ: (v: string) => void; cityFilter: string; setCityFilter: (v: string) => void;
  cities: string[]; onExpandAll: () => void; onCollapseAll: () => void;
}) {
  return (
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
      <button onClick={onExpandAll} aria-label="Expand all members" className="rounded-md border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--surf-3)]">⊞ Expand all</button>
      <button onClick={onCollapseAll} aria-label="Collapse all members" className="rounded-md border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--surf-3)]">⊟ Collapse all</button>
      {(q || cityFilter) && (
        <button onClick={() => { setQ(''); setCityFilter(''); }} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--color-gold-4)] hover:bg-[var(--surf-3)]">↺ Reset</button>
      )}
    </div>
  );
}

function DetailPanel({
  member, spouse, paidBy, viewerIsAdmin, viewerId, onEdit,
}: {
  member: Member; spouse: Member | null | undefined; paidBy: Record<string, number>; viewerIsAdmin: boolean; viewerId: string;
  onEdit?: () => void;
}) {
  return (
    <div className="mt-6 rounded-lg border border-[var(--border-2)] bg-[var(--surf-2)] p-4">
      <div className="mb-3 flex items-center gap-3">
        <PhotoLightbox src={member.photoUrl} alt={member.nameEn || member.nameUr}>
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full text-base font-bold text-white" style={{ background: member.color }}>
            {member.photoUrl ? <img src={member.photoUrl} alt="" className="size-full rounded-full object-cover" /> : ini(member.nameEn || member.nameUr)}
          </div>
        </PhotoLightbox>
        <div className="flex-1">
          <div className="font-[var(--font-arabic)] text-xl leading-[1.9] text-[var(--color-gold-2)]">{member.nameUr || member.nameEn}</div>
          <div className="text-sm text-[var(--color-gold-4)]">{member.nameEn}</div>
        </div>
        {spouse && (
          <div className="text-right text-[11px] text-[var(--txt-3)]">
            <div>Spouse:</div>
            <div className="font-semibold text-[var(--color-cream)]">{spouse.nameEn || spouse.nameUr}</div>
          </div>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-[var(--border-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-gold-2)] transition-colors hover:bg-[var(--color-gold)]/10"
          >
            Edit member
          </button>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {member.fatherName && member.fatherName !== '—' && (
          <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Father</dt><dd className="mt-0.5">{member.fatherName}</dd></div>
        )}
        {member.relation && (
          <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Relation</dt><dd className="mt-0.5">{member.relation}</dd></div>
        )}
        {member.city && <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">City</dt><dd className="mt-0.5">{member.city}</dd></div>}
        {member.province && <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Province</dt><dd className="mt-0.5">{member.province}</dd></div>}
        {member.phone && <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Phone</dt><dd className="mt-0.5">{member.phone}</dd></div>}
        {(viewerIsAdmin || member.id === viewerId) && (
          <div><dt className="text-[10px] uppercase text-[var(--color-gold-4)]">Total Paid</dt><dd className="mt-0.5 font-[var(--font-display)] text-[var(--color-gold)]">{fmtRs(paidBy[member.id] || 0)}</dd></div>
        )}
      </dl>
    </div>
  );
}

export default function TreeView(props: Props) {
  return (
    <ReactFlowProvider>
      <TreeCanvas {...props} />
    </ReactFlowProvider>
  );
}
