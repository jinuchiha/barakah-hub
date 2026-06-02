import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'achievements' });
const UNLOCKED_KEY = 'unlocked_achievements';

export interface Achievement {
  id: string;
  titleKey: string;
  description: string;
  icon: string;
  color: string;
  points: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_donation',
    titleKey: 'achievements.firstDonation',
    description: 'Submitted your first verified payment',
    icon: 'star-shooting',
    color: '#ffd740',
    points: 50,
  },
  {
    id: 'consistent_giver',
    titleKey: 'achievements.consistentGiver',
    description: 'Paid on time for 12 consecutive months',
    icon: 'calendar-check',
    color: '#00e676',
    points: 200,
  },
  {
    id: 'voter',
    titleKey: 'achievements.voter',
    description: 'Voted on 10 emergency cases',
    icon: 'vote',
    color: '#448aff',
    points: 100,
  },
  {
    id: 'helper',
    titleKey: 'achievements.helper',
    description: 'A case you voted Yes on was approved',
    icon: 'hand-heart',
    color: '#ea80fc',
    points: 75,
  },
  {
    id: 'family_builder',
    titleKey: 'achievements.familyBuilder',
    description: 'Added 5 or more family members',
    icon: 'family-tree',
    color: '#ff6d00',
    points: 80,
  },
  {
    id: 'loan_repayer',
    titleKey: 'achievements.loanRepayer',
    description: 'Fully repaid a Qarz-e-Hasana loan',
    icon: 'handshake',
    color: '#00bcd4',
    points: 150,
  },
  {
    id: 'generous_heart',
    titleKey: 'achievements.generousHeart',
    description: 'Donated double your pledge in a single month',
    icon: 'heart-multiple',
    color: '#ff5252',
    points: 120,
  },
];

export function getUnlockedIds(): string[] {
  try {
    const raw = storage.getString(UNLOCKED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function unlockAchievement(id: string): boolean {
  const current = getUnlockedIds();
  if (current.includes(id)) return false;
  storage.set(UNLOCKED_KEY, JSON.stringify([...current, id]));
  return true;
}

export function isUnlocked(id: string): boolean {
  return getUnlockedIds().includes(id);
}

export function getTotalPoints(): number {
  const unlocked = getUnlockedIds();
  return ACHIEVEMENTS.filter((a) => unlocked.includes(a.id))
    .reduce((sum, a) => sum + a.points, 0);
}
