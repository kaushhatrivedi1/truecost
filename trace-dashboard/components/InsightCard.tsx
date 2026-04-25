interface InsightCardProps {
  title: string;
  body: string;
}

export default function InsightCard({ title, body }: InsightCardProps) {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-indigo-700 mb-1">{title}</h3>
      <p className="text-sm text-indigo-900">{body}</p>
    </div>
  );
}
