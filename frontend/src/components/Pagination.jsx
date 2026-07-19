export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left  = page - delta;
  const right = page + delta + 1;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i < right)) {
      pages.push(i);
    }
  }

  // Insert ellipsis markers
  const items = [];
  let prev = null;
  for (const p of pages) {
    if (prev && p - prev > 1) items.push('...');
    items.push(p);
    prev = p;
  }

  return (
    <nav className="mt-5 flex items-center justify-between gap-4" aria-label="صفحه‌بندی">
      <p className="text-xs text-muted tabular">
        صفحه <span className="font-semibold text-ink">{page}</span> از <span className="font-semibold text-ink">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-ink/60 transition hover:bg-navy-50 disabled:opacity-30"
          aria-label="صفحه قبل"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {items.map((item, i) =>
          item === '...' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-muted">
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition
                ${item === page
                  ? 'bg-navy-600 text-white shadow-sm'
                  : 'border border-border bg-white text-ink/70 hover:bg-navy-50'
                }`}
            >
              {item}
            </button>
          )
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-ink/60 transition hover:bg-navy-50 disabled:opacity-30"
          aria-label="صفحه بعد"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
