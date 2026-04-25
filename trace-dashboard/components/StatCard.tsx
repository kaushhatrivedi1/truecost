interface StatCardProps {
  label: string;
  value: string | number;
  unit: string;
  disclaimer?: string;
}

export default function StatCard({ label, value, unit, disclaimer }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {value}{' '}
        <span className="text-sm font-normal text-gray-400">{unit}</span>
      </p>
      {disclaimer && (
        <p className="text-xs text-gray-400 mt-2 italic">{disclaimer}</p>
      )}
    </div>
  );
}
