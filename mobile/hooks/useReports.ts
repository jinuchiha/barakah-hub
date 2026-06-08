import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AnnualReport {
  year: number;
  collected: { sadaqah: number; zakat: number; qarz: number; total: number; count: number };
  cases: { total: number; approved: number; disbursed: number; disbursedAmount: number };
  loans: { issuedCount: number; issuedAmount: number; repaidAmount: number };
  members: { total: number; newThisYear: number };
}

export interface AuditEntry {
  id: string;
  action: string;
  detail: string | null;
  actor: string;
  target: string | null;
  createdAt: string;
}

async function fetchAnnual(year: number): Promise<AnnualReport> {
  const { data } = await api.get<AnnualReport>('/api/reports/annual', { params: { year } });
  return data;
}

async function fetchAudit(): Promise<AuditEntry[]> {
  const { data } = await api.get<AuditEntry[]>('/api/audit');
  return data;
}

/** Fetch a CSV export as text. kind ∈ members|fund|loans|audit */
export async function fetchExportCsv(kind: 'members' | 'fund' | 'loans' | 'audit', year?: number): Promise<string> {
  const { data } = await api.get<string>(`/api/exports/${kind}`, {
    responseType: 'text',
    params: year ? { year } : undefined,
  });
  return data;
}

export function useAnnualReport(year: number) {
  return useQuery({ queryKey: ['report', 'annual', year], queryFn: () => fetchAnnual(year), staleTime: 60_000 });
}

export function useAuditLog() {
  return useQuery({ queryKey: ['audit'], queryFn: fetchAudit, staleTime: 30_000 });
}
