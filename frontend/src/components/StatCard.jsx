export default function StatCard({ label, value, sublabel, accent = 'navy', icon, trend }) {
  const accentMap = {
    navy:   { text: 'text-navy-600',   bg: 'bg-navy-50',   border: 'border-navy-100',  icon: 'text-navy-400' },
    amber:  { text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100', icon: 'text-amber-400' },
    green:  { text: 'text-success',    bg: 'bg-success/8', border: 'border-success/20',icon: 'text-success/60' },
    red:    { text: 'text-danger',     bg: 'bg-danger/8',  border: 'border-danger/20', icon: 'text-danger/60' },
    purple: { text: 'text-[#7C5CBF]',  bg: 'bg-[#7C5CBF]/8', border: 'border-[#7C5CBF]/20', icon: 'text-[#7C5CBF]/60' },
  };

  const colors = accentMap[accent] || accentMap.navy;

  const trendIcon = trend > 0
    ? <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
    : trend < 0
    ? <svg className="h-3.5 w-3.5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
    : null;

  return (
    <div className="card group relative overflow-hidden rounded-2xl bg-white p-5 transition-shadow hover:shadow-md">
      {/* Top accent line */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${colors.bg} opacity-80`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted">{label}</p>
          <p className={`tabular mt-2 truncate text-2xl font-bold ${colors.text}`}>{value}</p>
          {(sublabel || trend !== undefined) && (
            <div className="mt-2 flex items-center gap-1.5">
              {trendIcon}
              {sublabel && <p className="text-xs text-muted">{sublabel}</p>}
            </div>
          )}
        </div>
        {icon && (
          <div className={`shrink-0 rounded-xl p-2.5 ${colors.bg}`}>
            <span className={colors.icon}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
