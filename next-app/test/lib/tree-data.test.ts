import { describe, it, expect } from 'vitest';
import { resolveMarriages, buildTreeData } from '@/app/(app)/tree/family-tree/tree-data';
import type { Member } from '@/lib/db/schema';

let seq = 0;
function makeMember(overrides: Partial<Member>): Member {
  seq += 1;
  const now = new Date();
  return {
    id: `id-${seq}`,
    authId: null,
    username: `user${seq}`,
    nameUr: '',
    nameEn: `Member ${seq}`,
    fatherName: '—',
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
    color: '#000000',
    photoUrl: null,
    deceased: false,
    needsSetup: false,
    joinedAt: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Member;
}

describe('buildTreeData — a child belongs to the couple, not to one named parent', () => {
  it('keys a child under the couple primary even when fatherName matches the secondary spouse', () => {
    const tariq = makeMember({ id: 'tariq', nameEn: 'Tariq Khan', spouseId: 'sana' });
    const sana = makeMember({ id: 'sana', nameEn: 'Sana Tariq', spouseId: 'tariq' });
    // Child added "from the mother's side" — fatherName text-matches Sana, the secondary spouse.
    const child = makeMember({ id: 'muhammad', nameEn: 'Muhammad', fatherName: 'Sana Tariq' });
    const members = [tariq, sana, child];

    const { primaryToSpouse, claimedAsSpouse } = resolveMarriages(members);
    const { childrenOf } = buildTreeData(members, claimedAsSpouse, primaryToSpouse);

    const [primaryId] = [...primaryToSpouse.keys()];
    expect(childrenOf.get(primaryId)?.map((m) => m.id)).toEqual(['muhammad']);
    // The secondary spouse's own key must NOT silently hold the child —
    // that's exactly how it used to vanish from the rendered tree.
    const secondaryId = primaryToSpouse.get(primaryId)!.id;
    expect(childrenOf.get(secondaryId)).toBeUndefined();
  });

  it('keys a child under the couple primary when parentId explicitly points at the secondary spouse', () => {
    const tariq = makeMember({ id: 'tariq', nameEn: 'Tariq Khan', spouseId: 'sana' });
    const sana = makeMember({ id: 'sana', nameEn: 'Sana Tariq', spouseId: 'tariq' });
    const child = makeMember({ id: 'muhammad', nameEn: 'Muhammad', parentId: 'sana' });
    const members = [tariq, sana, child];

    const { primaryToSpouse, claimedAsSpouse } = resolveMarriages(members);
    const { childrenOf } = buildTreeData(members, claimedAsSpouse, primaryToSpouse);

    const [primaryId] = [...primaryToSpouse.keys()];
    expect(childrenOf.get(primaryId)?.map((m) => m.id)).toEqual(['muhammad']);
  });

  it('an unmarried member keeps children keyed under their own id (no couple to remap to)', () => {
    const solo = makeMember({ id: 'solo', nameEn: 'Solo Parent' });
    const child = makeMember({ id: 'kid', nameEn: 'Kid', parentId: 'solo' });
    const members = [solo, child];

    const { primaryToSpouse, claimedAsSpouse } = resolveMarriages(members);
    const { childrenOf } = buildTreeData(members, claimedAsSpouse, primaryToSpouse);

    expect(childrenOf.get('solo')?.map((m) => m.id)).toEqual(['kid']);
  });
});
