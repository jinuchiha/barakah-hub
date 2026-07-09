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
  /** Ids of the selected person's ancestors+descendants (couples included);
   *  null when no bloodline highlight is active. */
  bloodline: Set<string> | null;
  /** True during the initial page-open growth sequence — every node/edge
   *  animates in staggered by generation depth. */
  growAll: boolean;
  /** Members that appeared since the last data load — they bloom in
   *  immediately (no depth stagger) so a new addition grows from its branch. */
  newIds: Set<string> | null;
  paidBy: Record<string, number>;
  viewerIsAdmin: boolean;
  viewerId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

const GEN_STAGGER = 0.38;

function makeNodeData(m: Member, isRoot: boolean, childCount: number, depth: number, args: BuildGraphArgs): PersonNodeData {
  const spouse = args.primaryToSpouse.get(m.id) ?? null;
  // Virtual father placeholders aren't in the members list, so they can
  // never be in `visible` — dimming them would grey out every synthesized
  // ancestor for no reason.
  const isVirtual = m.id.startsWith('virtual:');
  const dimMain = !isVirtual && !args.visible.has(m.id) && !(spouse && args.visible.has(spouse.id));
  const dimSpouse = spouse ? !args.visible.has(spouse.id) && !args.visible.has(m.id) : false;
  const inBloodline = args.bloodline
    ? args.bloodline.has(m.id) || (spouse ? args.bloodline.has(spouse.id) : false)
    : false;
  const grow = args.growAll || Boolean(args.newIds?.has(m.id));
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
    inBloodline,
    fade: Boolean(args.bloodline) && !inBloodline,
    grow,
    growDelay: args.growAll ? `${Math.min(depth, 8) * GEN_STAGGER + 0.2}s` : '0.05s',
    paidBy: args.paidBy,
    viewerIsAdmin: args.viewerIsAdmin,
    viewerId: args.viewerId,
    onToggle: args.onToggle,
    onSelect: args.onSelect,
  };
}

function nodeInBloodline(m: Member, args: BuildGraphArgs): boolean {
  if (!args.bloodline) return false;
  if (args.bloodline.has(m.id)) return true;
  const spouse = args.primaryToSpouse.get(m.id);
  return spouse ? args.bloodline.has(spouse.id) : false;
}

/** DFS from each root, stopping at collapsed nodes — collapsed subtrees
 *  are not merely hidden, they're absent from the graph entirely so
 *  Dagre closes the gap instead of leaving dead space. */
export function buildFlowGraph(args: BuildGraphArgs): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seen = new Set<string>();

  function visit(m: Member, isRoot: boolean, depth: number) {
    if (seen.has(m.id)) return;
    seen.add(m.id);

    const allKids = args.childrenOf.get(m.id) ?? [];
    const kids = allKids.filter((k) => args.visible.has(k.id) || hasVisibleDescendant(k.id, args.childrenOf, args.visible));

    nodes.push({ id: m.id, type: 'person', position: { x: 0, y: 0 }, draggable: false, data: makeNodeData(m, isRoot, kids.length, depth, args) });

    if (kids.length === 0 || !args.expanded.has(m.id)) return;
    for (const k of kids) {
      const childDepth = depth + 1;
      const inBloodline = Boolean(args.bloodline) && nodeInBloodline(m, args) && nodeInBloodline(k, args);
      const grow = args.growAll || Boolean(args.newIds?.has(k.id));
      edges.push({
        id: `${m.id}->${k.id}`,
        source: m.id,
        target: k.id,
        type: 'family',
        data: {
          inBloodline,
          dim: Boolean(args.bloodline) && !inBloodline,
          grow,
          growDelay: args.growAll ? `${Math.min(childDepth - 1, 8) * GEN_STAGGER + 0.15}s` : '0s',
        },
      });
      visit(k, false, childDepth);
    }
  }

  args.roots.forEach((r) => visit(r, true, 0));
  return { nodes, edges };
}
