import { getBezierPath, type EdgeProps } from '@xyflow/react';
import styles from './tree.module.css';

interface FamilyEdgeData {
  inBloodline?: boolean;
  dim?: boolean;
  grow?: boolean;
  growDelay?: string;
}

/**
 * Parent → child connector. Two layers: a soft blurred gold duplicate
 * behind a crisp foreground stroke gives the "glowing branch" look without
 * an SVG filter (Safari renders stroked filters inconsistently).
 *
 * During growth (initial page-open sequence, or a newly added member) the
 * strokes draw themselves source→target via a pathLength dash animation,
 * led by a small glowing "sap" particle travelling along the same path.
 */
export default function FamilyEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data,
}: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature: 0.35 });
  const d = (data ?? {}) as FamilyEdgeData;

  const stroke = d.inBloodline ? 'var(--color-gold)' : 'var(--color-gold-2)';
  const mainOpacity = d.dim ? 0.15 : d.inBloodline ? 0.9 : 0.55;
  const glowOpacity = d.dim ? 0.05 : d.inBloodline ? 0.32 : 0.15;

  return (
    <g id={id} className={d.grow ? styles.edgeGrow : undefined} style={{ '--edge-delay': d.growDelay ?? '0s' } as React.CSSProperties}>
      <path
        d={path}
        pathLength={1}
        fill="none"
        className={styles.edgeStroke}
        style={{ stroke: 'var(--color-gold)', strokeWidth: 6, strokeOpacity: glowOpacity, filter: 'blur(3px)' }}
      />
      <path
        d={path}
        pathLength={1}
        fill="none"
        className={styles.edgeStroke}
        style={{ stroke, strokeWidth: d.inBloodline ? 2 : 1.5, strokeOpacity: mainOpacity, strokeLinecap: 'round' }}
      />
      {d.grow && (
        <circle r={2.5} className={styles.sap} style={{ offsetPath: `path('${path}')` } as React.CSSProperties} />
      )}
    </g>
  );
}
