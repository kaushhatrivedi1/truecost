'use client';

import { useState, useMemo } from 'react';
import type { Session } from '../lib/data-utils';

interface SessionTableProps {
  sessions: Session[];
}

type SortColumn = keyof Pick<
  Session,
  'timestamp' | 'platform_id' | 'model_id' | 'tokens' | 'carbon_mg' | 'water_ml' | 'score' | 'grade' | 'intent'
>;

type SortDirection = 'asc' | 'desc';

const ROWS_PER_PAGE = 10;

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'platform_id', label: 'Platform' },
  { key: 'model_id', label: 'Model' },
  { key: 'tokens', label: 'Tokens' },
  { key: 'carbon_mg', label: 'CO₂e (mg)' },
  { key: 'water_ml', label: 'Water (ml)' },
  { key: 'score', label: 'Score' },
  { key: 'grade', label: 'Grade' },
  { key: 'intent', label: 'Intent' },
];

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-600',
  B: 'text-teal-600',
  C: 'text-amber-600',
  D: 'text-orange-600',
  F: 'text-red-600',
};

export default function SessionTable({ sessions }: SessionTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...sessions];
    copy.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return copy;
  }, [sessions, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = sorted.slice(startIdx, startIdx + ROWS_PER_PAGE);

  const handleSort = (col: SortColumn) => {
    if (col === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                >
                  {col.label}
                  {sortColumn === col.key && (
                    <span className="ml-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {pageRows.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(s.timestamp).toLocaleString()}</td>
                <td className="px-4 py-2 whitespace-nowrap">{s.platform_id}</td>
                <td className="px-4 py-2 whitespace-nowrap">{s.model_id}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right">{s.tokens.toLocaleString()}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right">{s.carbon_mg.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right">{s.water_ml.toFixed(4)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right">{s.score}</td>
                <td className={`px-4 py-2 whitespace-nowrap font-semibold ${GRADE_COLORS[s.grade] ?? ''}`}>{s.grade}</td>
                <td className="px-4 py-2 whitespace-nowrap capitalize">{s.intent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
        <span>
          Page {safePage} of {totalPages} ({sorted.length} sessions)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
