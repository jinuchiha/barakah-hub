import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';
import type { Edge } from '@/lib/tree-layout';

interface TreeConnectorProps {
  edges: Edge[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

function edgePath(e: Edge, oX: number, oY: number): string {
  const fx = e.fromX + oX;
  const fy = e.fromY + oY;
  const tx = e.toX + oX;
  const ty = e.toY + oY;
  const midY = (fy + ty) / 2;
  return `M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}

export function TreeConnector({ edges, width, height, offsetX, offsetY }: TreeConnectorProps) {
  const { colors } = useTheme();

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      {edges.map((e) => (
        <Path
          key={`${e.fromId}-${e.toId}`}
          d={edgePath(e, offsetX, offsetY)}
          stroke={colors.border2}
          strokeWidth={1.5}
          fill="none"
          strokeDasharray="4 3"
        />
      ))}
    </Svg>
  );
}
