import { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Member, Payment, EmergencyCase } from '@/types';

export interface SearchResult {
  type: 'member' | 'payment' | 'case';
  id: string;
  title: string;
  subtitle: string;
}

interface SearchableData {
  members: Member[];
  payments: Payment[];
  cases: EmergencyCase[];
}

async function fetchSearchData(): Promise<SearchableData> {
  const [membersRes, paymentsRes, casesRes] = await Promise.all([
    api.get<Member[]>('/api/members'),
    api.get<Payment[]>('/api/payments/mine'),
    api.get<EmergencyCase[]>('/api/cases'),
  ]);
  return {
    members: membersRes.data,
    payments: paymentsRes.data,
    cases: casesRes.data,
  };
}

function buildResults(data: SearchableData, query: string): SearchResult[] {
  if (!query.trim()) return [];

  const memberFuse = new Fuse(data.members, {
    keys: ['nameEn', 'nameUr', 'clan', 'city'],
    threshold: 0.35,
  });
  const paymentFuse = new Fuse(data.payments, {
    keys: ['monthLabel', 'note'],
    threshold: 0.35,
  });
  const caseFuse = new Fuse(data.cases, {
    keys: ['beneficiaryName', 'reasonEn', 'reasonUr', 'category'],
    threshold: 0.35,
  });

  const members: SearchResult[] = memberFuse
    .search(query)
    .slice(0, 5)
    .map(({ item }) => ({
      type: 'member',
      id: item.id,
      title: item.nameEn || item.nameUr,
      subtitle: [item.clan, item.city].filter(Boolean).join(' · '),
    }));

  const payments: SearchResult[] = paymentFuse
    .search(query)
    .slice(0, 5)
    .map(({ item }) => ({
      type: 'payment',
      id: item.id,
      title: `PKR ${item.amount.toLocaleString()} — ${item.monthLabel}`,
      subtitle: item.note ?? '',
    }));

  const cases: SearchResult[] = caseFuse
    .search(query)
    .slice(0, 5)
    .map(({ item }) => ({
      type: 'case',
      id: item.id,
      title: item.beneficiaryName,
      subtitle: item.category,
    }));

  return [...members, ...payments, ...cases];
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const { data } = useQuery({
    queryKey: ['search-data'],
    queryFn: fetchSearchData,
    staleTime: 60_000,
  });

  const results = useMemo(
    () => (data ? buildResults(data, query) : []),
    [data, query],
  );

  const search = useCallback((q: string) => setQuery(q), []);
  const clear = useCallback(() => setQuery(''), []);

  return { query, results, search, clear };
}
