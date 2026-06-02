import React from 'react';
import { Svg, Path, Line } from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';
import type { Edge } from '@/lib/tree-layout';

interface TreeConnectorProps {
  edges: Edge[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

function parentEdgePath(e: Edge, oX: number, oY: number): string {
  const fx = e.fromX + oX;
  const fy = e.fromY + oY;
  const tx = e.toX + oX;
  const ty = e.toY + oY;
  const midY = (fy + ty) / 2;
  return `M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}

/**
 * Renders the lines between tree nodes.
 *  - Parent edges: dashed Bezier curves from parent → child.
 *  - Spouse edges: solid gold horizontal line between the couple,
 *    distinguishes marriage from descent.
 */
export function TreeConnector({ edges, width, height, offsetX, offsetY }: TreeConnectorProps) {
  const { colors } = useTheme();

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      {edges.map((e) => {
        if (e.kind === 'spouse') {
          return (
            <Line
              key={`spouse-${e.fromId}-${e.toId}`}
              x1={e.fromX + offsetX}
              y1={e.fromY + offsetY}
              x2={e.toX + offsetX}
              y2={e.toY + offsetY}
              stroke={colors.primary}
              strokeWidth={2}
            />
          );
        }
        return (
          <Path
            key={`parent-${e.fromId}-${e.toId}`}
            d={parentEdgePath(e, offsetX, offsetY)}
            stroke={colors.border2}
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="4 3"
          />
        );
      })}
    </Svg>
  );
}
