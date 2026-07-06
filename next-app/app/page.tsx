import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-server';
import LandingContent from './landing-content';

export const metadata = {
  title: 'Barakah Hub · Islamic Family Fund',
  description:
    'A private treasury for your extended family — pool monthly sadaqah, issue interest-free loans, approve emergencies by majority vote, on a tamper-evident ledger.',
};

export default async function RootPage() {
  const user = await getUser();
  if (user) redirect('/dashboard');
  return <LandingContent />;
}
