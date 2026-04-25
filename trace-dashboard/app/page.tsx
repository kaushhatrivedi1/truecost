'use client';

import { useState, useMemo, useEffect } from 'react';
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

type DataSource = 'seed' | 'extension';

export default function PersonalPage() {
  const [sessions, setSessions] = useState<Session[]>(PERSONAL_SEED_DATA);
  const [dataSource, setDataSource] = useState<DataSource>('seed');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type !== 'TRACE_DATA') return;
      const data = event.data.data as { sessions?: Session[] } | undefined;
      if (data?.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
        setSessions(data.sessions);
        setDataSource('extension');
      }
    };

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'TRACE_REQUEST_DATA' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  const sourceBadge =
    dataSource === 'extension'
      ? { label: 'Live from Extension', className: 'bg-green-100 text-green-700 border-green-200' }
      : { label: 'Sample Data',          className: 'bg-gray-100 text-gray-500 border-gray-200' };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Personal Analytics</h1>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sourceBadge.className}`}>
          {dataSource === 'extension' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />}
          {sourceBadge.label}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString('en-US')} unit="est." disclaimer={DISCLAIMER} />
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
