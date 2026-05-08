import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalBar } from '@/components/goal-bar';

const baseConfig = {
  goalAmount: 100_000,
  goalLabelEn: 'Eid Goal',
  goalLabelUr: 'عید کا ہدف',
  goalDeadline: null,
};

describe('GoalBar', () => {
  it('renders the English label and percentage', () => {
    render(<GoalBar config={baseConfig} totalFund={50_000} />);
    expect(screen.getByText('Eid Goal')).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('returns null when goalAmount is 0', () => {
    const { container } = render(
      <GoalBar config={{ ...baseConfig, goalAmount: 0 }} totalFund={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "Goal achieved" cheer at 100%', () => {
    render(<GoalBar config={baseConfig} totalFund={120_000} />);
    expect(screen.getByText(/Alhamdulillah/)).toBeInTheDocument();
  });

  it('shows days-remaining when provided', () => {
    render(<GoalBar config={baseConfig} totalFund={50_000} daysRemaining={14} />);
    expect(screen.getByText(/14 days left/)).toBeInTheDocument();
  });

  it('shows deadline-passed when daysRemaining is 0 or negative', () => {
    render(<GoalBar config={baseConfig} totalFund={50_000} daysRemaining={-3} />);
    expect(screen.getByText(/deadline passed/)).toBeInTheDocument();
  });

  it('switches labels for Urdu locale', () => {
    render(<GoalBar config={baseConfig} totalFund={50_000} locale="ur" />);
    expect(screen.getByText('عید کا ہدف')).toBeInTheDocument();
  });
});
