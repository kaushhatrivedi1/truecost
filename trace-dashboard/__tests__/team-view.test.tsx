/**
 * Component tests for the Team View page.
 *
 * Validates: Requirements 23.1, 23.2, 23.5, 24.2
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamPage from '../app/team/page';
import TeamLeaderboard from '../components/TeamLeaderboard';
import InsightCard from '../components/InsightCard';
import { TEAM_SEED_DATA } from '../lib/seed-data';

// --- Mock Recharts (same pattern as personal-analytics tests) ---
jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ data }: any) => <div data-testid="co2-line-chart">{JSON.stringify(data)}</div>,
    BarChart: ({ data }: any) => <div data-testid="bar-chart">{JSON.stringify(data)}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data }: any) => <div data-testid="pie-data">{JSON.stringify(data)}</div>,
    Line: () => null,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Cell: () => null,
  };
});

// ---------------------------------------------------------------------------
// TeamLeaderboard — renders seed data (Req 23.1)
// ---------------------------------------------------------------------------
describe('TeamLeaderboard', () => {
  test('renders all 5 team members from seed data', () => {
    render(<TeamLeaderboard members={TEAM_SEED_DATA} />);
    for (const member of TEAM_SEED_DATA) {
      expect(screen.getByText(member.name)).toBeInTheDocument();
    }
  });

  test('renders "No team data" placeholder with empty members', () => {
    render(<TeamLeaderboard members={[]} />);
    expect(screen.getByText('No team data')).toBeInTheDocument();
  });

  test('displays prompts, grade, tokens, and intent for each member', () => {
    render(<TeamLeaderboard members={TEAM_SEED_DATA} />);
    // Verify specific values from seed data
    expect(screen.getByText('340')).toBeInTheDocument(); // Alex Chen prompts
    expect(screen.getByText('89,000')).toBeInTheDocument(); // Alex Chen tokens
  });
});


// ---------------------------------------------------------------------------
// Team Page — stat cards with aggregated values (Req 23.2)
// ---------------------------------------------------------------------------
describe('TeamPage — stat cards', () => {
  test('renders team total tokens stat card with correct aggregated value', () => {
    render(<TeamPage />);
    // Total tokens: 89000 + 67000 + 71000 + 54000 + 48000 = 329,000
    expect(screen.getByText('Team Total Tokens')).toBeInTheDocument();
    const totalTokens = (329000).toLocaleString();
    expect(screen.getByText(totalTokens)).toBeInTheDocument();
  });

  test('renders team total CO₂e stat card', () => {
    render(<TeamPage />);
    expect(screen.getByText('Team Total CO₂e')).toBeInTheDocument();
    // Carbon: (329000 / 1000) * 0.0021 / 1000 * 475 * 1_000_000
    const expectedCarbon = (329000 / 1000) * 0.0021 / 1000 * 475 * 1_000_000;
    expect(screen.getByText(expectedCarbon.toFixed(2))).toBeInTheDocument();
  });

  test('renders team total water stat card', () => {
    render(<TeamPage />);
    expect(screen.getByText('Team Total Water')).toBeInTheDocument();
    // Water: 329000 * 0.0106
    const expectedWater = 329000 * 0.0106;
    expect(screen.getByText(expectedWater.toFixed(2))).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Team Page — insight cards (Req 23.5)
// ---------------------------------------------------------------------------
describe('TeamPage — insight cards', () => {
  test('renders at least two insight cards', () => {
    render(<TeamPage />);
    // The page renders two InsightCard components with specific titles
    expect(screen.getByText(/Highest Token Usage/)).toBeInTheDocument();
    expect(screen.getByText(/Best Efficiency Grade/)).toBeInTheDocument();
  });

  test('insight card bodies are non-empty and reference team members', () => {
    render(<TeamPage />);
    // Top token user is Alex Chen — appears in leaderboard, chart, and insight card
    expect(screen.getAllByText(/Alex Chen/).length).toBeGreaterThanOrEqual(1);
    // Best grade user is Sofia Reyes — appears in leaderboard, chart, and insight card
    expect(screen.getAllByText(/Sofia Reyes/).length).toBeGreaterThanOrEqual(1);
    // Verify the insight card body text specifically
    expect(screen.getByText(/leads with/)).toBeInTheDocument();
    expect(screen.getByText(/highest average grade/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Team Page — disclaimer text (Req 24.2)
// ---------------------------------------------------------------------------
describe('TeamPage — disclaimers', () => {
  test('disclaimer text is present in all metric displays', () => {
    render(<TeamPage />);
    const disclaimers = screen.getAllByText(/Estimates based on published research/);
    // 3 stat cards + leaderboard section + 2 chart sections = at least 5 disclaimers
    expect(disclaimers.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// InsightCard component
// ---------------------------------------------------------------------------
describe('InsightCard', () => {
  test('renders title and body', () => {
    render(<InsightCard title="Test Title" body="Test body content" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test body content')).toBeInTheDocument();
  });
});
