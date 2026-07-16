export default function StatCard({ label, value, sublabel, accent = 'navy' }) {
  const accentStyles = {
    navy: 'text-navy-600',
    amber: 'text-amber-600',
    green: 'text-[#2E7D5B]',
    red: 'text-[#C1443D]',
  };

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-ink/60">{label}</p>
      <p className={`tabular mt-2 text-2xl font-bold ${accentStyles[accent]}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-ink/40">{sublabel}</p>}
    </div>
  );
}
