import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/stat-card';

describe('StatCard', () => {
  it('renders label, value, and hint', () => {
    render(<StatCard label="Total Fund" value="Rs. 12,345" hint="👥 5 members" />);
    expect(screen.getByText('Total Fund')).toBeInTheDocument();
    expect(screen.getByText('Rs. 12,345')).toBeInTheDocument();
    expect(screen.getByText('👥 5 members')).toBeInTheDocument();
  });

  it('renders sublabel when provided', () => {
    render(<StatCard label="Members" sublabel="Active family" value={42} />);
    expect(screen.getByText('Active family')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders sparkline svg when values provided', () => {
    const { container } = render(
      <StatCard label="Trend" value="100" spark={[10, 20, 15, 30, 25]} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('omits sparkline when spark is empty', () => {
    const { container } = render(<StatCard label="No trend" value="0" spark={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
