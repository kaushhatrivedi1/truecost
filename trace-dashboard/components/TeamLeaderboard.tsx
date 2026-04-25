'use client';

import { useState, useMemo } from 'react';
import type { TeamMember } from '../lib/seed-data';

type SortMetric = 'tokens' | 'prompts' | 'avgGrade';

interface TeamLeaderboardProps {
  members: TeamMember[];
  sortMetric?: SortMetric;
}

const GRADE_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export default function TeamLeaderboard({ members, sortMetric = 'tokens' }: TeamLeaderboardProps) {
  const [metric, setMetric] = useState<SortMetric>(sortMetric);

  const sorted = useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      if (metric === 'avgGrade') {
        return (GRADE_ORDER[b.avgGrade] ?? 0) - (GRADE_ORDER[a.avgGrade] ?? 0);
      }
      return b[metric] - a[metric];
    });
    return copy;
  }, [members, metric]);

  if (!members || members.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No team data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Sort by:</span>
        {(['tokens', 'prompts', 'avgGrade'] as SortMetric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`text-xs px-2 py-1 rounded ${
              metric === m
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m === 'tokens' ? 'Tokens' : m === 'prompts' ? 'Prompts' : 'Grade'}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Prompts</th>
              <th className="py-2 pr-4">Avg Grade</th>
              <th className="py-2 pr-4">Tokens</th>
              <th className="py-2 pr-4">Top Intent</th>
              <th className="py-2">Intent %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr key={m.name} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium text-gray-400">{i + 1}</td>
                <td className="py-2 pr-4 font-medium">{m.name}</td>
                <td className="py-2 pr-4">{m.prompts}</td>
                <td className="py-2 pr-4">{m.avgGrade}</td>
                <td className="py-2 pr-4">{m.tokens.toLocaleString()}</td>
                <td className="py-2 pr-4 capitalize">{m.topIntent}</td>
                <td className="py-2">{m.intentPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
