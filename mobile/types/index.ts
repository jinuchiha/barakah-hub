/* Domain types mirrored from the backend schema */

export type Role = 'admin' | 'supervisor' | 'member';
export type MemberStatus = 'pending' | 'approved' | 'rejected';
export type FundPool = 'sadaqah' | 'zakat' | 'qarz';
export type CaseStatus = 'voting' | 'approved' | 'rejected' | 'disbursed';
export type CaseType = 'gift' | 'qarz';

export interface Member {
  id: string;
  authId: string | null;
  username: string;
  nameUr: string;
  nameEn: string;
  fatherName: string;
  fatherDeceased: boolean;
  clan: string | null;
  relation: string | null;
  parentId: string | null;
  spouseId: string | null;
  role: Role;
  status: MemberStatus;
  phone: string | null;
  city: string | null;
  province: string | null;
  monthlyPledge: number;
  color: string;
  photoUrl: string | null;
  deceased: boolean;
  needsSetup: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  pool: FundPool;
  monthLabel: string;
  monthStart: string | null;
  paidOn: string | null;
  note: string | null;
  receiptUrl: string | null;
  pendingVerify: boolean;
  verifiedById: string | null;
  verifiedAt: string | null;
  supervisorApprovedAt: string | null;
  supervisorApprovedById: string | null;
  supervisorRejectedAt: string | null;
  supervisorRejectedById: string | null;
  supervisorRejectionNote: string | null;
  createdAt: string;
  member?: Pick<Member, 'id' | 'nameEn' | 'nameUr' | 'color'>;
}

/** Two-step approval queue state, mirrored from the web fund page. */
export type PaymentQueueState = 'awaiting-supervisor' | 'awaiting-admin' | 'rejected';

export function paymentQueueState(p: Payment): PaymentQueueState | null {
  if (!p.pendingVerify) return null;
  if (p.supervisorRejectedAt) return 'rejected';
  if (p.supervisorApprovedAt) return 'awaiting-admin';
  return 'awaiting-supervisor';
}

export interface EmergencyCase {
  id: string;
  applicantId: string;
  caseType: CaseType;
  pool: FundPool;
  category: string;
  beneficiaryName: string;
  relation: string | null;
  city: string | null;
  amount: number;
  reasonUr: string;
  reasonEn: string;
  emergency: boolean;
  doc: string | null;
  returnDate: string | null;
  status: CaseStatus;
  createdAt: string;
  resolvedAt: string | null;
  yesVotes?: number;
  noVotes?: number;
  totalEligible?: number;
  myVote?: boolean | null;
  applicant?: Pick<Member, 'id' | 'nameEn' | 'nameUr' | 'color'>;
}

export interface Vote {
  caseId: string;
  memberId: string;
  vote: boolean;
  votedAt: string;
}

export interface Loan {
  id: string;
  memberId: string;
  amount: number;
  paid: number;
  purpose: string;
  installmentAmount?: number | null;
  pool: FundPool;
  city: string | null;
  issuedOn: string;
  expectedReturn: string | null;
  active: boolean;
  caseId: string | null;
  member?: Pick<Member, 'id' | 'nameEn' | 'nameUr' | 'color'>;
}

export interface Repayment {
  id: string;
  loanId: string;
  amount: number;
  paidOn: string;
  note: string | null;
}

export interface Notification {
  id: string;
  recipientId: string;
  titleUr: string | null;
  titleEn: string | null;
  ur: string;
  en: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface FundSummary {
  sadaqah: number;
  zakat: number;
  qarz: number;
  pendingCount: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export interface Session {
  user: AuthUser;
  session: {
    id: string;
    token: string;
    expiresAt: string;
  };
}

export interface MemberWithSession extends Member {
  email?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
