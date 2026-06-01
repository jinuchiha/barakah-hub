import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared QueryClient so non-React code (auth/logout) can clear the
 * in-memory cache, not just the persisted one. Imported by the root layout
 * for the provider and by the logout path to wipe cached financial/PII data.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});
