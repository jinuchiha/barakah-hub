/**
 * Installment-plan arithmetic for qarz-e-hasana. Pure functions — the
 * cron, the admin pages, and the tests all share this one definition of
 * "behind schedule".
 */
export interface LoanPlanInput {
  amount: number;
  paid: number;
  installmentAmount: number | null;
  issuedOn: string | Date;
}

export interface PlanStatus {
  hasPlan: boolean;
  monthsElapsed: number;
  /** What the plan says should be repaid by now (capped at the principal). */
  expectedPaid: number;
  /** Positive = behind by this many rupees. */
  shortfall: number;
  onTrack: boolean;
}

/** Whole months between issue date and `now` (day-of-month aware). */
export function monthsBetween(issued: Date, now: Date): number {
  let months = (now.getFullYear() - issued.getFullYear()) * 12 + (now.getMonth() - issued.getMonth());
  if (now.getDate() < issued.getDate()) months -= 1;
  return Math.max(0, months);
}

export function planStatus(loan: LoanPlanInput, now: Date): PlanStatus {
  const installment = loan.installmentAmount ?? 0;
  if (installment <= 0) {
    return { hasPlan: false, monthsElapsed: 0, expectedPaid: 0, shortfall: 0, onTrack: true };
  }
  const issued = new Date(loan.issuedOn);
  const monthsElapsed = monthsBetween(issued, now);
  const expectedPaid = Math.min(loan.amount, monthsElapsed * installment);
  const shortfall = Math.max(0, expectedPaid - loan.paid);
  return { hasPlan: true, monthsElapsed, expectedPaid, shortfall, onTrack: shortfall === 0 };
}

/** Months needed to settle the remaining principal at the agreed installment. */
export function monthsRemaining(loan: LoanPlanInput): number | null {
  const installment = loan.installmentAmount ?? 0;
  if (installment <= 0) return null;
  return Math.ceil(Math.max(0, loan.amount - loan.paid) / installment);
}
