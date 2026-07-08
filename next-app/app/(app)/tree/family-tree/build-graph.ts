import type { Node, Edge } from '@xyflow/react';
import type { Member } from '@/lib/db/schema';
import { hasVisibleDescendant } from './tree-data';
import type { PersonNodeData } from './person-node';

interface BuildGraphArgs {
  roots: Member[];
  childrenOf: Map<string, Member[]>;
  primaryToSpouse: Map<string, Member>;
  expanded: Set<string>;
  visible: Set<string>;
  selectedId: string | null;
  matchedIds: Set<string>;
  paidBy: Record<string, number>;
  viewerIsAdmin: boolean;
  viewerId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function makeNodeData(m: Member, isRoot: boolean, childCount: number, args: BuildGraphArgs): PersonNodeData {
  const spouse = args.primaryToSpouse.get(m.id) ?? null;
  // Virtual father placeholders aren't in the members list, so they can
  // never be in `visible` — dimming them would grey out every synthesized
  // ancestor for no reason.
  const isVirtual = m.id.startsWith('virtual:');
  const dimMain = !isVirtual && !args.visible.has(m.id) && !(spouse && args.visible.has(spouse.id));
  const dimSpouse = spouse ? !args.visible.has(spouse.id) && !args.visible.has(m.id) : false;
  return {
    member: m,
    spouse,
    hasSpouse: Boolean(spouse),
    hasKids: childCount > 0,
    childCount,
    isExpanded: args.expanded.has(m.id),
    dimMain,
    dimSpouse,
    selectedId: args.selectedId,
    matchedIds: args.matchedIds,
    isRoot,
    paidBy: args.paidBy,
    viewerIsAdmin: args.viewerIsAdmin,
    viewerId: args.viewerId,
    onToggle: args.onToggle,
    onSelect: args.onSelect,
  };
}

/** DFS from each root, stopping at collapsed nodes — collapsed subtrees
 *  are not merely hidden, they're absent from the graph entirely so
 *  Dagre closes the gap instead of leaving dead space. */
export function buildFlowGraph(args: BuildGraphArgs): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seen = new Set<string>();

  function visit(m: Member, isRoot: boolean) {
    if (seen.has(m.id)) return;
    seen.add(m.id);

    const allKids = args.childrenOf.get(m.id) ?? [];
    const kids = allKids.filter((k) => args.visible.has(k.id) || hasVisibleDescendant(k.id, args.childrenOf, args.visible));
    const hasKids = kids.length > 0;

    nodes.push({ id: m.id, type: 'person', position: { x: 0, y: 0 }, draggable: false, data: makeNodeData(m, isRoot, kids.length, args) });

    if (!hasKids || !args.expanded.has(m.id)) return;
    for (const k of kids) {
      edges.push({ id: `${m.id}->${k.id}`, source: m.id, target: k.id, type: 'family' });
      visit(k, false);
    }
  }

  args.roots.forEach((r) => visit(r, true));
  return { nodes, edges };
}
