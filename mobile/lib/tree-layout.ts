export interface TreeNode {
  id: string;
  parentId: string | null;
  label: string;
  sublabel?: string;
  color: string;
  photoUrl?: string | null;
  deceased?: boolean;
  /** When set, this node is rendered side-by-side with its spouse. */
  spouse?: TreeNode | null;
}

export interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  children: LayoutNode[];
}

const H_GAP = 140;       // Wider so paired couples don't collide horizontally
const V_GAP = 110;
const SPOUSE_OFFSET = 90; // px offset from primary to spouse card

function buildTree(nodes: TreeNode[], parentId: string | null): LayoutNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .map((n) => ({
      ...n,
      x: 0,
      y: 0,
      children: buildTree(nodes, n.id),
    }));
}

/**
 * Couples take two slots horizontally so neighbouring nodes don't overlap
 * the spouse card. assignX gives a 2-slot width to married nodes.
 */
function assignX(node: LayoutNode, counter: { value: number }): void {
  if (node.children.length === 0) {
    node.x = counter.value * H_GAP;
    counter.value += node.spouse ? 2 : 1;
    return;
  }
  for (const child of node.children) assignX(child, counter);
  const firstX = node.children[0]?.x ?? 0;
  const lastX = node.children[node.children.length - 1]?.x ?? 0;
  node.x = (firstX + lastX) / 2;
}

function assignY(node: LayoutNode, depth: number): void {
  node.y = depth * V_GAP;
  for (const child of node.children) assignY(child, depth + 1);
}

export function layoutTree(nodes: TreeNode[]): { roots: LayoutNode[]; width: number; height: number } {
  const roots = buildTree(nodes, null);
  const counter = { value: 0 };
  for (const root of roots) assignX(root, counter);
  for (const root of roots) assignY(root, 0);

  const allFlat = flattenTree(roots);
  // Spouse cards add SPOUSE_OFFSET to the right of the primary, so make
  // sure the canvas accounts for that when computing width.
  const maxX = allFlat.reduce((m, n) => Math.max(m, n.x + (n.spouse ? SPOUSE_OFFSET : 0)), 0);
  const maxY = allFlat.reduce((m, n) => Math.max(m, n.y), 0);

  return { roots, width: maxX + H_GAP, height: maxY + V_GAP };
}

export function flattenTree(nodes: LayoutNode[]): LayoutNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

export interface Edge {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** A "marriage" edge connects a primary node to its spouse instead of
   *  a parent-child link. Renderer can draw this differently (no arrow,
   *  short straight line). */
  kind?: 'parent' | 'spouse';
}

export function buildEdges(nodes: LayoutNode[]): Edge[] {
  const flat = flattenTree(nodes);
  const edges: Edge[] = [];
  for (const node of flat) {
    for (const child of node.children) {
      edges.push({
        fromId: node.id,
        toId: child.id,
        fromX: node.x,
        fromY: node.y + 28,
        toX: child.x,
        toY: child.y - 28,
        kind: 'parent',
      });
    }
    if (node.spouse) {
      edges.push({
        fromId: node.id,
        toId: node.spouse.id,
        fromX: node.x + 28,
        fromY: node.y,
        toX: node.x + SPOUSE_OFFSET - 28,
        toY: node.y,
        kind: 'spouse',
      });
    }
  }
  return edges;
}

export const SPOUSE_OFFSET_X = SPOUSE_OFFSET;
