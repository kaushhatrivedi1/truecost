/**
 * Feature: trace-ai-layer, Property 19: Dashboard upload replaces seed data for all charts and the session table
 *
 * **Validates: Requirements 22.8**
 *
 * For any valid JSON export containing a `sessions` array, after upload every chart
 * and the session table must display data derived exclusively from the uploaded sessions,
 * not from the built-in seed data.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import PersonalPage from '../app/page';
import { PERSONAL_SEED_DATA } from '../lib/seed-data';
import type { Session } from '../lib/data-utils';

// --- Mock Recharts to avoid SVG rendering issues in jsdom ---
// Each chart mock renders its data as JSON so we can assert on it.
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

// --- Arbitrary Session generator ---
const VALID_PLATFORMS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'mistral', 'copilot'] as const;
const VALID_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;
const VALID_INTENTS = ['coding', 'writing', 'research', 'exploratory', 'general'] as const;
const VALID_MODELS = [
  'gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo',
  'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet',
  'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0',
  'mistral-large', 'mistral-small', 'default',
] as const;

const arbSession: fc.Arbitrary<Session> = fc.record({
  id: fc.uuid(),
  timestamp: fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
  platform_id: fc.constantFrom(...VALID_PLATFORMS),
  model_id: fc.constantFrom(...VALID_MODELS),
  tokens: fc.integer({ min: 1, max: 10000 }),
  carbon_mg: fc.integer({ min: 1, max: 100000 }).map(n => n / 100),
  water_ml: fc.integer({ min: 1, max: 10000 }).map(n => n / 100),
  score: fc.integer({ min: 0, max: 100 }),
  grade: fc.constantFrom(...VALID_GRADES),
  intent: fc.constantFrom(...VALID_INTENTS),
  prompt_preview: fc.stringOf(fc.constantFrom('a', 'b', 'c', ' ', 'x'), { minLength: 1, maxLength: 50 }),
});

// Generate arrays of 1-15 sessions (keep small for test speed)
const arbSessions = fc.array(arbSession, { minLength: 1, maxLength: 15 });

/** Helper: simulate file upload using a mock FileReader approach */
function simulateUpload(input: HTMLInputElement, sessions: Session[]) {
  const json = JSON.stringify({ sessions });
  const file = new File([json], 'export.json', { type: 'application/json' });

  // Fire the change event with the file
  fireEvent.change(input, { target: { files: [file] } });
}

function getFileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (!input) throw new Error('No file input found');
  return input;
}

describe('Property 19: Dashboard upload replaces seed data for all charts and the session table', () => {

  test('after upload, stat cards and session table reflect uploaded data exclusively', async () => {
    await fc.assert(
      fc.asyncProperty(arbSessions, async (sessions) => {
        const { unmount } = render(<PersonalPage />);

        try {
          const input = getFileInput();
          simulateUpload(input, sessions);

          // Wait for FileReader async processing to complete and state to update
          const expectedCount = sessions.length;
          const expectedTokens = sessions.reduce((s, sess) => s + sess.tokens, 0);

          await waitFor(() => {
            // Verify session count matches uploaded data
            const text = screen.getByText(new RegExp(`${expectedCount} sessions`));
            expect(text).toBeInTheDocument();
          }, { timeout: 3000 });

          // Verify stat card for Sessions shows uploaded count
          const sessionsCard = screen.getByText('Sessions').closest('div')!;
          expect(within(sessionsCard).getByText(String(expectedCount))).toBeInTheDocument();

          // Verify stat card for Total Tokens shows uploaded total
          const tokensCard = screen.getByText('Total Tokens').closest('div')!;
          expect(within(tokensCard).getByText(expectedTokens.toLocaleString())).toBeInTheDocument();

          // Verify session table rows contain only uploaded session platforms
          const tableBody = document.querySelector('tbody');
          expect(tableBody).not.toBeNull();
          const rows = tableBody!.querySelectorAll('tr');
          expect(rows.length).toBeGreaterThan(0);
          expect(rows.length).toBeLessThanOrEqual(Math.min(10, sessions.length));

          const uploadedPlatforms = new Set(sessions.map(s => s.platform_id));
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
              expect(uploadedPlatforms.has(cells[1].textContent!)).toBe(true);
            }
          });
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('after upload, all chart components receive data derived from uploaded sessions', async () => {
    await fc.assert(
      fc.asyncProperty(arbSessions, async (sessions) => {
        const { unmount } = render(<PersonalPage />);

        try {
          const input = getFileInput();
          simulateUpload(input, sessions);

          const expectedCount = sessions.length;

          await waitFor(() => {
            const text = screen.getByText(new RegExp(`${expectedCount} sessions`));
            expect(text).toBeInTheDocument();
          }, { timeout: 3000 });

          // CO2 line chart: should contain carbon_mg values from uploaded sessions (last 30)
          const lineChart = screen.getByTestId('co2-line-chart');
          const lineData = JSON.parse(lineChart.textContent!);
          const expectedSeries = sessions.slice(-30).map((s, i) => ({
            index: i + 1,
            carbon_mg: s.carbon_mg,
          }));
          expect(lineData).toEqual(expectedSeries);

          // Grade bar chart: should reflect uploaded grade distribution
          const barCharts = screen.getAllByTestId('bar-chart');
          const gradeData = JSON.parse(barCharts[0].textContent!);
          const expectedGrades: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
          sessions.forEach(s => { expectedGrades[s.grade]++; });
          const expectedGradeEntries = Object.entries(expectedGrades).map(([grade, count]) => ({ grade, count }));
          expect(gradeData).toEqual(expectedGradeEntries);

          // Intent donut chart: should reflect uploaded intent breakdown
          const pieDataElements = screen.getAllByTestId('pie-data');
          const intentData = JSON.parse(pieDataElements[0].textContent!);
          const intentCounts: Record<string, number> = {};
          sessions.forEach(s => { intentCounts[s.intent] = (intentCounts[s.intent] ?? 0) + 1; });
          const expectedIntents = Object.entries(intentCounts).map(([name, value]) => ({ name, value }));
          expect(intentData).toEqual(expectedIntents);

          // Platform donut chart: should reflect uploaded platform breakdown
          const platformData = JSON.parse(pieDataElements[1].textContent!);
          const platformCounts: Record<string, number> = {};
          sessions.forEach(s => { platformCounts[s.platform_id] = (platformCounts[s.platform_id] ?? 0) + 1; });
          const expectedPlatforms = Object.entries(platformCounts).map(([name, value]) => ({ name, value }));
          expect(platformData).toEqual(expectedPlatforms);
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  });
});
