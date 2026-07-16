export default function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-ink/70">{label}</span>}
      <input
        className={`w-full rounded-xl border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-navy-400 focus:outline-none ${className}`}
        {...props}
      />
    </label>
  );
}
