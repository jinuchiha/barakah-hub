export interface TreeNode {
  id: string;
  parentId: string | null;
  label: string;
  sublabel?: string;
  color: string;
  photoUrl?: string | null;
  deceased?: boolean;
}

export interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  children: LayoutNode[];
}

const H_GAP = 120;
const V_GAP = 100;

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

function assignX(node: LayoutNode, counter: { value: number }): void {
  if (node.children.length === 0) {
    node.x = counter.value * H_GAP;
    counter.value += 1;
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
  const maxX = allFlat.reduce((m, n) => Math.max(m, n.x), 0);
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
      });
    }
  }
  return edges;
}
