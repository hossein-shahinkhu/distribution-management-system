export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-navy-600 text-white hover:bg-navy-700',
    amber: 'bg-amber-400 text-navy-900 hover:bg-amber-600',
    ghost: 'bg-transparent text-navy-600 hover:bg-navy-50',
    danger: 'bg-[#C1443D] text-white hover:bg-[#a3352f]',
    outline: 'border border-navy-100 text-ink hover:bg-navy-50',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
