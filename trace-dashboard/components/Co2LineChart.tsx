'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CarbonSeriesPoint } from '../lib/data-utils';

interface Co2LineChartProps {
  data: CarbonSeriesPoint[];
}

export default function Co2LineChart({ data }: Co2LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="index" label={{ value: 'Session', position: 'insideBottom', offset: -2 }} />
          <YAxis label={{ value: 'CO₂e (mg)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value: number) => [`${value.toFixed(2)} mg`, 'CO₂e']} />
          <Line type="monotone" dataKey="carbon_mg" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
