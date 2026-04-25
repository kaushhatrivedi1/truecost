'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { GradeDistribution } from '../lib/data-utils';

interface GradeBarChartProps {
  data: GradeDistribution;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#14b8a6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

export default function GradeBarChart({ data }: GradeBarChartProps) {
  const entries = Object.entries(data).map(([grade, count]) => ({ grade, count }));
  const hasData = entries.some((e) => e.count > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={entries} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="grade" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {entries.map((entry) => (
              <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] ?? '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
