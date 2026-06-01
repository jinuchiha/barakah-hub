import type { Member } from '@/types';
import type { TreeNode } from './tree-layout';

const VIRTUAL_COLOR = '#64748b';

/** Normalize a name for matching: trim, lowercase, collapse whitespace. */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Build family-tree nodes from member records.
 *
 * Parenting priority (matches the web tree):
 *  1. explicit `parentId`
 *  2. `fatherName` that matches another member's nameEn/nameUr
 *  3. a SYNTHETIC "virtual father" node keyed by the father name — so
 *     siblings sharing a father who isn't (yet) a member still group into
 *     one tree instead of scattering as separate roots. As members are
 *     added with the same father name, they auto-attach to this node.
 *
 * Couples (bidirectional spouseId) render as one primary node with a
 * `spouse` attachment; the secondary partner is folded in.
 */
export function buildFamilyTreeNodes(members: Member[]): TreeNode[] {
  if (members.length === 0) return [];
  const byId = new Map(members.map((m) => [m.id, m]));

  const byName = new Map<string, string>();
  for (const m of members) {
    if (m.nameEn) byName.set(norm(m.nameEn), m.id);
    if (m.nameUr) byName.set(norm(m.nameUr), m.id);
  }

  // Spouse pairing — deterministic primary by smaller UUID.
  const claimedAsSpouse = new Set<string>();
  const primaryToSpouseId = new Map<string, string>();
  for (const m of members) {
    if (!m.spouseId || claimedAsSpouse.has(m.id) || primaryToSpouseId.has(m.id)) continue;
    const partner = byId.get(m.spouseId);
    if (!partner || partner.spouseId !== m.id) continue;
    const primary = m.id < partner.id ? m : partner;
    const secondary = primary === m ? partner : m;
    primaryToSpouseId.set(primary.id, secondary.id);
    claimedAsSpouse.add(secondary.id);
  }
  const secondaryToPrimary = new Map<string, string>();
  for (const [primary, secondary] of primaryToSpouseId) secondaryToPrimary.set(secondary, primary);

  // Resolve each member's effective parent, minting virtual fathers as needed.
  const virtualFathers = new Map<string, string>(); // normName -> virtualId
  const virtualLabels = new Map<string, string>();   // virtualId -> display name

  function resolveParentId(m: Member): string | null {
    if (m.parentId && byId.has(m.parentId)) return m.parentId;
    const fn = m.fatherName?.trim();
    if (!fn || fn === '—') return null;
    const real = byName.get(norm(fn));
    if (real && real !== m.id) return real;
    const key = norm(fn);
    if (!virtualFathers.has(key)) {
      const vid = `virtual:${key}`;
      virtualFathers.set(key, vid);
      virtualLabels.set(vid, fn);
    }
    return virtualFathers.get(key)!;
  }

  const nodes: TreeNode[] = [];

  // Real member nodes (primaries only; secondaries fold into spouse).
  for (const m of members) {
    if (claimedAsSpouse.has(m.id)) continue;
    let parentId = resolveParentId(m);
    // If the resolved parent is a folded-in spouse, attach under their primary.
    if (parentId && secondaryToPrimary.has(parentId)) parentId = secondaryToPrimary.get(parentId)!;

    const partnerId = primaryToSpouseId.get(m.id);
    const partner = partnerId ? byId.get(partnerId) : undefined;
    nodes.push({
      id: m.id,
      parentId,
      label: m.nameEn,
      sublabel: m.nameUr,
      color: m.color,
      photoUrl: m.photoUrl,
      deceased: m.deceased,
      spouse: partner
        ? {
            id: partner.id,
            parentId: null,
            label: partner.nameEn,
            sublabel: partner.nameUr,
            color: partner.color,
            photoUrl: partner.photoUrl,
            deceased: partner.deceased,
          }
        : null,
    });
  }

  // Virtual father roots (after members so ids are stable).
  for (const [vid, label] of virtualLabels) {
    nodes.push({
      id: vid,
      parentId: null,
      label,
      sublabel: 'Walid',
      color: VIRTUAL_COLOR,
      deceased: true,
      isVirtual: true,
      spouse: null,
    });
  }

  return nodes;
}
