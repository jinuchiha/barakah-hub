import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import { NODE_W_SINGLE, NODE_W_COUPLE, NODE_H, RANK_SEP, NODE_SEP } from './constants';

/**
 * Runs Dagre purely for X/Y — node/edge identity and data are untouched.
 * Couple nodes get the wider width so Dagre spaces siblings correctly;
 * a lone person keeps the narrow width.
 */
export function layoutTree(rawNodes: Node[], rawEdges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 24, marginy: 24 });

  for (const n of rawNodes) {
    const width = n.data?.hasSpouse ? NODE_W_COUPLE : NODE_W_SINGLE;
    g.setNode(n.id, { width, height: NODE_H });
  }
  for (const e of rawEdges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  const nodes = rawNodes.map((n) => {
    const width = n.data?.hasSpouse ? NODE_W_COUPLE : NODE_W_SINGLE;
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - width / 2, y: pos.y - NODE_H / 2 } };
  });

  return { nodes, edges: rawEdges };
}
