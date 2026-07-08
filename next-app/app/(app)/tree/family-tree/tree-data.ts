import type { Member } from '@/lib/db/schema';

function nameLower(s: string | null | undefined) {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Resolve spouse pairs and pick a "primary" side for tree rendering.
 *
 * Each marriage (A ↔ B) renders as ONE couple node under the primary
 * partner's father. We pick the primary by UUID order — purely a
 * deterministic choice, no gender semantics. The secondary partner still
 * keeps their own ancestry data; they just don't appear twice in the
 * visual tree (which would split a couple's children visually).
 */
export function resolveMarriages(members: Member[]) {
  const byId = new Map(members.map((m) => [m.id, m]));
  const primaryToSpouse = new Map<string, Member>();
  const claimedAsSpouse = new Set<string>();

  for (const m of members) {
    if (!m.spouseId || claimedAsSpouse.has(m.id) || primaryToSpouse.has(m.id)) continue;
    const partner = byId.get(m.spouseId);
    if (!partner || partner.spouseId !== m.id) continue;
    const primary = m.id < partner.id ? m : partner;
    const secondary = primary === m ? partner : m;
    primaryToSpouse.set(primary.id, secondary);
    claimedAsSpouse.add(secondary.id);
  }
  return { primaryToSpouse, claimedAsSpouse };
}

/** Synthesize a placeholder "father" node so siblings whose father isn't
 *  (yet) a member still group under one root instead of scattering. */
function makeVirtualFather(id: string, name: string, deceased: boolean): Member {
  const now = new Date();
  return {
    id,
    authId: null,
    username: id,
    nameUr: '',
    nameEn: name,
    fatherName: '',
    fatherDeceased: false,
    clan: null,
    relation: null,
    parentId: null,
    spouseId: null,
    role: 'member',
    status: 'approved',
    phone: null,
    city: null,
    province: null,
    monthlyPledge: 0,
    color: '#64748b',
    photoUrl: null,
    deceased,
    needsSetup: false,
    joinedAt: '',
    createdAt: now,
    updatedAt: now,
  } as Member;
}

/**
 * Build the renderable entity list + childrenOf map using:
 *  1. Explicit parentId (highest priority)
 *  2. fatherName case-insensitive match to another member's nameEn / nameUr
 *  3. A synthetic "virtual father" node keyed by the father name, so
 *     siblings sharing a non-member father group under one root
 *  4. Falls back to __root
 *
 * Members claimed as the secondary side of a marriage are skipped — they
 * render beside their primary spouse instead. Crucially, a child linked to
 * EITHER spouse (via parentId, or fatherName matching either name) is keyed
 * under the couple's primary id — a child belongs to the couple, not to
 * whichever one parent happened to be named. Without this remap, a child
 * added "from the mother's side" would be keyed under the secondary spouse's
 * id, which never renders its own branch, and the child would vanish.
 */
export function buildTreeData(
  members: Member[],
  claimedAsSpouse: Set<string>,
  primaryToSpouse: Map<string, Member>,
): { entities: Member[]; childrenOf: Map<string, Member[]>; parentOf: Map<string, string> } {
  const secondaryToPrimary = new Map<string, string>();
  for (const [primaryId, spouse] of primaryToSpouse) secondaryToPrimary.set(spouse.id, primaryId);
  const asPrimary = (id: string) => secondaryToPrimary.get(id) ?? id;

  const byName = new Map<string, string>();
  for (const m of members) {
    if (m.nameEn) byName.set(nameLower(m.nameEn), m.id);
    if (m.nameUr) byName.set(nameLower(m.nameUr), m.id);
  }

  const map = new Map<string, Member[]>();
  const parentOf = new Map<string, string>();
  const virtualFathers = new Map<string, Member>();
  const push = (key: string, m: Member) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
    if (key !== '__root') parentOf.set(m.id, key);
  };

  for (const m of members) {
    if (claimedAsSpouse.has(m.id)) continue;
    if (m.parentId) {
      push(asPrimary(m.parentId), m);
    } else if (m.fatherName && m.fatherName !== '—') {
      const auto = byName.get(nameLower(m.fatherName));
      if (auto && auto !== m.id) {
        push(asPrimary(auto), m);
      } else {
        const vid = `virtual:${nameLower(m.fatherName)}`;
        const existing = virtualFathers.get(vid);
        if (!existing) {
          virtualFathers.set(vid, makeVirtualFather(vid, m.fatherName, Boolean(m.fatherDeceased)));
        } else if (m.fatherDeceased) {
          existing.deceased = true; // a child confirmed the father has passed away
        }
        push(vid, m);
      }
    } else {
      push('__root', m);
    }
  }

  // Virtual fathers are themselves roots.
  for (const vf of virtualFathers.values()) push('__root', vf);

  return { entities: [...members, ...virtualFathers.values()], childrenOf: map, parentOf };
}

export function hasVisibleDescendant(
  id: string,
  childrenOf: Map<string, Member[]>,
  visible: Set<string>,
  visited = new Set<string>(),
): boolean {
  if (visited.has(id)) return false; // cycle guard
  visited.add(id);
  if (visible.has(id)) return true;
  for (const child of childrenOf.get(id) ?? []) {
    if (visible.has(child.id) || hasVisibleDescendant(child.id, childrenOf, visible, visited)) return true;
  }
  return false;
}
