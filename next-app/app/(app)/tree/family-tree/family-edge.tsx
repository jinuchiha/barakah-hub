import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

/**
 * Parent → child connector: a soft blurred gold duplicate behind a crisp
 * foreground stroke gives the "glowing" look without an SVG filter (which
 * Safari + PDF-export render inconsistently for stroked paths).
 */
export default function FamilyEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
}: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature: 0.35 });

  return (
    <>
      <BaseEdge id={`${id}-glow`} path={path} style={{ stroke: 'var(--color-gold)', strokeWidth: 6, strokeOpacity: 0.15, filter: 'blur(3px)' }} />
      <BaseEdge id={id} path={path} style={{ stroke: 'var(--color-gold-2)', strokeWidth: 1.5, strokeOpacity: 0.55 }} />
    </>
  );
}
