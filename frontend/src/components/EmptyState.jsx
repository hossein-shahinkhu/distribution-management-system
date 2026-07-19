export default function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {/* Illustration */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50">
        {icon || (
          <svg className="h-8 w-8 text-navy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
