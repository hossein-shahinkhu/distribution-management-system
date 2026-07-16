export default function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-100 bg-white py-14 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-ink/50">{description}</p>}
    </div>
  );
}
