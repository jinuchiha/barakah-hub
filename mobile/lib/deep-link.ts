import * as Linking from 'expo-linking';
import { router } from 'expo-router';

type DeepLinkRoute =
  | { type: 'case'; id: string }
  | { type: 'payment'; id: string }
  | { type: 'notifications' }
  | { type: 'unknown' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractId(raw: string | undefined): string | null {
  if (!raw) return null;
  return UUID_RE.test(raw) ? raw : null;
}

export function parseDeepLink(url: string): DeepLinkRoute {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path ?? '';

    if (path.startsWith('/case/') || parsed.hostname === 'case') {
      const id = extractId(path.replace('/case/', '') || (parsed.queryParams?.id as string));
      if (id) return { type: 'case', id };
    }

    if (path.startsWith('/payment/') || parsed.hostname === 'payment') {
      const id = extractId(path.replace('/payment/', '') || (parsed.queryParams?.id as string));
      if (id) return { type: 'payment', id };
    }

    if (path === '/notifications' || parsed.hostname === 'notifications') {
      return { type: 'notifications' };
    }
  } catch {
    // malformed URL
  }
  return { type: 'unknown' };
}

export function navigateDeepLink(url: string): void {
  const route = parseDeepLink(url);

  switch (route.type) {
    case 'case':
      router.push('/(tabs)/cases');
      break;
    case 'payment':
      router.push('/(tabs)/payments');
      break;
    case 'notifications':
      router.push('/notifications');
      break;
    default:
      break;
  }
}

export function setupDeepLinkListener(): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    navigateDeepLink(url);
  });
  return () => subscription.remove();
}

export async function handleInitialURL(): Promise<void> {
  const url = await Linking.getInitialURL();
  if (url) navigateDeepLink(url);
}
