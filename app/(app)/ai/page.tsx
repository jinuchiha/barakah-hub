import { getMeOrRedirect } from '@/lib/auth-server';
import { AIChatClient } from './chat';

export const metadata = { title: 'AI Assistant · Barakah Hub' };

export default async function AIPage() {
  const me = await getMeOrRedirect();
  return <AIChatClient userName={me.nameEn || me.nameUr} />;
}
