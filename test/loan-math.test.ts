import { describe, it, expect } from 'vitest';
import { monthsBetween, monthsRemaining, planStatus } from '@/lib/loan-math';

const NOW = new Date('2026-07-06');

describe('monthsBetween', () => {
  it('counts whole months only', () => {
    expect(monthsBetween(new Date('2026-01-06'), NOW)).toBe(6);
    expect(monthsBetween(new Date('2026-01-07'), NOW)).toBe(5);
  });
  it('never goes negative', () => {
    expect(monthsBetween(new Date('2026-12-01'), NOW)).toBe(0);
  });
  it('crosses year boundaries', () => {
    expect(monthsBetween(new Date('2025-05-06'), NOW)).toBe(14);
  });
});

describe('planStatus', () => {
  const base = { amount: 10_000, paid: 0, installmentAmount: 1000, issuedOn: '2026-01-06' };

  it('no plan when installment is null or zero', () => {
    expect(planStatus({ ...base, installmentAmount: null }, NOW).hasPlan).toBe(false);
    expect(planStatus({ ...base, installmentAmount: 0 }, NOW).hasPlan).toBe(false);
  });

  it('flags a borrower who paid nothing after 6 months', () => {
    const s = planStatus(base, NOW);
    expect(s.expectedPaid).toBe(6000);
    expect(s.shortfall).toBe(6000);
    expect(s.onTrack).toBe(false);
  });

  it('on track when payments match the plan', () => {
    const s = planStatus({ ...base, paid: 6000 }, NOW);
    expect(s.shortfall).toBe(0);
    expect(s.onTrack).toBe(true);
  });

  it('ahead of plan is still on track', () => {
    expect(planStatus({ ...base, paid: 9000 }, NOW).onTrack).toBe(true);
  });

  it('expected repayment never exceeds the principal', () => {
    const s = planStatus({ ...base, issuedOn: '2020-01-06' }, NOW);
    expect(s.expectedPaid).toBe(10_000);
  });

  it('a loan issued today expects nothing yet', () => {
    const s = planStatus({ ...base, issuedOn: NOW }, NOW);
    expect(s.expectedPaid).toBe(0);
    expect(s.onTrack).toBe(true);
  });
});

describe('monthsRemaining', () => {
  it('rounds up partial months', () => {
    expect(monthsRemaining({ amount: 10_000, paid: 500, installmentAmount: 1000, issuedOn: '2026-01-01' })).toBe(10);
  });
  it('settled loan needs zero months', () => {
    expect(monthsRemaining({ amount: 10_000, paid: 10_000, installmentAmount: 1000, issuedOn: '2026-01-01' })).toBe(0);
  });
  it('null without a plan', () => {
    expect(monthsRemaining({ amount: 10_000, paid: 0, installmentAmount: null, issuedOn: '2026-01-01' })).toBeNull();
  });
});
