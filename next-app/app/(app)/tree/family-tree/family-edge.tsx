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
      <BaseEdge id={`${id}-glow`} path={path} style={{ stroke: 'var(--color-gold)', strokeWidth: 5, strokeOpacity: 0.16, filter: 'blur(2px)' }} />
      <BaseEdge id={id} path={path} style={{ stroke: 'var(--color-gold-4)', strokeWidth: 1.75, strokeOpacity: 0.75 }} />
    </>
  );
}
