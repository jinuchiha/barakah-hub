import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { fmtRs } from '@/lib/i18n/dict';
import { ini, cn } from '@/lib/utils';
import type { Member } from '@/lib/db/schema';
import { PhotoLightbox } from '@/components/photo-lightbox';
import { NODE_W_SINGLE, NODE_W_COUPLE } from './constants';
import styles from './tree.module.css';

export interface PersonNodeData extends Record<string, unknown> {
  member: Member;
  spouse: Member | null;
  hasSpouse: boolean;
  hasKids: boolean;
  childCount: number;
  isExpanded: boolean;
  dimMain: boolean;
  dimSpouse: boolean;
  selectedId: string | null;
  matchedIds: Set<string>;
  isRoot: boolean;
  inBloodline: boolean;
  /** Bloodline highlight is active and this node is NOT part of it. */
  fade: boolean;
  /** Play the bloom entrance animation (initial growth or a new member). */
  grow: boolean;
  growDelay: string;
  paidBy: Record<string, number>;
  viewerIsAdmin: boolean;
  viewerId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

export type PersonFlowNode = Node<PersonNodeData, 'person'>;

// React Flow's stylesheet gives handles a visible dot and custom nodes a
// default background — inline styles are the only override that can't lose
// a specificity fight with it.
const hiddenHandle: React.CSSProperties = {
  opacity: 0,
  pointerEvents: 'none',
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 'none',
  background: 'transparent',
};

function Avatar({ m }: { m: Member }) {
  return (
    <div
      className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold text-white"
      style={{
        background: m.color,
        filter: m.deceased ? 'grayscale(0.8) brightness(0.9)' : undefined,
        boxShadow: '0 0 0 2px var(--surf-2), 0 0 0 3px color-mix(in srgb, var(--color-gold-4) 55%, transparent)',
      }}
    >
      {m.photoUrl ? (
        <img src={m.photoUrl} alt="" className="size-full rounded-full object-cover" />
      ) : (
        ini(m.nameEn || m.nameUr)
      )}
    </div>
  );
}

function Card({
  m, isRoot, isSelected, isMatched, inBloodline, dim, onSelect, paidBy, viewerIsAdmin, viewerId,
}: {
  m: Member; isRoot?: boolean; isSelected: boolean; isMatched: boolean; inBloodline: boolean; dim: boolean;
  onSelect: () => void; paidBy: Record<string, number>; viewerIsAdmin: boolean; viewerId: string;
}) {
  const borderColor = isSelected
    ? 'var(--color-gold)'
    : isMatched
      ? 'var(--tree-blue)'
      : inBloodline
        ? 'color-mix(in srgb, var(--color-gold) 55%, transparent)'
        : isRoot
          ? 'color-mix(in srgb, var(--color-gold-2) 55%, transparent)'
          : 'var(--border)';
  const boxShadow = isSelected
    ? '0 0 0 3px rgba(200,155,60,0.20), 0 0 26px rgba(200,155,60,0.18), 0 10px 26px rgba(0,0,0,0.4)'
    : isMatched
      ? '0 0 0 3px color-mix(in srgb, var(--tree-blue) 28%, transparent), 0 0 22px color-mix(in srgb, var(--tree-blue) 30%, transparent)'
      : inBloodline
        ? '0 0 18px rgba(200,155,60,0.14), 0 10px 26px rgba(0,0,0,0.35)'
        : '0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 26px rgba(0,0,0,0.35)';

  return (
    <div
      onClick={onSelect}
      role="treeitem"
      aria-selected={isSelected}
      className={cn(
        styles.card,
        'relative flex w-40 cursor-pointer flex-col items-center rounded-[14px] border p-3 text-center',
        dim && 'opacity-40',
        m.deceased && !dim && 'opacity-75',
      )}
      style={{
        background: 'linear-gradient(160deg, color-mix(in srgb, var(--surf-1) 86%, transparent) 0%, color-mix(in srgb, var(--surf-1) 60%, transparent) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderColor,
        boxShadow,
      }}
    >
      <span aria-hidden="true" className={styles.leaves} />
      {isRoot && (
        <span
          aria-hidden="true"
          className="absolute inset-x-6 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold-2), transparent)' }}
        />
      )}
      <PhotoLightbox src={m.photoUrl} alt={m.nameEn || m.nameUr}>
        <Avatar m={m} />
      </PhotoLightbox>
      {/* Nastaliq ascenders overflow tight line boxes — Urdu names need
          their script's tall line-height or they clip. */}
      <div className={cn('mt-1.5 w-full text-[13px] font-semibold text-[var(--color-cream)]', m.nameUr ? 'font-[var(--font-arabic)] leading-[1.9]' : 'leading-tight')}>
        {m.nameUr || m.nameEn}
      </div>
      {m.nameUr && m.nameEn && (
        <div className="mt-0.5 w-full truncate text-[9px] uppercase tracking-[1.5px] text-[var(--txt-3)]">{m.nameEn}</div>
      )}
      {m.city && <div className="mt-1 text-[9px] tracking-wide text-[var(--color-gold-4)]">{m.city}</div>}
      {m.deceased && (
        <div
          className="mt-1 rounded-full border px-2 py-px font-[var(--font-arabic)] text-[9px] leading-[1.7] text-[var(--color-gold-4)]"
          style={{ borderColor: 'color-mix(in srgb, var(--color-gold-4) 45%, transparent)' }}
        >
          مرحوم
        </div>
      )}
      {(viewerIsAdmin || m.id === viewerId) && paidBy[m.id] > 0 && (
        <div className="mt-1 font-[var(--font-display)] text-xs text-[var(--color-gold)]">{fmtRs(paidBy[m.id])}</div>
      )}
    </div>
  );
}

export default function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const {
    member, spouse, hasKids, childCount, isExpanded, dimMain, dimSpouse, selectedId, matchedIds,
    isRoot, inBloodline, fade, grow, growDelay, paidBy, viewerIsAdmin, viewerId, onToggle, onSelect,
  } = data;

  return (
    <div
      className={cn('relative flex items-start justify-center pb-3', grow && styles.bloom)}
      style={{
        width: spouse ? NODE_W_COUPLE : NODE_W_SINGLE,
        opacity: fade ? 0.3 : undefined,
        transition: 'opacity 0.3s ease',
        ...(grow ? ({ '--gen-delay': growDelay } as React.CSSProperties) : null),
      }}
    >
      <Handle type="target" position={Position.Top} style={hiddenHandle} />
      <Card
        m={member}
        isRoot={isRoot}
        isSelected={selectedId === member.id}
        isMatched={matchedIds.has(member.id)}
        inBloodline={inBloodline}
        dim={dimMain}
        onSelect={() => onSelect(member.id)}
        paidBy={paidBy}
        viewerIsAdmin={viewerIsAdmin}
        viewerId={viewerId}
      />
      {spouse && (
        <div className="mx-1 mt-11 flex w-9 flex-col items-center" aria-hidden="true">
          <div className="relative h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold-4), transparent)' }}>
            <span
              className="absolute left-1/2 top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rotate-45 border"
              style={{ borderColor: 'var(--color-gold-2)', background: 'var(--surf-2)' }}
            />
          </div>
          <div className="mt-2 text-[7px] uppercase tracking-[2px] text-[var(--color-gold-4)]">nikah</div>
        </div>
      )}
      {spouse && (
        <Card
          m={spouse}
          isSelected={selectedId === spouse.id}
          isMatched={matchedIds.has(spouse.id)}
          inBloodline={inBloodline}
          dim={dimSpouse}
          onSelect={() => onSelect(spouse.id)}
          paidBy={paidBy}
          viewerIsAdmin={viewerIsAdmin}
          viewerId={viewerId}
        />
      )}
      {hasKids && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(member.id); }}
          aria-label={isExpanded ? `Collapse ${member.nameEn || member.nameUr}` : `Expand ${member.nameEn || member.nameUr}`}
          aria-expanded={isExpanded}
          className="nodrag nopan absolute -bottom-0.5 left-1/2 z-10 grid h-6 min-w-6 -translate-x-1/2 cursor-pointer place-items-center rounded-full border px-1.5 font-[var(--font-display)] text-[11px] font-bold leading-none"
          style={{
            background: 'var(--surf-1)',
            borderColor: 'color-mix(in srgb, var(--color-gold-2) 60%, transparent)',
            color: 'var(--color-gold-2)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
          }}
        >
          {isExpanded ? '−' : `+${childCount}`}
        </button>
      )}
      {hasKids && isExpanded && <Handle type="source" position={Position.Bottom} style={hiddenHandle} />}
    </div>
  );
}
