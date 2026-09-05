import { cache } from 'react';
import { cookies } from 'next/headers';
import type { Locale } from './dict';

/**
 * Locale for Server Components. The topbar language picker writes the
 * `barakah_lang` cookie (localStorage alone is invisible to the server)
 * and refreshes the router, so every server-rendered string follows.
 * React.cache: several components on one page each ask for the locale.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return store.get('barakah_lang')?.value === 'ur' ? 'ur' : 'en';
});
