'use client';

import { useState, useMemo, type ChangeEvent } from 'react';
import { PERSONAL_SEED_DATA } from '../lib/seed-data';
import type { Session } from '../lib/data-utils';
import {
  gradeDistribution,
  intentBreakdown,
  platformBreakdown,
  last30SessionsCarbonSeries,
  perPlatformTotals,
} from '../lib/data-utils';
import StatCard from '../components/StatCard';
import Co2LineChart from '../components/Co2LineChart';
import GradeBarChart from '../components/GradeBarChart';
import IntentDonutChart from '../components/IntentDonutChart';
import PlatformDonutChart from '../components/PlatformDonutChart';
import SessionTable from '../components/SessionTable';

const DISCLAIMER = 'Estimates based on published research. Actual values may vary.';

export default function PersonalPage() {
  const [sessions, setSessions] = useState<Session[]>(PERSONAL_SEED_DATA);
  const [error, setError] = useState<string | null>(null);

  // Aggregated stats
  const totalTokens = useMemo(() => sessions.reduce((sum, s) => sum + s.tokens, 0), [sessions]);
  const totalCarbon = useMemo(() => sessions.reduce((sum, s) => sum + s.carbon_mg, 0), [sessions]);
  const totalWater = useMemo(() => sessions.reduce((sum, s) => sum + s.water_ml, 0), [sessions]);
  const sessionCount = sessions.length;

  // Chart data
  const grades = useMemo(() => gradeDistribution(sessions), [sessions]);
  const intents = useMemo(() => intentBreakdown(sessions), [sessions]);
  const platforms = useMemo(() => platformBreakdown(sessions), [sessions]);
  const carbonSeries = useMemo(() => last30SessionsCarbonSeries(sessions), [sessions]);
  const _platformTotals = useMemo(() => perPlatformTotals(sessions), [sessions]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.sessions || !Array.isArray(parsed.sessions)) {
          throw new Error('Invalid file: missing "sessions" array.');
        }
        setSessions(parsed.sessions);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse JSON file.';
        setError(message);
        setSessions(PERSONAL_SEED_DATA);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setSessions(PERSONAL_SEED_DATA);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Personal Analytics</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>Upload JSON export:</span>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:bg-white file:text-gray-700 hover:file:bg-gray-50"
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString()} unit="est." disclaimer={DISCLAIMER} />
        <StatCard label="Total CO₂e" value={totalCarbon.toFixed(2)} unit="mg" disclaimer={DISCLAIMER} />
        <StatCard label="Total Water" value={totalWater.toFixed(2)} unit="ml" disclaimer={DISCLAIMER} />
        <StatCard label="Sessions" value={sessionCount} unit="sessions" disclaimer={DISCLAIMER} />
      </div>

      {/* Charts — row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 mb-3">CO₂e — Last 30 Sessions</h2>
          <Co2LineChart data={carbonSeries} />
          <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Grade Distribution</h2>
          <GradeBarChart data={grades} />
          <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
        </div>
      </div>

      {/* Charts — row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Intent Breakdown</h2>
          <IntentDonutChart data={intents} />
          <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Platform Breakdown</h2>
          <PlatformDonutChart data={platforms} />
          <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
        </div>
      </div>

      {/* Session Table */}
      <div>
        <h2 className="text-sm font-medium text-gray-600 mb-3">Session History</h2>
        <SessionTable sessions={sessions} />
        <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
      </div>
    </div>
  );
}
