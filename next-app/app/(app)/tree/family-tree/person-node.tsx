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
  isExpanded: boolean;
  dimMain: boolean;
  dimSpouse: boolean;
  selectedId: string | null;
  matchedIds: Set<string>;
  isRoot: boolean;
  paidBy: Record<string, number>;
  viewerIsAdmin: boolean;
  viewerId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

export type PersonFlowNode = Node<PersonNodeData, 'person'>;

function Avatar({ m }: { m: Member }) {
  return (
    <div
      className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold text-white shadow-sm"
      style={{ background: m.color, filter: m.deceased ? 'grayscale(0.7)' : 'none' }}
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
  m, isRoot, isSelected, isMatched, dim, onSelect, paidBy, viewerIsAdmin, viewerId,
}: {
  m: Member; isRoot?: boolean; isSelected: boolean; isMatched: boolean; dim: boolean;
  onSelect: () => void; paidBy: Record<string, number>; viewerIsAdmin: boolean; viewerId: string;
}) {
  return (
    <div
      onClick={onSelect}
      role="treeitem"
      aria-selected={isSelected}
      className={cn(
        styles.card,
        'relative flex w-40 cursor-pointer flex-col items-center rounded-lg border bg-gradient-to-br from-[var(--surf-1)] to-[var(--surf-2)] p-3 text-center',
        isSelected && styles.cardSelected,
        isMatched && !isSelected && styles.cardMatched,
        isRoot && !isSelected && !isMatched && 'border-[var(--color-gold-2)]/60',
        m.deceased && 'opacity-60',
        !isRoot && !isSelected && !isMatched && !m.deceased && 'border-[var(--border)]',
        dim && 'opacity-40',
      )}
    >
      <PhotoLightbox src={m.photoUrl} alt={m.nameEn || m.nameUr}>
        <Avatar m={m} />
      </PhotoLightbox>
      <div className={cn('mt-1 w-full text-[13px] font-semibold text-[var(--color-cream)]', m.nameUr ? 'font-[var(--font-arabic)] leading-[1.9]' : 'leading-tight')}>
        {m.nameUr || m.nameEn}
      </div>
      {m.nameUr && m.nameEn && <div className="mt-0.5 text-[10px] text-[var(--txt-3)]">{m.nameEn}</div>}
      {m.city && <div className="mt-0.5 text-[9px] text-[var(--color-gold-4)]">{m.city}</div>}
      {m.deceased && <div className="mt-0.5 text-[9px] italic text-[var(--color-gold-4)]">مرحوم</div>}
      {(viewerIsAdmin || m.id === viewerId) && paidBy[m.id] > 0 && (
        <div className="mt-1 font-[var(--font-display)] text-xs text-[var(--color-gold)]">{fmtRs(paidBy[m.id])}</div>
      )}
    </div>
  );
}

export default function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const {
    member, spouse, hasKids, isExpanded, dimMain, dimSpouse, selectedId, matchedIds,
    isRoot, paidBy, viewerIsAdmin, viewerId, onToggle, onSelect,
  } = data;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: spouse ? NODE_W_COUPLE : NODE_W_SINGLE }}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} />
      {hasKids && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(member.id); }}
          aria-label={isExpanded ? `Collapse ${member.nameEn}` : `Expand ${member.nameEn}`}
          className="absolute -top-2 right-1/2 z-10 grid size-6 translate-x-1/2 place-items-center rounded-full border border-[var(--border-2)] bg-[var(--surf-3)] text-xs font-bold text-[var(--color-gold)] shadow-sm hover:bg-[var(--color-gold)]/10"
        >
          {isExpanded ? '−' : '+'}
        </button>
      )}
      <Card
        m={member}
        isRoot={isRoot}
        isSelected={selectedId === member.id}
        isMatched={matchedIds.has(member.id)}
        dim={dimMain}
        onSelect={() => onSelect(member.id)}
        paidBy={paidBy}
        viewerIsAdmin={viewerIsAdmin}
        viewerId={viewerId}
      />
      {spouse && (
        <>
          <div className="mx-2 flex flex-col items-center" aria-hidden="true">
            <div className="text-[18px] leading-none text-[var(--tree-blue)]">∞</div>
            <div className="mt-1 h-px w-6 bg-[var(--tree-blue)]/60" />
            <div className="mt-1 text-[8px] uppercase tracking-[1.5px] text-[var(--tree-blue)]/80">married</div>
          </div>
          <Card
            m={spouse}
            isSelected={selectedId === spouse.id}
            isMatched={matchedIds.has(spouse.id)}
            dim={dimSpouse}
            onSelect={() => onSelect(spouse.id)}
            paidBy={paidBy}
            viewerIsAdmin={viewerIsAdmin}
            viewerId={viewerId}
          />
        </>
      )}
      {hasKids && isExpanded && <Handle type="source" position={Position.Bottom} className={styles.handle} />}
    </div>
  );
}
