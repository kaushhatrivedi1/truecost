/**
 * Component tests for the Personal Analytics page.
 *
 * Validates: Requirements 22.1, 22.6, 22.7, 22.8
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatCard from '../components/StatCard';
import Co2LineChart from '../components/Co2LineChart';
import GradeBarChart from '../components/GradeBarChart';
import IntentDonutChart from '../components/IntentDonutChart';
import PlatformDonutChart from '../components/PlatformDonutChart';
import SessionTable from '../components/SessionTable';
import PersonalPage from '../app/page';
import { PERSONAL_SEED_DATA } from '../lib/seed-data';
import type { Session } from '../lib/data-utils';

// --- Mock Recharts (same pattern as existing property test) ---
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
// StatCard
// ---------------------------------------------------------------------------
describe('StatCard', () => {
  test('renders label, value, unit', () => {
    render(<StatCard label="Total Tokens" value="1,234" unit="est." />);
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('est.')).toBeInTheDocument();
  });

  test('renders disclaimer when provided', () => {
    const disclaimer = 'Estimates based on published research.';
    render(<StatCard label="CO₂e" value="42.00" unit="mg" disclaimer={disclaimer} />);
    expect(screen.getByText(disclaimer)).toBeInTheDocument();
  });

  test('does not render disclaimer when omitted', () => {
    const { container } = render(<StatCard label="Sessions" value={30} unit="sessions" />);
    // No italic disclaimer paragraph should exist
    expect(container.querySelector('.italic')).toBeNull();
  });
});


// ---------------------------------------------------------------------------
// Chart components — valid data & empty data
// ---------------------------------------------------------------------------
describe('Co2LineChart', () => {
  test('renders without crashing with valid data', () => {
    const data = [
      { index: 1, carbon_mg: 10.5 },
      { index: 2, carbon_mg: 20.3 },
    ];
    const { container } = render(<Co2LineChart data={data} />);
    expect(container.querySelector('[data-testid="co2-line-chart"]')).toBeInTheDocument();
  });

  test('renders "No data" placeholder with empty data', () => {
    render(<Co2LineChart data={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});

describe('GradeBarChart', () => {
  test('renders without crashing with valid data', () => {
    const data = { A: 5, B: 3, C: 2, D: 1, F: 0 };
    const { container } = render(<GradeBarChart data={data} />);
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
  });

  test('renders "No data" placeholder when all counts are zero', () => {
    render(<GradeBarChart data={{ A: 0, B: 0, C: 0, D: 0, F: 0 }} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});

describe('IntentDonutChart', () => {
  test('renders without crashing with valid data', () => {
    const data = [{ name: 'coding', value: 5 }, { name: 'writing', value: 3 }];
    const { container } = render(<IntentDonutChart data={data} />);
    expect(container.querySelector('[data-testid="pie-chart"]')).toBeInTheDocument();
  });

  test('renders "No data" placeholder with empty data', () => {
    render(<IntentDonutChart data={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});

describe('PlatformDonutChart', () => {
  test('renders without crashing with valid data', () => {
    const data = [{ name: 'chatgpt', value: 6 }, { name: 'claude', value: 5 }];
    const { container } = render(<PlatformDonutChart data={data} />);
    expect(container.querySelector('[data-testid="pie-chart"]')).toBeInTheDocument();
  });

  test('renders "No data" placeholder with empty data', () => {
    render(<PlatformDonutChart data={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});


// ---------------------------------------------------------------------------
// SessionTable — pagination and sorting
// ---------------------------------------------------------------------------
describe('SessionTable', () => {
  // Build a set of 25 sessions so we can test pagination (10 per page → 3 pages)
  const sessions: Session[] = Array.from({ length: 25 }, (_, i) => ({
    id: `t${i}`,
    timestamp: new Date(2025, 5, i + 1).toISOString(),
    platform_id: 'chatgpt',
    model_id: 'gpt-4o',
    tokens: (i + 1) * 10,
    carbon_mg: (i + 1) * 1.5,
    water_ml: (i + 1) * 0.1,
    score: 50 + i,
    grade: (['A', 'B', 'C', 'D', 'F'] as const)[i % 5],
    intent: 'coding' as const,
    prompt_preview: `prompt ${i}`,
  }));

  test('renders first page with 10 rows', () => {
    render(<SessionTable sessions={sessions} />);
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(10);
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
  });

  test('navigates to next page', () => {
    render(<SessionTable sessions={sessions} />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
  });

  test('navigates back to previous page', () => {
    render(<SessionTable sessions={sessions} />);
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Previous'));
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
  });

  test('Previous button is disabled on first page', () => {
    render(<SessionTable sessions={sessions} />);
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  test('Next button is disabled on last page', () => {
    render(<SessionTable sessions={sessions} />);
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/Page 3 of 3/)).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeDisabled();
  });

  test('clicking a column header sorts the table', () => {
    render(<SessionTable sessions={sessions} />);
    // Click "Tokens" header to sort ascending
    fireEvent.click(screen.getByText('Tokens'));
    const firstRowCells = document.querySelectorAll('tbody tr:first-child td');
    // After ascending sort, smallest token value (10) should be first
    expect(firstRowCells[3].textContent).toBe('10');
  });

  test('clicking same column header toggles sort direction', () => {
    render(<SessionTable sessions={sessions} />);
    // Default sort is timestamp desc. Click Tokens → asc, click again → desc
    fireEvent.click(screen.getByText('Tokens'));
    fireEvent.click(screen.getByText('Tokens'));
    const firstRowCells = document.querySelectorAll('tbody tr:first-child td');
    // After descending sort, largest token value (250) should be first
    expect(firstRowCells[3].textContent).toBe('250');
  });

  test('renders "No data" placeholder with empty sessions', () => {
    render(<SessionTable sessions={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});


// ---------------------------------------------------------------------------
// PersonalPage — seed data, file upload, invalid JSON
// ---------------------------------------------------------------------------
describe('PersonalPage', () => {
  test('renders with seed data when no file is uploaded (Req 22.7)', () => {
    render(<PersonalPage />);
    // Seed data has 30 sessions
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('Total CO₂e')).toBeInTheDocument();
    expect(screen.getByText('Total Water')).toBeInTheDocument();
  });

  test('renders disclaimer text on stat cards (Req 22.1)', () => {
    render(<PersonalPage />);
    const disclaimers = screen.getAllByText(/Estimates based on published research/);
    // At least 4 stat cards + chart sections have disclaimers
    expect(disclaimers.length).toBeGreaterThanOrEqual(4);
  });

  test('file upload replaces data (Req 22.8)', async () => {
    render(<PersonalPage />);
    const uploadSessions: Session[] = [
      {
        id: 'u1',
        timestamp: '2025-07-01T10:00:00Z',
        platform_id: 'claude',
        model_id: 'claude-3-opus',
        tokens: 999,
        carbon_mg: 50.0,
        water_ml: 5.0,
        score: 80,
        grade: 'B',
        intent: 'research',
        prompt_preview: 'test upload',
      },
    ];
    const json = JSON.stringify({ sessions: uploadSessions });
    const file = new File([json], 'export.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Session count should now be 1
      const sessionsCard = screen.getByText('Sessions').closest('div')!;
      expect(within(sessionsCard).getByText('1')).toBeInTheDocument();
    });

    // Token total should reflect uploaded data
    const tokensCard = screen.getByText('Total Tokens').closest('div')!;
    expect(within(tokensCard).getByText('999')).toBeInTheDocument();
  });

  test('invalid JSON upload shows error and reverts to seed data (Req 22.8)', async () => {
    render(<PersonalPage />);
    const file = new File(['not valid json'], 'bad.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Should revert to seed data (30 sessions)
    const sessionsCard = screen.getByText('Sessions').closest('div')!;
    expect(within(sessionsCard).getByText('30')).toBeInTheDocument();
  });

  test('JSON without sessions array shows error and reverts to seed data', async () => {
    render(<PersonalPage />);
    const json = JSON.stringify({ data: 'no sessions key' });
    const file = new File([json], 'missing.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    const sessionsCard = screen.getByText('Sessions').closest('div')!;
    expect(within(sessionsCard).getByText('30')).toBeInTheDocument();
  });
});
