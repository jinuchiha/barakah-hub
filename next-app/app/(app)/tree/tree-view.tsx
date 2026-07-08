'use client';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import styles from './family-tree/tree.module.css';

interface Props {
  members: Member[];
  paidBy: Record<string, number>;
  viewerId: string;
  viewerIsAdmin: boolean;
}

const nodeTypes = { person: PersonNode };
const edgeTypes = { family: FamilyEdge };

function TreeCanvas({ members, paidBy, viewerId, viewerIsAdmin }: Props) {
  const [q, setQ] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  // Single source of truth: which nodes the user has collapsed. Default is
  // everything expanded (empty set) — including virtual-father placeholders.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const { setCenter } = useReactFlow();

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

  const { nodes, edges } = useMemo(() => {
    const raw = buildFlowGraph({
      roots, childrenOf, primaryToSpouse, expanded: effectiveExpanded, visible,
      selectedId: selected, matchedIds, paidBy, viewerIsAdmin, viewerId,
      onToggle: toggle, onSelect: setSelected,
    });
    return layoutTree(raw.nodes, raw.edges);
  }, [roots, childrenOf, primaryToSpouse, effectiveExpanded, visible, selected, matchedIds, paidBy, viewerIsAdmin, viewerId, toggle]);

  // Keep the first search match centered as ancestor-expansion reflows the tree.
  useEffect(() => {
    if (matchedIds.size === 0) return;
    const firstId = [...matchedIds][0];
    const node = nodes.find((n) => n.id === firstId || (n.data as PersonNodeData).spouse?.id === firstId);
    if (!node) return;
    const width = (node.data as PersonNodeData).spouse ? NODE_W_COUPLE : NODE_W_SINGLE;
    setCenter(node.position.x + width / 2, node.position.y + NODE_H / 2, { zoom: 1.15, duration: 650 });
  }, [nodes, matchedIds, setCenter]);

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
            <MiniMap
              pannable
              zoomable
              className={styles.minimap}
              bgColor="var(--surf-1)"
              maskColor="color-mix(in srgb, var(--surf-2) 75%, transparent)"
              nodeColor="var(--color-gold-4)"
              nodeStrokeColor="transparent"
            />
          </ReactFlow>
        )}
      </div>

      {selectedMember && (
        <DetailPanel member={selectedMember} spouse={selectedSpouse} paidBy={paidBy} viewerIsAdmin={viewerIsAdmin} viewerId={viewerId} />
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
  member, spouse, paidBy, viewerIsAdmin, viewerId,
}: {
  member: Member; spouse: Member | null | undefined; paidBy: Record<string, number>; viewerIsAdmin: boolean; viewerId: string;
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
