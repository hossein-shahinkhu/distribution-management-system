export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm text-ink/60 disabled:opacity-30"
      >
        قبلی
      </button>
      <span className="text-sm text-ink/50 tabular">
        صفحه {page} از {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm text-ink/60 disabled:opacity-30"
      >
        بعدی
      </button>
    </div>
  );
}
