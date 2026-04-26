'use client';

import { useState, useMemo, useEffect } from 'react';
import { TEAM_SEED_DATA } from '../../lib/seed-data';
import type { TeamMember } from '../../lib/seed-data';
import StatCard from '../../components/StatCard';
import TeamLeaderboard from '../../components/TeamLeaderboard';
import TeamBarChart from '../../components/TeamBarChart';
import PlatformDonutChart from '../../components/PlatformDonutChart';
import InsightCard from '../../components/InsightCard';

const DISCLAIMER = 'Estimates based on published research. Actual values may vary.';
const DEFAULT_ENERGY = 0.0021;

type DataSource = 'seed' | 'api';

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(TEAM_SEED_DATA);
  const [dataSource, setDataSource] = useState<DataSource>('seed');

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((json: { members?: TeamMember[] }) => {
        if (json.members && json.members.length > 0) {
          setMembers(json.members);
          setDataSource('api');
        }
      })
      .catch(() => {});
  }, []);

  const totalTokens = useMemo(() => members.reduce((s, m) => s + m.tokens, 0), [members]);

  const totalCarbon = useMemo(
    () => (totalTokens / 1000) * DEFAULT_ENERGY / 1000 * 475 * 1_000_000,
    [totalTokens],
  );

  const totalWater = useMemo(() => totalTokens * 0.0106, [totalTokens]);

  const intentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      counts[m.topIntent] = (counts[m.topIntent] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  const topUser = useMemo(
    () => [...members].sort((a, b) => b.tokens - a.tokens)[0],
    [members],
  );
  const bestGradeUser = useMemo(() => {
    const order: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
    return [...members].sort((a, b) => (order[b.avgGrade] ?? 0) - (order[a.avgGrade] ?? 0))[0];
  }, [members]);

  const sourceBadge =
    dataSource === 'api'
      ? { label: 'Live from Database', className: 'bg-blue-100 text-blue-700 border-blue-200' }
      : { label: 'Sample Data', className: 'bg-gray-100 text-gray-500 border-gray-200' };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Team Leaderboard</h1>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sourceBadge.className}`}>
          {dataSource === 'api' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 animate-pulse" />
          )}
          {sourceBadge.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString('en-US')} unit="est." disclaimer={DISCLAIMER} />
        <StatCard label="Total CO₂e" value={totalCarbon.toFixed(2)} unit="mg" disclaimer={DISCLAIMER} />
        <StatCard label="Total Water" value={totalWater.toFixed(2)} unit="ml" disclaimer={DISCLAIMER} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-medium text-gray-600 mb-3">Leaderboard</h2>
        <TeamLeaderboard members={members} sortMetric="tokens" />
        <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Tokens per Member</h2>
          <TeamBarChart data={members} />
          <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Intent Breakdown</h2>
          <PlatformDonutChart data={intentBreakdown} />
          <p className="text-xs text-gray-400 mt-2 italic">{DISCLAIMER}</p>
        </div>
      </div>

      {topUser && bestGradeUser && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InsightCard
            title="Highest Token Usage"
            body={`${topUser.name} leads with ${topUser.tokens.toLocaleString('en-US')} tokens across ${topUser.prompts} prompts, primarily for ${topUser.topIntent}.`}
          />
          <InsightCard
            title="Best Efficiency Grade"
            body={`${bestGradeUser.name} has the highest average grade (${bestGradeUser.avgGrade}) with ${bestGradeUser.prompts} prompts — a model for efficient prompting.`}
          />
        </div>
      )}
    </div>
  );
}
